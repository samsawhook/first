"use client";
import { useMemo, useState } from "react";
import { ChevronDown, Pencil, RotateCcw } from "lucide-react";
import type { PortfolioCompany } from "@/lib/types";
import type { DirectInvestor, DirectPosition } from "@/lib/investors";

// ── Company accent colors ────────────────────────────────────────────────
const ACCENT: Record<string, string> = {
  "audily":         "#8B5CF6",
  "sbr2th":         "#EC4899",
  "certd":          "#10B981",
  "merchant-boxes": "#F59E0B",
  "falconer":       "#3B82F6",
  "nth-venture":    "#64748B",
  "sentius":        "#06B6D4",
  "prreact":        "#F97316",
};
const FALLBACK_INITIALS: Record<string, string> = {
  "audily": "AU", "sbr2th": "S2", "certd": "PS",
  "merchant-boxes": "MB", "falconer": "FL",
  "nth-venture": "NV", "sentius": "SD", "prreact": "PR",
};
// Logos for non-portfolio companies (portfolio companies use portMap.logoUrl)
const EXTRA_LOGOS: Record<string, string> = {
  "nth-venture": "https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/1691979830329-NJ5W8U6WT1N0F60PRNXV/Nth.png",
};

const accentFor   = (id?: string) => ACCENT[id ?? ""] ?? "#94A3B8";
const initialsFor = (id?: string, name?: string) =>
  FALLBACK_INITIALS[id ?? ""] ?? (name ?? "??").slice(0, 2).toUpperCase();

// ── Formatters ────────────────────────────────────────────────────────────
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
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const gainColor = (n: number) => n >= 0 ? "#34D399" : "#F87171";

const isCommonOrRSU = (type: string) => type === "Class A Common" || type === "RSU";

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
  const [open, setOpen] = useState(new Set(["equity", "notes", "earned"]));
  const toggle = (k: string) => setOpen(p => { const s = new Set(p); s.has(k) ? s.delete(k) : s.add(k); return s; });

  // ── Portfolio lookup ──────────────────────────────────────────────────────
  const portMap = useMemo(() =>
    Object.fromEntries(portfolio.map(c => [c.id, c])),
    [portfolio]
  );

  const defaultImplied = (c: PortfolioCompany) =>
    c.customPricePerShare && c.totalShares
      ? c.customPricePerShare * c.totalShares
      : c.impliedValuation;

  const effectiveImplied = (companyId: string) => {
    const c = portMap[companyId];
    if (!c) return null;
    return userValuations[companyId] ?? defaultImplied(c);
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

  const estVal = (p: DirectPosition): number => {
    if (p.shares && p.companyId && isCommonOrRSU(p.securityType)) {
      const pps = effectivePps(p.companyId);
      if (pps !== null) return p.shares * pps;
    }
    return p.estimatedValue;
  };

  const { positions } = investor;

  // ── Position buckets ──────────────────────────────────────────────────────
  const commonPos  = positions.filter(p => p.category === "Purchased Equity" && isCommonOrRSU(p.securityType));
  const convertPos = positions.filter(p => p.category === "Purchased Equity" && !isCommonOrRSU(p.securityType));
  const notesPos   = positions.filter(p => p.category === "Short-term Notes");
  const earnedPos  = positions.filter(p => p.category === "Earned Equity");
  const equityPos  = positions.filter(p => p.category === "Purchased Equity");

  const sum = (ps: DirectPosition[], f: (p: DirectPosition) => number) =>
    ps.reduce((s, p) => s + f(p), 0);

  // ── Aggregates ────────────────────────────────────────────────────────────
  const commonCost      = sum(commonPos,  p => p.costBasis);
  const commonValue     = sum(commonPos,  p => estVal(p));

  const convertCost     = sum(convertPos, p => p.costBasis);
  const convertValue    = sum(convertPos, p => estVal(p));
  const convertInterest = sum(convertPos, p => p.interestDividend ?? 0);

  const creditPrincipal = sum(notesPos, p => p.principal ?? 0);
  const creditRepaid    = sum(notesPos, p => p.repaid ?? 0);
  const creditInterest  = sum(notesPos, p => p.interestDividend ?? 0);
  const creditValue     = sum(notesPos, p => p.estimatedValue);

  const earnedValue = sum(earnedPos, p => estVal(p));

  const equityCost      = commonCost + convertCost;
  const equityValue     = commonValue + convertValue;
  const equityInterest  = convertInterest;
  // MOIC for Purchased Equity includes interest earned
  const equityMoic      = equityCost > 0 ? (equityValue + equityInterest) / equityCost : null;

  const amountInvested  = equityCost + creditPrincipal;
  const amountRepaid    = creditRepaid;
  const principalBasis  = amountInvested - amountRepaid;
  const cashReceived    = amountRepaid + creditInterest; // total cash back from notes

  const portfolioValue  = equityValue + creditValue + earnedValue;
  const totalInterest   = equityInterest + creditInterest;

  // ── Donut: by company ─────────────────────────────────────────────────────
  const byCompany: Record<string, { id?: string; name: string; value: number }> = {};
  for (const p of positions) {
    const v = estVal(p) + (p.interestDividend ?? 0);
    if (v <= 0) continue;
    const key = p.companyId ?? p.company;
    if (!byCompany[key]) byCompany[key] = { id: p.companyId, name: p.company, value: 0 };
    byCompany[key].value += v;
  }
  const donutItems  = Object.values(byCompany).sort((a, b) => b.value - a.value);
  const donutTotal  = donutItems.reduce((s, d) => s + d.value, 0);

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
        <div className="grid grid-cols-3 border-t border-[#1E2D3D] divide-x divide-[#1E2D3D]">
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

  // Avatar: portco logo → extra logo (nth venture etc.) → colored initials
  const CompanyAvatar = ({ id, name }: { id?: string; name: string }) => {
    const portLogo = id ? portMap[id]?.logoUrl : undefined;
    const extraLogo = id ? EXTRA_LOGOS[id] : undefined;
    const logoUrl = portLogo ?? extraLogo;
    if (logoUrl) {
      const isExtra = !portLogo && !!extraLogo;
      return (
        <div className="w-6 h-6 rounded overflow-hidden bg-white flex items-center justify-center p-0.5 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={name} className="w-full h-full object-contain"
            style={isExtra ? { filter: "brightness(0)" } : undefined} />
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
        <button
          className={`font-medium text-slate-200 hover:text-white transition-colors text-left underline decoration-slate-600 hover:decoration-slate-400 ${className}`}
          onClick={(e) => { e.stopPropagation(); onSelectCompany(c.id); }}
        >
          {name}
        </button>
      );
    }
    return <span className={`font-medium text-slate-200 ${className}`}>{name}</span>;
  };

  const EditableValCell = ({ p }: { p: DirectPosition }) => {
    if (!p.shares || !p.companyId || !isCommonOrRSU(p.securityType)) return null;
    const c = portMap[p.companyId];
    if (!c) return null;
    const hasCustom = userValuations[p.companyId] !== undefined;
    const defPps = defaultPps(p.companyId);
    const effPps = effectivePps(p.companyId);
    const v = estVal(p);
    const isWinner = v >= p.costBasis;
    return (
      <div className="flex items-start gap-1.5">
        <div className="flex flex-col gap-0.5">
          {hasCustom && defPps !== null && (
            <span className="text-slate-600 line-through leading-tight tabular-nums text-[10px]">
              {fmt(p.shares * defPps)}
            </span>
          )}
          <span className="font-semibold tabular-nums leading-tight" style={{ color: isWinner ? "#34D399" : "#F87171" }}>
            {fmt(v)}
          </span>
          {effPps !== null && (
            <span className="text-[9px] text-slate-600 tabular-nums leading-tight">${effPps.toFixed(4)}/sh</span>
          )}
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
            <button
              onClick={(e) => { e.stopPropagation(); onResetValuation(p.companyId!); }}
              className="p-0.5 rounded hover:bg-rose-500/10 text-slate-600 hover:text-rose-400 transition-colors"
              title="Reset to default"
            >
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
      <div className="flex items-start gap-1.5">
        <div className="flex flex-col gap-0.5">
          {hasCustom && defPps !== null && p.shares && (
            <span className="text-slate-600 line-through leading-tight tabular-nums text-[10px]">
              {fmt(p.shares * defPps)}
            </span>
          )}
          <span className="font-semibold tabular-nums leading-tight" style={{ color: v > 0 ? "#F59E0B" : "#64748B" }}>
            {v > 0 ? fmt(v) : "—"}
          </span>
          {effPps !== null && v > 0 && (
            <span className="text-[9px] text-slate-600 tabular-nums leading-tight">${effPps.toFixed(4)}/sh</span>
          )}
        </div>
        <div className="flex flex-col gap-0.5 mt-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); const iv = effectiveImplied(p.companyId!); onOpenValuationModal(c, iv ?? defaultImplied(c)); }}
            className="p-0.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: hasCustom ? "#F59E0B" : "#64748B" }}
            title="Edit valuation"
          >
            <Pencil size={10} />
          </button>
          {hasCustom && (
            <button
              onClick={(e) => { e.stopPropagation(); onResetValuation(p.companyId!); }}
              className="p-0.5 rounded hover:bg-rose-500/10 text-slate-600 hover:text-rose-400 transition-colors"
              title="Reset to default"
            >
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
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#1E2D3D]">
          <div className="px-4 py-3.5 border-r border-[#1E2D3D]">
            <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium">Portfolio Value</p>
            <p className="text-sm font-bold mt-1 tabular-nums" style={{ color: "#10B981" }}>{fmt(portfolioValue)}</p>
            <p className="text-[9px] text-slate-600 tabular-nums mt-0.5">incl. {fmt(earnedValue)} earned</p>
          </div>
          <div className="px-4 py-3.5 border-r border-[#1E2D3D]">
            <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium">Amount Invested</p>
            <p className="text-sm font-bold mt-1 tabular-nums text-slate-200">{fmt(amountInvested)}</p>
            <p className="text-[9px] text-slate-600 tabular-nums mt-0.5">{fmt(equityCost)} equity · {fmt(creditPrincipal)} notes</p>
          </div>
          <div className="px-4 py-3.5 border-r border-[#1E2D3D]">
            <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium">Cash Received</p>
            <p className="text-sm font-bold mt-1 tabular-nums" style={{ color: "#34D399" }}>{fmt(cashReceived)}</p>
            <p className="text-[9px] text-slate-600 tabular-nums mt-0.5">{fmt(amountRepaid)} principal · {fmt(creditInterest)} interest</p>
          </div>
          <div className="px-4 py-3.5">
            <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium">Principal Basis</p>
            <p className="text-sm font-bold mt-1 tabular-nums text-slate-200">{fmt(principalBasis)}</p>
            <p className="text-[9px] text-slate-600 tabular-nums mt-0.5">still deployed</p>
          </div>
        </div>

        {/* ── Asset class row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#1E2D3D] bg-[#080E1A]">
          {/* Equity */}
          <div className="px-4 py-3 border-r border-[#1E2D3D]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-medium">Equity</p>
            </div>
            <p className="text-xs font-bold tabular-nums text-slate-200">{fmt(commonValue)}</p>
            <p className="text-[9px] text-slate-600 tabular-nums">{fmt(commonCost)} invested</p>
          </div>
          {/* Convertibles */}
          <div className="px-4 py-3 border-r border-[#1E2D3D]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-medium">Convertibles</p>
            </div>
            <p className="text-xs font-bold tabular-nums text-slate-200">{fmt(convertValue)}</p>
            <p className="text-[9px] text-slate-600 tabular-nums">{fmt(convertCost)} invested · {fmt(convertInterest)} int.</p>
          </div>
          {/* Credit */}
          <div className="px-4 py-3 border-r border-[#1E2D3D]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-medium">Credit</p>
            </div>
            <p className="text-xs font-bold tabular-nums" style={{ color: "#34D399" }}>Fully repaid</p>
            <p className="text-[9px] text-slate-600 tabular-nums">{fmt(creditPrincipal)} principal · {fmt(creditInterest)} int.</p>
          </div>
          {/* Earned */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-medium">Earned Equity</p>
            </div>
            <p className="text-xs font-bold tabular-nums text-amber-400">{fmt(earnedValue)}</p>
            <p className="text-[9px] text-slate-600 tabular-nums">$0 cost basis</p>
          </div>
        </div>

        {/* ── Investor meta ── */}
        <div className="border-b border-[#1E2D3D] px-4 sm:px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium shrink-0">Direct Shareholder</p>
            <p className="text-[10px] text-slate-400 font-semibold">{investor.name}</p>
            <p className="text-[10px] text-slate-600">Investor since {investor.investorSince}</p>
            <p className="text-[10px] text-slate-600">Statement {investor.statementDate}</p>
            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />nth Venture Inc.
            </div>
          </div>
        </div>

        {/* ── Donut + legend ── */}
        <div className="flex flex-col sm:flex-row gap-6 px-5 py-5">
          <div className="shrink-0 flex justify-center">
            <svg width={160} height={160} viewBox="0 0 160 160">
              {arcs.map((a, i) => (
                <path key={i} d={a.path} fill={accentFor(a.id)} fillOpacity={0.85} />
              ))}
              <text x={80} y={76} textAnchor="middle" fill="#e2e8f0" fontSize={13} fontWeight="700" fontFamily="inherit">{fmt(portfolioValue)}</text>
              <text x={80} y={91} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="inherit">est. portfolio</text>
            </svg>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 content-center">
            {donutItems.map((d, i) => (
              <div key={i} className="flex items-center gap-2.5 min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accentFor(d.id) }} />
                {d.id && portMap[d.id] ? (
                  <button
                    className="text-xs text-slate-400 hover:text-white transition-colors text-left truncate flex-1"
                    onClick={() => onSelectCompany(d.id!)}
                  >
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

      {/* ══ 1. Purchased Equity ═══════════════════════════════════════════════ */}
      <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
        <div className="border-b border-[#1E2D3D]">
          <SectionHeader label="Purchased Equity" tableKey="equity" accentCol="#10B981" stats={[
            { label: "Cost Basis",  value: fmt(equityCost) },
            { label: "Est. Value",  value: fmt(equityValue), color: "#10B981" },
            { label: "MOIC (incl. int.)", value: equityMoic !== null ? `${equityMoic.toFixed(2)}×` : "—", color: equityMoic && equityMoic >= 1 ? "#10B981" : "#F87171" },
            { label: "Interest",    value: equityInterest > 0 ? fmt(equityInterest) : "—", color: "#F59E0B" },
          ]} />
        </div>
        {open.has("equity") && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                <tr>
                  <TH></TH>
                  <TH wide>Company</TH>
                  <TH>Type</TH>
                  <TH>Issue Date</TH>
                  <TH>Shares</TH>
                  <TH>Basis / Sh</TH>
                  <TH>Cost Basis</TH>
                  <TH>Interest / Div.</TH>
                  <TH>Est. Value</TH>
                  <TH>Ann. Return</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0D1421]">
                {equityPos.map((p, i) => {
                  const v = estVal(p);
                  const isWinner = v >= p.costBasis;
                  const isEditable = !!(p.shares && p.companyId && isCommonOrRSU(p.securityType) && portMap[p.companyId]);
                  return (
                    <tr key={i} className="hover:bg-[#111D2E]/40 transition-colors">
                      <TD><CompanyAvatar id={p.companyId} name={p.company} /></TD>
                      <TD><CompanyName p={p} /></TD>
                      <TD className="text-slate-400">{p.securityType}</TD>
                      <TD className="text-slate-500">{fmtDate(p.issueDate)}</TD>
                      <TD className="text-slate-300 tabular-nums">{p.shares ? fmtShares(p.shares) : "—"}</TD>
                      <TD className="text-slate-400 tabular-nums">{p.perShareBasis != null ? `$${p.perShareBasis.toFixed(3)}` : "—"}</TD>
                      <TD className="text-slate-300 tabular-nums">{fmt(p.costBasis)}</TD>
                      <TD className="tabular-nums" style={{ color: "#F59E0B" }}>{p.interestDividend ? fmt(p.interestDividend) : "—"}</TD>
                      <TD className="tabular-nums">
                        {isEditable
                          ? <EditableValCell p={p} />
                          : <span className="font-semibold" style={{ color: isWinner ? "#34D399" : "#F87171" }}>{fmt(v)}</span>
                        }
                      </TD>
                      <TD className="tabular-nums" style={{ color: p.annualizedReturnPct != null ? gainColor(p.annualizedReturnPct) : "#94A3B8" }}>
                        {p.annualizedReturnPct != null ? fmtPct(p.annualizedReturnPct) : "—"}
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ 2. Short-term Notes ═══════════════════════════════════════════════ */}
      <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
        <div className="border-b border-[#1E2D3D]">
          <SectionHeader label="Short-term Notes" tableKey="notes" accentCol="#6366F1" stats={[
            { label: "Principal",   value: fmt(creditPrincipal) },
            { label: "All Repaid",  value: "✓", color: "#34D399" },
            { label: "Interest",    value: fmt(creditInterest), color: "#F59E0B" },
            { label: "# Notes",     value: `${notesPos.length}` },
          ]} />
        </div>
        {open.has("notes") && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                <tr>
                  <TH></TH>
                  <TH wide>Company</TH>
                  <TH>Issue Date</TH>
                  <TH>Principal</TH>
                  <TH>Status</TH>
                  <TH>Interest Earned</TH>
                  <TH>Total Return</TH>
                  <TH>Ann. Return</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0D1421]">
                {notesPos.map((p, i) => {
                  const repaid = p.repaid ?? 0;
                  const fullyRepaid = repaid > 0 && repaid >= (p.principal ?? 0);
                  return (
                    <tr key={i} className="hover:bg-[#111D2E]/40 transition-colors">
                      <TD><CompanyAvatar id={p.companyId} name={p.company} /></TD>
                      <TD><CompanyName p={p} /></TD>
                      <TD className="text-slate-500">{fmtDate(p.issueDate)}</TD>
                      <TD className="text-slate-300 tabular-nums">{fmt(p.principal ?? 0)}</TD>
                      <TD>
                        {fullyRepaid
                          ? <span className="text-emerald-400 font-semibold">Repaid</span>
                          : repaid > 0
                            ? <span className="text-yellow-400">{fmt(repaid)} returned</span>
                            : <span className="text-slate-600">Outstanding</span>
                        }
                      </TD>
                      <TD className="tabular-nums font-semibold" style={{ color: "#F59E0B" }}>{p.interestDividend ? fmt(p.interestDividend) : "—"}</TD>
                      <TD className="tabular-nums" style={{ color: "#34D399" }}>{fmt(repaid + (p.interestDividend ?? 0))}</TD>
                      <TD className="tabular-nums" style={{ color: p.annualizedReturnPct != null ? gainColor(p.annualizedReturnPct) : "#94A3B8" }}>
                        {p.annualizedReturnPct != null ? fmtPct(p.annualizedReturnPct) : "—"}
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ 3. Earned Equity ═════════════════════════════════════════════════ */}
      <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
        <div className="border-b border-[#1E2D3D]">
          <SectionHeader label="Earned Equity" tableKey="earned" accentCol="#F59E0B" stats={[
            { label: "Cost Basis",  value: "$0" },
            { label: "Est. Value",  value: fmt(earnedValue), color: "#F59E0B" },
            { label: "# Positions", value: `${earnedPos.length}` },
          ]} />
        </div>
        {open.has("earned") && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                <tr>
                  <TH></TH>
                  <TH wide>Company</TH>
                  <TH>Type</TH>
                  <TH>Issue Date</TH>
                  <TH>Shares / Units</TH>
                  <TH>Est. Value</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0D1421]">
                {earnedPos.map((p, i) => (
                  <tr key={i} className="hover:bg-[#111D2E]/40 transition-colors">
                    <TD><CompanyAvatar id={p.companyId} name={p.company} /></TD>
                    <TD><CompanyName p={p} /></TD>
                    <TD className="text-slate-400">{p.securityType}</TD>
                    <TD className="text-slate-500">{fmtDate(p.issueDate)}</TD>
                    <TD className="text-slate-300 tabular-nums">{p.shares ? fmtShares(p.shares) : "—"}</TD>
                    <TD className="tabular-nums font-semibold">
                      <EarnedValCell p={p} />
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ Disclosure ═══════════════════════════════════════════════════════ */}
      <div className="rounded-lg border border-[#1E2D3D] bg-[#080E1A] px-5 py-4">
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
