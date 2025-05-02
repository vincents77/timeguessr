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
          const day = today.getDay();
          const diff = (day === 0 ? -6 : 1) - day;
          sinceDate.setDate(today.getDate() + diff);
          sinceDate.setHours(0, 0, 0, 0);
        } else if (selectedRange === "month") {
          sinceDate = new Date(today.getFullYear(), today.getMonth(), 1);
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

  let displaySessions = [];

  const top3 = sortedSessions.slice(0, 3);
  const currentIndex = sortedSessions.findIndex(s => s.id === sessionId);
  const current = sortedSessions[currentIndex];
  
  if (!current) {
    // Show top 10 if current session isn't found
    displaySessions = sortedSessions.slice(0, 10);
  } else if (currentIndex < 3) {
    // Already visible in top 3
    displaySessions = sortedSessions.slice(0, 10);
  } else {
    const top3 = sortedSessions.slice(0, 3);
    const surrounding = sortedSessions.slice(currentIndex - 3, currentIndex + 4);
    const uniqueSessions = [...top3];
  
    surrounding.forEach(session => {
      if (!uniqueSessions.find(s => s.id === session.id)) {
        uniqueSessions.push(session);
      }
    });
  
    displaySessions = uniqueSessions;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center flex items-center justify-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="inline w-5 h-5 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20 4h-2V2H6v2H4c0 3 1 5 3 6 1 3 3 5 5 6v3H8v2h8v-2h-4v-3c2-1 4-3 5-6 2-1 3-3 3-6zM6 9c-1-.6-2-2-2-4h2v4zm12 0V5h2c0 2-1 3.4-2 4z"/>
      </svg> Top Scores</h1>

      <div className="flex justify-center gap-4 mb-6">
        {['week', 'month', 'all'].map((range) => (
          <button
            key={range}
            onClick={() => setSelectedRange(range)}
            className={`px-4 py-2 rounded font-medium ${
              selectedRange === range
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-800"
            }`}
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
                    className={`text-center hover:bg-gray-100 ${isCurrent ? "bg-purple-100 border-l-4 border-purple-500" : ""}`}
                  >
                    <td className="p-2 border">
                      <div className="flex items-center gap-2 justify-center">
                        {rank === 1 && (
                          <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2a5 5 0 015 5v2a5 5 0 01-10 0V7a5 5 0 015-5zM8 12l4 10 4-10H8z" />
                          </svg>
                        )}
                        {rank === 2 && (
                          <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2a5 5 0 015 5v2a5 5 0 01-10 0V7a5 5 0 015-5zM8 12h8l-4 10-4-10z" />
                          </svg>
                        )}
                        {rank === 3 && (
                          <svg className="w-4 h-4 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2a5 5 0 015 5v2a5 5 0 01-10 0V7a5 5 0 015-5zM9 12h6l-3 10-3-10z" />
                          </svg>
                        )}
                        <span className="font-semibold">{rank}</span>
                      </div>
                    </td>
                    <td className="p-2 border">{session.player_name}</td>
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4l12 8-12 8z" />
              </svg>
              Guess Again
            </button>
          </div>
        </>
      )}
    </div>
  );
}
