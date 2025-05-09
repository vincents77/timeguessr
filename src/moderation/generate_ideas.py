# src/moderation/generate_ideas.py

import sys
from pathlib import Path

# ⬇️ Add the project root to Python's import path
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(project_root))

# ⬇️ Load environment variables from .env
from dotenv import load_dotenv
load_dotenv(dotenv_path=project_root / ".env")

import json
import os
import openai
import pandas as pd
import argparse
from openai import OpenAI
from datetime import datetime
import shutil


# ✅ Set OpenAI API key from .env
client = OpenAI(api_key=os.getenv("VITE_OPENAI_API_KEY"))

INPUT_CSV = project_root / "src/scripts/event_titles.csv"
OUTPUT_JSON = project_root / "src/moderation/generated_ideas.json"

def generate_ideas_with_filters(filters: dict, count: int = 10):
    existing_titles = pd.read_csv(INPUT_CSV)["title"].dropna().tolist()

    filter_text = []
    if filters.get("themes"):
        filter_text.append("themes: " + ", ".join(filters["themes"]))
    if filters.get("broad_eras"):
        filter_text.append("broad eras: " + ", ".join(filters["broad_eras"]))
    if filters.get("regions"):
        filter_text.append("regions: " + ", ".join(filters["regions"]))
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

    print("🔍 Generating ideas with filters:", filters)

    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )

    try:
        raw = response.choices[0].message.content
        print("🧾 Raw model response:\n", raw)

        if raw.startswith("```"):
            raw = raw.strip()
            if raw.startswith("```json"):
                raw = raw[len("```json"):].strip()
            elif raw.startswith("```"):
                raw = raw[len("```"):].strip()
            if raw.endswith("```"):
                raw = raw[:-3].strip()

        ideas = json.loads(raw)
    except Exception as e:
        print("❌ Exception during parsing:", e)
        raise ValueError("❌ Failed to parse OpenAI response as JSON list.") from e

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(ideas, f, indent=2, ensure_ascii=False)

    # Archive it with a timestamp
    archive_dir = project_root / "src/moderation/archive"
    archive_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    archive_path = archive_dir / f"generated_ideas_{timestamp}.json"
    shutil.copy(OUTPUT_JSON, archive_path)

    print(f"✅ Generated {len(ideas)} new event ideas and saved to {OUTPUT_JSON}")
    print(f"✅ Archived to {archive_path}")
    return ideas



# --- CLI Entry Point ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate new event ideas based on filters")
    parser.add_argument("--theme", nargs="*", help="One or more themes")
    parser.add_argument("--broad_era", nargs="*", help="One or more broad eras")
    parser.add_argument("--region", nargs="*", help="One or more regions")
    parser.add_argument("--count", type=int, default=10, help="Number of ideas to generate")
    args = parser.parse_args()

    filters = {
        "themes": args.theme or [],
        "broad_eras": args.broad_era or [],
        "regions": args.region or []
    }

    generate_ideas_with_filters(filters, count=args.count)