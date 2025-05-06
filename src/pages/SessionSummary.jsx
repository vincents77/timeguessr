import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";

export default function SessionSummary() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId, playerName, mode } = location.state || {};

  const [summary, setSummary] = useState(null);
  const [personalBest, setPersonalBest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId || !playerName) return;

    async function fetchSummary() {
      setLoading(true);

      const { data, error } = await supabase
        .from("results")
        .select("score, created_at")
        .eq("session_id", sessionId);

      if (error) {
        console.error("Error fetching session results:", error);
        setLoading(false);
        return;
      }

      const totalScore = data.reduce((sum, r) => sum + (r.score || 0), 0);
      const playedAt = data.length ? data[0].created_at : null;
      setSummary({ totalScore, playedAt });

      const { data: bestData } = await supabase
        .from("results")
        .select("score, session_id")
        .eq("player_name", playerName)
        .order("score", { ascending: false })
        .limit(1);

      if (bestData?.length && bestData[0].session_id === sessionId) {
        setPersonalBest(true);
      }

      setLoading(false);
    }

    fetchSummary();
  }, [sessionId, playerName]);

  if (loading) return <div className="p-6 text-center">Loading summary…</div>;
  if (!summary) return <div className="p-6 text-center">No summary found.</div>;

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6 text-center">
      <h1 className="text-3xl font-bold">🎉 Session Complete!</h1>

      {personalBest && (
        <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded shadow inline-block">
          🌟 New personal best for this mode!
        </div>
      )}

      <p className="text-lg text-gray-700">
        Total Score: <span className="font-semibold">{summary.totalScore} pts</span>
      </p>

      <div className="flex justify-center gap-4 mt-4 flex-wrap">
        <button
          onClick={() => navigate("/")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          🎮 Play Again
        </button>
        <button
          onClick={() => navigate("/scoreboard")}
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded"
        >
          📊 View Scoreboard
        </button>
      </div>
    </div>
  );
}
