import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import openai
from src.data.curriculum_profiles import CURRICULUM_PROFILES
import re
from collections import defaultdict

# Set up root path and environment
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(project_root))
load_dotenv(dotenv_path=project_root / ".env")

openai.api_key = os.getenv("VITE_OPENAI_API_KEY")
if not openai.api_key:
    raise ValueError("❌ Missing OpenAI API Key.")

MODEL = "gpt-4o"

INPUT_PATH = "public/data/events.json"
OUTPUT_PATH = "public/data/events_with_curriculum.json"

def load_events(path=INPUT_PATH):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_events(events, path=OUTPUT_PATH):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(events, f, indent=2, ensure_ascii=False)

def format_curriculum_profiles_for_prompt():
    return "\n".join([
        f"- {p['curriculum_tag']}: {p['objective']} (Themes: {p['theme_ids']}, Levels: {p['levels']})"
        for p in CURRICULUM_PROFILES
    ])

def build_prompt(event, formatted_profiles):
    return f"""You are an expert in historical education and curriculum alignment.

Here is a historical event:
Title: {event.get('title')}
Summary: {event.get('description')}
Region: {event.get('region')}
Broad Era: {event.get('broad_era')}
Theme: {event.get('theme')}

Based on the following curriculum profiles, identify which ones this event qualifies for. Only return strong matches.

Curriculum Profiles:
{formatted_profiles}

Please respond with a JSON list of matching profiles. For each, include:
- curriculum_tag
- theme_ids
- levels
- objective
- language (e.g. "en")
- mode (always "curriculum")

Respond only with a valid JSON list. If none match, return an empty list.
"""


def get_curriculum_matches(event):
    formatted_profiles = format_curriculum_profiles_for_prompt()
    prompt = build_prompt(event, formatted_profiles)

    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    content = response.choices[0].message.content.strip()

    # Debug print
    print(f"\n🧠 GPT raw output for event '{event.get('slug', 'unknown')}':\n{content}\n")

    # Remove markdown wrapping like ```json ... ```
    cleaned = re.sub(r"^```(?:json)?\s*", "", content)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, list):
            return parsed
        else:
            print(f"[Warning] GPT returned non-list for event: {event.get('slug')}")
            return []
    except json.JSONDecodeError as e:
        print(f"[Warning] Failed to parse GPT response for event: {event.get('slug')} — {e}")
        return []

def append_curriculum_metadata(event, matches):
    if not matches:
        return event

    tag_level_map = defaultdict(set)
    tag_theme_map = defaultdict(set)

    for match in matches:
        tag = match["curriculum_tag"]
        tag_level_map[tag].update(match.get("levels", []))
        tag_theme_map[tag].update(match.get("theme_ids", []))

    # Build curricula array
    event["curricula"] = []
    for tag in tag_theme_map.keys():
        event["curricula"].append({
            "tag": tag,
            "levels": sorted(tag_level_map.get(tag, [])),
            "theme_ids": sorted(tag_theme_map[tag])
        })

    # Clean up any legacy fields if they exist
    for field in ["curriculum_tags", "levels", "curriculum_theme_ids", "objective", "language", "mode"]:
        event.pop(field, None)

    return event

def main():
    events = load_events()
    updated = []

    for event in events:
        print(f"🔍 Processing: {event.get('slug')}")
        matches = get_curriculum_matches(event)
        updated_event = append_curriculum_metadata(event, matches)
        updated.append(updated_event)

    save_events(updated)
    print(f"✅ Saved {len(updated)} events to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()