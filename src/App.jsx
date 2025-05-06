// src/App.jsx
import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import PreGameScreen from "./pages/PreGameScreen";
import TimeGuessrGame from "./TimeGuessrGame";
import Scoreboard from "./pages/Scoreboard";

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
    </Routes>
  );
}