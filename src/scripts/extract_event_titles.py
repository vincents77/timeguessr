from pathlib import Path
import json
import csv

# Load the events data
with open("public/data/events.json", "r", encoding="utf-8") as f:
    events = json.load(f)

# Define the fields to extract
fields = ["title", "year", "theme", "broad_era", "region", "country", "city", "notable_location"]

# Write to CSV inside src/scripts
output_path = Path("src/scripts/event_titles.csv")
output_path.parent.mkdir(parents=True, exist_ok=True)

with output_path.open("w", newline="", encoding="utf-8") as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=fields)
    writer.writeheader()
    for event in events:
        row = {field: event.get(field, "") for field in fields}
        writer.writerow(row)

print(f"✅ Extracted {len(events)} events to {output_path}")