# src/scripts/fetch_all_events.py

import os
import csv
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
EVENTS_CSV_PATH = Path("src/data/events_rows.csv")
EVENTS_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)

# --- Main logic

def fetch_all_events():
    response = supabase.table("events").select("*").execute()
    if not response.data:
        raise Exception("❌ Failed to fetch events from Supabase.")
    return response.data

def save_events_to_csv(events):
    if not events:
        print("⚠️ No events to write.")
        return

    fields = list(events[0].keys())
    with open(EVENTS_CSV_PATH, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fields)
        writer.writeheader()
        writer.writerows(events)
    print(f"✅ Saved {len(events)} events to {EVENTS_CSV_PATH}")

# --- Entry point

def main():
    print("🔄 Fetching all events from Supabase...")
    events = fetch_all_events()
    save_events_to_csv(events)
    print("🎯 Done!")

if __name__ == "__main__":
    main()