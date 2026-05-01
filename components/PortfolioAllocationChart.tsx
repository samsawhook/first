"use client";
import { portfolio, fund } from "@/lib/data";
import type { Investor, Holding } from "@/lib/types";

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1_000).toFixed(0)}K`;

// ── Resolve a holding to a display item ──────────────────────────────────────

interface ResolvedHolding {
  key: string;
  label: string;
  sublabel: string;
  value: number;
  color: string;
  logoUrl?: string;
  badge: string; // "Equity" | "LP Units" | "Debt" | instrument name
  badgeColor: string;
}

function resolveHolding(h: Holding): ResolvedHolding | null {
  if (h.class === "equity") {
    const co = portfolio.find((c) => c.id === h.entityId);
    if (!co || !co.totalShares) return null;
    const pricePerShare = co.impliedValuation / co.totalShares;
    const value = h.shares * pricePerShare;
    return {
      key: `equity-${co.id}`,
      label: co.name,
      sublabel: `${h.shares.toLocaleString()} shares`,
      value,
      color: co.accentColor,
      logoUrl: co.logoUrl,
      badge: "Equity",
      badgeColor: "#10B981",
    };
  }

  if (h.class === "lp_units") {
    const value = (h.lpPct / 100) * fund.nav;
    return {
      key: "lp-co-owner-fund",
      label: "Co-Owner Fund LP",
      sublabel: `${h.lpPct}% LP interest`,
      value,
      color: "#6366F1",
      logoUrl: "https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/1691979830329-NJ5W8U6WT1N0F60PRNXV/Nth.png",
      badge: "LP Units",
      badgeColor: "#6366F1",
    };
  }

  if (h.class === "debt") {
    const isFund = h.entityId === "co-owner-fund";
    const co = isFund ? null : portfolio.find((c) => c.id === h.entityId);
    const label = isFund ? "Co-Owner Fund LP" : (co?.name ?? h.entityId);
    const color = isFund ? "#F59E0B" : (co?.accentColor ?? "#F59E0B");
    return {
      key: `debt-${h.entityId}-${h.instrument}`,
      label,
      sublabel: `${h.instrument} · ${fmt(h.principal)} principal`,
      value: h.currentValue,
      color,
      logoUrl: isFund
        ? "https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/1691979830329-NJ5W8U6WT1N0F60PRNXV/Nth.png"
        : co?.logoUrl,
      badge: h.instrument,
      badgeColor: "#F59E0B",
    };
  }

  return null;
}

// ── Fund-level allocation (default view when no investor selected) ─────────────

function fundSegments() {
  return portfolio
    .filter((c) => c.status !== "written-off")
    .map((c) => ({
      key: c.id,
      label: c.name,
      sublabel: `${c.ownership}% owned · ${c.stage}`,
      value: c.currentValue,
      color: c.accentColor,
      logoUrl: c.logoUrl,
      badge: "Equity",
      badgeColor: "#10B981",
    }));
}

// ── Donut chart ───────────────────────────────────────────────────────────────

interface Segment {
  key: string;
  label: string;
  sublabel: string;
  value: number;
  color: string;
  logoUrl?: string;
  badge: string;
  badgeColor: string;
  pct: number;
  arcLen: number;
  dashoffset: number;
}

function buildSegments(items: ReturnType<typeof fundSegments>): Segment[] {
  const total = items.reduce((s, i) => s + i.value, 0);
  const CX = 120, CY = 120, R = 78;
  const circumference = 2 * Math.PI * R;
  let cumulative = 0;
  return items.map((item) => {
    const pct = total > 0 ? item.value / total : 0;
    const arcLen = pct * circumference;
    const dashoffset = -cumulative;
    cumulative += arcLen;
    return { ...item, pct, arcLen, dashoffset };
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PortfolioAllocationChart({
  investor,
  onCompanyClick,
}: {
  investor?: Investor;
  onCompanyClick?: (id: string) => void;
}) {
  const rawItems = investor
    ? (investor.holdings.map(resolveHolding).filter(Boolean) as ReturnType<typeof fundSegments>)
    : fundSegments();

  const segments = buildSegments(rawItems);
  const totalValue = segments.reduce((s, seg) => s + seg.value, 0);
  const CX = 120, CY = 120, R = 78, SW = 42;
  const circumference = 2 * Math.PI * R;

  // For investor view: show cost basis / MOIC if equity-only, otherwise just total value
  const equitySegs = investor
    ? investor.holdings.filter((h) => h.class === "equity")
    : null;
  const showMoic = !investor;
  const fundActive = portfolio.filter((c) => c.status !== "written-off");
  const fundInvested = fundActive.reduce((s, c) => s + c.invested, 0);
  const fundMoic = (totalValue / fundInvested).toFixed(2);

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
      {/* Donut */}
      <div className="shrink-0">
        <svg
          viewBox="0 0 240 240"
          className="w-52 h-52"
          aria-label="Portfolio allocation"
        >
          {/* Track ring */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#111D2E" strokeWidth={SW} />

          {/* Segments */}
          {segments.map((seg) => (
            <circle
              key={seg.key}
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke={seg.color}
              strokeWidth={SW}
              strokeDasharray={`${seg.arcLen} ${circumference}`}
              strokeDashoffset={seg.dashoffset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${CX} ${CY})`}
              opacity="0.85"
            />
          ))}

          {/* Center */}
          <text x={CX} y={CY - 10} textAnchor="middle" fontSize="18" fontWeight="700"
            fill="#E2E8F0" fontFamily="Poppins, sans-serif">
            {fmt(totalValue)}
          </text>
          <text x={CX} y={CY + 8} textAnchor="middle" fontSize="9" fill="#64748B"
            fontFamily="Poppins, sans-serif" letterSpacing="0.08em">
            {investor ? "TOTAL VALUE" : "PORTFOLIO VALUE"}
          </text>
          {showMoic && (
            <text x={CX} y={CY + 24} textAnchor="middle" fontSize="12" fontWeight="600"
              fill="#10B981" fontFamily="Poppins, sans-serif">
              {fundMoic}x MOIC
            </text>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-2 w-full">
        {segments.map((seg) => {
          const companyId = portfolio.find((c) => c.name === seg.label)?.id;
          const isClickable = !!companyId && !!onCompanyClick;
          return (
          <div
            key={seg.key}
            onClick={() => isClickable && onCompanyClick(companyId!)}
            className={`flex items-center gap-3 p-2.5 rounded-lg bg-[#111D2E] transition-colors ${isClickable ? "hover:bg-[#141f30] cursor-pointer" : ""}`}
          >
            {/* Color dot */}
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />

            {/* Logo or initials */}
            {seg.logoUrl ? (
              <div className="w-6 h-6 rounded overflow-hidden bg-white flex items-center justify-center p-0.5 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={seg.logoUrl} alt={seg.label} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div
                className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center shrink-0"
                style={{ background: `${seg.color}20`, color: seg.color }}
              >
                {seg.label[0]}
              </div>
            )}

            {/* Name + sublabel */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isClickable ? "text-slate-200 hover:text-emerald-400 transition-colors" : "text-slate-200"}`}>{seg.label}</p>
              <p className="text-xs text-slate-600 truncate">{seg.sublabel}</p>
            </div>

            {/* Holding class badge */}
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0 hidden sm:inline"
              style={{ background: `${seg.badgeColor}18`, color: seg.badgeColor }}
            >
              {seg.badge}
            </span>

            {/* Bar */}
            <div className="w-16 h-1.5 bg-[#1E2D3D] rounded-full overflow-hidden shrink-0">
              <div
                className="h-full rounded-full"
                style={{ width: `${seg.pct * 100}%`, background: seg.color, opacity: 0.8 }}
              />
            </div>

            {/* % and value */}
            <span className="text-xs font-semibold tabular-nums w-10 text-right shrink-0"
              style={{ color: seg.color }}>
              {(seg.pct * 100).toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400 tabular-nums w-14 text-right shrink-0">
              {fmt(seg.value)}
            </span>
          </div>
          );
        })}

        {/* Total row */}
        <div className="flex items-center justify-between border-t border-[#1E2D3D] pt-2 mt-1 px-2.5">
          <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total</span>
          <span className="text-sm font-semibold text-slate-200 tabular-nums">{fmt(totalValue)}</span>
        </div>
      </div>
    </div>
  );
}
