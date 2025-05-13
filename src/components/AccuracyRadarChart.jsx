import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip
  } from 'recharts';
  
  export default function AccuracyRadarChart({ data }) {
    return (
      <div>
        {/* Custom Legend */}
        <div className="flex justify-center mb-2 text-sm font-medium text-gray-700">
          <span className="mr-4 flex items-center">
            <span className="inline-block w-3 h-3 bg-blue-600 mr-1 rounded-full" />
            Player
          </span>
          <span className="flex items-center">
            <span className="inline-block w-3 h-3 bg-green-400 mr-1 rounded-full" />
            Benchmark
          </span>
        </div>
  
        {/* Radar Chart */}
        <ResponsiveContainer width="100%" height={350}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="metric" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            <Radar
              name="Player"
              dataKey="player"
              stroke="#2563EB"
              fill="#2563EB"
              fillOpacity={0.4}
            />
            <Radar
              name="Benchmark"
              dataKey="top"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.2}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-white border rounded shadow text-xs p-2 max-w-xs">
                      <div className="font-semibold mb-1">{label}</div>
                      <div className="text-gray-700 italic mb-1">{item.description}</div>
                      <div><span className="font-medium text-blue-600">Player:</span> {item.player}%</div>
                      <div><span className="font-medium text-green-600">Benchmark:</span> {item.top}%</div>
                      <div className="text-gray-500 mt-1">{item.raw}</div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }