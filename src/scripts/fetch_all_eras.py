# src/scripts/fetch_all_eras.py

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
ERAS_CSV_PATH = Path("src/data/eras_rows.csv")
ERAS_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)

# --- Main logic

def fetch_all_eras():
    response = supabase.table("eras").select("*").execute()
    if not response.data:
        raise Exception("❌ Failed to fetch eras from Supabase.")
    return response.data

def save_eras_to_csv(eras):
    fields = ["id", "label", "region", "start", "end", "country", "duration", "created_at"]
    with open(ERAS_CSV_PATH, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fields)
        writer.writeheader()
        writer.writerows(eras)
    print(f"✅ Saved {len(eras)} eras to {ERAS_CSV_PATH}")

# --- Entry point

def main():
    print("🔄 Fetching all eras from Supabase...")
    eras = fetch_all_eras()
    save_eras_to_csv(eras)
    print("🎯 Done!")

if __name__ == "__main__":
    main()