import json
import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
import hashlib

# Load .env
project_root = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=project_root / ".env")

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
TABLE_NAME = os.getenv("SUPABASE_EVENTS_TABLE", "events")  # 👈 supports staging override

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Missing Supabase credentials in .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Files
INPUT_PATH = "public/data/events_with_curriculum_final.json"

def hash_curricula(curricula):
    """Returns a stable hash for comparison"""
    return hashlib.sha256(json.dumps(curricula, sort_keys=True).encode("utf-8")).hexdigest()

def main():
    # Load local enriched events
    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        local_events = {e["slug"]: e for e in json.load(f)}

    # Fetch remote events from Supabase
    print(f"🔄 Fetching events from Supabase table: `{TABLE_NAME}` ...")
    response = supabase.table(TABLE_NAME).select("slug,curricula").execute()
    remote_events = {e["slug"]: e for e in response.data}

    updated, skipped, missing = 0, 0, 0

    for slug, local_event in local_events.items():
        local_curricula = local_event.get("curricula", [])
        remote = remote_events.get(slug)

        if not remote:
            print(f"⚠️ Missing in Supabase: {slug}")
            missing += 1
            continue

        remote_curricula = remote.get("curricula", [])
        if hash_curricula(remote_curricula) != hash_curricula(local_curricula):
            # Update
            supabase.table(TABLE_NAME).update({
                "curricula": local_curricula,
                "mode": "curriculum"
            }).eq("slug", slug).execute()
            print(f"✅ Updated: {slug}")
            updated += 1
        else:
            skipped += 1

    print(f"\n📊 Sync Summary ({TABLE_NAME}):")
    print(f"✅ {updated} updated")
    print(f"⏭️ {skipped} skipped (no change)")
    print(f"⚠️ {missing} missing in Supabase")

if __name__ == "__main__":
    main()