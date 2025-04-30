import json
import re
import openai
from pathlib import Path
from dotenv import load_dotenv
import os

# Load environment variables (assumes you have a .env in root)
load_dotenv()
openai.api_key = os.getenv("VITE_OPENAI_API_KEY")

if not openai.api_key:
    raise ValueError("❌ Missing OpenAI API Key")

# Load events
input_path = Path("src/data/events.json")
with open(input_path, "r") as f:
    events = json.load(f)

print(f"📦 Loaded {len(events)} events")

# Filter events missing fields
incomplete_events = [e for e in events if "caption" not in e or "wiki_url" not in e]
print(f"🕵️ Events missing metadata: {len(incomplete_events)}")

# GPT prompt for backfilling caption + wiki_url
def build_prompt(event):
    return f"""
You are enriching metadata for a historical event titled: "{event['title']}", which occurred in {event['year']} in {event.get('country', '')}.

Provide a JSON object with:
- "caption": a short but insightful 1-2 sentence summary that adds new context or clues for this event — ideally a detail not obvious from just the title.
- "wiki_url": the most relevant Wikipedia article URL (English version) for this specific event.

Output strictly in JSON format.
"""

# Call OpenAI and sanitize output
def call_gpt_backfill(event):
    prompt = build_prompt(event)
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    content = response.choices[0].message.content.strip()
    content = re.sub(r'^```(?:json)?\n(.+?)\n```$', r'\1', content, flags=re.DOTALL)

    try:
        data = json.loads(content)
        return data
    except json.JSONDecodeError as e:
        print(f"⚠️ GPT JSON error for '{event['title']}': {e}")
        print(content)
        return None

# Apply to each missing event
updated = 0
for e in events:
    if "caption" not in e or "wiki_url" not in e:
        print(f"🔄 Backfilling: {e['title']}")
        result = call_gpt_backfill(e)
        if result:
            e["caption"] = result.get("caption", "")
            e["wiki_url"] = result.get("wiki_url", "")
            updated += 1

# Save updated file
output_path = Path("src/data/events.backfilled.json")
with open(output_path, "w") as f:
    json.dump(events, f, indent=2)

print(f"✅ Backfilled {updated} events → saved to {output_path}")