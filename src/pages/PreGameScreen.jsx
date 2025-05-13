import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const MODES = [
  { label: "3 Rounds", value: 3 },
  { label: "5 Rounds", value: 5 },
  { label: "10 Rounds", value: 10 },
  { label: "Endless Mode", value: "endless" },
];

const THEMES = [
  "architecture & engineering",
  "art & culture",
  "diplomacy & international relations",
  "economic & industrial history",
  "exploration & discovery",
  "foundational political moments",
  "law & justice",
  "migration & demographic change",
  "natural disasters",
  "religious history",
  "royalty & coronations",
  "scientific & technological breakthroughs",
  "social movements & protests",
  "wars & battles"
];

const BROAD_ERAS = [
  "1. Deep Prehistory",
  "2. Early Prehistory",
  "3. Late Prehistory",
  "4. Ancient World",
  "5. Middle Ages",
  "6. Early Modern Era",
  "7. Industrial Age",
  "8. 20th Century",
  "9. 21st Century"
];

const REGIONS = [
  "Europe",
  "Asia",
  "Africa",
  "Americas",
  "Global",
  "Middle East",
  "Oceania"
];

export default function PreGameScreen({ events = [] }) {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState(sessionStorage.getItem("playerName") || "");
  const [mode, setMode] = useState(sessionStorage.getItem("mode") || "endless");
  const [filterMode, setFilterMode] = useState("random");
  const [selectedThemes, setSelectedThemes] = useState([]);
  const [selectedEras, setSelectedEras] = useState([]);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    if (filterMode === "random") {
      setWarning("");
      return;
    }

    let filtered = events;

    if (selectedThemes.length > 0) {
      filtered = filtered.filter(e => selectedThemes.includes(e.theme));
    }
    if (selectedEras.length > 0) {
      filtered = filtered.filter(e => selectedEras.includes(e.broad_era));
    }
    if (selectedRegions.length > 0) {
      filtered = filtered.filter(e => selectedRegions.includes(e.region));
    }

    if (mode !== "endless") {
      const roundTarget = parseInt(mode);
      if (filtered.length < roundTarget) {
        setWarning(`⚠️ Only ${filtered.length} matching events found, but ${roundTarget} rounds selected.`);
      } else {
        setWarning("");
      }
    } else {
      if (filtered.length === 0) {
        setWarning("❌ No events match your filters. Please adjust them.");
      } else if (filtered.length < 10) {
        setWarning(`⚠️ Low variety: only ${filtered.length} events match your filters.`);
      } else {
        setWarning("");
      }
    }
  }, [mode, selectedThemes, selectedEras, selectedRegions, filterMode, events]);

  const toggleSelection = (value, list, setter) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const handleSubmit = () => {
    if (!playerName.trim()) {
      setError("Please enter your name.");
      return;
    }

    sessionStorage.setItem("playerName", playerName.trim());
    sessionStorage.setItem("mode", mode);
    sessionStorage.setItem("targetEvents", mode === "endless" ? "" : String(mode));
    sessionStorage.setItem("filterMode", filterMode);

    if (filterMode === "random") {
      sessionStorage.setItem("selectedThemes", JSON.stringify([]));
      sessionStorage.setItem("selectedBroadEras", JSON.stringify([]));
      sessionStorage.setItem("selectedRegions", JSON.stringify([]));
    } else {
      sessionStorage.setItem("selectedThemes", JSON.stringify(selectedThemes));
      sessionStorage.setItem("selectedBroadEras", JSON.stringify(selectedEras));
      sessionStorage.setItem("selectedRegions", JSON.stringify(selectedRegions));
    }

    navigate("/play");
  };

  const pillClass = (selected) => `px-4 py-2 rounded-full border text-sm transition-all duration-150
    ${selected ? "bg-purple-200 font-bold text-black" : "bg-gray-100 text-gray-800"}`;

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-6 text-center">
      <h2 className="text-gray-600 text-base sm:text-lg">Guess when. Guess where. Learn along the way.</h2>
      <h1 className="text-2xl sm:text-3xl font-bold text-black">Welcome to MapThePast</h1>

      <input
        className="border px-4 py-3 rounded w-full text-base"
        value={playerName}
        onChange={(e) => {
          setPlayerName(e.target.value);
          setError(null);
        }}
        placeholder="Enter your name"
      />
      {error && <div className="text-red-500 text-sm mt-1">{error}</div>}

      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={`px-4 py-2 rounded-full border text-sm min-w-[96px]
              ${mode === m.value ? "bg-purple-200 font-bold text-black" : "bg-gray-100 text-gray-800"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        <button
          onClick={() => setFilterMode("random")}
          className={`px-4 py-2 rounded-full border text-sm min-w-[120px] ${filterMode === "random" ? "bg-purple-200 font-bold" : "bg-gray-100"}`}
        >Surprise Me</button>
        <button
          onClick={() => setFilterMode("manual")}
          className={`px-4 py-2 rounded-full border text-sm min-w-[120px] ${filterMode === "manual" ? "bg-purple-200 font-bold" : "bg-gray-100"}`}
        >Select Topics</button>
      </div>

      {filterMode === "manual" && (
        <div className="space-y-4 text-left">
          <div>
            <h3 className="font-bold mb-2">Theme</h3>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <button
                  key={t}
                  className={pillClass(selectedThemes.includes(t))}
                  onClick={() => toggleSelection(t, selectedThemes, setSelectedThemes)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-2">Broad Era</h3>
            <div className="flex flex-wrap gap-2">
              {BROAD_ERAS.map((e) => (
                <button
                  key={e}
                  className={pillClass(selectedEras.includes(e))}
                  onClick={() => toggleSelection(e, selectedEras, setSelectedEras)}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-2">Region</h3>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  className={pillClass(selectedRegions.includes(r))}
                  onClick={() => toggleSelection(r, selectedRegions, setSelectedRegions)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {warning && <div className="text-yellow-700 bg-yellow-100 border border-yellow-300 px-3 py-2 rounded text-sm font-medium">{warning}</div>}

      <button
        onClick={handleSubmit}
        className="bg-black text-white px-4 py-3 text-base rounded hover:bg-gray-800 w-full"
      >
        Start Playing
      </button>

      <div className="mt-4 flex justify-center gap-3 flex-wrap">
        <button
          onClick={() => navigate("/scoreboard")}
          className="px-4 py-2 rounded-full border text-sm bg-blue-100 hover:bg-blue-200"
        >
          View Scoreboard
        </button>
        <button
          onClick={() => navigate("/player-stats")}
          className="px-4 py-2 rounded-full border text-sm bg-blue-100 hover:bg-blue-200"
        >
          View My Stats
        </button>
      </div>
    </div>
  );
}
