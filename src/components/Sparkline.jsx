// Sparkline.jsx
import React from "react";

export default function Sparkline({ data = [], width = 60, height = 20, stroke = "#3b82f6" }) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const isUp = data[data.length - 1] > data[0];
  const trendArrow = isUp ? "▲" : "▼";
  const trendColor = isUp ? "text-green-600" : "text-red-600";

  return (
    <div className="flex flex-col items-end">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          points={points}
        />
      </svg>
      <div className={`text-[10px] mt-1 font-semibold ${trendColor}`}>
        {trendArrow}
      </div>
    </div>
  );
}