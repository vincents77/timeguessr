# server.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Union, Literal
from src.moderation.generate_ideas import generate_ideas_with_filters, generate_ideas_from_curriculum
from pathlib import Path
import json
from datetime import datetime
import shutil
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from fastapi import Query
from collections import defaultdict
from src.data.curriculum_profiles import curriculum_profiles
import traceback

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

class FiltersPayload(BaseModel):
    mode: Literal["filters"]
    filters: dict
    count: int

class CurriculumPayload(BaseModel):
    mode: Literal["curriculum"]
    curriculum_country: str
    curriculum_level: str
    count: int

# This allows both str and dict-based entries in accepted ideas
AcceptedIdea = Union[str, dict]

@app.post("/api/generate-ideas")
def generate_ideas(request: Union[FiltersPayload, CurriculumPayload]):
    try:
        if request.mode == "filters":
            return generate_ideas_with_filters(request.filters, count=request.count)
        elif request.mode == "curriculum":
            return generate_ideas_from_curriculum(
                country=request.curriculum_country,
                curriculum_key_fragment=request.curriculum_level,  # ✅ Renamed param
                count=request.count
            )
        return []
    except Exception as e:
        import traceback
        traceback.print_exc()
        return [{"error": str(e)}]
    
@app.post("/api/save-accepted-ideas")
def save_accepted_ideas(ideas: List[dict]):
    from src.agents.deduplication_agent import get_broad_era_label, infer_theme_from_text

    # 🔁 Enrich accepted ideas
    enriched = []
    for idea in ideas:
        # Year → broad era
        if "broad_era" not in idea and "year" in idea:
            idea["broad_era"] = get_broad_era_label(idea["year"])

        # Theme inference (if missing)
        if "theme" not in idea or not idea["theme"]:
            combined = (idea.get("title", "") + " " + idea.get("description", "")).lower()
            idea["theme"] = infer_theme_from_text(combined)

        enriched.append(idea)
    output_path = project_root / "src/moderation/pending_event_ideas.json"

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(ideas, f, indent=2, ensure_ascii=False)

    archive_dir = project_root / "src/moderation/archive"
    archive_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    archive_path = archive_dir / f"pending_event_ideas_{timestamp}.json"
    shutil.copy(output_path, archive_path)

    print(f"✅ Saved to {output_path}")
    print(f"🗂️ Archived to {archive_path}")
    return {"status": "✅ Ideas saved and archived"}

@app.get("/api/player-summary")
def get_player_summary(player_name: str = Query(...)):
    try:
        sessions_resp = supabase.from_("sessions").select("*").eq("player_name", player_name).eq("completed", True).execute()
        sessions = sessions_resp.data if sessions_resp.data else []

        session_ids = [s["id"] for s in sessions]
        total_events = sum(s.get("total_events", 0) for s in sessions)
        total_points = sum(s.get("total_points", 0) for s in sessions)
        avg_score = round(total_points / total_events) if total_events else 0  # ⬅️ Integer
        best_score = max((s.get("total_points", 0) for s in sessions), default=0)

        results_resp = supabase.from_("results").select("*").in_("session_id", session_ids).execute()
        results = results_resp.data if results_resp.data else []

        total_time = sum(r.get("time_to_guess", 0) or 0 for r in results)
        avg_time = round(total_time / len(results), 1) if results else 0  # ⬅️ 1 decimal

        perfect_guesses = [
            r for r in results
            if r["distance"] is not None and r["year_diff"] is not None
            and r["distance"] <= 10 and abs(r["year_diff"]) <= 5
        ]
        perfect_guess_rate = round(len(perfect_guesses) / len(results) * 100, 1) if results else 0

        avg_distance = round(sum((r.get("distance") or 0) for r in results) / len(results), 1) if results else 0
        avg_year_diff = round(sum(abs(r.get("year_diff") or 0) for r in results) / len(results), 1) if results else 0

        unique_events = set(r["slug"] for r in results if r["slug"])
        average_attempts = round(len(results) / len(unique_events), 2) if unique_events else 0

        # ✅ Add recent_scores: last 10 scores from most recent completed sessions
        recent_scores = [
            round(s["total_points"] / s["total_events"])
            for s in sessions
            if s.get("total_points") and s.get("total_events")
        ][:10]

        return {
            "player_name": player_name,
            "total_games": len(sessions),
            "total_events": total_events,
            "average_score": avg_score,
            "best_score": best_score,
            "total_play_time": total_time,
            "average_time_per_guess": avg_time,
            "perfect_guess_rate": perfect_guess_rate,
            "average_distance": avg_distance,
            "average_year_diff": avg_year_diff,
            "average_attempts": average_attempts,
            "recent_scores": recent_scores  # 👈 Added
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
    
@app.get("/api/player-performance-comparison")
def get_player_performance_comparison(player_name: str = Query(...)):
    try:
        # Fetch player sessions
        player_sessions_resp = supabase.from_("sessions").select("id, total_points, total_events").eq("player_name", player_name).eq("completed", True).execute()
        player_sessions = player_sessions_resp.data if player_sessions_resp.data else []

        total_points = sum(s["total_points"] for s in player_sessions if s["total_points"] is not None)
        total_events = sum(s["total_events"] for s in player_sessions if s["total_events"])
        avg_player_score = round(total_points / total_events) if total_events else 0
        best_player_score = max((s["total_points"] for s in player_sessions if s["total_points"] is not None), default=0)

        player_session_ids = [s["id"] for s in player_sessions]
        player_results_resp = supabase.from_("results").select("*").in_("session_id", player_session_ids).execute()
        player_results = player_results_resp.data if player_results_resp.data else []

        player_distances = [r["distance"] for r in player_results if r["distance"] is not None]
        player_year_diffs = [abs(r["year_diff"]) for r in player_results if r["year_diff"] is not None]
        player_times = [r["time_to_guess"] for r in player_results if r["time_to_guess"] is not None]
        player_perfect_guesses = [
            r for r in player_results
            if r["distance"] is not None and r["year_diff"] is not None
            and r["distance"] <= 10 and abs(r["year_diff"]) <= 5
        ]
        slug_attempts = {}
        for r in player_results:
            slug = r.get("slug")
            if slug:
                slug_attempts.setdefault(slug, []).append(r)
        player_attempts = [len(v) for v in slug_attempts.values()]
        player_avg_attempts = round(sum(player_attempts) / len(player_attempts), 2) if player_attempts else 0

        # Fetch all sessions
        all_sessions_resp = supabase.from_("sessions").select("id, player_name, total_points, total_events").eq("completed", True).execute()
        all_sessions = all_sessions_resp.data if all_sessions_resp.data else []

        # Map: player_name -> list of average scores
        player_event_averages = {}
        for s in all_sessions:
            name = s["player_name"]
            if s["total_points"] is not None and s["total_events"]:
                avg = s["total_points"] / s["total_events"]
                player_event_averages.setdefault(name, []).append(avg)

        avg_scores_per_player = [
            (name, sum(scores) / len(scores))
            for name, scores in player_event_averages.items()
        ]
        avg_scores_per_player.sort(key=lambda x: x[1], reverse=True)

        def compute_benchmark(percentile):
            top_count = max(int(len(avg_scores_per_player) * (percentile / 100.0)), 1)
            selected_players = [name for name, _ in avg_scores_per_player[:top_count]]
            selected_sessions = [s for s in all_sessions if s["player_name"] in selected_players]

            if not selected_sessions:
                return None

            session_ids = [s["id"] for s in selected_sessions]
            results_resp = supabase.from_("results").select("*").in_("session_id", session_ids).execute()
            results = results_resp.data if results_resp.data else []

            distances = [r["distance"] for r in results if r["distance"] is not None]
            year_diffs = [abs(r["year_diff"]) for r in results if r["year_diff"] is not None]
            time_guesses = [r["time_to_guess"] for r in results if r["time_to_guess"] is not None]
            perfect_guesses = [
                r for r in results
                if r["distance"] is not None and r["year_diff"] is not None
                and r["distance"] <= 10 and abs(r["year_diff"]) <= 5
            ]
            slug_attempts = {}
            for r in results:
                slug = r.get("slug")
                if slug:
                    slug_attempts.setdefault(slug, []).append(r)
            attempts_per_slug = [len(v) for v in slug_attempts.values()]
            average_attempts = round(sum(attempts_per_slug) / len(attempts_per_slug), 2) if attempts_per_slug else 0

            total_points = sum(s["total_points"] for s in selected_sessions if s["total_points"] is not None)
            total_events = sum(s["total_events"] for s in selected_sessions if s["total_events"])
            return {
                "average_score": round(total_points / total_events) if total_events else 0,
                "best_score": max((s["total_points"] for s in selected_sessions if s["total_points"] is not None), default=0),
                "perfect_guess_pct": round(len(perfect_guesses) / len(results) * 100, 1) if results else 0,
                "average_distance": round(sum(distances) / len(distances), 1) if distances else None,
                "average_year_diff": round(sum(year_diffs) / len(year_diffs), 1) if year_diffs else None,
                "average_time_per_guess": round(sum(time_guesses) / len(time_guesses), 1) if time_guesses else None,
                "average_attempts": average_attempts
            }

        return {
            "player_name": player_name,
            "average_score": avg_player_score,
            "best_score": best_player_score,
            "perfect_guess_pct": round(len(player_perfect_guesses) / len(player_results) * 100, 1) if player_results else 0,
            "average_distance": round(sum(player_distances) / len(player_distances), 1) if player_distances else None,
            "average_year_diff": round(sum(player_year_diffs) / len(player_year_diffs), 1) if player_year_diffs else None,
            "average_time_per_guess": round(sum(player_times) / len(player_times), 1) if player_times else None,
            "average_attempts": player_avg_attempts,
            "top_10_percent": compute_benchmark(10),
            "top_25_percent": compute_benchmark(25),
            "average": compute_benchmark(100),
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
    
@app.get("/api/player-dimension-performance")
def get_player_dimension_performance(player_name: str = Query(...)):
    try:
        # Step 1: Get all results for the player, including slug
        results_resp = supabase.from_("results").select("slug, score, distance, year_diff").eq("player_name", player_name).execute()
        results = results_resp.data or []

        if not results:
            return {
                "player_name": player_name,
                "performance_matrix": []
            }

        # Step 2: Extract all slugs and fetch corresponding event metadata
        slugs = list(set(r["slug"] for r in results if r.get("slug")))
        events_resp = supabase.from_("events").select("slug, theme, broad_era, region").in_("slug", slugs).execute()
        events = events_resp.data or []
        event_meta_map = {e["slug"]: e for e in events}

        # Step 3: Group results by (theme, broad_era, region)
        pivot = defaultdict(list)

        for r in results:
            meta = event_meta_map.get(r["slug"])
            if not meta:
                continue  # skip if event metadata is missing
            key = (
                meta.get("theme"),
                meta.get("broad_era"),
                meta.get("region")
            )
            pivot[key].append(r)

        # Step 4: Aggregate stats per group
        performance_matrix = []
        for (theme, era, region), group in pivot.items():
            scores = [r["score"] for r in group if r.get("score") is not None]
            distances = [r["distance"] for r in group if r.get("distance") is not None]
            year_diffs = [abs(r["year_diff"]) for r in group if r.get("year_diff") is not None]

            if not scores:
                continue

            performance_matrix.append({
                "theme": theme,
                "broad_era": era,
                "region": region,
                "avg_score": round(sum(scores) / len(scores), 1),
                "avg_distance": round(sum(distances) / len(distances), 1) if distances else None,
                "avg_year_diff": round(sum(year_diffs) / len(year_diffs), 1) if year_diffs else None
            })

        return {
            "player_name": player_name,
            "performance_matrix": performance_matrix
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
    
@app.get("/api/curriculum-profiles")
def get_curriculum_profiles():
    result = {}
    for full_key in curriculum_profiles.keys():
        if "_" not in full_key:
            continue
        country, level = full_key.split("_", 1)
        country = country.lower()
        level = level.lower()
        if level not in result.setdefault(country, []):
            result[country].append(level)
    return result