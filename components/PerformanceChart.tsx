"use client";
import { navHistory } from "@/lib/data";

const fmt = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : `$${(n / 1_000).toFixed(0)}K`;

export default function PerformanceChart() {
  const data = navHistory;
  const maxVal = Math.max(...data.map((d) => Math.max(d.nav, d.called))) * 1.12;
  const minVal = 0;
  const range = maxVal - minVal;

  const W = 800;
  const H = 200;
  const PAD_L = 48;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 32;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const xStep = chartW / (data.length - 1);

  const toX = (i: number) => PAD_L + i * xStep;
  const toY = (v: number) => PAD_T + chartH - ((v - minVal) / range) * chartH;

  const navPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)},${toY(d.nav)}`)
    .join(" ");

  const navFill =
    navPath +
    ` L ${toX(data.length - 1)},${PAD_T + chartH} L ${PAD_L},${PAD_T + chartH} Z`;

  const calledPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)},${toY(d.called)}`)
    .join(" ");

  // Y-axis labels
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    value: minVal + t * range,
    y: PAD_T + chartH - t * chartH,
  }));

  // X-axis: show every 4th label
  const xLabels = data.filter((_, i) => i % 4 === 0 || i === data.length - 1);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: 400 }}
        aria-label="Fund NAV vs Called Capital over time"
      >
        <defs>
          <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((t) => (
          <g key={t.value}>
            <line
              x1={PAD_L}
              y1={t.y}
              x2={W - PAD_R}
              y2={t.y}
              stroke="#1E2D3D"
              strokeWidth="1"
            />
            <text
              x={PAD_L - 6}
              y={t.y + 4}
              textAnchor="end"
              fontSize="10"
              fill="#475569"
            >
              {fmt(t.value)}
            </text>
          </g>
        ))}

        {/* NAV fill area */}
        <path d={navFill} fill="url(#navGrad)" />

        {/* Called capital line (dashed) */}
        <path
          d={calledPath}
          fill="none"
          stroke="#6366F1"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity="0.6"
        />

        {/* NAV line */}
        <path d={navPath} fill="none" stroke="#10B981" strokeWidth="2" />

        {/* NAV dots */}
        {data.map((d, i) => (
          <circle
            key={d.quarter}
            cx={toX(i)}
            cy={toY(d.nav)}
            r="3"
            fill="#10B981"
            opacity={i === data.length - 1 ? 1 : 0}
          />
        ))}

        {/* Latest NAV dot always visible */}
        <circle
          cx={toX(data.length - 1)}
          cy={toY(data[data.length - 1].nav)}
          r="4"
          fill="#10B981"
          stroke="#060B14"
          strokeWidth="2"
        />

        {/* X-axis labels */}
        {xLabels.map((d) => {
          const idx = data.indexOf(d);
          return (
            <text
              key={d.quarter}
              x={toX(idx)}
              y={PAD_T + chartH + 18}
              textAnchor="middle"
              fontSize="9"
              fill="#475569"
            >
              {d.quarter}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex gap-5 mt-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-emerald-500 rounded" />
          <span className="text-xs text-slate-500">NAV</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-0.5 rounded"
            style={{
              background: "#6366F1",
              opacity: 0.6,
              backgroundImage:
                "repeating-linear-gradient(90deg,#6366F1 0,#6366F1 4px,transparent 4px,transparent 7px)",
            }}
          />
          <span className="text-xs text-slate-500">Called Capital</span>
        </div>
      </div>
    </div>
  );
}
