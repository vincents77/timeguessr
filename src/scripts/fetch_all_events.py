# src/scripts/fetch_all_events.py
import os
import json
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# --- Setup
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent.parent / ".env")

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise ValueError("❌ Missing Supabase URL or Anon Key.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# --- Paths
PUBLIC_EVENTS_PATH = Path("public/data/events.json")
PUBLIC_EVENTS_PATH.parent.mkdir(parents=True, exist_ok=True)  # Ensure /public/data exists

# --- Helper functions

def normalize_coords(events):
    """
    Ensures coords field is parsed as [lat, lng] array, not a string.
    """
    for event in events:
        coords = event.get("coords")
        if isinstance(coords, str):
            try:
                event["coords"] = json.loads(coords)
            except json.JSONDecodeError:
                print(f"⚠️ Failed to parse coords for event: {event.get('title', 'Unknown')}")
                event["coords"] = [0.0, 0.0]
    return events

def fetch_all_events():
    response = supabase.table("events").select("*").execute()

    if not response.data:
        raise Exception("❌ Failed to fetch events from Supabase.")

    events = response.data
    events = normalize_coords(events)

    return events

def save_events_locally(events):
    with open(PUBLIC_EVENTS_PATH, "w") as f:
        json.dump(events, f, indent=2)
    print(f"✅ Saved {len(events)} events to {PUBLIC_EVENTS_PATH}")

# --- Main process

def main():
    print("🔄 Fetching all events from Supabase...")
    events = fetch_all_events()
    save_events_locally(events)
    print("🎯 Done!")

# --- Entry point
if __name__ == "__main__":
    main()