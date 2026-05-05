"use client";
import { Fragment, useMemo, useState } from "react";
import { ChevronDown, Pencil, RotateCcw } from "lucide-react";
import type { PortfolioCompany } from "@/lib/types";
import type { DirectInvestor, DirectPosition } from "@/lib/investors";
import { computeFundNav, LP_TOTAL_UNITS } from "@/lib/data";

// ── Company accent colors ────────────────────────────────────────────────
const ACCENT: Record<string, string> = {
  "audily":         "#8B5CF6",
  "sbr2th":         "#EC4899",
  "certd":          "#10B981",
  "merchant-boxes": "#F59E0B",
  "falconer":       "#3B82F6",
  "nth-venture":    "#64748B",
  "sentius":        "#06B6D4",
  "galileo":        "#6366F1",
  "co-owner-fund":  "#14B8A6",
};
const FALLBACK_INITIALS: Record<string, string> = {
  "audily": "AU", "sbr2th": "S2", "certd": "PS",
  "merchant-boxes": "MB", "falconer": "FL",
  "nth-venture": "NV", "sentius": "SD", "galileo": "GC",
  "co-owner-fund": "CO",
};
const EXTRA_LOGOS: Record<string, string> = {
  "nth-venture": "https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/1691979830329-NJ5W8U6WT1N0F60PRNXV/Nth.png",
};

const accentFor   = (id?: string) => ACCENT[id ?? ""] ?? "#94A3B8";
const initialsFor = (id?: string, name?: string) =>
  FALLBACK_INITIALS[id ?? ""] ?? (name ?? "??").slice(0, 2).toUpperCase();

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000   ? `$${(n / 1_000).toFixed(1)}K`
  :                `$${Math.round(n).toLocaleString()}`;
const fmtShares = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(0)}K`
  :                n.toLocaleString();
const fmtDate = (iso: string) => {
  const [y, m] = iso.split("-");
  return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1]} ${y}`;
};
const gainColor = (n: number) => n >= 0 ? "#34D399" : "#F87171";
const isCommonOrRSU = (type: string) => type === "Class A Common" || type === "RSU";
const isCommon      = (type: string) => type === "Class A Common";

interface Props {
  investor: DirectInvestor;
  portfolio: PortfolioCompany[];
  userValuations: Record<string, number>;
  onOpenValuationModal: (company: PortfolioCompany, pendingVal: number) => void;
  onResetValuation: (companyId: string) => void;
  onSelectCompany: (companyId: string) => void;
}

export default function DirectHoldingsTab({
  investor, portfolio, userValuations, onOpenValuationModal, onResetValuation, onSelectCompany,
}: Props) {
  const [open, setOpen] = useState(new Set(["equity", "convertibles", "notes", "lp", "ownership"]));
  const toggle = (k: string) => setOpen(p => { const s = new Set(p); s.has(k) ? s.delete(k) : s.add(k); return s; });
  const [openCompanies, setOpenCompanies] = useState<Set<string>>(new Set());
  const toggleCompany = (k: string) => setOpenCompanies(p => { const s = new Set(p); s.has(k) ? s.delete(k) : s.add(k); return s; });
  const [showConverted, setShowConverted] = useState(false);
  // 3,250 preferred shares (1,250 SAFE→Series A + 2,000 Series A Pref) convert 1:1,000
  const PREF_CONVERSION = { companyId: "audily", extraShares: 3_250 * 1_000 } as const;

  const portMap = useMemo(() => Object.fromEntries(portfolio.map(c => [c.id, c])), [portfolio]);

  const defaultImplied = (c: PortfolioCompany) =>
    c.customPricePerShare && c.totalShares ? c.customPricePerShare * c.totalShares : c.impliedValuation;

  const effectiveImplied = (companyId: string) => {
    const c = portMap[companyId];
    return c ? (userValuations[companyId] ?? defaultImplied(c)) : null;
  };

  const effectivePps = (companyId: string): number | null => {
    const c = portMap[companyId];
    if (!c || !c.totalShares) return null;
    return (userValuations[companyId] ?? defaultImplied(c)) / c.totalShares;
  };

  const defaultPps = (companyId: string): number | null => {
    const c = portMap[companyId];
    if (!c || !c.totalShares) return null;
    return defaultImplied(c) / c.totalShares;
  };

  // Bottom-up fund NAV with the user's share-price overrides applied. Drives the
  // LP Interest mark-to-NAV below so editing any company's share price flows
  // through to the LP-interest current value.
  const dynamicFundNav = useMemo(
    () => computeFundNav(userValuations),
    [userValuations]
  );

  const estVal = (p: DirectPosition): number => {
    if (p.shares && p.companyId && isCommonOrRSU(p.securityType)) {
      const pps = effectivePps(p.companyId);
      if (pps !== null) return p.shares * pps;
    }
    // LP Interest in Co-Owner Fund LP — value = LP basis (units at $1 par)
    // × current NAV/unit, recomputed whenever underlying share prices change.
    if (p.category === "LP Interests" && p.companyId === "co-owner-fund" && LP_TOTAL_UNITS > 0) {
      return Math.round((dynamicFundNav / LP_TOTAL_UNITS) * p.costBasis);
    }
    return p.estimatedValue;
  };

  const { positions } = investor;

  const commonPos  = positions.filter(p => p.category === "Purchased Equity" && isCommonOrRSU(p.securityType));
  const convertPos = positions.filter(p => p.category === "Purchased Equity" && !isCommonOrRSU(p.securityType));
  const notesPos   = positions.filter(p => p.category === "Short-term Notes");
  const earnedPos  = positions.filter(p => p.category === "Earned Equity");
  const lpPos      = positions.filter(p => p.category === "LP Interests");

  const sum = (ps: DirectPosition[], f: (p: DirectPosition) => number) =>
    ps.reduce((s, p) => s + f(p), 0);

  const commonCost      = sum(commonPos,  p => p.costBasis);
  const commonValue     = sum(commonPos,  p => estVal(p));
  const convertCost     = sum(convertPos, p => p.costBasis);
  const convertValue    = sum(convertPos, p => estVal(p));
  const convertInterest = sum(convertPos, p => p.interestDividend ?? 0);
  // "New cash invested" — net of any portion of a note's principal that was rolled
  // in from a prior note (avoids double-counting when a note is consolidated).
  const creditPrincipal = sum(notesPos,   p => (p.principal ?? 0) - (p.rolledInFromPrior ?? 0));
  const creditRepaid    = sum(notesPos,   p => p.repaid ?? 0);
  // Rolled / capitalized — total principal (and capitalized interest) that flowed forward
  // into a consolidating note. Reads from rolledInFromPrior on the destination note.
  const creditRolled    = sum(notesPos,   p => p.rolledInFromPrior ?? 0);
  const creditInterest  = sum(notesPos,   p => p.interestDividend ?? 0);
  const earnedValue       = sum(earnedPos,  p => estVal(p));
  const earnedEquityValue = sum(earnedPos.filter(p => p.securityType !== "RSU"), p => estVal(p));
  const lpInterestsCost   = sum(lpPos, p => p.costBasis);
  const lpInterestsValue  = sum(lpPos, p => estVal(p));

  const equityCost     = commonCost + convertCost;
  const equityValue    = commonValue + convertValue;

  const creditOutstanding = sum(notesPos, p => p.estimatedValue);
  const amountInvested = equityCost + creditPrincipal + lpInterestsCost;
  const amountRepaid   = creditRepaid;
  const principalBasis = amountInvested - amountRepaid;
  const cashReceived   = amountRepaid + creditInterest + convertInterest;
  const portfolioValue = equityValue + earnedEquityValue + lpInterestsValue;    // RSUs excluded; notes fully repaid
  const totalReturn    = portfolioValue + creditInterest + convertInterest + amountRepaid;
  const totalMoic      = amountInvested > 0 ? totalReturn / amountInvested : null;
  const dpi            = amountInvested > 0 ? cashReceived / amountInvested : null;
  const tvpi           = amountInvested > 0 ? (portfolioValue + cashReceived) / amountInvested : null;

  // ── Equity section (combined common + earned) — grouped per company ───────
  // RSU value is excluded from totals (consistent with portfolioValue), but RSU rows still display.
  const valueForTotals = (p: DirectPosition) => p.securityType === "RSU" ? 0 : estVal(p);

  type EquityGroup = {
    key: string; companyId?: string; company: string; positions: DirectPosition[];
    totalShares: number; totalCost: number; totalValue: number; totalDist: number;
    weightedBasis: number | null; returnPct: number | null;
    pps: number | null; pctFD: number | null; pctVoting: number | null;
  };

  const equityGroups: EquityGroup[] = (() => {
    const map: Record<string, { companyId?: string; company: string; positions: DirectPosition[] }> = {};
    for (const p of [...commonPos, ...earnedPos]) {
      const key = p.companyId ?? p.company;
      if (!map[key]) map[key] = { companyId: p.companyId, company: p.company, positions: [] };
      map[key].positions.push(p);
    }
    return Object.entries(map).map(([key, g]) => {
      const totalShares = g.positions.reduce((s, p) => s + (p.shares ?? 0), 0);
      const totalCost   = g.positions.reduce((s, p) => s + p.costBasis, 0);
      const totalValue  = g.positions.reduce((s, p) => s + valueForTotals(p), 0);
      const totalDist   = g.positions.reduce((s, p) => s + (p.interestDividend ?? 0), 0);
      const weightedBasis = totalShares > 0 ? totalCost / totalShares : null;
      const returnPct     = totalCost > 0 ? (totalValue + totalDist - totalCost) / totalCost : null;
      const c   = g.companyId ? portMap[g.companyId] : undefined;
      const pps = g.companyId ? effectivePps(g.companyId) : null;
      const pctFD     = c?.totalShares ? totalShares / c.totalShares : null;
      const pctVoting = c?.commonSharesOutstanding ? totalShares / c.commonSharesOutstanding : null;
      return { key, ...g, totalShares, totalCost, totalValue, totalDist, weightedBasis, returnPct, pps, pctFD, pctVoting };
    }).sort((a, b) => b.totalValue - a.totalValue);
  })();

  const equitySectionShares  = equityGroups.reduce((s, g) => s + g.totalShares, 0);
  const equitySectionCost    = equityGroups.reduce((s, g) => s + g.totalCost,   0);
  const equitySectionValue   = equityGroups.reduce((s, g) => s + g.totalValue,  0);
  const equitySectionDist    = equityGroups.reduce((s, g) => s + g.totalDist,   0);
  const equitySectionBasis   = equitySectionShares > 0 ? equitySectionCost / equitySectionShares : null;
  const equitySectionReturn  = equitySectionCost > 0 ? (equitySectionValue + equitySectionDist - equitySectionCost) / equitySectionCost : null;

  // Convertibles section aggregates (own card)
  const convertReturn = convertCost > 0 ? (convertValue + convertInterest - convertCost) / convertCost : null;

  // ── Company ownership breakdown (Class A Common only, no RSUs) ──────────
  const ownershipMap: Record<string, number> = {};
  for (const p of positions) {
    if (!p.companyId || !p.shares || !isCommon(p.securityType)) continue;
    ownershipMap[p.companyId] = (ownershipMap[p.companyId] ?? 0) + p.shares;
  }
  const ownershipRows = Object.entries(ownershipMap)
    .map(([id, shares]) => {
      const c = portMap[id];
      return { id, shares, company: c };
    })
    .filter(r => r.company)
    .sort((a, b) => (b.company!.totalShares ? b.shares / b.company!.totalShares : 0) -
                    (a.company!.totalShares ? a.shares / a.company!.totalShares : 0));

  // ── Donut: by company ─────────────────────────────────────────────────────
  const byCompany: Record<string, { id?: string; name: string; value: number }> = {};
  for (const p of positions) {
    const v = estVal(p) + (p.interestDividend ?? 0);
    if (v <= 0) continue;
    const key = p.companyId ?? p.company;
    if (!byCompany[key]) byCompany[key] = { id: p.companyId, name: p.company, value: 0 };
    byCompany[key].value += v;
  }
  const donutItems = Object.values(byCompany).sort((a, b) => b.value - a.value);
  const donutTotal = donutItems.reduce((s, d) => s + d.value, 0);

  const cx = 80, cy = 80, R = 62, r = 40;
  let ang = -Math.PI / 2;
  const arcs = donutItems.map(d => {
    const sweep = donutTotal > 0 ? (d.value / donutTotal) * 2 * Math.PI : 0;
    const x1 = cx + R * Math.cos(ang), y1 = cy + R * Math.sin(ang);
    ang += sweep;
    const x2 = cx + R * Math.cos(ang), y2 = cy + R * Math.sin(ang);
    const ix1 = cx + r * Math.cos(ang - sweep), iy1 = cy + r * Math.sin(ang - sweep);
    const ix2 = cx + r * Math.cos(ang), iy2 = cy + r * Math.sin(ang);
    const large = sweep > Math.PI ? 1 : 0;
    return { ...d, path: `M${x1},${y1} A${R},${R},0,${large},1,${x2},${y2} L${ix2},${iy2} A${r},${r},0,${large},0,${ix1},${iy1} Z` };
  });

  // ── Benchmarks: Cambridge Associates VC, ~year-4 fund ────────────────────
  const BM = {
    dpi:  { q1: 0.18, q3: 0.01 },  // growth equity top/bottom quartile DPI at yr 4
    tvpi: { q1: 1.45, q3: 0.90 },  // growth equity top/bottom quartile TVPI at yr 4
  } as const;

  const BenchmarkBar = ({ value, q1, q3 }: { value: number | null; q1: number; q3: number }) => {
    const pct = value !== null ? Math.max(0, Math.min(1, (value - q3) / (q1 - q3))) : null;
    const aboveQ1 = value !== null && value >= q1;
    const belowQ3 = value !== null && value < q3;
    const dotColor = aboveQ1 ? "#10B981" : belowQ3 ? "#F87171" : "#e2e8f0";
    return (
      <div className="mt-2">
        <div className="flex items-center justify-between mb-1" style={{ fontSize: 8, color: "#475569" }}>
          <span>Q3 {q3.toFixed(2)}×</span>
          <span className="text-[7px] text-slate-700">GE yr-4</span>
          <span>Q1 {q1.toFixed(2)}×</span>
        </div>
        <div className="relative h-1 rounded-full overflow-visible" style={{ background: "#1E2D3D" }}>
          <div className="absolute inset-0 rounded-full opacity-30"
            style={{ background: "linear-gradient(to right, #F87171, #10B981)" }} />
          {pct !== null && (
            <div className="absolute top-1/2 w-2 h-2 rounded-full border border-[#0D1421]"
              style={{ left: `${pct * 100}%`, transform: "translate(-50%, -50%)", background: dotColor }} />
          )}
        </div>
        <p className="mt-1" style={{ fontSize: 8, color: aboveQ1 ? "#10B981" : belowQ3 ? "#F87171" : "#64748B" }}>
          {value === null ? "" : aboveQ1 ? "▲ Top quartile" : belowQ3 ? "▼ Below Q3" : "● Mid-range"}
        </p>
      </div>
    );
  };

  // ── Sub-components ────────────────────────────────────────────────────────
  const TH = ({ children, wide }: { children?: React.ReactNode; wide?: boolean }) => (
    <th className={`py-2 px-3 text-left text-[10px] text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap${wide ? " min-w-[160px]" : ""}`}>{children}</th>
  );
  const TD = ({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
    <td className={`py-2.5 px-3 text-xs ${className}`} style={style}>{children}</td>
  );

  const SectionHeader = ({ label, tableKey, accentCol, stats }: {
    label: string; tableKey: string; accentCol: string;
    stats: { label: string; value: string; color?: string }[];
  }) => (
    <button onClick={() => toggle(tableKey)} className="w-full hover:bg-[#111D2E]/60 transition-colors">
      <div className="sm:hidden">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accentCol }} />
            <span className="text-sm font-semibold text-slate-200">{label}</span>
          </div>
          <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${open.has(tableKey) ? "rotate-180" : ""}`} />
        </div>
        <div className={`grid border-t border-[#1E2D3D] divide-x divide-[#1E2D3D]`} style={{ gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}>
          {stats.map(s => (
            <div key={s.label} className="flex flex-col justify-center px-2 py-2.5">
              <p className="text-[8px] text-slate-600 uppercase tracking-widest font-medium leading-tight">{s.label}</p>
              <p className="text-xs font-bold mt-0.5 tabular-nums" style={{ color: s.color ?? "#e2e8f0" }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden sm:flex items-stretch">
        <div className="flex items-center gap-3 px-4 py-3.5 shrink-0 min-w-[160px] border-r border-[#1E2D3D]">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: accentCol }} />
          <span className="text-sm font-semibold text-slate-200 whitespace-nowrap">{label}</span>
        </div>
        <div className="flex flex-1 items-stretch divide-x divide-[#1E2D3D] overflow-hidden">
          {stats.map(s => (
            <div key={s.label} className="flex flex-col justify-center px-4 py-2.5 flex-1 min-w-0">
              <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium whitespace-nowrap">{s.label}</p>
              <p className="text-sm font-bold mt-0.5 tabular-nums whitespace-nowrap" style={{ color: s.color ?? "#e2e8f0" }}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center px-4 shrink-0 border-l border-[#1E2D3D]">
          <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${open.has(tableKey) ? "rotate-180" : ""}`} />
        </div>
      </div>
    </button>
  );

  const CompanyAvatar = ({ id, name }: { id?: string; name: string }) => {
    const portLogo = id ? portMap[id]?.logoUrl : undefined;
    const extraLogo = id ? EXTRA_LOGOS[id] : undefined;
    const logoUrl = portLogo ?? extraLogo;
    if (logoUrl) {
      return (
        <div className="w-6 h-6 rounded overflow-hidden bg-white flex items-center justify-center p-0.5 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={name} className="w-full h-full object-contain"
            style={!portLogo && extraLogo ? { filter: "brightness(0)" } : undefined} />
        </div>
      );
    }
    return (
      <div className="w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center shrink-0"
        style={{ background: `${accentFor(id)}22`, color: accentFor(id) }}>
        {initialsFor(id, name)}
      </div>
    );
  };

  const CompanyName = ({ p, className = "" }: { p: DirectPosition; className?: string }) => {
    const name = p.company.replace(" Inc.", "").replace(" Recruiting", "");
    const c = p.companyId ? portMap[p.companyId] : undefined;
    if (c) {
      return (
        <button className={`font-medium text-slate-200 hover:text-white transition-colors text-left underline decoration-slate-600 hover:decoration-slate-400 ${className}`}
          onClick={(e) => { e.stopPropagation(); onSelectCompany(c.id); }}>
          {name}
        </button>
      );
    }
    return <span className={`font-medium text-slate-200 ${className}`}>{name}</span>;
  };

  // Share price cell with pencil (for common/RSU in portfolio companies)
  const PriceEditCell = ({ p }: { p: DirectPosition }) => {
    if (!p.shares || !p.companyId || !isCommonOrRSU(p.securityType)) return null;
    const c = portMap[p.companyId];
    if (!c) return null;
    const hasCustom = userValuations[p.companyId] !== undefined;
    const defPps = defaultPps(p.companyId);
    const effPps = effectivePps(p.companyId);
    return (
      <div className="flex items-start gap-1">
        <div className="flex flex-col gap-0.5">
          {hasCustom && defPps !== null && (
            <span className="text-slate-600 line-through text-[10px] tabular-nums leading-tight">${defPps.toFixed(4)}</span>
          )}
          <span className="tabular-nums leading-tight" style={{ color: hasCustom ? "#34D399" : "#e2e8f0" }}>
            ${(effPps ?? defPps ?? 0).toFixed(4)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 mt-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); const iv = effectiveImplied(p.companyId!); onOpenValuationModal(c, iv ?? defaultImplied(c)); }}
            className="p-0.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: hasCustom ? "#34D399" : "#64748B" }}
            title="Edit valuation"
          >
            <Pencil size={10} />
          </button>
          {hasCustom && (
            <button onClick={(e) => { e.stopPropagation(); onResetValuation(p.companyId!); }}
              className="p-0.5 rounded hover:bg-rose-500/10 text-slate-600 hover:text-rose-400 transition-colors"
              title="Reset">
              <RotateCcw size={9} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const EarnedValCell = ({ p }: { p: DirectPosition }) => {
    const c = p.companyId ? portMap[p.companyId] : undefined;
    const v = estVal(p);
    if (!p.shares || !p.companyId || !isCommonOrRSU(p.securityType) || !c) {
      return <span style={{ color: v > 0 ? "#F59E0B" : "#64748B" }}>{v > 0 ? fmt(v) : "—"}</span>;
    }
    const hasCustom = userValuations[p.companyId] !== undefined;
    const defPps = defaultPps(p.companyId);
    const effPps = effectivePps(p.companyId);
    return (
      <div className="flex items-start gap-1">
        <div className="flex flex-col gap-0.5">
          {hasCustom && defPps !== null && p.shares && (
            <span className="text-slate-600 line-through text-[10px] tabular-nums leading-tight">{fmt(p.shares * defPps)}</span>
          )}
          <span className="font-semibold tabular-nums leading-tight" style={{ color: v > 0 ? "#F59E0B" : "#64748B" }}>
            {v > 0 ? fmt(v) : "—"}
          </span>
          {effPps !== null && v > 0 && (
            <span className="text-[9px] text-slate-600 tabular-nums">${effPps.toFixed(4)}/sh</span>
          )}
        </div>
        <div className="flex flex-col gap-0.5 mt-0.5">
          <button onClick={(e) => { e.stopPropagation(); const iv = effectiveImplied(p.companyId!); onOpenValuationModal(c, iv ?? defaultImplied(c)); }}
            className="p-0.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: hasCustom ? "#F59E0B" : "#64748B" }} title="Edit valuation">
            <Pencil size={10} />
          </button>
          {hasCustom && (
            <button onClick={(e) => { e.stopPropagation(); onResetValuation(p.companyId!); }}
              className="p-0.5 rounded hover:bg-rose-500/10 text-slate-600 hover:text-rose-400 transition-colors" title="Reset">
              <RotateCcw size={9} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">

      {/* ══ Hero card ════════════════════════════════════════════════════════ */}
      <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">

        {/* ── Metrics strip ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-[#1E2D3D] divide-y sm:divide-y-0 sm:divide-x divide-[#1E2D3D]">
          {/* Combined: Portfolio Value + Investor Basis (with cash returned highlight) */}
          <div className="px-3 sm:px-4 py-3 sm:py-3.5 flex flex-col">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium">Portfolio Value</p>
                <p className="text-sm sm:text-base font-bold mt-1 tabular-nums" style={{ color: "#10B981" }}>{fmt(portfolioValue)}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium">Investor Basis</p>
                <p className="text-sm sm:text-base font-bold mt-1 tabular-nums text-slate-200">{fmt(principalBasis)}</p>
              </div>
            </div>

            {/* Cash returned — emphasized */}
            <div className="mt-2 sm:mt-3 px-2.5 py-2 rounded-md border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-baseline justify-between">
                <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: "#34D399" }}>Cash Returned</p>
                <p className="text-sm sm:text-base font-bold tabular-nums" style={{ color: "#34D399" }}>{fmt(cashReceived)}</p>
              </div>
              <div className="mt-1 space-y-0.5 text-[9px] text-slate-500 tabular-nums">
                <div className="flex justify-between gap-2"><span>Principal returned</span><span className="text-slate-400">{fmt(creditRepaid)}</span></div>
                <div className="flex justify-between gap-2"><span>Interest paid</span><span className="text-slate-400">{fmt(creditInterest)}</span></div>
                <div className="flex justify-between gap-2"><span>Distributions</span><span className="text-slate-400">{fmt(convertInterest)}</span></div>
              </div>
            </div>

            <div className="mt-2 space-y-0.5 text-[9px] tabular-nums">
              <div className="flex justify-between gap-2"><span className="text-slate-600">Total invested</span><span className="text-slate-400">{fmt(amountInvested)}</span></div>
            </div>
          </div>

          {/* DPI */}
          <div className="px-3 sm:px-4 py-3 sm:py-3.5 flex flex-col">
            <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium">DPI</p>
            <p className="text-sm sm:text-base font-bold mt-1 tabular-nums" style={{ color: dpi !== null && dpi >= BM.dpi.q1 ? "#34D399" : dpi !== null && dpi >= BM.dpi.q3 ? "#e2e8f0" : "#94A3B8" }}>
              {dpi !== null ? `${dpi.toFixed(2)}×` : "—"}
            </p>
            <BenchmarkBar value={dpi} q1={BM.dpi.q1} q3={BM.dpi.q3} />
            <div className="mt-2 pt-2 border-t border-[#1E2D3D]/60 space-y-0.5 text-[9px] tabular-nums">
              <div className="flex justify-between gap-2"><span className="text-slate-600">Cash returned</span><span style={{ color: "#34D399" }}>{fmt(cashReceived)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-600">Principal returned</span><span className="text-emerald-400">{fmt(creditRepaid)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-600">Interest paid</span><span className="text-amber-400">{fmt(creditInterest)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-600">Distributions</span><span className="text-amber-400">{fmt(convertInterest)}</span></div>
            </div>
          </div>

          {/* TVPI */}
          <div className="px-3 sm:px-4 py-3 sm:py-3.5 flex flex-col">
            <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium">TVPI</p>
            <p className="text-sm sm:text-base font-bold mt-1 tabular-nums" style={{ color: tvpi !== null && tvpi >= BM.tvpi.q1 ? "#10B981" : tvpi !== null && tvpi >= BM.tvpi.q3 ? "#e2e8f0" : "#F87171" }}>
              {tvpi !== null ? `${tvpi.toFixed(2)}×` : "—"}
            </p>
            <BenchmarkBar value={tvpi} q1={BM.tvpi.q1} q3={BM.tvpi.q3} />
            <div className="mt-2 pt-2 border-t border-[#1E2D3D]/60 space-y-0.5 text-[9px] tabular-nums">
              <div className="flex justify-between gap-2"><span className="text-slate-600">Cash returned</span><span style={{ color: "#34D399" }}>{fmt(cashReceived)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-600">Investor basis</span><span className="text-slate-300">{fmt(principalBasis)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-600">Total value</span><span className="text-emerald-400">{fmt(portfolioValue)}</span></div>
            </div>
          </div>
        </div>

        {/* ── Investor meta ── */}
        <div className="border-b border-[#1E2D3D] px-4 sm:px-5 py-3 bg-[#080E1A]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium shrink-0">Direct Shareholder</p>
            <p className="text-[10px] text-slate-400 font-semibold">{investor.name}</p>
            <p className="text-[10px] text-slate-600">Investor since {investor.investorSince}</p>
            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />nth Venture Inc.
            </div>
          </div>
        </div>

        {/* ── Allocation bars + donut ── */}
        <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-[#1E2D3D]">

          {/* LEFT: allocation + MOIC */}
          <div className="flex-1 px-4 sm:px-5 py-4 sm:py-5">

            {/* Total MOIC box */}
            <div className="mb-5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest font-medium mb-0.5">Total MOIC</p>
                <p className="text-2xl font-bold tabular-nums" style={{ color: totalMoic && totalMoic >= 1 ? "#10B981" : "#F87171" }}>
                  {totalMoic !== null ? `${totalMoic.toFixed(2)}×` : "—"}
                </p>
              </div>
              <div className="text-right text-[10px] text-slate-600 tabular-nums space-y-0.5">
                <p>{fmt(totalReturn)} total return</p>
                <p>on {fmt(amountInvested)} invested</p>
                <p style={{ color: "#34D399" }}>{fmt(totalReturn - amountInvested)} gain</p>
              </div>
            </div>

            {/* Allocation bars — overview style */}
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-medium mb-3">Capital Allocated</p>
            {[
              { label: "Equity",       amount: commonCost,      color: "#10B981" },
              { label: "Convertibles", amount: convertCost,     color: "#F59E0B" },
              { label: "Credit",       amount: creditPrincipal, color: "#6366F1" },
              { label: "LP Interests", amount: lpInterestsCost, color: "#A78BFA" },
            ].filter(b => b.amount > 0).map(b => {
              const pct = amountInvested > 0 ? b.amount / amountInvested : 0;
              return (
                <div key={b.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: b.color }} />
                      <span className="text-xs text-slate-300 font-medium">{b.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs tabular-nums text-slate-400">{fmt(b.amount)}</span>
                      <span className="text-[10px] tabular-nums text-slate-600 w-8 text-right">{(pct * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-[#111D2E] rounded-full overflow-hidden mb-3">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(pct * 100).toFixed(1)}%`, background: b.color, opacity: 0.8 }} />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t border-[#1E2D3D] flex items-center justify-between">
              <span className="text-[10px] text-slate-600 uppercase tracking-wider">Total Invested</span>
              <span className="text-xs font-semibold text-slate-300 tabular-nums">{fmt(amountInvested)}</span>
            </div>
          </div>

          {/* RIGHT: donut + legend */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 px-4 sm:px-5 py-4 sm:py-5 flex-1">
            <div className="shrink-0 flex justify-center">
              <svg width={160} height={160} viewBox="0 0 160 160">
                {arcs.map((a, i) => <path key={i} d={a.path} fill={accentFor(a.id)} fillOpacity={0.85} />)}
                <text x={80} y={76} textAnchor="middle" fill="#e2e8f0" fontSize={13} fontWeight="700" fontFamily="inherit">{fmt(portfolioValue)}</text>
                <text x={80} y={91} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="inherit">est. portfolio</text>
              </svg>
            </div>
            <div className="flex flex-col gap-2 content-center justify-center min-w-0 flex-1">
              {donutItems.map((d, i) => (
                <div key={i} className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accentFor(d.id) }} />
                  {d.id && portMap[d.id] ? (
                    <button className="text-xs text-slate-400 hover:text-white transition-colors text-left truncate flex-1"
                      onClick={() => onSelectCompany(d.id!)}>
                      {d.name.replace(" Inc.", "").replace(" Recruiting", "")}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 truncate flex-1">{d.name.replace(" Inc.", "").replace(" Recruiting", "")}</span>
                  )}
                  <span className="text-xs font-semibold tabular-nums text-slate-200 shrink-0">{fmt(d.value)}</span>
                  <span className="text-[10px] text-slate-600 shrink-0 w-10 text-right">{((d.value / donutTotal) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ 1. Equity ════════════════════════════════════════════════════════ */}
      <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
        <div className="border-b border-[#1E2D3D]">
          <SectionHeader label="Equity" tableKey="equity" accentCol="#10B981" stats={[
            { label: "Cost Basis", value: fmt(equitySectionCost) },
            { label: "Value",      value: fmt(equitySectionValue), color: "#10B981" },
            { label: "Return",     value: equitySectionReturn !== null ? `${(equitySectionReturn * 100).toFixed(1)}%` : "—", color: equitySectionReturn !== null && equitySectionReturn >= 0 ? "#10B981" : "#F87171" },
          ]} />
        </div>
        {open.has("equity") && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                <tr>
                  <TH></TH><TH wide>Company</TH>
                  <TH>Shares</TH><TH>Basis / Sh</TH><TH>Cost</TH><TH>Share Price</TH>
                  <TH>Distributions</TH><TH>Est. Value</TH>
                  <TH>Return</TH><TH>% FD</TH><TH>% Voting</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0D1421]">
                {equityGroups.map(g => {
                  const isOpen = openCompanies.has(g.key);
                  const groupAllRSU = g.positions.every(p => p.securityType === "RSU");
                  return (
                    <Fragment key={`g-${g.key}`}>
                      {/* Summary row */}
                      <tr
                        onClick={() => toggleCompany(g.key)}
                        className={`cursor-pointer hover:bg-[#111D2E]/60 transition-colors${groupAllRSU ? " opacity-70" : ""}`}>
                        <TD>
                          <div className="flex items-center gap-2">
                            <ChevronDown size={12} className={`text-slate-500 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
                            <CompanyAvatar id={g.companyId} name={g.company} />
                          </div>
                        </TD>
                        <TD>
                          <button
                            className="font-medium text-slate-200 hover:text-white transition-colors text-left underline decoration-slate-600 hover:decoration-slate-400"
                            onClick={(e) => { e.stopPropagation(); if (g.companyId && portMap[g.companyId]) onSelectCompany(g.companyId); }}>
                            {g.company.replace(" Inc.", "").replace(" Recruiting", "")}
                          </button>
                          <span className="ml-2 text-[9px] text-slate-600">{g.positions.length} {g.positions.length === 1 ? "lot" : "lots"}</span>
                        </TD>
                        <TD className="text-slate-200 tabular-nums font-medium">{g.totalShares ? fmtShares(g.totalShares) : "—"}</TD>
                        <TD className="text-slate-400 tabular-nums">{g.weightedBasis !== null ? `$${g.weightedBasis.toFixed(4)}` : "—"}</TD>
                        <TD className="text-slate-200 tabular-nums font-medium">{fmt(g.totalCost)}</TD>
                        <TD className="tabular-nums text-slate-400">{g.pps !== null ? `$${g.pps.toFixed(4)}` : "—"}</TD>
                        <TD className="tabular-nums" style={{ color: g.totalDist > 0 ? "#F59E0B" : "#64748B" }}>{g.totalDist > 0 ? fmt(g.totalDist) : "—"}</TD>
                        <TD className="tabular-nums font-semibold" style={{ color: g.totalValue > 0 ? "#34D399" : "#64748B" }}>{g.totalValue > 0 ? fmt(g.totalValue) : "—"}</TD>
                        <TD className="tabular-nums font-semibold" style={{ color: g.returnPct !== null ? gainColor(g.returnPct) : g.totalValue > 0 ? "#34D399" : "#64748B" }}>
                          {g.returnPct !== null ? `${(g.returnPct * 100).toFixed(1)}%` : g.totalValue > 0 ? "∞" : "—"}
                        </TD>
                        <TD className="tabular-nums font-semibold" style={{ color: "#8B5CF6" }}>
                          {g.pctFD !== null ? `${(g.pctFD * 100).toFixed(2)}%` : "—"}
                        </TD>
                        <TD className="tabular-nums font-semibold" style={{ color: "#A78BFA" }}>
                          {g.pctVoting !== null ? `${(g.pctVoting * 100).toFixed(2)}%` : "—"}
                        </TD>
                      </tr>

                      {/* Expanded children */}
                      {isOpen && g.positions.map((p, i) => {
                        const v = estVal(p);
                        const isRSU = p.securityType === "RSU";
                        const dist = p.interestDividend ?? 0;
                        const rowReturn = p.costBasis > 0 ? (v + dist - p.costBasis) / p.costBasis : null;
                        return (
                          <tr key={`g-${g.key}-${i}`} className={`bg-[#080E1A]/60 hover:bg-[#111D2E]/40 transition-colors${isRSU ? " opacity-60" : ""}`}>
                            <TD>{null}</TD>
                            <TD>
                              <div className="pl-6 flex items-center gap-1.5">
                                <span className="text-slate-700">└</span>
                                <span className="text-slate-400 text-[11px]">{p.securityType}</span>
                                {isRSU && <span className="text-[8px] font-semibold px-1 py-0.5 rounded" style={{ background: "#1E293B", color: "#64748B" }}>excl.</span>}
                                <span className="text-slate-600 text-[10px]">· {fmtDate(p.issueDate)}</span>
                              </div>
                            </TD>
                            <TD className="text-slate-300 tabular-nums">{p.shares ? fmtShares(p.shares) : "—"}</TD>
                            <TD className="text-slate-500 tabular-nums">{p.perShareBasis != null ? `$${p.perShareBasis.toFixed(3)}` : p.costBasis === 0 ? "$0" : "—"}</TD>
                            <TD className="text-slate-400 tabular-nums">{p.costBasis > 0 ? fmt(p.costBasis) : "$0"}</TD>
                            <TD className="tabular-nums">
                              {isCommonOrRSU(p.securityType) ? <PriceEditCell p={p} /> : <span className="text-slate-600">—</span>}
                            </TD>
                            <TD className="tabular-nums" style={{ color: dist > 0 ? "#F59E0B" : "#64748B" }}>{dist > 0 ? fmt(dist) : "—"}</TD>
                            <TD className="tabular-nums">
                              {p.costBasis === 0 ? <EarnedValCell p={p} />
                                : <span className="font-semibold" style={{ color: v >= p.costBasis ? "#34D399" : "#F87171" }}>{fmt(v)}</span>}
                            </TD>
                            <TD className="tabular-nums font-semibold" style={{ color: rowReturn !== null ? gainColor(rowReturn) : v > 0 ? "#34D399" : "#64748B" }}>
                              {rowReturn !== null ? `${(rowReturn * 100).toFixed(1)}%` : v > 0 ? "∞" : "—"}
                            </TD>
                            <TD>{null}</TD>
                            <TD>{null}</TD>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}

                {/* Totals row */}
                <tr className="border-t border-[#1E2D3D] bg-[#080E1A]">
                  <td className="py-2 px-3" />
                  <td className="py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total</td>
                  <td className="py-2 px-3 text-xs text-slate-200 tabular-nums font-semibold">{fmtShares(equitySectionShares)}</td>
                  <td className="py-2 px-3 text-xs text-slate-400 tabular-nums">{equitySectionBasis !== null ? `$${equitySectionBasis.toFixed(4)}` : "—"}</td>
                  <td className="py-2 px-3 text-xs text-slate-200 tabular-nums font-semibold">{fmt(equitySectionCost)}</td>
                  <td className="py-2 px-3" />
                  <td className="py-2 px-3 text-xs tabular-nums font-semibold" style={{ color: equitySectionDist > 0 ? "#F59E0B" : "#64748B" }}>{equitySectionDist > 0 ? fmt(equitySectionDist) : "—"}</td>
                  <td className="py-2 px-3 text-xs text-emerald-400 tabular-nums font-semibold">{fmt(equitySectionValue)}</td>
                  <td className="py-2 px-3 text-xs tabular-nums font-semibold" style={{ color: equitySectionReturn !== null ? gainColor(equitySectionReturn) : "#94A3B8" }}>
                    {equitySectionReturn !== null ? `${(equitySectionReturn * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-2 px-3" />
                  <td className="py-2 px-3" />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ 2. Convertibles ═════════════════════════════════════════════════ */}
      <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
        <div className="border-b border-[#1E2D3D]">
          <SectionHeader label="Convertibles" tableKey="convertibles" accentCol="#F59E0B" stats={[
            { label: "Cost Basis",   value: fmt(convertCost) },
            { label: "Value",        value: fmt(convertValue), color: "#F59E0B" },
            { label: "Distributions", value: fmt(convertInterest), color: "#F59E0B" },
            { label: "Return",       value: convertReturn !== null ? `${(convertReturn * 100).toFixed(1)}%` : "—", color: convertReturn !== null && convertReturn >= 0 ? "#10B981" : "#F87171" },
          ]} />
        </div>
        {open.has("convertibles") && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                <tr>
                  <TH></TH><TH wide>Company</TH><TH>Type</TH><TH>Issue Date</TH>
                  <TH>Shares</TH><TH>Basis / Sh</TH><TH>Cost</TH><TH>Share Price</TH>
                  <TH>Distributions</TH><TH>Est. Value</TH><TH>Return</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0D1421]">
                {convertPos.map((p, i) => {
                  const v = estVal(p);
                  const dist = p.interestDividend ?? 0;
                  const rowReturn = p.costBasis > 0 ? (v + dist - p.costBasis) / p.costBasis : null;
                  return (
                    <Fragment key={`v${i}`}>
                      <tr className="hover:bg-[#111D2E]/40 transition-colors">
                        <TD><CompanyAvatar id={p.companyId} name={p.company} /></TD>
                        <TD><CompanyName p={p} /></TD>
                        <TD className="text-slate-400">{p.securityType}</TD>
                        <TD className="text-slate-500">{fmtDate(p.issueDate)}</TD>
                        <TD className="text-slate-300 tabular-nums">{p.shares ? fmtShares(p.shares) : "—"}</TD>
                        <TD className="text-slate-400 tabular-nums">{p.perShareBasis != null ? `$${p.perShareBasis.toFixed(4)}` : "—"}</TD>
                        <TD className="text-slate-300 tabular-nums">{fmt(p.costBasis)}</TD>
                        <TD className="tabular-nums">
                          {p.shares && p.estimatedValue > 0
                            ? <span className="text-slate-400">${(p.estimatedValue / p.shares).toFixed(2)}/sh</span>
                            : <span className="text-slate-600">N/A</span>}
                        </TD>
                        <TD className="tabular-nums" style={{ color: "#F59E0B" }}>{dist > 0 ? fmt(dist) : "—"}</TD>
                        <TD className="tabular-nums font-semibold" style={{ color: v >= p.costBasis ? "#34D399" : "#F87171" }}>{fmt(v)}</TD>
                        <TD className="tabular-nums font-semibold" style={{ color: rowReturn !== null ? gainColor(rowReturn) : "#94A3B8" }}>
                          {rowReturn !== null ? `${(rowReturn * 100).toFixed(1)}%` : "—"}
                        </TD>
                      </tr>
                      {p.notes && (
                        <tr className="bg-[#080E1A]/40">
                          <td className="py-1 px-3" colSpan={11}>
                            <p className="text-[10px] text-slate-500 leading-snug pl-9">{p.notes}</p>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {/* Totals */}
                <tr className="border-t border-[#1E2D3D] bg-[#080E1A]">
                  <td className="py-2 px-3" />
                  <td className="py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total</td>
                  <td /><td />
                  <td />
                  <td />
                  <td className="py-2 px-3 text-xs text-slate-200 tabular-nums font-semibold">{fmt(convertCost)}</td>
                  <td />
                  <td className="py-2 px-3 text-xs tabular-nums font-semibold" style={{ color: "#F59E0B" }}>{fmt(convertInterest)}</td>
                  <td className="py-2 px-3 text-xs tabular-nums font-semibold" style={{ color: "#F59E0B" }}>{fmt(convertValue)}</td>
                  <td className="py-2 px-3 text-xs tabular-nums font-semibold" style={{ color: convertReturn !== null ? gainColor(convertReturn) : "#94A3B8" }}>
                    {convertReturn !== null ? `${(convertReturn * 100).toFixed(1)}%` : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ 3. Credit ═══════════════════════════════════════════════════════ */}
      <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
        <div className="border-b border-[#1E2D3D]">
          <SectionHeader label="Credit" tableKey="notes" accentCol="#6366F1" stats={[
            { label: "New Cash Invested", value: fmt(creditPrincipal) },
            { label: "Cash Repaid",       value: fmt(creditRepaid), color: "#34D399" },
            ...(creditRolled > 0 ? [{ label: "Rolled / Capitalized", value: fmt(creditRolled), color: "#A78BFA" }] : []),
            { label: "Working Principal", value: fmt(creditOutstanding), color: creditOutstanding > 0 ? "#e2e8f0" : "#64748B" },
            { label: "Interest",         value: fmt(creditInterest), color: "#F59E0B" },
            { label: "# Notes",          value: `${notesPos.length}` },
          ]} />
        </div>
        {open.has("notes") && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                <tr>
                  <TH></TH><TH wide>Company</TH><TH>Issue Date</TH>
                  <TH>Principal</TH><TH>Status</TH><TH>Interest</TH><TH>Ann. Return</TH><TH>MOIC</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0D1421]">
                {notesPos.map((p, i) => {
                  const repaid = p.repaid ?? 0;
                  const principal = p.principal ?? 0;
                  const rolledIn = p.rolledInFromPrior ?? 0;
                  const newCash = principal - rolledIn;
                  const rolledOut = p.rolled ? principal - repaid : 0;
                  const cashSettledPct = principal > 0 ? Math.round(repaid / principal * 100) : 0;
                  // For MOIC: rolled notes are 100% settled (cash + roll); non-rolled use cash-repaid only.
                  const effectiveSettled = p.rolled ? principal : repaid;
                  const total = effectiveSettled + (p.interestDividend ?? 0);
                  const moic = p.costBasis > 0 ? total / p.costBasis : null;
                  return (
                    <Fragment key={i}>
                      <tr className="hover:bg-[#111D2E]/40 transition-colors">
                        <TD><CompanyAvatar id={p.companyId} name={p.company} /></TD>
                        <TD><CompanyName p={p} /></TD>
                        <TD className="text-slate-500">{fmtDate(p.issueDate)}</TD>
                        <TD className="text-slate-300 tabular-nums">
                          {fmt(principal)}
                          {rolledIn > 0 && (
                            <span className="block text-[9px] text-slate-600">incl. {fmt(rolledIn)} rolled-in</span>
                          )}
                        </TD>
                        <TD>
                          {p.rolled
                            ? repaid > 0
                              ? <span className="font-semibold"><span className="text-emerald-400">{cashSettledPct}% cash</span><span className="text-slate-500"> + </span><span style={{ color: "#A78BFA" }}>{100 - cashSettledPct}% rolled</span></span>
                              : <span className="font-semibold" style={{ color: "#A78BFA" }}>100% rolled</span>
                            : cashSettledPct === 100
                              ? <span className="text-emerald-400 font-semibold">100% repaid</span>
                              : cashSettledPct > 0
                                ? <span className="text-yellow-400 font-semibold">{cashSettledPct}% repaid</span>
                                : <span className="text-slate-600">Outstanding</span>}
                        </TD>
                        <TD className="tabular-nums font-semibold" style={{ color: "#F59E0B" }}>{p.interestDividend ? fmt(p.interestDividend) : "—"}</TD>
                        <TD className="tabular-nums" style={{ color: "#94A3B8" }}>
                          {p.annualizedReturnPct != null ? `${p.annualizedReturnPct.toFixed(1)}%` : "—"}
                        </TD>
                        <TD className="tabular-nums font-semibold" style={{ color: moic !== null ? gainColor(moic - 1) : "#94A3B8" }}>
                          {moic !== null ? `${moic.toFixed(2)}×` : "—"}
                        </TD>
                      </tr>
                      {p.notes && (
                        <tr className="bg-[#080E1A]/40">
                          <td className="py-1 px-3" colSpan={8}>
                            <p className="text-[10px] text-slate-500 leading-snug pl-9">{p.notes}</p>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ 4. LP Interests ═══════════════════════════════════════════════ */}
      {lpPos.length > 0 && (
        <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
          <div className="border-b border-[#1E2D3D]">
            <SectionHeader label="LP Interests" tableKey="lp" accentCol="#A78BFA" stats={[
              { label: "Cost Basis", value: fmt(lpInterestsCost) },
              { label: "Est. Value", value: fmt(lpInterestsValue), color: "#A78BFA" },
              { label: "MOIC",       value: lpInterestsCost > 0 ? `${(lpInterestsValue / lpInterestsCost).toFixed(2)}×` : "—", color: lpInterestsValue >= lpInterestsCost ? "#10B981" : "#F87171" },
              { label: "# Positions", value: `${lpPos.length}` },
            ]} />
          </div>
          {open.has("lp") && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                  <tr>
                    <TH></TH><TH wide>Fund</TH><TH>Type</TH><TH>Issue Date</TH>
                    <TH>Cost Basis</TH><TH>Est. Value</TH><TH>MOIC</TH>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0D1421]">
                  {lpPos.map((p, i) => {
                    const v = estVal(p);
                    const moic = p.costBasis > 0 ? v / p.costBasis : null;
                    return (
                      <tr key={i} className="hover:bg-[#111D2E]/40 transition-colors">
                        <TD><CompanyAvatar id={p.companyId} name={p.company} /></TD>
                        <TD><CompanyName p={p} /></TD>
                        <TD className="text-slate-400">{p.securityType}</TD>
                        <TD className="text-slate-500">{fmtDate(p.issueDate)}</TD>
                        <TD className="text-slate-300 tabular-nums">{fmt(p.costBasis)}</TD>
                        <TD className="tabular-nums font-semibold" style={{ color: "#A78BFA" }}>{fmt(v)}</TD>
                        <TD className="tabular-nums font-semibold" style={{ color: moic !== null ? gainColor(moic - 1) : "#94A3B8" }}>
                          {moic !== null ? `${moic.toFixed(2)}×` : "—"}
                        </TD>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-[#1E2D3D] bg-[#080E1A]">
                    <td className="py-2 px-3" />
                    <td className="py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total</td>
                    <td /><td />
                    <td className="py-2 px-3 text-xs text-slate-200 tabular-nums font-semibold">{fmt(lpInterestsCost)}</td>
                    <td className="py-2 px-3 text-xs tabular-nums font-semibold" style={{ color: "#A78BFA" }}>{fmt(lpInterestsValue)}</td>
                    <td className="py-2 px-3 text-xs tabular-nums font-semibold" style={{ color: lpInterestsCost > 0 && lpInterestsValue >= lpInterestsCost ? "#10B981" : "#F87171" }}>
                      {lpInterestsCost > 0 ? `${(lpInterestsValue / lpInterestsCost).toFixed(2)}×` : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ 5. Company Ownership ═════════════════════════════════════════════ */}
      <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
        <div className="border-b border-[#1E2D3D]">
          <SectionHeader label="Company Ownership" tableKey="ownership" accentCol="#8B5CF6" stats={[
            { label: "Companies",  value: `${ownershipRows.length}` },
            { label: "Class", value: "Class A Common" },
            { label: "Basis",      value: "Fully diluted" },
          ]} />
        </div>
        {open.has("ownership") && (
          <div className="overflow-x-auto">
            {/* As-converted toggle */}
            <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-[#1E2D3D] bg-[#080E1A]">
              <span className="text-[10px] text-slate-500">Audily preferred → common (3,250 × 1:1,000)</span>
              <button
                onClick={() => setShowConverted(v => !v)}
                className={`relative inline-flex h-4.5 w-8 shrink-0 rounded-full border transition-colors duration-200 focus:outline-none ${
                  showConverted ? "bg-violet-600 border-violet-500" : "bg-slate-700 border-slate-600"
                }`}
                style={{ width: 32, height: 18 }}
                aria-pressed={showConverted}
              >
                <span
                  className="inline-block rounded-full bg-white shadow transition-transform duration-200"
                  style={{ width: 12, height: 12, margin: 3, transform: showConverted ? "translateX(14px)" : "translateX(0)" }}
                />
              </button>
              <span className="text-[10px] font-semibold" style={{ color: showConverted ? "#A78BFA" : "#475569" }}>
                {showConverted ? "As-converted" : "Base"}
              </span>
            </div>
            <table className="w-full text-xs">
              <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                <tr>
                  <TH></TH>
                  <TH wide>Company</TH>
                  <TH>Your Shares</TH>
                  <TH>FD Shares (co.)</TH>
                  <TH>% Fully Diluted</TH>
                  <TH>Common Out. (co.)</TH>
                  <TH>% Voting</TH>
                  <TH>Est. Value</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0D1421]">
                {ownershipRows.map(({ id, shares, company: c }) => {
                  if (!c) return null;
                  const isConverted = showConverted && id === PREF_CONVERSION.companyId;
                  const adjShares    = isConverted ? shares + PREF_CONVERSION.extraShares : shares;
                  const adjFD        = c.totalShares;  // preferred already included in FD count
                  const adjVoting    = isConverted && c.commonSharesOutstanding ? c.commonSharesOutstanding + PREF_CONVERSION.extraShares : c.commonSharesOutstanding;
                  const pps          = effectivePps(id);
                  const estValue     = pps !== null ? adjShares * pps : null;
                  const pctFD        = adjFD ? adjShares / adjFD : null;
                  const pctVoting    = adjVoting ? adjShares / adjVoting : null;
                  return (
                    <tr key={id} className="hover:bg-[#111D2E]/40 transition-colors">
                      <TD><CompanyAvatar id={id} name={c.name} /></TD>
                      <TD>
                        <div className="flex items-center gap-1.5">
                          <button className="font-medium text-slate-200 hover:text-white transition-colors text-left underline decoration-slate-600 hover:decoration-slate-400"
                            onClick={() => onSelectCompany(id)}>
                            {c.name.replace(" Inc.", "").replace(" Recruiting", "")}
                          </button>
                          {isConverted && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "#4C1D95", color: "#C4B5FD" }}>
                              as-converted
                            </span>
                          )}
                        </div>
                      </TD>
                      <TD className="text-slate-300 tabular-nums">
                        {fmtShares(adjShares)}
                        {isConverted && (
                          <span className="ml-1 text-[9px]" style={{ color: "#A78BFA" }}>
                            +{fmtShares(PREF_CONVERSION.extraShares)}
                          </span>
                        )}
                      </TD>
                      <TD className="text-slate-500 tabular-nums">{adjFD ? fmtShares(adjFD) : "—"}</TD>
                      <TD className="tabular-nums font-semibold" style={{ color: "#8B5CF6" }}>
                        {pctFD !== null ? `${(pctFD * 100).toFixed(2)}%` : "—"}
                      </TD>
                      <TD className="text-slate-500 tabular-nums">{adjVoting ? fmtShares(adjVoting) : "—"}</TD>
                      <TD className="tabular-nums font-semibold" style={{ color: "#A78BFA" }}>
                        {pctVoting !== null ? `${(pctVoting * 100).toFixed(2)}%` : "—"}
                      </TD>
                      <TD className="tabular-nums font-semibold" style={{ color: c.accentColor }}>
                        {estValue !== null ? fmt(estValue) : "—"}
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ Disclosure ═══════════════════════════════════════════════════════ */}
      <div className="rounded-lg border border-[#1E2D3D] bg-[#080E1A] px-4 sm:px-5 py-3 sm:py-4">
        <p className="text-[10px] text-slate-600 leading-relaxed">
          Values are based on implied share prices derived from the most recent cap table and are for
          informational purposes only. They do not represent a guarantee of value, liquidity, or future
          performance. Positions are subject to transfer restrictions as set out in each company&apos;s
          shareholders&apos; agreement. Past returns are not indicative of future results.
          <span className="block mt-1 text-slate-700">Statement date: {investor.statementDate} · nth Venture Inc. · All figures in USD</span>
        </p>
      </div>
    </div>
  );
}
