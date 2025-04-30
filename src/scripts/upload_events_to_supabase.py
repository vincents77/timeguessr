import json
import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

print("🔧 Script started...")

# Load .env
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_API_KEY")


if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Missing Supabase credentials in .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# Test basic fetch
test = supabase.table("events").select("*").limit(1).execute()
print("🧪 Test fetch response:", test)

# Load the events data
events_path = Path("src/data/events.json")
with open(events_path, "r") as f:
    events = json.load(f)

# Insert or upsert each event (by slug)
inserted = 0
for event in events:
    slug = event.get("slug")
    if not slug:
        print("⚠️ Missing slug, skipping:", event.get("title"))
        continue

    # Upsert by slug to avoid duplicates
    response = supabase.table("events").upsert(event, on_conflict="slug").execute()

    print(f"📦 Response for {slug}: {response}")
    if hasattr(response, "error") and response.error:
        print(f"❌ Error inserting {slug}: {response.error}")
    else:
        inserted += 1

print(f"📄 Loaded {len(events)} events from file.")
print(f"✅ Uploaded {inserted} events to Supabase.")