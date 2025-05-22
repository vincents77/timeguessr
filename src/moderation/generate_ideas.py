# src/moderation/generate_ideas.py

import sys
from pathlib import Path
from dotenv import load_dotenv
import json
import os
import openai
import pandas as pd
import argparse
from openai import OpenAI
from datetime import datetime
import shutil
from src.data.curriculum_profiles import curriculum_profiles
from textwrap import dedent
from src.agents.deduplication_agent import run_batch_deduplication


# Setup paths and environment
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(project_root))
load_dotenv(dotenv_path=project_root / ".env")

# OpenAI client setup
client = OpenAI(api_key=os.getenv("VITE_OPENAI_API_KEY"))
MODEL = "gpt-4o"

INPUT_CSV = project_root / "src/scripts/event_titles.csv"
OUTPUT_JSON = project_root / "src/moderation/generated_ideas.json"
ARCHIVE_DIR = project_root / "src/moderation/archive"

def normalize_title(title: str) -> str:
    """Basic title normalization for deduplication."""
    return title.strip().lower().replace("’", "'").replace("“", "\"").replace("”", "\"")

# ========== FILTER-BASED MODE ==========
def generate_ideas_with_filters(filters: dict, count: int = 10):
    existing_titles = pd.read_csv(INPUT_CSV)["title"].dropna().tolist()

    scope_description = "\n".join([
        f"- Theme: {', '.join(filters['themes'])}" if filters.get("themes") else "",
        f"- Broad era: {', '.join(filters['broad_eras'])}" if filters.get("broad_eras") else "",
        f"- Region: {', '.join(filters['regions'])}" if filters.get("regions") else ""
    ]).strip() or "No constraints (any theme, era, or region)"

    prompt = f"""
You are helping design new AI-generated historical event challenges for a game.

Each event must be unique and **not redundant** with existing entries.

Only generate events that match ALL of the following criteria:
{scope_description}

Here are existing titles to avoid repeating:
{json.dumps(existing_titles[:200])}

Now propose {count} new plausible historical events (real, famous or niche), each formatted as a single string title.
Only return a raw JSON array like:
[
  "The Rise of the Khmer Empire in Southeast Asia",
  "The Building of the Panama Canal"
]
""".strip()

    print("🔍 Generating filter-based ideas with:", filters)

    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )

    try:
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[-2].strip()
        ideas = json.loads(raw)
    except Exception as e:
        print("❌ Error parsing OpenAI response:", e)
        raise ValueError("Failed to parse JSON response.") from e

    ideas_payload = [
        {"title": title, "mode": "filters", "source": "filtered_generation", "created_at": datetime.utcnow().isoformat()}
        for title in ideas
    ]
    save_ideas(ideas_payload)

    # Run deduplication for just-saved ideas
    if ideas_payload:
        print("🤖 Running deduplication agent...")
        run_batch_deduplication(ideas_payload, save_to_file=True)

    return ideas_payload


# ========== CURRICULUM-BASED MODE ==========
from openai import OpenAI
import json
from src.data.curriculum_profiles import curriculum_profiles

client = OpenAI(api_key=os.getenv("VITE_OPENAI_API_KEY"))

def generate_ideas_from_curriculum(country: str, curriculum_key_fragment: str, count: int = 10):
    try:
        key = f"{country.lower()}_{curriculum_key_fragment}"
        profile = curriculum_profiles.get(key)

        if not profile:
            raise ValueError(f"❌ No curriculum found for {key}")

        persona = profile.get("default_persona", "You are a history teacher.")
        label = profile.get("label", f"{country.upper()} {curriculum_key_fragment}")
        themes = profile.get("themes", [])
        language = profile.get("language", "en")

        print(f"📚 Generating ideas for curriculum: {label} ({key})")

        # Determine per-theme cap
        per_theme_count = max(1, count // len(themes)) if themes else 3

        # Load existing events
        events_path = project_root / "public/data/events.json"
        try:
            with open(events_path, "r", encoding="utf-8") as f:
                existing_events = json.load(f)
        except:
            existing_events = []

        title_map = {normalize_title(e["title"]): e for e in existing_events if "title" in e}
        updated_existing_events = False
        all_new_ideas = []

        for theme in themes:
            theme_id = theme["id"]
            theme_label = theme["label"]
            objective = theme["objective"]
            level = theme["level"]

            prompt = dedent(f"""
            {persona}
            You are preparing a history lesson for students in level {level} using the curriculum: "{label}".

            Theme: {theme_label}
            Objective: {objective}

            Generate up to {per_theme_count} historically significant events that:
            - Are real (no fictional events)
            - Are dateable (single integer year)
            - Match this theme and learning objective
            - Are useful in an educational game

            Return valid JSON like:
            [
              {{
                "title": "...",
                "year": ...,
                "description": "..."
              }},
              ...
            ]

            ⚠️ Do not include commentary or formatting. Output only the JSON array.
            """).strip()

            print(f"\n🎓 Generating for theme: {theme_label} [{level}]")

            try:
                response = client.chat.completions.create(
                    model=MODEL,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.6,
                )
                content = response.choices[0].message.content.strip()
                if content.startswith("```json"):
                    content = content[len("```json"):].strip()
                if content.endswith("```"):
                    content = content[:-3].strip()

                ideas = json.loads(content)
                if not isinstance(ideas, list):
                    raise ValueError("GPT returned unexpected format")

            except Exception as e:
                print(f"❌ Failed to parse or generate ideas for theme: {theme_label}")
                print("GPT raw response:\n", content)
                continue  # Move on to next theme

            for idea in ideas:
                norm_title = normalize_title(idea["title"])
                found = next(
                    (idea for idea in all_new_ideas
                    if normalize_title(idea["title"]) == norm_title and idea.get("year") == idea.get("year")),
                    None
                )

                if found:
                    if level not in found["levels"]:
                        found["levels"].append(level)
                    if theme_id not in found["curriculum_theme_ids"]:
                        found["curriculum_theme_ids"].append(theme_id)
                    if key not in found["curriculum_tags"]:
                        found["curriculum_tags"].append(key)
                else:
                    entry = {
                        "title": idea["title"],
                        "year": idea.get("year"),
                        "description": idea.get("description"),
                        "theme": theme_label,
                        "objective": objective,
                        "levels": [level],
                        "curriculum_theme_ids": [theme_id],
                        "curriculum_tags": [key],
                        "language": language,
                        "mode": "curriculum",
                        "source": "curriculum_generation",
                        "created_at": datetime.utcnow().isoformat()
                    }
                    all_new_ideas.append(entry)

        if all_new_ideas:
            save_ideas(all_new_ideas)
            print("🤖 Running deduplication agent...")
            run_batch_deduplication(all_new_ideas, save_to_file=True)

        if updated_existing_events:
            with open(events_path, "w", encoding="utf-8") as f:
                json.dump(existing_events, f, indent=2, ensure_ascii=False)
            print("✅ Updated events.json with new curriculum_tags.")

        return all_new_ideas

    except Exception as e:
        print("❌ Error during curriculum idea generation:", e)
        return []


# ========== SHARED SAVE LOGIC ==========
def save_ideas(new_ideas):
    try:
        with open(OUTPUT_JSON, "r", encoding="utf-8") as f:
            existing = json.load(f)
    except:
        existing = []

    all_ideas = existing + new_ideas

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(all_ideas, f, indent=2, ensure_ascii=False)

    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    archive_path = ARCHIVE_DIR / f"generated_ideas_{timestamp}.json"
    shutil.copy(OUTPUT_JSON, archive_path)

    print(f"✅ Saved {len(new_ideas)} ideas to {OUTPUT_JSON}")
    print(f"🗂️ Archived snapshot to {archive_path}")


# ========== CLI Entry Point ==========
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate new event ideas")

    parser.add_argument("--curriculum", action="store_true", help="Use curriculum-based generation")
    parser.add_argument("--country", type=str, default="fr")
    parser.add_argument("--curriculum_key_fragment", type=str, default="cycle_4")
    parser.add_argument("--count", type=int, default=10)

    parser.add_argument("--theme", nargs="*")
    parser.add_argument("--broad_era", nargs="*")
    parser.add_argument("--region", nargs="*")

    args = parser.parse_args()

    if args.curriculum:
        generate_ideas_from_curriculum(args.country, args.curriculum_key_fragment, count=args.count)
    else:
        filters = {
            "themes": args.theme or [],
            "broad_eras": args.broad_era or [],
            "regions": args.region or []
        }
        generate_ideas_with_filters(filters, count=args.count)