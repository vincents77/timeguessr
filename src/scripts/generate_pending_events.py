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
        "The founding of the Red Cross by Henri Dunant (1863)",
        "The building of the first transcontinental railroad in the United States (1869)",
        "The eruption of Krakatoa (1883)",
        "The meeting of Roosevelt, Churchill, and Stalin at the Yalta Conference (1945)",
        "The trial of Galileo Galilei before the Inquisition (1633)",
        "The coronation of Queen Elizabeth II in Westminster Abbey (1953)",
        "The partition of India and creation of Pakistan (1947)",
        "The first human heart transplant by Christiaan Barnard (1967)",
        "The liberation of Auschwitz by Soviet troops (1945)",
        "The abdication of Tsar Nicholas II and end of the Russian Empire (1917)",
        "The eruption of Eyjafjallajökull disrupting European air travel (2010)",
        "The 1986 Chernobyl nuclear disaster and initial evacuation",
        "The assassination of Archduke Franz Ferdinand in Sarajevo (1914)",
        "The first use of the telegraph to send a long-distance message (1844)",
        "The 1972 Nixon visit to China marking a shift in Cold War diplomacy",
        "The trial and execution of Louis XVI during the French Revolution (1793)",
        "The Berlin Airlift begins as a response to the Soviet blockade (1948)",
        "The sinking of the Lusitania by a German U-boat (1915)",
        "The proclamation of the German Empire in the Hall of Mirrors at Versailles (1871)",
        "The assassination of Yitzhak Rabin at a peace rally in Tel Aviv (1995)",
        "The Boxer Rebellion erupts in China against foreign influence (1900)",
        "The election of Nelson Mandela as President of South Africa (1994)",
        "The burning of the Reichstag in Berlin (1933)",
        "The abdication of Emperor Akihito, Japan’s first in two centuries (2019)",
        "The fall of Saigon and end of the Vietnam War (1975)",
        "The launch of Voyager 1 carrying the Golden Record (1977)",
        "The Great Fire of London devastates the city (1666)",
        "The death of Princess Diana and public mourning (1997)",
        "The 2015 Paris Agreement is signed at COP21 (2015)",
        "The 1968 student protests erupt in Paris (May 1968)",
        "The signing of the Camp David Accords between Egypt and Israel (1978)",
        "The 1973 oil crisis triggered by the Yom Kippur War"
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