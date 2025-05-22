import { useState, useEffect } from "react";
import axios from "axios";

const THEMES = [
  "architecture & engineering", "art & culture", "diplomacy & international relations",
  "economic & industrial history", "exploration & discovery", "foundational political moments",
  "law & justice", "migration & demographic change", "natural disasters", "religious history",
  "royalty & coronations", "scientific & technological breakthroughs",
  "social movements & protests", "wars & battles"
];

const BROAD_ERAS = [
  "1. Deep Prehistory", "2. Early Prehistory", "3. Late Prehistory",
  "4. Ancient World", "5. Middle Ages", "6. Early Modern Era",
  "7. Industrial Age", "8. 20th Century", "9. 21st Century"
];

const REGIONS = [
  "Europe", "Asia", "Africa", "Americas", "Global", "Middle East", "Oceania"
];

export default function IdeaModerationPanel() {
  const [selectedThemes, setSelectedThemes] = useState([]);
  const [selectedEras, setSelectedEras] = useState([]);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [ideaCount, setIdeaCount] = useState(5);
  const [ideas, setIdeas] = useState([]);
  const [acceptedIdeas, setAcceptedIdeas] = useState([]);
  const [rejectedIdeas, setRejectedIdeas] = useState([]);
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState("filters"); // "filters" or "curriculum"
  const [curriculumProfiles, setCurriculumProfiles] = useState({});
  const [curriculumCountry, setCurriculumCountry] = useState("");
  const [curriculumLevel, setCurriculumLevel] = useState("");
  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setIdeas([]);
    setAcceptedIdeas([]);
    setRejectedIdeas([]);
  };

  // Fetch curriculum profiles from backend
  useEffect(() => {
    const fetchProfiles = async () => {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      try {
        const res = await axios.get(`${API_BASE}/api/curriculum-profiles`);
        setCurriculumProfiles(res.data);
      } catch (err) {
        console.error("❌ Failed to load curriculum profiles:", err);
      }
    };
    fetchProfiles();
  }, []);

  const toggle = (val, list, setter) => {
    setter(list.includes(val) ? list.filter(v => v !== val) : [...list, val]);
  };

  const generateIdeas = async () => {
    setLoading(true);
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  
    const payload =
      mode === "curriculum"
        ? {
            mode: "curriculum",
            curriculum_country: curriculumCountry,
            curriculum_level: curriculumLevel,
            count: ideaCount,
          }
        : {
            mode: "filters",
            filters: {
              themes: selectedThemes,
              broad_eras: selectedEras,
              regions: selectedRegions,
            },
            count: ideaCount,
          };
  
    console.log("🔍 Sending payload:", payload);
  
    try {
      const response = await axios.post(`${API_BASE}/api/generate-ideas`, payload);
  
      // ✅ Defensive check: ensure it's an array
      if (!Array.isArray(response.data)) {
        console.error("❌ Unexpected response format:", response.data);
        alert("❌ The server did not return a valid list of ideas.");
        setIdeas([]);
        return;
      }
  
      setIdeas(response.data);
      setAcceptedIdeas([]);
      setRejectedIdeas([]);
    } catch (error) {
      console.error("❌ Error generating ideas:", error);
      alert("❌ Failed to generate ideas. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = (idea) => {
    if (!acceptedIdeas.includes(idea)) setAcceptedIdeas([...acceptedIdeas, idea]);
    setRejectedIdeas(rejectedIdeas.filter(i => i !== idea));
  };

  const handleReject = (idea) => {
    if (!rejectedIdeas.includes(idea)) setRejectedIdeas([...rejectedIdeas, idea]);
    setAcceptedIdeas(acceptedIdeas.filter(i => i !== idea));
  };

  const handleExport = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      const res = await axios.post(`${API_BASE}/api/save-accepted-ideas`, acceptedIdeas, {
        headers: { "Content-Type": "application/json" },
      });
      alert(res.data.status);
    } catch (err) {
      console.error("❌ Failed to save to backend:", err);
      alert("❌ Failed to save accepted ideas to backend.");
    }
  };

  const pill = (selected, label, onClick) => (
    <button
      key={label}
      className={`px-3 py-1 border rounded-full text-sm ${selected ? "bg-purple-300" : "bg-gray-100"}`}
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">🧠 Idea Generator</h1>

      {/* Mode Switcher */}
      <div className="flex gap-4">
        <button
          onClick={() => handleModeSwitch("filters")}
          className={`px-3 py-2 rounded ${mode === "filters" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
        >
          Manual Filters
        </button>
        <button
          onClick={() => handleModeSwitch("curriculum")}
          className={`px-3 py-2 rounded ${mode === "curriculum" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
        >
          Curriculum
        </button>
      </div>

      {/* Curriculum selection dropdowns */}
      {mode === "curriculum" && (
        <div className="flex gap-4 mt-2">
          <div>
            <label className="block text-sm font-semibold mb-1">Curriculum Country</label>
            <select
              value={curriculumCountry}
              onChange={(e) => {
                setCurriculumCountry(e.target.value);
                setCurriculumLevel("");
              }}
              className="border px-3 py-2 rounded text-sm"
            >
              <option value="">—</option>
              {Object.keys(curriculumProfiles).map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          {curriculumCountry && (
            <div>
              <label className="block text-sm font-semibold mb-1">Level</label>
              <select
                value={curriculumLevel}
                onChange={(e) => setCurriculumLevel(e.target.value)}
                className="border px-3 py-2 rounded text-sm"
              >
                <option value="">—</option>
                {curriculumProfiles[curriculumCountry]?.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Manual filter UI */}
      {mode === "filters" && (
        <>
          <div>
            <h2 className="font-semibold mb-1">Themes</h2>
            <div className="flex flex-wrap gap-2">
              {THEMES.map(t => pill(selectedThemes.includes(t), t, () => toggle(t, selectedThemes, setSelectedThemes)))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold mb-1">Broad Eras</h2>
            <div className="flex flex-wrap gap-2">
              {BROAD_ERAS.map(e => pill(selectedEras.includes(e), e, () => toggle(e, selectedEras, setSelectedEras)))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold mb-1">Regions</h2>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map(r => pill(selectedRegions.includes(r), r, () => toggle(r, selectedRegions, setSelectedRegions)))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="number"
              value={ideaCount}
              onChange={(e) => setIdeaCount(Number(e.target.value))}
              className="border px-3 py-2 rounded w-24 text-sm"
              min={1}
            />
          </div>
        </>
      )}

      <div>
      <button
        onClick={generateIdeas}
        className="bg-black text-white px-4 py-2 rounded text-sm mt-2 flex items-center gap-2"
        disabled={loading || (mode === "curriculum" && (!curriculumCountry || !curriculumLevel))}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            Generating...
          </>
        ) : (
          "Generate Ideas"
        )}
      </button>
      </div>

      <div className="space-y-4">
        {ideas.map((idea, idx) => {
          const isExisting = idea._status === "existing";
          const title = typeof idea === "string" ? idea : idea.title;

          return (
            <div
              key={idx}
              className={`border p-3 rounded ${isExisting ? "bg-gray-100 text-gray-600 italic" : ""} flex flex-col gap-2`}
            >
              <div className="flex justify-between items-start">
              <span className="text-sm whitespace-pre-line">
                {title}
                {idea.levels && idea.levels.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                  {idea.levels?.map((lvl, i) => (
                    <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                      {lvl}
                    </span>
                  ))}
                </div>
                )}
              </span>
                <div className="flex gap-2">
                  {!isExisting && (
                    <>
                      <button
                        className={`px-3 py-1 text-xs rounded ${
                          acceptedIdeas.includes(idea)
                            ? "bg-green-600 text-white"
                            : "bg-green-100 text-green-800"
                        }`}
                        onClick={() => handleAccept(idea)}
                      >
                        Accept
                      </button>
                      <button
                        className={`px-3 py-1 text-xs rounded ${
                          rejectedIdeas.includes(idea)
                            ? "bg-red-600 text-white"
                            : "bg-red-100 text-red-800"
                        }`}
                        onClick={() => handleReject(idea)}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {isExisting && (
                    <span className="text-xs bg-gray-300 text-gray-800 px-2 py-0.5 rounded">
                      Already exists
                    </span>
                  )}
                </div>
              </div>

              {isExisting && (
                <details className="text-xs ml-1 mt-1">
                  <summary className="cursor-pointer text-gray-500">Metadata may have been updated (e.g., curriculum tag)</summary>
                  <pre className="mt-1 bg-white p-2 border rounded overflow-auto max-h-48">
                    {JSON.stringify(idea, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          );
        })}
      </div>

      {acceptedIdeas.length > 0 && (
        <div className="mt-4">
          <button
            onClick={handleExport}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded shadow text-sm"
          >
            Export Accepted Ideas ({acceptedIdeas.length})
          </button>
        </div>
      )}
    </div>
  );
}