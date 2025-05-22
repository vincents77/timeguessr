import sys
from pathlib import Path

# ⬇️ Add the project root to Python's import path
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(project_root))

# ⬇️ Now you can safely import everything relative to src
from dotenv import load_dotenv
load_dotenv(dotenv_path=project_root / ".env")

import pandas as pd
import json
import re
import openai
import os

# ✅ Updated import to use the full `src.` prefix
from src.data.theme_lookup import theme_lookup

openai.api_key = os.getenv("VITE_OPENAI_API_KEY")

if not openai.api_key:
    raise ValueError("❌ Missing OpenAI API Key. Make sure VITE_OPENAI_API_KEY is set in your environment.")
# --- Helper Functions ---

def slugify(text: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', text.lower().strip()).strip('-')

def normalize_coords(coords) -> list:
    """
    Ensures coords are always a proper [lat, lon] list.
    """
    if isinstance(coords, str):
        parts = coords.split(",")
        return [float(parts[0].strip()), float(parts[1].strip())]
    elif isinstance(coords, list):
        return [float(coords[0]), float(coords[1])]
    else:
        raise ValueError(f"Invalid coords format: {coords}")

def match_era(year: int, region: str, eras_df: pd.DataFrame) -> dict:
    candidates = eras_df[(eras_df["start"] <= year) & (eras_df["end"] >= year)]

    if candidates.empty:
        return {"era": "Unknown", "era_id": None}

    exact_match = candidates[candidates["region"] == region]
    fallback_match = candidates[candidates["region"] == "General"]

    if not exact_match.empty:
        selected = exact_match.iloc[0]
    elif not fallback_match.empty:
        selected = fallback_match.iloc[0]
    else:
        selected = candidates.iloc[0]

    return {
        "era": selected["label"],
        "era_id": int(selected["id"])
    }

def get_broad_era_label(year: int) -> str:
    if year <= -300000:
        return "1. Deep Prehistory"
    elif year <= -100000:
        return "2. Early Prehistory"
    elif year <= -3000:
        return "3. Late Prehistory"
    elif year <= 500:
        return "4. Ancient World"
    elif year <= 1500:
        return "5. Middle Ages"
    elif year <= 1800:
        return "6. Early Modern Era"
    elif year <= 1945:
        return "7. Industrial Age"
    elif year <= 2000:
        return "8. 20th Century"
    else:
        return "9. 21st Century"

def assign_theme(theme_label: str, theme_lookup: dict) -> dict:
    theme_label = theme_label.lower().strip()
    if theme_label not in theme_lookup:
        print(f"⚠️ Warning: Unknown theme '{theme_label}', defaulting to 'art & culture'.")
        return {"theme": "art & culture", "theme_id": theme_lookup["art & culture"]}
    
    return {"theme": theme_label, "theme_id": theme_lookup[theme_label]}

def call_gpt_generate_metadata(idea: str) -> dict:
    """
    Calls GPT-4o to generate metadata for an event idea.
    """
    prompt = f"""
You are tasked with generating structured metadata for a historical event: "{idea}".

Respond in pure JSON format, without any commentary.

Required fields:
- title
- year (integer)
- coords (array [latitude, longitude])
- theme (pick from: wars & battles, foundational political moments, diplomacy & international relations, law & justice, social movements & protests, scientific & technological breakthroughs, natural disasters, architecture & engineering, exploration & discovery, art & culture, royalty & coronations, religious history, economic & industrial history, migration & demographic change)
- region (Africa, Americas, Asia, Europe, Oceania)
- notable_figures (comma-separated)
- visuals (array of 3–5 short visual elements)
- prompt (full DALL·E prompt description)
- country
- city (if any)
- notable_location (if any)
- caption (1–2 sentence summary contextualizing the event)
- wiki_url (Wikipedia link, if available)

Special instructions:
- When generating the `prompt` field for the image, always follow this structure:
"A highly detailed, photo-realistic image of [title] as it might have appeared at the time. 
The scene includes [visual elements], depicted with authentic clothing, environment, and technology from the historical era. 
Captured as if by a high-resolution camera. No text or modern artifacts. Realistic proportions, cinematic style."
- Prioritize scenes that include recognizable city features, landscapes, important buildings, or architecture when relevant to the event.
- Human activity (e.g., battles, ceremonies, education) should still be central, but framed within authentic settings when possible.
- If the event takes place indoors, consider showing elements of the architecture or view of the surrounding location if appropriate.
- Ensure that clothing, crowns, tools, furniture, artifacts, and architecture match the specific time period (avoid anachronisms).
Respond only with valid JSON. No text around it.
"""

    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.2
    )

    content = response.choices[0].message.content
    content = re.sub(r'^```(?:json)?\n(.+?)\n```$', r'\1', content.strip(), flags=re.DOTALL)

    print("🧠 GPT raw response:\n", content)
    try:
        metadata = json.loads(content)
        return metadata
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON from GPT: {e}")

# --- Load eras ---
eras_df = pd.read_csv('src/data/eras_rows.csv')

# --- Main Processing ---

def load_event_ideas():
    return [
]

def generate_event_metadata(idea, eras_df: pd.DataFrame) -> dict:
    # Support both raw string and enriched idea object
    if isinstance(idea, str):
        title = idea
        raw = call_gpt_generate_metadata(title)
    elif isinstance(idea, dict):
        title = idea["title"]
        raw = call_gpt_generate_metadata(title)
        raw = {**raw, **idea}  # merge AI result with user-provided fields
    else:
        raise ValueError("Unsupported idea format")

    slug = slugify(title)
    era_match = match_era(raw["year"], raw["region"], eras_df)
    theme_info = assign_theme(raw["theme"], theme_lookup)
    normalized_coords = normalize_coords(raw["coords"])
    broad_era = get_broad_era_label(raw["year"])

    enriched = {
        "title": title,
        "slug": slug,
        "year": raw["year"],
        "coords": json.dumps(normalized_coords),
        "theme": theme_info["theme"],
        "theme_id": theme_info["theme_id"],
        "region": raw["region"],
        "notable_figures": raw["notable_figures"],
        "visuals": "; ".join(raw["visuals"]),
        "prompt": raw["prompt"],
        "image_url": f"/images/{slug}.jpg",
        "difficulty": raw.get("difficulty", 3),
        "source": "AI-generated based on historical records",
        "country": raw.get("country", "Unknown"),
        "city": raw.get("city", ""),
        "notable_location": raw.get("notable_location", ""),
        "caption": raw.get("caption", ""),
        "wiki_url": raw.get("wiki_url", ""),
        "era": era_match["era"],
        "era_id": era_match["era_id"],
        "broad_era": broad_era
    }

    # Optional: preserve curriculum metadata if present
    for field in ["levels", "curriculum_tags", "curriculum_theme_ids", "language", "objective"]:
        if field in raw:
            enriched[field] = raw[field]

    return enriched

def save_event_locally(event: dict, output_file="pending_events.json"):
    output_path = Path('src/data') / output_file
    if output_path.exists():
        with open(output_path, "r") as f:
            events = json.load(f)
    else:
        events = []

    events.append(event)

    with open(output_path, "w") as f:
        json.dump(events, f, indent=2)

def batch_generate_events_from_pending():
    pending_path = Path("src/moderation/pending_event_ideas.json")
    archive_path = Path("src/moderation/archived_event_ideas.json")
    output_path = Path("src/data/pending_events.json")

    if not pending_path.exists():
        print("❌ No pending_event_ideas.json found.")
        return

    with open(pending_path, "r", encoding="utf-8") as f:
        ideas = json.load(f)

    # Load archived ideas
    if archive_path.exists():
        with open(archive_path, "r", encoding="utf-8") as f:
            archived_ideas = json.load(f)
    else:
        archived_ideas = []

    # Load already saved events to prevent duplicates
    if output_path.exists():
        with open(output_path, "r", encoding="utf-8") as f:
            existing_events = json.load(f)
    else:
        existing_events = []

    existing_keys = {
        (
            e["title"].strip().lower(),
            e["year"],
            tuple(sorted(e.get("curriculum_tags", [])))
        )
        for e in existing_events
    }

    new_events = []

    for idea in ideas:
        key = (
            idea["title"].strip().lower(),
            idea["year"],
            tuple(sorted(idea.get("curriculum_tags", [])))
        )
        if key in existing_keys:
            print(f"⚠️ Skipping duplicate: {idea['title']} ({idea['year']}) {idea.get('curriculum_tags', [])}")
            continue
        try:
            event = generate_event_metadata(idea["title"], eras_df)
            save_event_locally(event)
            new_events.append(event)
            existing_keys.add(key)
            print(f"✅ Success: {event['title']}")
        except Exception as e:
            print(f"❌ Error processing {idea['title']}: {str(e)}")

    # Archive processed ideas
    with open(archive_path, "w", encoding="utf-8") as f:
        json.dump(archived_ideas + ideas, f, indent=2, ensure_ascii=False)
        print(f"📦 Archived {len(ideas)} ideas to {archive_path.name}")

    # Clear the pending list
    pending_path.unlink()
    print("🧹 Cleared pending_event_ideas.json")

# --- Entry Point ---
if __name__ == "__main__":
    batch_generate_events_from_pending()