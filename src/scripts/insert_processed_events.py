# src/scripts/insert_processed_events.py

import os
import json
import subprocess
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# --- Setup
project_root = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=project_root / ".env")

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("❌ Missing Supabase URL or Service Role Key.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# --- Paths
PROCESSED_EVENTS_PATH = project_root / "src/data/processed_events.json"
ARCHIVED_EVENTS_PATH = project_root / "src/data/archived_events.json"
ERROR_LOG_PATH = project_root / "src/data/error_log.json"
FRONTEND_EVENTS_PATH = project_root / "public/data/events.json"

# --- Helper functions

def load_json(file_path):
    if file_path.exists():
        with open(file_path, "r") as f:
            return json.load(f)
    return []

def save_json(data, file_path):
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, "w") as f:
        json.dump(data, f, indent=2)

def normalize_coords_field(event):
    """
    Ensures the 'coords' field is always a valid JSON array [lat, lon].
    """
    try:
        coords_raw = event.get("coords")
        if isinstance(coords_raw, str):
            # Handle both JSON string or comma-separated values
            if coords_raw.strip().startswith("["):
                coords = json.loads(coords_raw)
            else:
                lat_str, lng_str = coords_raw.split(",")
                coords = [float(lat_str.strip()), float(lng_str.strip())]
        else:
            coords = coords_raw
        event["coords"] = json.dumps([float(coords[0]), float(coords[1])])
    except Exception as e:
        print(f"⚠️ Warning: Invalid coords for event '{event.get('title', 'Unknown')}': {e}")
        event["coords"] = json.dumps([0.0, 0.0])
    return event

def insert_event(event):

    # ✅ Ensure curriculum fields are of the correct type
    if "curriculum_tags" in event:
        if not isinstance(event["curriculum_tags"], list):
            event["curriculum_tags"] = []
    
    if "curriculum_theme_ids" in event:
        if not isinstance(event["curriculum_theme_ids"], list):
            event["curriculum_theme_ids"] = []
        # Ensure it's JSON-serializable (for jsonb field)
        event["curriculum_theme_ids"] = json.dumps(event["curriculum_theme_ids"])

    if "levels" in event:
        if not isinstance(event["levels"], list):
            event["levels"] = []
        event["levels"] = json.dumps(event["levels"])

    if "created_at" in event and event["created_at"] is None:
        del event["created_at"]

    # ⬇️ Use UPSERT to update existing rows based on 'slug'
    response = supabase.table("events").upsert(event, on_conflict="slug").execute()

    if not response.data:
        raise Exception(f"❌ Supabase upsert failed or no data returned.")

    print(f"✅ Upserted: {event['title']}")

def archive_events(events):
    archived = load_json(ARCHIVED_EVENTS_PATH)
    archived.extend(events)
    save_json(archived, ARCHIVED_EVENTS_PATH)

def log_errors(errors):
    if errors:
        save_json(errors, ERROR_LOG_PATH)
        print(f"⚠️ Logged {len(errors)} errors in error_log.json.")

def fetch_all_events_and_save():
    print("🔄 Fetching all events from Supabase...")
    response = supabase.table("events").select("*").execute()

    if not response.data:
        raise Exception("❌ No events fetched from Supabase!")

    # Normalize coords for frontend
    events = response.data
    for event in events:
        try:
            if isinstance(event.get("coords"), str):
                coords = json.loads(event["coords"])
                event["coords"] = [float(coords[0]), float(coords[1])]
        except Exception as e:
            print(f"⚠️ Warning: Bad coords for event {event.get('title', 'Unknown')} - {e}")
            event["coords"] = [0.0, 0.0]

    save_json(events, FRONTEND_EVENTS_PATH)
    print(f"✅ Saved {len(events)} events to {FRONTEND_EVENTS_PATH}")

# --- Main process

def main():
    events = load_json(PROCESSED_EVENTS_PATH)

    if not events:
        print("⚠️ No events found in processed_events.json.")
        return

    print(f"🚀 Attempting to insert {len(events)} events...")

    successful = []
    failed = []

    for event in events:
        try:
            clean_event = normalize_coords_field(event)
            insert_event(clean_event)
            successful.append(clean_event)
        except Exception as e:
            print(f"❌ Error inserting {event.get('title', 'Unknown')}: {e}")
            failed.append(event)

    # Archive successes
    if successful:
        archive_events(successful)

    # Save back only failed events
    # save_json(failed, PROCESSED_EVENTS_PATH)

    # Log errors if any
    log_errors(failed)

    print(f"🎯 Process finished: {len(successful)} succeeded, {len(failed)} failed.")
    print(f"📘 Curriculum tags: {event.get('curriculum_tags')}")


# --- Entry point
if __name__ == "__main__":
    main()