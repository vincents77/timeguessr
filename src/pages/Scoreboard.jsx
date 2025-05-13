import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";

export default function Scoreboard() {
  const [sessions, setSessions] = useState([]);
  const [selectedRange, setSelectedRange] = useState("all");
  const [sessionId, setSessionId] = useState(
    () => sessionStorage.getItem("sessionId") || localStorage.getItem("sessionId") || null
  );
  const [sortKey, setSortKey] = useState("total_points");
  const [sortAsc, setSortAsc] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchSessions() {
      let query = supabase
        .from("sessions")
        .select("id, player_name, total_points, total_events, started_at, theme, era, broad_era, region, mode")
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

      const { data, error } = await query;
      if (error) {
        console.error("❌ Error fetching sessions:", error);
      } else {
        setSessions(data || []);
      }
    }

    fetchSessions();
  }, [selectedRange]);

  const sortedSessions = [...sessions].sort((a, b) => {
    const aVal = sortKey === "avg" ? (a.total_points / (a.total_events || 1)) : a[sortKey];
    const bVal = sortKey === "avg" ? (b.total_points / (b.total_events || 1)) : b[sortKey];
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  const currentIndex = sortedSessions.findIndex((s) => s.id === sessionId);
  const current = sortedSessions[currentIndex];
  const top10 = sortedSessions.slice(0, 10);

  let displaySessions = [];

  if (!current) {
    displaySessions = showAll ? sortedSessions : top10;
  } else if (currentIndex < 10) {
    displaySessions = showAll ? sortedSessions : top10;
  } else {
    const contextWindow = sortedSessions.slice(currentIndex - 3, currentIndex + 4);
    const merged = [...top10];
    contextWindow.forEach((s) => {
      if (!merged.find((m) => m.id === s.id)) merged.push(s);
    });
    displaySessions = showAll ? sortedSessions : merged;
  }

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const getFiltersLabel = (theme, era, region) => {
    if ((theme === "all" || !theme) && (era === "all" || !era) && (region === "all" || !region)) {
      return "all";
    }
    return [theme, era, region].filter((f) => f && f !== "all").join(" • ") || "-";
  };

  const getModeBadge = (mode) => {
    if (mode === "endless") return "∞";
    if (["3", "5", "10"].includes(mode)) return mode;
    return "∞";
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center flex items-center justify-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="inline w-5 h-5 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 4h-2V2H6v2H4c0 3 1 5 3 6 1 3 3 5 5 6v3H8v2h8v-2h-4v-3c2-1 4-3 5-6 2-1 3-3 3-6zM6 9c-1-.6-2-2-2-4h2v4zm12 0V5h2c0 2-1 3.4-2 4z" />
        </svg>
        Top Scores
      </h1>

      <div className="flex justify-center gap-4 mb-6">
        {["week", "month", "all"].map((range) => (
          <button
            key={range}
            onClick={() => setSelectedRange(range)}
            className={`px-4 py-2 rounded font-medium ${selectedRange === range ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-800"}`}
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
                <th className="p-2 border cursor-pointer" onClick={() => toggleSort("total_points")}>
                  Score {sortKey === "total_points" && (sortAsc ? "↑" : "↓")}
                </th>
                <th className="p-2 border cursor-pointer" onClick={() => toggleSort("avg")}>
                  Avg {sortKey === "avg" && (sortAsc ? "↑" : "↓")}
                </th>
                <th className="p-2 border">Filters</th>
              </tr>
            </thead>
            <tbody>
              {displaySessions.map((session) => {
                const rank = sortedSessions.findIndex((s) => s.id === session.id) + 1;
                const isCurrent = session.id === sessionId;
                const avg = session.total_events ? Math.round(session.total_points / session.total_events) : "-";

                return (
                  <tr
                    key={session.id}
                    className={`text-center hover:bg-gray-100 ${isCurrent ? "bg-purple-100" : ""}`}
                  >
                    <td className="p-2 border">
                      <div className="flex items-center justify-center gap-2">
                        {rank === 1 && "🥇"}
                        {rank === 2 && "🥈"}
                        {rank === 3 && "🥉"}
                        {rank > 3 && <span className="font-medium">{rank}</span>}
                      </div>
                    </td>
                    <td className="p-2 border">
                      {session.player_name}
                      {session.total_events && (
                        <span className="ml-2 text-xs inline-block bg-gray-200 text-gray-600 px-1 rounded">
                          {getModeBadge(session.mode)}
                        </span>
                      )}
                    </td>
                    <td className="p-2 border">{session.total_points}</td>
                    <td className="p-2 border">{avg}</td>
                    <td className="p-2 border">{getFiltersLabel(session.theme, session.broad_era, session.region)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!showAll && sortedSessions.length > displaySessions.length && (
            <div className="flex justify-center mt-4">
              <button onClick={() => setShowAll(true)} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
                Show All
              </button>
            </div>
          )}

          <div className="flex justify-center mt-4 gap-4">
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

            {sessionStorage.getItem("playerName") && (
              <button
                onClick={() =>
                  navigate("/player-stats")
                }
                className="bg-blue-100 hover:bg-blue-200 text-blue-900 font-medium px-4 py-2 rounded"
              >
                View My Stats
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}