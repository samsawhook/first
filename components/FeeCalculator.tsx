"use client";
import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";

function fmt(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}
function fmtPct(n: number, digits = 1) { return `${(n * 100).toFixed(digits)}%`; }
function fmtX(n: number) { return `${n.toFixed(2)}x`; }

interface Result {
  mgmtFee: number;
  gpCarry: number;
  lpNet: number;
  lpNetMoic: number;
  lpNetIrr: number;
  gpTotal: number;
  hurdle: number;
  hurdleMet: boolean;
  exitValue: number;
}

function calc2_20(capital: number, years: number, grossMoic: number): Result {
  const exitValue = capital * grossMoic;
  const totalProfit = exitValue - capital;
  const mgmtFee = 0.02 * capital * years;
  const hurdle = capital * (Math.pow(1.06, years) - 1);
  const hurdleMet = totalProfit > hurdle;

  let gpCarry = 0;
  if (hurdleMet) {
    const P = totalProfit;
    const PAP = P - hurdle;
    const catchupPool = 0.25 * P;
    if (PAP <= catchupPool) {
      gpCarry = 0.8 * PAP;
    } else {
      gpCarry = 0.2 * P + 0.2 * (PAP - catchupPool);
    }
  }

  const lpNet = exitValue - mgmtFee - gpCarry;
  const lpNetMoic = lpNet / capital;
  const lpNetIrr = Math.pow(Math.max(lpNetMoic, 0), 1 / years) - 1;
  return { mgmtFee, gpCarry, lpNet, lpNetMoic, lpNetIrr, gpTotal: mgmtFee + gpCarry, hurdle, hurdleMet, exitValue };
}

function calcBuffett(capital: number, years: number, grossMoic: number): Result {
  const exitValue = capital * grossMoic;
  const totalProfit = exitValue - capital;
  const hurdle = capital * (Math.pow(1.06, years) - 1);
  const hurdleMet = totalProfit > hurdle;

  let gpCarry = 0;
  if (hurdleMet) {
    gpCarry = 0.5 * (totalProfit - hurdle);
  }

  const lpNet = exitValue - gpCarry;
  const lpNetMoic = lpNet / capital;
  const lpNetIrr = Math.pow(Math.max(lpNetMoic, 0), 1 / years) - 1;
  return { mgmtFee: 0, gpCarry, lpNet, lpNetMoic, lpNetIrr, gpTotal: gpCarry, hurdle, hurdleMet, exitValue };
}

// =========================================================
//   Asset universe — Co-Owner Fund treated as a portfolio
//   line item alongside other holdings.
// =========================================================
const ASSET_CLASSES = [
  { key: "fund",       label: "Co-Owner Fund",       color: "#A855F7", defaultReturn: 0.20,  defaultVol: 0.25, isFund: true,  targetPct: 0.15 },
  { key: "sp500",      label: "S&P 500",             color: "#60A5FA", defaultReturn: 0.09,  defaultVol: 0.16, isFund: false, targetPct: 0.35 },
  { key: "realestate", label: "Real Estate",         color: "#34D399", defaultReturn: 0.07,  defaultVol: 0.12, isFund: false, targetPct: 0.15 },
  { key: "privCredit", label: "Private Credit",      color: "#A78BFA", defaultReturn: 0.09,  defaultVol: 0.06, isFund: false, targetPct: 0.10 },
  { key: "privEquity", label: "Other Priv. Equity",  color: "#F87171", defaultReturn: 0.12,  defaultVol: 0.25, isFund: false, targetPct: 0.10 },
  { key: "crypto",     label: "Crypto",              color: "#FBBF24", defaultReturn: 0.15,  defaultVol: 0.70, isFund: false, targetPct: 0.10 },
  { key: "cash",       label: "Cash / Money Market", color: "#94A3B8", defaultReturn: 0.04,  defaultVol: 0.01, isFund: false, targetPct: 0.05 },
] as const;

type AssetKey = typeof ASSET_CLASSES[number]["key"];

// Stacked-area draw order: bottom (most stable) to top (most volatile)
const STACK_ORDER: AssetKey[] = ["cash", "privCredit", "sp500", "realestate", "privEquity", "fund", "crypto"];

// =========================================================
//   Slider (top-level fee-calc assumptions)
// =========================================================
function Slider({ label, value, min, max, step, onChange, display, sub }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; display: string; sub?: string;
}) {
  const isCapital = min === 100_000;
  const isHorizon = min === 1;
  const minLabel  = isCapital ? "$100k" : isHorizon ? "1 yr"   : "0%";
  const maxLabel  = isCapital ? "$10M"  : isHorizon ? "25 yrs" : "35%";

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs text-slate-400 uppercase tracking-wide font-medium">{label}</span>
        <span className="text-right">
          <span className="text-sm font-semibold text-slate-100 tabular-nums">{display}</span>
          {sub && <span className="ml-2 text-xs text-slate-500 tabular-nums">{sub}</span>}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
          bg-slate-700 [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400
          [&::-webkit-slider-thumb]:cursor-pointer"
      />
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-slate-600">{minLabel}</span>
        <span className="text-[10px] text-slate-600">{maxLabel}</span>
      </div>
    </div>
  );
}

// =========================================================
//   Slider row — slider only, no inline text input
// =========================================================
function SliderRow({
  prefix, value, setValue, min, max, step,
}: {
  prefix: string;
  value: number;
  setValue: (v: number) => void;
  min: number; max: number; step: number;
}) {
  return (
    <div className="flex items-center gap-2 pl-4">
      <span className="text-[10px] text-slate-600 w-9 shrink-0 uppercase tracking-wide">{prefix}</span>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => setValue(parseFloat(e.target.value))}
        className="flex-1 h-1 rounded-full appearance-none cursor-pointer bg-slate-800
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-slate-300
          [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
}

// =========================================================
//   Inline editable numeric value (click to edit)
// =========================================================
function InlineNum({
  value, displayFn, editFn, parseFn, onChange, widthClass, color, title,
}: {
  value: number;
  displayFn: (v: number) => string;
  editFn: (v: number) => string;
  parseFn: (raw: string) => number;
  onChange: (v: number) => void;
  widthClass?: string;
  color?: string;
  title?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const w = widthClass ?? "w-16";
  if (editing) {
    return (
      <input
        type="text"
        value={text}
        autoFocus
        onFocus={e => e.currentTarget.select()}
        onChange={e => setText(e.target.value)}
        onBlur={() => {
          const v = parseFn(text);
          if (isFinite(v)) onChange(v);
          setEditing(false);
        }}
        onKeyDown={e => {
          if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
          else if (e.key === "Escape") setEditing(false);
        }}
        className={`bg-slate-800 ring-1 ring-slate-500 rounded px-1 text-xs tabular-nums text-right text-slate-100 focus:outline-none ${w}`}
        style={color ? { color } : undefined}
      />
    );
  }
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.stopPropagation(); setText(editFn(value)); setEditing(true); }}
      className={`text-xs tabular-nums text-right hover:bg-slate-800/60 hover:ring-1 hover:ring-slate-700 rounded px-1 transition-colors ${w}`}
      style={color ? { color } : undefined}
    >
      {displayFn(value)}
    </button>
  );
}

// =========================================================
//   StackBar (proceeds split for the fee-calc result cards)
// =========================================================
function StackBar({ exit, capital, mgmtFee, carry, lpNet }: {
  exit: number; capital: number; mgmtFee: number; carry: number; lpNet: number;
}) {
  const lpReturn  = lpNet - capital;
  const basisPct  = (capital / exit) * 100;
  const returnPct = (Math.max(lpReturn, 0) / exit) * 100;
  const carryPct  = (carry / exit) * 100;
  const feePct    = (mgmtFee / exit) * 100;
  return (
    <div className="w-full h-5 rounded-md overflow-hidden flex" title="Proceeds split">
      <div style={{ width: `${Math.max(basisPct, 0)}%` }}  className="bg-slate-500/70 transition-all duration-300" title={`LP basis: ${fmt(capital)}`} />
      <div style={{ width: `${Math.max(returnPct, 0)}%` }} className="bg-emerald-500/70 transition-all duration-300" title={`LP return: ${fmt(lpReturn)}`} />
      <div style={{ width: `${Math.max(carryPct, 0)}%` }}  className="bg-violet-500/70 transition-all duration-300" title={`GP carry: ${fmt(carry)}`} />
      <div style={{ width: `${Math.max(feePct, 0)}%` }}    className="bg-rose-500/60 transition-all duration-300" title={`Mgmt fee: ${fmt(mgmtFee)}`} />
    </div>
  );
}

function ResultCard({ title, label, accentColor, result, capital }: {
  title: string; label: string; accentColor: string; result: Result; capital: number;
}) {
  const rows = [
    { label: "Gross Exit Value", value: fmt(result.exitValue), dim: false },
    { label: "6% Hurdle (LP preferred return)", value: fmt(result.hurdle), dim: true },
    { label: "Hurdle Met", value: result.hurdleMet ? "Yes" : "No", dim: false, color: result.hurdleMet ? "#10B981" : "#F59E0B" },
    result.mgmtFee > 0 ? { label: "Management Fee (2% × yrs)", value: fmt(result.mgmtFee), dim: false, color: "#F87171" } : null,
    { label: "GP Carried Interest", value: fmt(result.gpCarry), dim: false, color: "#A78BFA" },
    { label: "GP Total Compensation", value: fmt(result.gpTotal), dim: false },
    null,
    { label: "LP Net Proceeds", value: fmt(result.lpNet), dim: false, bold: true },
    { label: "LP Net IRR", value: fmtPct(result.lpNetIrr), dim: false, color: result.lpNetIrr >= 0.06 ? "#10B981" : "#F59E0B" },
    { label: "GP % of Gross Proceeds", value: fmtPct(result.gpTotal / result.exitValue), dim: true },
    { label: "LP % of Gross Proceeds", value: fmtPct(result.lpNet / result.exitValue), dim: true },
  ].filter(Boolean) as ({ label: string; value: string; dim: boolean; bold?: boolean; color?: string } | null)[];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden flex-1 min-w-0">
      <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between" style={{ background: `${accentColor}10` }}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: accentColor }}>{label}</p>
          <p className="text-base font-semibold text-slate-100">{title}</p>
        </div>
        <div className="text-right ml-4 shrink-0">
          <p className="text-2xl font-bold tabular-nums text-slate-100 leading-none">{fmtX(result.lpNetMoic)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">LP Net MOIC</p>
        </div>
      </div>
      <div className="px-5 pt-4 pb-2">
        <StackBar exit={result.exitValue} capital={capital} mgmtFee={result.mgmtFee} carry={result.gpCarry} lpNet={result.lpNet} />
        <div className="flex gap-4 mt-1.5 flex-wrap">
          <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-sm bg-slate-500/70 inline-block" />LP basis</span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-sm bg-emerald-500/70 inline-block" />LP return</span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-sm bg-violet-500/70 inline-block" />GP carry</span>
          {result.mgmtFee > 0 && <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-sm bg-rose-500/60 inline-block" />Mgmt fee</span>}
        </div>
      </div>
      <div className="px-5 pb-5 space-y-0">
        {rows.map((row, i) =>
          row === null ? (
            <div key={i} className="border-t border-slate-800/60 my-2" />
          ) : (
            <div key={i} className="flex justify-between items-baseline py-1.5">
              <span className={`text-xs ${row.dim ? "text-slate-600" : "text-slate-400"}`}>{row.label}</span>
              <span
                className={`text-xs tabular-nums font-medium ${row.bold ? "text-sm text-slate-100 font-semibold" : ""}`}
                style={{ color: row.color ?? (row.bold ? undefined : row.dim ? "#475569" : "#CBD5E1") }}
              >
                {row.value}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// =========================================================
//   Portfolio chart — supports stacked-median view and
//   variable view with 90% confidence interval
// =========================================================
type ViewMode = "median" | "variable";

interface PortfolioInputs {
  amount: number;     // dollars
  retRate: number;    // annual return (decimal); for fund this is net IRR
  vol: number;        // annual vol (decimal)
  color: string;
  label: string;
  key: AssetKey;
}

function PortfolioChart({
  view, years, rows, accentColor,
}: {
  view: ViewMode;
  years: number;
  rows: PortfolioInputs[];     // active rows only (amount > 0)
  accentColor: string;         // for total median line in variable view
}) {
  const W = 580, H = 320, PL = 66, PR = 24, PT = 16, PB = 34;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;
  const T = Math.max(years, 1);

  // Per-asset median trajectory at each time t (0..years)
  const medians: { row: PortfolioInputs; values: number[] }[] = rows.map(r => ({
    row: r,
    values: Array.from({ length: years + 1 }, (_, t) => r.amount * Math.pow(1 + r.retRate, t)),
  }));

  // Total median + variance/std (independence approximation)
  const totalMedian = Array.from({ length: years + 1 }, (_, t) =>
    medians.reduce((s, m) => s + m.values[t], 0)
  );
  const totalStd = Array.from({ length: years + 1 }, (_, t) => {
    const v = medians.reduce((s, m) => {
      const median = m.values[t];
      const sigma  = m.row.vol;
      return s + median * median * (Math.exp(sigma * sigma * t) - 1);
    }, 0);
    return Math.sqrt(Math.max(v, 0));
  });
  const Z = 1.645; // ~90% two-sided
  const totalHigh = totalMedian.map((m, t) => m + Z * totalStd[t]);
  const totalLow  = totalMedian.map((m, t) => Math.max(0, m - Z * totalStd[t]));

  // y-axis max
  const allY: number[] =
    view === "median"
      ? [...totalMedian]
      : [...totalHigh];
  const maxVal = Math.max(...allY, 1);

  const xS = (t: number) => PL + (t / T) * innerW;
  const yS = (v: number) => PT + innerH * (1 - Math.min(Math.max(v, 0) / maxVal, 1));
  const linePath = (vals: number[]) =>
    vals.map((v, t) => `${t === 0 ? "M" : "L"} ${xS(t).toFixed(1)} ${yS(v).toFixed(1)}`).join(" ");
  const areaPath = (lower: number[], upper: number[]) => {
    const top = upper.map((v, t) => `${t === 0 ? "M" : "L"} ${xS(t).toFixed(1)} ${yS(v).toFixed(1)}`).join(" ");
    const bot = lower.map((v, t) => `L ${xS(years - t).toFixed(1)} ${yS(lower[years - t]).toFixed(1)}`).join(" ").replace(/^L/, " L");
    return `${top}${bot} Z`;
  };

  // -------- Stacked layers (Median view) --------
  const stackOrderRows = STACK_ORDER
    .map(k => medians.find(m => m.row.key === k))
    .filter(Boolean) as { row: PortfolioInputs; values: number[] }[];

  type Layer = { row: PortfolioInputs; bottom: number[]; top: number[] };
  const layers: Layer[] = [];
  let baseline: number[] = Array(years + 1).fill(0);
  for (const m of stackOrderRows) {
    const top = baseline.map((v, t) => v + m.values[t]);
    layers.push({ row: m.row, bottom: [...baseline], top });
    baseline = top;
  }

  const stackedAreaPath = (layer: Layer) => {
    const top = layer.top.map((v, t) => `${t === 0 ? "M" : "L"} ${xS(t).toFixed(1)} ${yS(v).toFixed(1)}`).join(" ");
    const bot = Array.from({ length: years + 1 }, (_, i) => {
      const idx = years - i;
      return `L ${xS(idx).toFixed(1)} ${yS(layer.bottom[idx]).toFixed(1)}`;
    }).join(" ");
    return `${top} ${bot} Z`;
  };

  // -------- Axis ticks --------
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => maxVal * f);
  const tickCount = Math.min(years, 8);
  const xTicks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((i / tickCount) * years));

  const finalMedian = totalMedian[years];
  const finalHigh   = totalHigh[years];
  const finalLow    = totalLow[years];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: 240 }}>
      {/* Y grid + labels */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={PL} y1={yS(v)} x2={W - PR} y2={yS(v)} stroke="#1E293B" strokeWidth="1" />
          <text x={PL - 5} y={yS(v)} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="#475569">
            {v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}k` : `$${v.toFixed(0)}`}
          </text>
        </g>
      ))}
      {/* X axis labels */}
      {xTicks.map(t => (
        <text key={t} x={xS(t)} y={H - 8} textAnchor="middle" fontSize="9" fill="#475569">
          {t === 0 ? "Now" : `Yr ${t}`}
        </text>
      ))}
      {/* Exit vertical guide */}
      <line x1={xS(years)} y1={PT} x2={xS(years)} y2={PT + innerH} stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />

      {view === "median" && (
        <>
          {/* Stacked area layers */}
          {layers.map(l => (
            <path key={l.row.key} d={stackedAreaPath(l)} fill={l.row.color} fillOpacity="0.55" stroke={l.row.color} strokeOpacity="0.9" strokeWidth="1" />
          ))}
          {/* Endpoint label */}
          {finalMedian > 0 && (
            <>
              <circle cx={xS(years)} cy={yS(finalMedian)} r="4" fill="#F8FAFC" />
              <text x={xS(years) - 8} y={yS(finalMedian) - 8} textAnchor="end" fontSize="9" fontWeight="700" fill="#F8FAFC">
                {fmt(finalMedian)}
              </text>
            </>
          )}
        </>
      )}

      {view === "variable" && (
        <>
          {/* Per-asset median (faint reference) */}
          {medians.map(m => (
            <path key={m.row.key} d={linePath(m.values)} fill="none" stroke={m.row.color} strokeWidth="1" strokeOpacity="0.5" />
          ))}
          {/* CI band */}
          <path d={areaPath(totalLow, totalHigh)} fill={accentColor} fillOpacity="0.18" />
          {/* Low / High edges */}
          <path d={linePath(totalLow)}  fill="none" stroke={accentColor} strokeOpacity="0.5" strokeWidth="1" strokeDasharray="3 3" />
          <path d={linePath(totalHigh)} fill="none" stroke={accentColor} strokeOpacity="0.5" strokeWidth="1" strokeDasharray="3 3" />
          {/* Total median line */}
          <path d={linePath(totalMedian)} fill="none" stroke={accentColor} strokeWidth="2.75" strokeLinejoin="round" strokeLinecap="round" />
          {/* Endpoint labels */}
          {finalMedian > 0 && (
            <>
              <circle cx={xS(years)} cy={yS(finalHigh)} r="3" fill={accentColor} fillOpacity="0.7" />
              <circle cx={xS(years)} cy={yS(finalMedian)} r="5" fill={accentColor} />
              <circle cx={xS(years)} cy={yS(finalLow)} r="3" fill={accentColor} fillOpacity="0.7" />
              <text x={xS(years) - 8} y={yS(finalHigh) - 4} textAnchor="end" fontSize="8" fontWeight="600" fill={accentColor}>P95 {fmt(finalHigh)}</text>
              <text x={xS(years) - 8} y={yS(finalMedian) - 8} textAnchor="end" fontSize="9" fontWeight="700" fill={accentColor}>median {fmt(finalMedian)}</text>
              <text x={xS(years) - 8} y={yS(finalLow) + 12} textAnchor="end" fontSize="8" fontWeight="600" fill={accentColor}>P5 {fmt(finalLow)}</text>
            </>
          )}
        </>
      )}
    </svg>
  );
}

// =========================================================
//   Allocation suggestion box — compares current % vs target %
// =========================================================
function AllocationSuggestions({
  rows, targets, totalValue,
}: {
  rows: PortfolioInputs[];
  targets: Record<string, number>;
  totalValue: number;
}) {
  if (totalValue <= 0) {
    return (
      <p className="text-xs text-slate-600">
        Add allocations across the asset rows to see balanced-portfolio rebalancing suggestions.
      </p>
    );
  }
  const items = ASSET_CLASSES.map(a => {
    const row = rows.find(r => r.key === a.key);
    const current = row?.amount ?? 0;
    const currentPct = current / totalValue;
    const targetPct = targets[a.key] ?? 0;
    const deltaPct = currentPct - targetPct;             // + means overweight
    const targetDollar = targetPct * totalValue;
    const deltaDollar = current - targetDollar;          // + overweight, − underweight
    return { asset: a, current, currentPct, targetPct, deltaPct, deltaDollar };
  });

  const TOL = 0.02; // ±2pp = "on target"
  const sorted = [...items].sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
  const overweight = sorted.filter(i => i.deltaPct > TOL).slice(0, 4);
  const underweight = sorted.filter(i => i.deltaPct < -TOL).slice(0, 4);
  const onTarget = items.filter(i => Math.abs(i.deltaPct) <= TOL && i.current > 0);

  const Row = ({ kind, item }: { kind: "over" | "under"; item: typeof items[number] }) => (
    <div className="flex items-baseline gap-2 py-1">
      <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: item.asset.color }} />
      <span className="text-xs text-slate-300 font-medium w-32 shrink-0 truncate">{item.asset.label}</span>
      <span className="text-[10px] text-slate-500 tabular-nums w-24">
        {fmtPct(item.currentPct, 1)} <span className="text-slate-700">vs</span> {fmtPct(item.targetPct, 0)}
      </span>
      <span className={`text-[11px] tabular-nums font-semibold flex-1 ${kind === "over" ? "text-rose-400" : "text-emerald-400"}`}>
        {kind === "over" ? "↓ reduce" : "↑ add"} ~{fmt(Math.abs(item.deltaDollar))}
      </span>
      <span className="text-[10px] text-slate-600 tabular-nums">
        {item.deltaPct > 0 ? "+" : ""}{(item.deltaPct * 100).toFixed(1)} pp
      </span>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Allocation Suggestions</p>
        <p className="text-[10px] text-slate-600">vs. balanced growth target</p>
      </div>
      {underweight.length === 0 && overweight.length === 0 ? (
        <p className="text-xs text-emerald-400">All positions within ±2pp of target — portfolio is well-balanced.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
          <div>
            {underweight.length > 0 && <p className="text-[10px] uppercase tracking-widest text-emerald-500/80 mb-1">Underweight</p>}
            {underweight.map(i => <Row key={i.asset.key} kind="under" item={i} />)}
          </div>
          <div>
            {overweight.length > 0 && <p className="text-[10px] uppercase tracking-widest text-rose-500/80 mb-1">Overweight</p>}
            {overweight.map(i => <Row key={i.asset.key} kind="over" item={i} />)}
          </div>
        </div>
      )}

      {/* Target allocation bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5 mt-2">
          <span className="text-[10px] uppercase tracking-widest text-slate-600">Target portfolio</span>
          <span className="text-[10px] text-slate-600 tabular-nums">100%</span>
        </div>
        <div className="w-full h-2 rounded-md overflow-hidden flex bg-slate-900">
          {ASSET_CLASSES.map(a => (
            <div
              key={a.key}
              style={{ width: `${(targets[a.key] ?? 0) * 100}%`, background: a.color }}
              title={`${a.label}: ${((targets[a.key] ?? 0) * 100).toFixed(0)}%`}
              className="opacity-80"
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {ASSET_CLASSES.map(a => (
            <span key={a.key} className="flex items-center gap-1 text-[10px] text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: a.color }} />
              {a.label}: <span className="text-slate-400 tabular-nums">{((targets[a.key] ?? 0) * 100).toFixed(0)}%</span>
            </span>
          ))}
        </div>
      </div>

      {onTarget.length > 0 && (
        <p className="text-[10px] text-slate-600 pt-1">
          On target ({onTarget.length}): {onTarget.map(i => i.asset.label).join(" · ")}
        </p>
      )}
    </div>
  );
}

// =========================================================
//   Main component
// =========================================================
export default function FeeCalculator() {
  // Top-level fee-calc inputs
  const [capital, setCapital] = useState(1_000_000);
  const [years, setYears] = useState(5);
  const [grossReturn, setGrossReturn] = useState(0.20);

  // Other portfolio asset state
  const [portAlloc, setPortAlloc] = useState<Record<AssetKey, number>>(
    Object.fromEntries(ASSET_CLASSES.map(a => [a.key, 0])) as Record<AssetKey, number>
  );
  const [portReturn, setPortReturn] = useState<Record<AssetKey, number>>(
    Object.fromEntries(ASSET_CLASSES.map(a => [a.key, a.defaultReturn])) as Record<AssetKey, number>
  );
  const [portVol, setPortVol] = useState<Record<AssetKey, number>>(
    Object.fromEntries(ASSET_CLASSES.map(a => [a.key, a.defaultVol])) as Record<AssetKey, number>
  );

  // Fee-calc results
  const grossMoic = Math.pow(1 + grossReturn, years);
  const r2_20 = useMemo(() => calc2_20(capital, years, grossMoic), [capital, years, grossMoic]);
  const rBuf  = useMemo(() => calcBuffett(capital, years, grossMoic), [capital, years, grossMoic]);
  const lpDiff = rBuf.lpNet - r2_20.lpNet;

  // Fee structure selector
  const [feeStruct, setFeeStruct] = useState<"2/20" | "0/50">(() => {
    const m = Math.pow(1.20, 5);
    return calc2_20(1_000_000, 5, m).lpNet >= calcBuffett(1_000_000, 5, m).lpNet ? "2/20" : "0/50";
  });
  const selectedResult = feeStruct === "2/20" ? r2_20 : rBuf;
  const selectedColor  = feeStruct === "2/20" ? "#6366F1" : "#F59E0B";
  const selectedLabel  = feeStruct === "2/20" ? "2/20 LP net" : "0/50 LP net";
  const selectedTextCls = feeStruct === "2/20" ? "text-indigo-400" : "text-amber-400";

  // Portfolio view selector
  const [portfolioView, setPortfolioView] = useState<ViewMode>("median");

  // Per-asset slider expansion state
  const [expandedAssets, setExpandedAssets] = useState<Set<AssetKey>>(new Set());

  // Build PortfolioInputs rows used by chart + suggestions
  const fundRow: PortfolioInputs = {
    key: "fund",
    label: "Co-Owner Fund",
    color: "#A855F7",
    amount: capital,
    retRate: selectedResult.lpNetIrr,   // net IRR after fees
    vol: portVol.fund ?? 0.25,
  };
  const otherRows: PortfolioInputs[] = ASSET_CLASSES
    .filter(a => !a.isFund)
    .map(a => ({
      key: a.key,
      label: a.label,
      color: a.color,
      amount: portAlloc[a.key] || 0,
      retRate: portReturn[a.key] ?? a.defaultReturn,
      vol: portVol[a.key] ?? a.defaultVol,
    }));
  const allRows: PortfolioInputs[] = [fundRow, ...otherRows];
  const activeRows = allRows.filter(r => r.amount > 0);

  // Total portfolio value (current)
  const totalValue = allRows.reduce((s, r) => s + r.amount, 0);

  // Targets map
  const targets = Object.fromEntries(ASSET_CLASSES.map(a => [a.key, a.targetPct]));

  // Fund accessors (special bindings)
  const setFundAmount = (v: number) => setCapital(Math.max(100_000, Math.min(10_000_000, v)));
  const setFundReturn = (v: number) => setGrossReturn(Math.max(0, Math.min(0.35, v)));
  const setFundVol    = (v: number) => setPortVol(prev => ({ ...prev, fund: Math.max(0, Math.min(1, v)) }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Allocator</h1>
        <p className="text-sm text-slate-500 mt-1">
          Model fee structures, compare LP and GP economics, and stress-test the Co-Owner Fund
          against the rest of your portfolio. Fee calculations assume a single close, full capital
          deployed at inception, and a lump-sum exit at horizon.
        </p>
      </div>

      {/* Sliders */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-5">Assumptions</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Slider
            label="Committed Capital" value={capital} min={100_000} max={10_000_000} step={100_000}
            onChange={setCapital}
            display={capital >= 1_000_000 ? `$${(capital / 1_000_000).toFixed(1)}M` : `$${(capital / 1_000).toFixed(0)}k`}
          />
          <Slider
            label="Investment Horizon" value={years} min={1} max={25} step={1}
            onChange={setYears} display={`${years} yr${years !== 1 ? "s" : ""}`}
          />
          <Slider
            label="Gross Annual Return" value={grossReturn} min={0} max={0.35} step={0.005}
            onChange={setGrossReturn}
            display={fmtPct(grossReturn)}
            sub={`${fmtX(grossMoic)} MOIC`}
          />
        </div>
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
          <span>Gross exit: <span className="text-slate-300 font-medium">{fmt(capital * grossMoic)}</span></span>
          <span>Gross MOIC: <span className="text-slate-300 font-medium">{fmtX(grossMoic)}</span></span>
          <span>6% hurdle amount: <span className="text-slate-300 font-medium">{fmt(capital * (Math.pow(1.06, years) - 1))}</span></span>
        </div>
      </div>

      {/* Side-by-side fee-structure results */}
      <div className="flex flex-col sm:flex-row gap-5">
        <ResultCard title="2% Management Fee / 20% Carry" label="Traditional 2 / 20" accentColor="#6366F1" result={r2_20} capital={capital} />
        <ResultCard title="0% Management Fee / 50% Carry" label="Buffett Partnership Style  ·  0 / 50" accentColor="#F59E0B" result={rBuf} capital={capital} />
      </div>

      {/* Comparison callout */}
      <div className={`rounded-xl border px-6 py-4 text-sm ${lpDiff > 0 ? "border-emerald-800/50 bg-emerald-900/10" : "border-rose-800/50 bg-rose-900/10"}`}>
        <span className="text-slate-400">At these assumptions, the Buffett structure returns </span>
        <span className={`font-semibold ${lpDiff > 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {lpDiff > 0 ? "+" : ""}{fmt(Math.abs(lpDiff))} ({lpDiff > 0 ? "+" : ""}{fmtPct(lpDiff / capital)})
        </span>
        <span className="text-slate-400"> {lpDiff > 0 ? "more" : "less"} to the LP versus 2/20.</span>
        <span className="ml-2 text-slate-600 text-xs">
          (Δ LP net MOIC: {lpDiff >= 0 ? "+" : ""}{(rBuf.lpNetMoic - r2_20.lpNetMoic).toFixed(2)}× · Δ LP net IRR: {lpDiff >= 0 ? "+" : ""}{fmtPct(rBuf.lpNetIrr - r2_20.lpNetIrr)})
        </span>
      </div>

      {/* Portfolio Context */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        {/* Header with two toggles */}
        <div className="px-6 py-4 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Portfolio Context</p>
            <p className="text-sm text-slate-400 mt-0.5">
              Compare your full holdings — Co-Owner Fund alongside other assets — over the same horizon.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {/* Fee structure */}
            <div className="inline-flex rounded-md border border-slate-800 bg-slate-950/60 p-0.5">
              <button
                type="button"
                onClick={() => setFeeStruct("2/20")}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  feeStruct === "2/20"
                    ? "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/40"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                2/20 Traditional
              </button>
              <button
                type="button"
                onClick={() => setFeeStruct("0/50")}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  feeStruct === "0/50"
                    ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                0/50 Buffett
              </button>
            </div>
            {/* View mode */}
            <div className="inline-flex rounded-md border border-slate-800 bg-slate-950/60 p-0.5">
              <button
                type="button"
                onClick={() => setPortfolioView("median")}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  portfolioView === "median"
                    ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Median Outcome
              </button>
              <button
                type="button"
                onClick={() => setPortfolioView("variable")}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  portfolioView === "variable"
                    ? "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/40"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Variable (90% CI)
              </button>
            </div>
          </div>
        </div>

        {/* Body: input rows + chart */}
        <div className="p-6 flex flex-col lg:flex-row gap-8">
          {/* Asset rows (Co-Owner Fund first, then others) */}
          <div className="lg:w-[26rem] shrink-0 space-y-2">
            {ASSET_CLASSES.map(a => {
              const isFund = a.isFund;
              const amount  = isFund ? capital      : (portAlloc[a.key] || 0);
              const retRate = isFund ? grossReturn  : (portReturn[a.key] ?? a.defaultReturn);
              const vol     = isFund ? (portVol.fund ?? 0.25) : (portVol[a.key] ?? a.defaultVol);
              const setAmt  = isFund ? setFundAmount : (v: number) => setPortAlloc(prev => ({ ...prev, [a.key]: v }));
              const setRet  = isFund ? setFundReturn : (v: number) => setPortReturn(prev => ({ ...prev, [a.key]: v }));
              const setVol  = isFund ? setFundVol    : (v: number) => setPortVol(prev   => ({ ...prev, [a.key]: v }));
              const expanded = expandedAssets.has(a.key);
              const headerReturn = isFund ? selectedResult.lpNetIrr : retRate;

              return (
                <div key={a.key} className="rounded-md border border-transparent hover:border-slate-800/60 transition-colors">
                  {/* Header — editable inline fields + expand toggle */}
                  <div className="flex items-center gap-2 py-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
                    <span className="text-xs text-slate-300 font-medium flex-1 truncate min-w-0">
                      {a.label}
                      {isFund && <span className="ml-1 text-[10px] text-slate-600 font-normal">({feeStruct})</span>}
                    </span>
                    {/* Amount (inline editable) */}
                    <InlineNum
                      value={amount}
                      displayFn={v => v > 0 ? fmt(v) : "—"}
                      editFn={v => Math.round(v).toString()}
                      parseFn={raw => parseFloat(raw.replace(/[^0-9.]/g, ""))}
                      onChange={setAmt}
                      widthClass="w-16"
                    />
                    {/* Return (inline editable). For fund, display = net IRR, edit = gross. */}
                    <InlineNum
                      value={headerReturn}
                      displayFn={v => isFund ? `${(v * 100).toFixed(1)}% net` : `${(v * 100).toFixed(1)}%`}
                      editFn={() => (retRate * 100).toFixed(1)}
                      parseFn={raw => parseFloat(raw) / 100}
                      onChange={setRet}
                      widthClass={isFund ? "w-20" : "w-14"}
                      color={a.color}
                      title={isFund ? `Edit gross return; current gross ${(retRate * 100).toFixed(1)}%` : undefined}
                    />
                    {/* Vol (inline editable) */}
                    <InlineNum
                      value={vol}
                      displayFn={v => `Vol. ${(v * 100).toFixed(0)}%`}
                      editFn={v => (v * 100).toFixed(0)}
                      parseFn={raw => parseFloat(raw) / 100}
                      onChange={setVol}
                      widthClass="w-16"
                    />
                    {/* Expand toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedAssets(prev => {
                        const next = new Set(prev);
                        if (next.has(a.key)) next.delete(a.key); else next.add(a.key);
                        return next;
                      })}
                      className="shrink-0 p-1 text-slate-500 hover:text-slate-200 transition-colors"
                      aria-label={expanded ? "Collapse" : "Expand sliders"}
                    >
                      <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  {/* Sliders — collapsible */}
                  {expanded && (
                    <div className="space-y-1.5 pb-2 pt-0.5">
                      <SliderRow
                        prefix="$"
                        value={amount}
                        setValue={setAmt}
                        min={isFund ? 100_000 : 0} max={10_000_000} step={25_000}
                      />
                      <SliderRow
                        prefix="%"
                        value={retRate}
                        setValue={setRet}
                        min={0} max={0.35} step={0.005}
                      />
                      <SliderRow
                        prefix="Vol."
                        value={vol}
                        setValue={setVol}
                        min={0} max={1.0} step={0.01}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Total summary */}
            <div className="pt-4 border-t border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300 flex-1">Total Portfolio</span>
                <span className="text-sm tabular-nums font-semibold text-slate-100">{fmt(totalValue)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 flex-1">Co-Owner Fund share</span>
                <span className={`text-xs tabular-nums ${selectedTextCls}`}>
                  {totalValue > 0 ? fmtPct(capital / totalValue, 1) : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Chart + legend */}
          <div className="flex-1 min-w-0">
            {activeRows.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-16">
                Slide allocations above to populate the chart.
              </p>
            ) : (
              <PortfolioChart
                view={portfolioView}
                years={years}
                rows={activeRows}
                accentColor={portfolioView === "variable" ? "#22D3EE" : selectedColor}
              />
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 px-2">
              {ASSET_CLASSES.map(a => {
                const row = allRows.find(r => r.key === a.key);
                const active = (row?.amount ?? 0) > 0;
                return (
                  <span
                    key={a.key}
                    className={`flex items-center gap-1.5 text-[10px] ${active ? "text-slate-400" : "text-slate-700"}`}
                  >
                    <span className="w-2 h-2 rounded-sm" style={{ background: a.color, opacity: active ? 1 : 0.3 }} />
                    {a.label}
                  </span>
                );
              })}
            </div>
            {portfolioView === "variable" && (
              <p className="text-[10px] text-slate-600 mt-2 px-2">
                Bands shown are ±1.645 × Vol. (90% CI) on terminal portfolio value, assuming asset
                returns are lognormal and uncorrelated. Per-asset Vol. is editable above.
              </p>
            )}
          </div>
        </div>

        {/* Allocation suggestions footer */}
        <div className="px-6 py-5 border-t border-slate-800 bg-slate-950/40">
          <AllocationSuggestions rows={allRows} targets={targets} totalValue={totalValue} />
        </div>
      </div>

      {/* Structure notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-500">
        <div className="rounded-lg border border-slate-800 p-4 space-y-1">
          <p className="font-semibold text-slate-400 mb-2">2/20 Waterfall</p>
          <p>① Return of capital to LP</p>
          <p>② LP preferred return at 6% compounded</p>
          <p>③ 80/20 catchup until GP holds 20% of all profits</p>
          <p>④ 80% LP / 20% GP on remaining proceeds</p>
          <p className="pt-1 text-slate-600">Management fee paid annually regardless of performance.</p>
        </div>
        <div className="rounded-lg border border-slate-800 p-4 space-y-1">
          <p className="font-semibold text-slate-400 mb-2">Buffett Partnership 0/50 Waterfall</p>
          <p>① Return of capital to LP</p>
          <p>② LP preferred return at 6% compounded</p>
          <p>③ 50% LP / 50% GP on profits above hurdle</p>
          <p className="pt-1 text-slate-600">No management fee. No catchup. GP only earns on supra-hurdle returns.</p>
        </div>
      </div>
    </div>
  );
}
