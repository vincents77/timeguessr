// src/pages/Scoreboard.jsx
import { useEffect, useState } from "react";
import supabase from "../supabaseClient";

export default function Scoreboard() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    async function fetchSessions() {
        const { data, error } = await supabase
          .from("sessions")
          .select("id, player_name, total_points, started_at, theme, era, region")
          .order("total_points", { ascending: false })
          .limit(10);
      
        console.log("DATA:", data);    // 🛑 Add this
        console.log("ERROR:", error);  // 🛑 And this
      
        if (error) {
          console.error("Error fetching sessions:", error);
        } else {
          setSessions(data);
        }
      }

    fetchSessions();
  }, []);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">🏆 Top Scores</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Player</th>
            <th className="p-2 border">Score</th>
            <th className="p-2 border">Date</th>
            <th className="p-2 border">Theme</th>
            <th className="p-2 border">Era</th>
            <th className="p-2 border">Region</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id} className="text-center">
              <td className="p-2 border">{session.player_name}</td>
              <td className="p-2 border">{session.total_points}</td>
              <td className="p-2 border">{new Date(session.started_at).toLocaleDateString()}</td>
              <td className="p-2 border">{session.theme || "-"}</td>
              <td className="p-2 border">{session.era || "-"}</td>
              <td className="p-2 border">{session.region || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}