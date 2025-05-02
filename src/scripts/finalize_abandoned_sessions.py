# src/scripts/finalize_abandoned_sessions.py
import os
import json
from datetime import datetime, timezone
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

# --- Logic

def summarize_session_results(session_id):
    print(f"🔎 Checking session_id: {session_id} ({type(session_id)})")
    response = supabase.table("results").select("slug, score").in_("session_id", [session_id]).execute()
    print(f"📥 Supabase response: data={response.data} count={getattr(response, 'count', None)}")

    entries = response.data
    if not entries:
        return None  # No results, treat as an abandoned session

    best_scores = {}
    for entry in entries:
        slug = entry.get("slug")
        score = max(entry.get("score") or 0, 0)
        if slug not in best_scores or score > best_scores[slug]:
            best_scores[slug] = score

    total_events = len(best_scores)
    total_points = sum(best_scores.values())
    average_score = total_points / total_events if total_events else 0

    return {
        "total_events": total_events,
        "total_points": round(total_points),
        "average_score": round(average_score),
        "completed": True,
    }

def finalize_abandoned_sessions():
    print("🔍 Fetching open-ended sessions...")
    response = supabase.table("sessions").select("id").is_("ended_at", None).execute()
    session_ids = [s["id"] for s in response.data or []]
    print(f"📦 Found {len(session_ids)} candidate sessions")

    finalized = 0
    for sid in session_ids:
        summary = summarize_session_results(sid)
        if summary:
            update_data = {
                "ended_at": datetime.now(timezone.utc).isoformat(),
                **summary,
            }
            result = supabase.table("sessions").update(update_data).eq("id", sid).execute()
            if result.data:
                finalized += 1

    print(f"✅ Finalized {finalized} sessions with results.")

if __name__ == "__main__":
    finalize_abandoned_sessions()
