import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

const MODES = [
  { label: "3 Rounds", value: 3 },
  { label: "5 Rounds", value: 5 },
  { label: "10 Rounds", value: 10 },
  { label: "Endless Mode", value: "endless" },
];

export default function PreGameScreen() {
  const [playerName, setPlayerName] = useState(() => sessionStorage.getItem("playerName") || "");
  const [mode, setMode] = useState(() => sessionStorage.getItem("mode") || "endless");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!playerName.trim()) {
      setError("Please enter your name.");
      return;
    }

    const trimmedName = playerName.trim();

    // Persist to sessionStorage
    sessionStorage.setItem("playerName", trimmedName);
    sessionStorage.setItem("mode", mode);
    sessionStorage.setItem("targetEvents", mode === "endless" ? "" : String(mode));

    // Notify parent
    navigate("/play");
  };

  return (
    <div className="p-8 max-w-xl mx-auto space-y-6 text-center">
    <div className="space-y-1 animate-fade-in-up">
        <h2 className="text-xl text-gray-600 tracking-wide">
        Guess when. Guess where. Learn along the way.
        </h2>
        <h1 className="text-3xl font-bold text-black">
        Welcome to MapThePast
        </h1>
    </div>
  
      <div>
        <input
          className="border px-4 py-2 rounded w-full"
          value={playerName}
          onChange={(e) => {
            setPlayerName(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="Enter your name"
        />
        {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
      </div>
  
      <div className="space-y-2 text-left">
        {MODES.map((m) => (
          <label
            key={m.value}
            className={`block cursor-pointer border p-3 rounded ${
              mode === m.value ? "bg-indigo-600 text-white" : "bg-gray-100"
            }`}
          >
            <input
              type="radio"
              value={m.value}
              checked={mode === m.value}
              onChange={() => setMode(m.value)}
              className="mr-2"
            />
            {m.label}
          </label>
        ))}
      </div>
  
      <button
        onClick={handleSubmit}
        className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 w-full"
      >
        Start Playing
      </button>
  
      <div className="mt-4 text-sm">
        <button onClick={() => navigate("/scoreboard")} className="underline text-blue-600">
          View Scoreboard
        </button>
      </div>
    </div>
  );
}
