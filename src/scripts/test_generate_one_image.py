# src/test/test_generate_one_image.py

import json
from pathlib import Path
from src.scripts.generate_images_for_pending import generate_timeguessr_image

# Load the first event from pending_events.json
pending_path = Path("src/data/pending_events.json")

if not pending_path.exists():
    print("❌ No pending_events.json found.")
    exit(1)

with open(pending_path, "r", encoding="utf-8") as f:
    events = json.load(f)

if not events:
    print("❌ No events found in pending_events.json.")
    exit(1)

event = events[0]
print(f"🎯 Generating image for: {event['title']}")

try:
    generate_timeguessr_image(event["prompt"], event["slug"])
    print(f"✅ Image generated successfully for: {event['slug']}")
except Exception as e:
    print(f"❌ Error generating image: {e}")