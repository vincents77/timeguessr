import json
import os
from pathlib import Path
from dotenv import load_dotenv
import openai
import re
from collections import defaultdict
from src.data.curriculum_profiles import CURRICULUM_PROFILES

# Paths
INPUT_PATH = "public/data/events_with_curriculum.json"
OUTPUT_PATH = "public/data/events_with_curriculum_final.json"

# Load API key
project_root = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=project_root / ".env")
openai.api_key = os.getenv("VITE_OPENAI_API_KEY")

MODEL = "gpt-4o"

def get_curriculum_matches(event):
    def format_profiles():
        return "\n".join([
            f"- {p['curriculum_tag']}: {p['objective']} (Themes: {p['theme_ids']}, Levels: {p['levels']})"
            for p in CURRICULUM_PROFILES
        ])

    def build_prompt():
        return f"""You are an expert in historical education and curriculum alignment.

Here is a historical event:
Title: {event.get('title')}
Summary: {event.get('description')}
Region: {event.get('region')}
Broad Era: {event.get('broad_era')}
Theme: {event.get('theme')}

Based on the following curriculum profiles, identify which ones this event qualifies for. Only return strong matches.

Curriculum Profiles:
{format_profiles()}

Please respond with a JSON list of matching profiles. For each, include:
- curriculum_tag
- theme_ids
- levels
- objective
- language (e.g. "en")
- mode (always "curriculum")

Respond only with a valid JSON list. If none match, return an empty list.
"""

    prompt = build_prompt()
    response = openai.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    content = response.choices[0].message.content.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", content)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, list) else []
    except json.JSONDecodeError:
        print(f"[Warning] Failed to parse GPT for {event.get('slug')}")
        return []

def append_curriculum_metadata(event, matches, verbose=True):
    if not matches:
        return event

    existing = {c["tag"]: c for c in event.get("curricula", [])}
    new_entries = 0
    merged_entries = 0
    skipped_entries = 0

    for match in matches:
        tag = match["curriculum_tag"]
        new_levels = set(match.get("levels", []))
        new_themes = set(match.get("theme_ids", []))

        if tag in existing:
            existing_levels = set(existing[tag].get("levels", []))
            existing_themes = set(existing[tag].get("theme_ids", []))

            combined_levels = existing_levels | new_levels
            combined_themes = existing_themes | new_themes

            if combined_levels != existing_levels or combined_themes != existing_themes:
                merged_entries += 1
                existing[tag]["levels"] = sorted(combined_levels)
                existing[tag]["theme_ids"] = sorted(combined_themes)
            else:
                skipped_entries += 1
        else:
            new_entries += 1
            existing[tag] = {
                "tag": tag,
                "levels": sorted(new_levels),
                "theme_ids": sorted(new_themes)
            }

    event["curricula"] = list(existing.values())

    for field in ["curriculum_tags", "levels", "curriculum_theme_ids", "objective", "language", "mode"]:
        event.pop(field, None)

    if verbose:
        slug = event.get("slug", "unknown")
        print(f"📘 [{slug}] → +{new_entries} new, ~{merged_entries} merged, ✓{skipped_entries} unchanged")

    return event

def main():
    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        events = json.load(f)

    updated = []
    for event in events:
        print(f"🔍 Processing: {event.get('slug')}")
        matches = get_curriculum_matches(event)
        updated.append(append_curriculum_metadata(event, matches, verbose=True))

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(updated, f, indent=2, ensure_ascii=False)

    print(f"✅ Finished. Saved {len(updated)} events to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()