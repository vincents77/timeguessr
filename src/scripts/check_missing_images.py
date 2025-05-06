import json
import os

# Paths
EVENTS_PATH = "src/data/events.json"  # or "public/data/events.json"
IMAGES_DIR = "public/images"

# Load events
with open(EVENTS_PATH, "r", encoding="utf-8") as f:
    events = json.load(f)

# Check for missing images
missing = []
for e in events:
    slug = e.get("slug")
    if slug:
        expected_path = os.path.join(IMAGES_DIR, f"{slug}.jpg")
        if not os.path.exists(expected_path):
            missing.append({
                "slug": slug,
                "title": e.get("title"),
                "year": e.get("year"),
                "theme": e.get("theme"),
                "region": e.get("region")
            })

# Report
print(f"\n🖼️ {len(missing)} events missing images:")
for m in missing:
    print(f" - {m['slug']} ({m['year']})")

# Optionally export to CSV
if missing:
    import pandas as pd
    pd.DataFrame(missing).to_csv("src/scripts/missing_images_report.csv", index=False)
    print("\n📄 CSV report saved to src/scripts/missing_images_report.csv")