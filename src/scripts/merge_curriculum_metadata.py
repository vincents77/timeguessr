import json
from collections import defaultdict
from src.data.curriculum_profiles import curriculum_profiles as CURRICULUM_PROFILES

INPUT_PATH = "public/data/events_with_curriculum.json"
OUTPUT_PATH = "public/data/events_with_curriculum_merged.json"

def ensure_list(field):
    if isinstance(field, list):
        return field
    if isinstance(field, str):
        try:
            return json.loads(field)
        except json.JSONDecodeError:
            return []
    return []

def merge_curriculum_metadata(event):
    raw_tags = event.get("curriculum_tags", [])
    raw_levels = ensure_list(event.get("levels", []))
    raw_themes = ensure_list(event.get("curriculum_theme_ids", []))

    # Build mapping: tag -> { levels, theme_ids }
    tag_level_map = defaultdict(set)
    tag_theme_map = defaultdict(set)

    for tag in raw_tags:
        for level in raw_levels:
            if level in CURRICULUM_PROFILES.get(tag, {}).get("levels", []):
                tag_level_map[tag].add(level)
        for theme_id in raw_themes:
            if any(t["id"] == theme_id for t in CURRICULUM_PROFILES.get(tag, {}).get("themes", [])):
                tag_theme_map[tag].add(theme_id)

    # Build new field
    event["curricula"] = []
    for tag in raw_tags:
        event["curricula"].append({
            "tag": tag,
            "levels": sorted(tag_level_map.get(tag, [])),
            "theme_ids": sorted(tag_theme_map.get(tag, []))
        })

    # Clean old fields
    for field in ["curriculum_tags", "levels", "curriculum_theme_ids", "objective", "language", "mode"]:
        event.pop(field, None)

    return event

def main():
    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        events = json.load(f)

    updated_events = [merge_curriculum_metadata(e) for e in events]

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(updated_events, f, indent=2, ensure_ascii=False)

    print(f"✅ Merged and saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()