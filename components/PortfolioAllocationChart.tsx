"use client";
import { portfolio } from "@/lib/data";

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1_000).toFixed(0)}K`;

export default function PortfolioAllocationChart() {
  const companies = portfolio.filter((c) => c.status !== "written-off");
  const totalValue = companies.reduce((s, c) => s + c.currentValue, 0);
  const totalInvested = companies.reduce((s, c) => s + c.invested, 0);
  const overallMoic = (totalValue / totalInvested).toFixed(2);

  const CX = 120;
  const CY = 120;
  const R = 78;
  const SW = 42; // stroke width (ring thickness)
  const circumference = 2 * Math.PI * R;

  // Build segments with dasharray positioning
  let cumulative = 0;
  const segments = companies.map((c) => {
    const pct = c.currentValue / totalValue;
    const arcLen = pct * circumference;
    const dashoffset = -cumulative;
    cumulative += arcLen;
    return { company: c, pct, arcLen, dashoffset };
  });

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
      {/* Donut */}
      <div className="shrink-0">
        <svg
          viewBox="0 0 240 240"
          className="w-52 h-52"
          aria-label="Portfolio allocation by current value"
        >
          {/* Track ring */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="#111D2E"
            strokeWidth={SW}
          />

          {/* Segments */}
          {segments.map(({ company, arcLen, dashoffset }) => (
            <circle
              key={company.id}
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke={company.accentColor}
              strokeWidth={SW}
              strokeDasharray={`${arcLen} ${circumference}`}
              strokeDashoffset={dashoffset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${CX} ${CY})`}
              opacity="0.85"
            />
          ))}

          {/* Center: total value */}
          <text
            x={CX}
            y={CY - 10}
            textAnchor="middle"
            fontSize="18"
            fontWeight="700"
            fill="#E2E8F0"
            fontFamily="Poppins, sans-serif"
          >
            {fmt(totalValue)}
          </text>
          <text
            x={CX}
            y={CY + 8}
            textAnchor="middle"
            fontSize="9"
            fill="#64748B"
            fontFamily="Poppins, sans-serif"
            letterSpacing="0.08em"
          >
            PORTFOLIO VALUE
          </text>
          <text
            x={CX}
            y={CY + 24}
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill="#10B981"
            fontFamily="Poppins, sans-serif"
          >
            {overallMoic}x MOIC
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-2 w-full">
        {segments.map(({ company, pct }) => (
          <div
            key={company.id}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-[#111D2E] hover:bg-[#141f30] transition-colors"
          >
            {/* Color dot */}
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: company.accentColor }}
            />

            {/* Logo or initials */}
            {company.logoUrl ? (
              <div className="w-6 h-6 rounded overflow-hidden bg-white flex items-center justify-center p-0.5 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div
                className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center shrink-0"
                style={{
                  background: `${company.accentColor}20`,
                  color: company.accentColor,
                }}
              >
                {company.initials[0]}
              </div>
            )}

            {/* Name */}
            <span className="text-sm text-slate-200 font-medium flex-1 min-w-0 truncate">
              {company.name}
            </span>

            {/* Bar */}
            <div className="w-24 h-1.5 bg-[#1E2D3D] rounded-full overflow-hidden shrink-0">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct * 100}%`,
                  background: company.accentColor,
                  opacity: 0.8,
                }}
              />
            </div>

            {/* Stats */}
            <span
              className="text-xs font-semibold tabular-nums w-10 text-right shrink-0"
              style={{ color: company.accentColor }}
            >
              {(pct * 100).toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400 tabular-nums w-14 text-right shrink-0">
              {fmt(company.currentValue)}
            </span>
          </div>
        ))}

        {/* Total row */}
        <div className="flex items-center justify-between border-t border-[#1E2D3D] pt-2 mt-1 px-2.5">
          <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">invested {fmt(totalInvested)}</span>
            <span className="text-sm font-semibold text-slate-200 tabular-nums">
              {fmt(totalValue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
