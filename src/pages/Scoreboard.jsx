import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";

export default function Scoreboard() {
  const [sessions, setSessions] = useState([]);
  const [selectedRange, setSelectedRange] = useState("all");
  const [sessionId, setSessionId] = useState(
    () => sessionStorage.getItem("sessionId") || localStorage.getItem("sessionId") || null
  );
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchSessions() {
      let query = supabase
        .from("sessions")
        .select("id, player_name, total_points, started_at, theme, era, region")
        .not("total_points", "is", null);

      if (selectedRange !== "all") {
        const today = new Date();
        let sinceDate = new Date();

        if (selectedRange === "week") {
          sinceDate.setDate(today.getDate() - 7);
        } else if (selectedRange === "month") {
          sinceDate.setMonth(today.getMonth() - 1);
        }

        query = query.gte("started_at", sinceDate.toISOString());
      }

      const { data, error } = await query.order("total_points", { ascending: false });

      if (error) {
        console.error("❌ Error fetching sessions:", error);
      } else {
        setSessions(data || []);
      }
    }

    fetchSessions();
  }, [selectedRange]);

  const sortedSessions = [...sessions].sort((a, b) => b.total_points - a.total_points);
  const currentIndex = sortedSessions.findIndex(s => s.id === sessionId);

  let displaySessions = [];
  if (currentIndex === -1 || currentIndex < 3) {
    displaySessions = sortedSessions.slice(0, 10);
  } else {
    const start = Math.max(0, currentIndex - 3);
    displaySessions = sortedSessions.slice(start, start + 7);
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">🏆 Top Scores</h1>

      <div className="flex justify-center gap-4 mb-6">
        {['week', 'month', 'all'].map((range) => (
          <button
            key={range}
            onClick={() => setSelectedRange(range)}
            className={`px-4 py-2 rounded ${selectedRange === range ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            {range === "week" ? "This Week" : range === "month" ? "This Month" : "All Time"}
          </button>
        ))}
      </div>

      {sessions.length === 0 ? (
        <div className="text-center text-gray-500 mt-10">No sessions yet for this period!</div>
      ) : (
        <>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">#</th>
                <th className="p-2 border">Player</th>
                <th className="p-2 border">Score</th>
                <th className="p-2 border">Date</th>
                <th className="p-2 border">Theme</th>
                <th className="p-2 border">Era</th>
                <th className="p-2 border">Region</th>
              </tr>
            </thead>
            <tbody>
              {displaySessions.map((session) => {
                const rank = sortedSessions.findIndex(s => s.id === session.id) + 1;
                const isCurrent = session.id === sessionId;
                return (
                  <tr
                    key={session.id}
                    className={`text-center hover:bg-gray-100 ${isCurrent ? "bg-purple-100" : ""}`}
                  >
                    <td className="p-2 border">{rank}</td>
                    <td className="p-2 border font-semibold">
                      {rank === 1 ? "🥇 " : rank === 2 ? "🥈 " : rank === 3 ? "🥉 " : ""}
                      {session.player_name}
                      {session.id === sessionId && (
                        <span className="ml-2 text-sm text-purple-700 font-medium">(you)</span>
                      )}
                    </td>
                    <td className="p-2 border">{session.total_points}</td>
                    <td className="p-2 border">{new Date(session.started_at).toLocaleDateString()}</td>
                    <td className="p-2 border">{session.theme || "-"}</td>
                    <td className="p-2 border">{session.era || "-"}</td>
                    <td className="p-2 border">{session.region || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-center mt-6">
            <button
              onClick={() => {
                localStorage.removeItem("sessionId");
                sessionStorage.removeItem("sessionId");
                navigate("/");
              }}
              className="mt-4 px-5 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              ▶️ Guess Again
            </button>
          </div>
        </>
      )}
    </div>
  );
}
