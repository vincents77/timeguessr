import { useState } from "react";
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

  const toggle = (val, list, setter) => {
    setter(list.includes(val) ? list.filter(v => v !== val) : [...list, val]);
  };

  const generateIdeas = async () => {
    setLoading(true);
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    try {
        const response = await axios.post(`${API_BASE}/api/generate-ideas`, {
            filters: {
              themes: selectedThemes,
              broad_eras: selectedEras,
              regions: selectedRegions,
            },
            count: ideaCount,
          });
      setIdeas(response.data);
      setAcceptedIdeas([]);
      setRejectedIdeas([]);
    } catch (error) {
        if (error.response) {
          // Backend responded with error (e.g. 500, 422)
          console.error("❌ Backend responded with error:", error.response.data);
          console.error("Status code:", error.response.status);
          console.error("Headers:", error.response.headers);
        } else if (error.request) {
          // Request was made but no response received
          console.error("❌ No response received. Request:", error.request);
        } else {
          // Something else happened
          console.error("❌ General error:", error.message);
        }
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
        headers: { "Content-Type": "application/json" }
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
        <button
          onClick={generateIdeas}
          className="bg-black text-white px-4 py-2 rounded text-sm"
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate Ideas"}
        </button>
      </div>

      <div className="space-y-4">
        {ideas.map((idea, idx) => (
          <div key={idx} className="border p-3 rounded flex justify-between items-start gap-4">
            <span className="text-sm">{idea}</span>
            <div className="flex gap-2">
              <button
                className={`px-3 py-1 text-xs rounded ${acceptedIdeas.includes(idea) ? "bg-green-600 text-white" : "bg-green-100 text-green-800"}`}
                onClick={() => handleAccept(idea)}
              >
                Accept
              </button>
              <button
                className={`px-3 py-1 text-xs rounded ${rejectedIdeas.includes(idea) ? "bg-red-600 text-white" : "bg-red-100 text-red-800"}`}
                onClick={() => handleReject(idea)}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
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