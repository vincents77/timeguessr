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
- caption (1–2 sentence clue or contextual enrichment that hints at or deepens the event, for display after the game round)
- wiki_url (URL to the best matching Wikipedia article)

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
  "The Storming of the Winter Palace during the Russian Revolution (1917)",
  "The Dropping of the Atomic Bomb on Hiroshima (1945)",
  "The Signing of the Maastricht Treaty establishing the EU (1992)",
  "The Moon Landing by Apollo 11 from the NASA headquarters (1969)",
  "The Fall of the Twin Towers on September 11 (2001)",
  "The Launch of Facebook marking the rise of social media (2004)",
  "The Coronation of Napoleon Bonaparte in Notre-Dame (1804)",
  "The Assassination of John F. Kennedy in Dallas (1963)",
  "The Opening Ceremony of the Beijing Olympics (2008)",
  "The Release of Nelson Mandela from Prison (1990)",
  "The Declaration of the People's Republic of China by Mao Zedong (1949)",
  "The Abolition of Slavery in the British Empire (1833)",
  "The Founding of the United Nations in San Francisco (1945)",
  "The Opening of Japan by Commodore Perry (1853)",
  "The Election of Barack Obama as U.S. President (2008)",
  "The Unification of Germany under Otto von Bismarck (1871)",
  "The Haitian Declaration of Independence (1804)",
  "The Election of Lech Wałęsa as President of Poland (1990)",
  "The Bandung Conference of Non-Aligned Nations (1955)",
  "The Establishment of the European Economic Community (1957)",
  "The First UN General Assembly held in London (1946)"
]

def generate_event_metadata(idea: str, eras_df: pd.DataFrame) -> dict:
    raw = call_gpt_generate_metadata(idea)

    slug = slugify(raw["title"])
    era_match = match_era(raw["year"], raw["region"], eras_df)
    theme_info = assign_theme(raw["theme"], theme_lookup)
    normalized_coords = normalize_coords(raw["coords"])

    return {
        "title": raw["title"],
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
        "era": era_match["era"],
        "era_id": era_match["era_id"],
        "caption": raw.get("caption", ""),
        "wiki_url": raw.get("wiki_url", "") 
    }

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

def batch_generate_events():
    ideas = load_event_ideas()

    for idea in ideas:
        try:
            event = generate_event_metadata(idea, eras_df)
            save_event_locally(event)
            print(f"✅ Success: {event['title']}")
        except Exception as e:
            print(f"❌ Error processing {idea}: {str(e)}")

# --- Entry Point ---
if __name__ == "__main__":
    batch_generate_events()