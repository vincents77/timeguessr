# server.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from src.moderation.generate_ideas import generate_ideas_with_filters
from pathlib import Path
import json
from datetime import datetime
import shutil
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from fastapi import Query

project_root = Path(__file__).resolve().parent
app = FastAPI()

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("❌ Missing Supabase credentials in environment variables")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# ✅ CORRECT CORS placement — directly after app initialization
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IdeaRequest(BaseModel):
    filters: dict
    count: int

@app.post("/api/generate-ideas")
def generate_ideas(request: IdeaRequest):
    try:
        return generate_ideas_with_filters(request.filters, request.count)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
    
@app.post("/api/save-accepted-ideas")
def save_accepted_ideas(ideas: List[str]):
    output_path = Path(__file__).resolve().parent / "src/moderation/pending_event_ideas.json"
    # ✅ Save the accepted ideas
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(ideas, f, indent=2, ensure_ascii=False)

    # ✅ Archive it with a timestamp
    archive_dir = project_root / "src/moderation/archive"
    archive_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    archive_path = archive_dir / f"pending_event_ideas_{timestamp}.json"
    shutil.copy(output_path, archive_path)

    print(f"✅ Saved to {output_path}")
    print(f"✅ Archived to {archive_path}")

    return {"status": "✅ Ideas saved and archived"}

@app.get("/api/player-summary")
def get_player_summary(player_name: str = Query(...)):
    try:
        # Fetch all completed sessions for the player
        sessions_resp = supabase.from_("sessions").select("*").eq("player_name", player_name).eq("completed", True).execute()
        sessions = sessions_resp.data if sessions_resp.data else []

        session_ids = [s["id"] for s in sessions]
        total_events = sum(s.get("total_events", 0) for s in sessions)
        total_points = sum(s.get("total_points", 0) for s in sessions)
        avg_score = round(total_points / total_events, 2) if total_events else 0
        best_score = max((s.get("total_points", 0) for s in sessions), default=0)

        # Fetch all related results
        results_resp = supabase.from_("results").select("*").in_("session_id", session_ids).execute()
        results = results_resp.data if results_resp.data else []

        total_time = sum(r.get("time_to_guess", 0) or 0 for r in results)
        avg_time = round(total_time / len(results), 2) if results else 0

        return {
            "player_name": player_name,
            "total_games": len(sessions),
            "total_events": total_events,
            "average_score": avg_score,
            "best_score": best_score,
            "total_play_time": total_time,
            "average_time_per_guess": avg_time
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}