// src/App.jsx
import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import PreGameScreen from "./pages/PreGameScreen";
import TimeGuessrGame from "./TimeGuessrGame";
import Scoreboard from "./pages/Scoreboard";
import SessionSummary from "./pages/SessionSummary";
import IdeaModerationPanel from "./moderation/IdeaGeneratorTool";
import PlayerStatsPage from "./pages/PlayerStatsPage";
import { useLocation } from "react-router-dom";

function PlayerStatsWrapper() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const queryName = params.get("player");

  const storedName = sessionStorage.getItem("playerName") || "anonymous";
  const playerName = queryName || storedName;

  return <PlayerStatsPage playerName={playerName} />;
}

export default function App() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch("/data/events.json")
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch((err) => console.error("Failed to load events:", err));
  }, []);

  if (events.length === 0) {
    return <div className="p-8 text-center">Loading events…</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<PreGameScreen events={events} />} />
      <Route path="/play" element={<TimeGuessrGame events={events} />} />
      <Route path="/scoreboard" element={<Scoreboard />} />
      <Route path="/summary" element={<SessionSummary />} />
      <Route path="/moderation" element={<IdeaModerationPanel />} />
      <Route path="/player-stats" element={<PlayerStatsWrapper />} />
    </Routes>
  );
}