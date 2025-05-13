import { useState, useEffect } from "react";
import axios from "axios";
import AccuracyRadarChart from '../components/AccuracyRadarChart';
import { pivotPerformanceData } from '../utils/pivotUtils';
import Sparkline from '../components/Sparkline';

function CollapsibleSection({ title, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border rounded mb-4">
      <div
        className="flex justify-between items-center px-4 py-2 bg-gray-100 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 className="font-semibold text-base">{title}</h2>
        <span>{isOpen ? "▼" : "▶"}</span>
      </div>
      {isOpen && <div className="p-4 space-y-2">{children}</div>}
    </div>
  );
}

  
function StatRow({ label, value, benchmark, betterIfLower = false, unit = "", precision = 1, trendData = null }) {
    const numericValue = parseFloat(value);
    const numericBenchmark = parseFloat(benchmark);
    const isBetter = betterIfLower ? numericValue < numericBenchmark : numericValue > numericBenchmark;
  
    return (
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 sm:gap-0">
        <span>{label}</span>
        <div className="text-right">
          <div className="flex items-end justify-end gap-2">
            <span>
              {value?.toFixed?.(precision) ?? value} {unit}
              {benchmark != null && (
                <>
                  {" "}
                  <span className="text-gray-500 text-xs ml-1">(Top 10%: {benchmark.toFixed?.(precision)}{unit})</span>
                  {isBetter && (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800">
                      Top 10%
                    </span>
                  )}
                </>
              )}
            </span>
            {trendData?.length > 1 && <Sparkline data={trendData} />}
          </div>
        </div>
      </div>
    );
}

export default function PlayerStatsPage() {
  const playerName = sessionStorage.getItem("playerName") || "anonymous";
  const [summary, setSummary] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [dimensionData, setDimensionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [benchmarkKey, setBenchmarkKey] = useState("top_10_percent");
  const [selectedMetric, setSelectedMetric] = useState("avg_score");

  const benchmarkOptions = {
    average: "Average",
    top_25_percent: "Top 25%",
    top_10_percent: "Top 10%",
  };

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

    const fetchStats = async () => {
      try {
        const [summaryRes, comparisonRes, dimensionRes] = await Promise.all([
          axios.get(`${API_BASE}/api/player-summary`, { params: { player_name: playerName } }),
          axios.get(`${API_BASE}/api/player-performance-comparison`, { params: { player_name: playerName } }),
          axios.get(`${API_BASE}/api/player-dimension-performance`, { params: { player_name: playerName } }),
        ]);
        setSummary(summaryRes.data);
        setComparison(comparisonRes.data);
        setDimensionData(dimensionRes.data.performance_matrix);
      } catch (err) {
        console.error("❌ Failed to load stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [playerName]);

  if (loading) return <div className="p-6 text-center">Loading stats…</div>;
  if (!summary || !comparison) return <div className="p-6 text-red-600">Error loading stats</div>;

  const selected = comparison[benchmarkKey];

  const normalize = (val, max, invert = false) => {
    const ratio = Math.min(val / max, 1);
    return Math.round((invert ? (1 - ratio) : ratio) * 100);
  };

  const radarData = [
    { metric: 'Perfect Guess Rate', player: Math.round(summary.perfect_guess_rate), top: Math.round(selected.perfect_guess_pct),
      raw: `${Math.round(summary.perfect_guess_rate)}% vs ${Math.round(selected.perfect_guess_pct)}%`, description: 'How often you scored a perfect 2300 points' },
    { metric: 'Distance Accuracy', player: normalize(summary.average_distance, 10000, true), top: normalize(selected.average_distance, 10000, true),
      raw: `${Math.round(summary.average_distance)} km vs ${Math.round(selected.average_distance)} km`, description: 'Average distance error – closer is better' },
    { metric: 'Year Accuracy', player: normalize(summary.average_year_diff, 500, true), top: normalize(selected.average_year_diff, 500, true),
      raw: `${Math.round(summary.average_year_diff)} yrs vs ${Math.round(selected.average_year_diff)} yrs`, description: 'Average year error in your historical guess' },
    { metric: 'Guess Efficiency', player: normalize(summary.average_attempts, 4, true), top: normalize(selected.average_attempts, 4, true),
      raw: `${summary.average_attempts.toFixed(1)} vs ${selected.average_attempts.toFixed(1)} attempts`, description: 'Fewer retries = higher efficiency' },
    { metric: 'Time Efficiency', player: normalize(summary.average_time_per_guess, 90, true), top: normalize(selected.average_time_per_guess, 90, true),
      raw: `${Math.round(summary.average_time_per_guess)}s vs ${Math.round(selected.average_time_per_guess)}s`, description: 'Faster guesses — without compromising accuracy' },
  ];

  const { rows, cols, values } = dimensionData
    ? pivotPerformanceData(dimensionData, "theme", "broad_era", selectedMetric, {
        valueTransform: v =>
          selectedMetric === "avg_score" ? Math.round(v) : parseFloat(v.toFixed(1))
      })
    : { rows: [], cols: [], values: {} };

  const getBlueGradient = (value, max = 2300) => {
    if (value == null || value <= 0) return "bg-gray-50";
    const pct = value / max;
    if (pct > 0.9) return "bg-blue-500 text-white";
    if (pct > 0.75) return "bg-blue-400 text-white";
    if (pct > 0.5) return "bg-blue-300";
    if (pct > 0.3) return "bg-blue-200";
    return "bg-blue-100";
  };

  return (
    <div className="max-w-6xl mx-auto p-4 text-sm">
      <h1 className="text-xl font-bold mb-4">Player Stats: {summary.player_name}</h1>

      {dimensionData?.length > 0 && (
        <div className="mb-4 text-sm text-blue-900 bg-blue-50 border border-blue-200 px-3 py-2 rounded">
            💡 You perform best on{" "}
            <strong>
            {dimensionData[0].broad_era} events in {dimensionData[0].region}
            </strong>{" "}
            ({dimensionData[0].avg_score?.toFixed(0)} pts)
        </div>
        )}

      <CollapsibleSection title="General Summary">
        <StatRow label="Total Games" value={summary.total_games} precision={0}/>
        <StatRow label="Total Events" value={summary.total_events} precision={0}/>
        <StatRow
          label="Average Score"
          value={summary.average_score}
          benchmark={selected.average_score}
          precision={0}
        />
        <StatRow
          label="Best Score"
          value={summary.best_score}
          benchmark={selected.best_score}
          precision={0}
        />
        <StatRow
          label="Average Time per Guess"
          value={summary.average_time_per_guess}
          benchmark={selected.average_time_per_guess}
          betterIfLower
          unit="sec"
        />
      </CollapsibleSection>

      <CollapsibleSection title="Accuracy Breakdown">
        <StatRow label="Perfect Guess Rate" value={summary.perfect_guess_rate} benchmark={selected.perfect_guess_pct} unit="%" />
        <StatRow label="Avg Distance" value={summary.average_distance} benchmark={selected.average_distance} betterIfLower unit="km" />
        <StatRow label="Avg Year Diff" value={summary.average_year_diff} benchmark={selected.average_year_diff} betterIfLower unit="years" />
        <StatRow label="Avg Attempts per Event" value={summary.average_attempts} benchmark={selected.average_attempts} betterIfLower />
      </CollapsibleSection>

      <CollapsibleSection title="Distribution Insights" defaultOpen={false}>
        <div className="mb-2 flex justify-end">
          <select value={benchmarkKey} onChange={(e) => setBenchmarkKey(e.target.value)} className="text-sm border px-2 py-1 rounded">
            {Object.entries(benchmarkOptions).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <AccuracyRadarChart data={radarData} />
      </CollapsibleSection>

      <CollapsibleSection title="Performance by Theme & Era" defaultOpen={false}>
        <div className="mb-2 flex justify-end">
          <select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)} className="text-sm border px-2 py-1 rounded">
            <option value="avg_score">Average Score</option>
            <option value="avg_distance">Average Distance</option>
            <option value="avg_year_diff">Average Year Diff</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="table-auto text-xs border-collapse border border-gray-300 w-full">
            <thead>
              <tr>
                <th className="border px-2 py-1 bg-gray-100 sticky left-0 z-10">Theme \ Era</th>
                {cols.map(col => (
                  <th key={col} className="border px-2 py-1 bg-gray-100 whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row}>
                  <td className="border px-2 py-1 font-semibold bg-gray-50 sticky left-0 z-0 whitespace-nowrap">{row}</td>
                  {cols.map(col => {
                    const val = values?.[row]?.[col];
                    const bg = getBlueGradient(val);
                    return (
                      <td key={col} className={`border px-2 py-1 text-center ${bg}`}>
                        {val != null ? val : "-"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>
      {/* Bottom navigation buttons */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={() => {
            sessionStorage.removeItem("sessionId");
            localStorage.removeItem("sessionId");
            window.location.href = "/";
          }}
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          Guess Again
        </button>

        <button
          onClick={() => window.location.href = "/scoreboard"}
          className="bg-blue-100 text-blue-800 px-4 py-2 rounded hover:bg-blue-200"
        >
          View Scoreboard
        </button>
      </div>
    </div>
  );
}