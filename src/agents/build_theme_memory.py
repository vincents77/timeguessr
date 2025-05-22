# src/agents/build_theme_memory.py

from pathlib import Path
import json

# Step 1: Locate events.json
events_path = Path("public/data/events.json")
if not events_path.exists():
    print(f"❌ File not found: {events_path}")
    exit(1)

# Step 2: Load events
try:
    with open(events_path, "r", encoding="utf-8") as f:
        all_events = json.load(f)
    print(f"📦 Loaded {len(all_events)} events.")
except Exception as e:
    print(f"❌ Failed to load events: {e}")
    exit(1)

# Step 3: Group by theme and era
grouped_memory = {}

for event in all_events:
    theme = event.get("theme", "unknown").strip().lower()
    broad_era = event.get("broad_era", "unknown").strip().lower()
    key = f"{theme} | {broad_era}"

    if key not in grouped_memory:
        grouped_memory[key] = []

    grouped_memory[key].append({
        "title": event["title"],
        "year": event.get("year"),
        "description": event.get("caption") or event.get("description", ""),
        "slug": event.get("slug"),
    })

# Step 4: Save grouped memory
memory_path = Path("src/agents/memory/theme_memory.json")
memory_path.parent.mkdir(parents=True, exist_ok=True)

try:
    with open(memory_path, "w", encoding="utf-8") as f:
        json.dump(grouped_memory, f, indent=2, ensure_ascii=False)
    print(f"✅ Memory written to {memory_path} with {len(grouped_memory)} groups.")
except Exception as e:
    print(f"❌ Failed to save memory file: {e}")