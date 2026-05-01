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

const ZERO_RESULT: Result = {
  mgmtFee: 0, gpCarry: 0, lpNet: 0, lpNetMoic: 0, lpNetIrr: 0,
  gpTotal: 0, hurdle: 0, hurdleMet: false, exitValue: 0,
};

function calc2_20(capital: number, years: number, grossMoic: number): Result {
  if (capital <= 0) return ZERO_RESULT;
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
  if (capital <= 0) return ZERO_RESULT;
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
  const isCapital = max === 10_000_000;
  const isHorizon = max === 25 && step === 1;
  const minLabel  = isCapital ? "$0"    : isHorizon ? "1 yr"   : "0%";
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

  // Per-asset median + lognormal 90% bounds. Lognormal lower is bounded
  // at 0 by construction, so per-asset values can never go negative.
  const Z = 1.645; // ~90% two-sided
  const medians: { row: PortfolioInputs; values: number[]; lows: number[]; highs: number[] }[] = rows.map(r => {
    const values = Array.from({ length: years + 1 }, (_, t) => r.amount * Math.pow(1 + r.retRate, t));
    const lows   = values.map((v, t) => v * Math.exp(-Z * r.vol * Math.sqrt(t)));
    const highs  = values.map((v, t) => v * Math.exp(+Z * r.vol * Math.sqrt(t)));
    return { row: r, values, lows, highs };
  });

  // Total = sum of per-asset values/lows/highs (sum of lognormal bounds).
  const totalMedian = Array.from({ length: years + 1 }, (_, t) =>
    medians.reduce((s, m) => s + m.values[t], 0)
  );
  const totalLow = Array.from({ length: years + 1 }, (_, t) =>
    medians.reduce((s, m) => s + m.lows[t], 0)
  );
  const totalHigh = Array.from({ length: years + 1 }, (_, t) =>
    medians.reduce((s, m) => s + m.highs[t], 0)
  );

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
//   Retirement planning math
// =========================================================
type RiskTolerance = "conservative" | "moderate" | "aggressive";

// Wealth-band-aware target portfolios. Each band reflects realistic
// constraints: accreditation thresholds for private investments, minimum
// fund commitment sizes, and adequate liquidity buffers at lower wealth.
//   Starter (<$200k): no privates (not accredited), heavier cash buffer
//   Builder ($200k-$1M): partial private exposure
//   Established ($1M+): full diversification
// All rows must sum to 1.00 within each tolerance.
const TARGETS_STARTER: Record<RiskTolerance, Record<AssetKey, number>> = {
  conservative: { fund: 0,    sp500: 0.50, realestate: 0.15, privCredit: 0,    privEquity: 0,    crypto: 0.02, cash: 0.33 },
  moderate:     { fund: 0,    sp500: 0.65, realestate: 0.10, privCredit: 0,    privEquity: 0,    crypto: 0.05, cash: 0.20 },
  aggressive:   { fund: 0,    sp500: 0.70, realestate: 0.10, privCredit: 0,    privEquity: 0,    crypto: 0.10, cash: 0.10 },
};
const TARGETS_BUILDER: Record<RiskTolerance, Record<AssetKey, number>> = {
  conservative: { fund: 0.05, sp500: 0.35, realestate: 0.15, privCredit: 0.15, privEquity: 0.05, crypto: 0.02, cash: 0.23 },
  moderate:     { fund: 0.07, sp500: 0.45, realestate: 0.15, privCredit: 0.08, privEquity: 0.08, crypto: 0.07, cash: 0.10 },
  aggressive:   { fund: 0.13, sp500: 0.35, realestate: 0.12, privCredit: 0.05, privEquity: 0.18, crypto: 0.12, cash: 0.05 },
};
const TARGETS_ESTABLISHED: Record<RiskTolerance, Record<AssetKey, number>> = {
  conservative: { fund: 0.10, sp500: 0.25, realestate: 0.15, privCredit: 0.25, privEquity: 0.05, crypto: 0.02, cash: 0.18 },
  moderate:     { fund: 0.15, sp500: 0.35, realestate: 0.15, privCredit: 0.10, privEquity: 0.10, crypto: 0.10, cash: 0.05 },
  aggressive:   { fund: 0.20, sp500: 0.30, realestate: 0.10, privCredit: 0.05, privEquity: 0.20, crypto: 0.13, cash: 0.02 },
};

function getWealthBand(wealth: number): "starter" | "builder" | "established" {
  if (wealth < 200_000)   return "starter";
  if (wealth < 1_000_000) return "builder";
  return "established";
}
function getWealthBandLabel(wealth: number): string {
  const b = getWealthBand(wealth);
  if (b === "starter")     return "Starter (<$200k)";
  if (b === "builder")     return "Builder ($200k–$1M)";
  return "Established ($1M+)";
}
function getTargets(wealth: number, tolerance: RiskTolerance): Record<AssetKey, number> {
  const b = getWealthBand(wealth);
  if (b === "starter")     return TARGETS_STARTER[tolerance];
  if (b === "builder")     return TARGETS_BUILDER[tolerance];
  return TARGETS_ESTABLISHED[tolerance];
}

// Standard normal CDF (Abramowitz–Stegun 7.1.26)
function normalCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + 0.3275911 * a);
  const erf = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return 0.5 * (1.0 + sign * erf);
}

// Future value of a present sum + an annual contribution stream (end-of-year).
// If `growthRate` > 0, contributions grow at that rate each year (e.g. raises),
// which is the "growing annuity" formula.
function projectFV(present: number, contribFirstYear: number, rate: number, years: number, growthRate: number = 0): number {
  if (years <= 0) return present;
  const factor = Math.pow(1 + rate, years);
  if (contribFirstYear === 0) return present * factor;
  if (Math.abs(rate - growthRate) < 1e-9) {
    // Special case r == g: FV(growing annuity) = C × N × (1+r)^(N-1)
    return present * factor + contribFirstYear * years * Math.pow(1 + rate, years - 1);
  }
  if (Math.abs(rate) < 1e-9) {
    // No growth on existing wealth, but contribs may grow geometrically
    if (Math.abs(growthRate) < 1e-9) return present + contribFirstYear * years;
    return present + contribFirstYear * (Math.pow(1 + growthRate, years) - 1) / growthRate;
  }
  return present * factor + contribFirstYear * (factor - Math.pow(1 + growthRate, years)) / (rate - growthRate);
}

// Probability that a lognormal terminal value exceeds the target
function probMeetGoal(meanFV: number, vol: number, years: number, target: number): number {
  if (target <= 0) return 1;
  if (meanFV <= 0) return 0;
  if (vol <= 0 || years <= 0) return meanFV >= target ? 1 : 0;
  const logVol = vol * Math.sqrt(years);
  const z = (Math.log(target) - Math.log(meanFV)) / logVol;
  return 1 - normalCdf(z);
}

// Weighted-average expected return + portfolio vol (assumes uncorrelated assets)
function portfolioStats(
  weights: Record<string, number>,
  returns: Record<string, number>,
  vols: Record<string, number>,
): { expRet: number; vol: number } {
  let expRet = 0;
  let variance = 0;
  for (const a of ASSET_CLASSES) {
    const w = weights[a.key] ?? 0;
    const r = returns[a.key] ?? 0;
    const v = vols[a.key] ?? 0;
    expRet += w * r;
    variance += w * w * v * v;
  }
  return { expRet, vol: Math.sqrt(Math.max(variance, 0)) };
}

// =========================================================
//   Profile slider (personal inputs)
// =========================================================
function ProfileSlider({
  label, value, setValue, min, max, step, format,
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
  min: number; max: number; step: number;
  format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
        <span className="text-xs tabular-nums font-semibold text-slate-200">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => setValue(parseFloat(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer bg-slate-800
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400
          [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
}

// =========================================================
//   Stat card (current vs target with delta)
// =========================================================
function StatCard({
  title, current, target, delta, better, neutral, highlight,
}: {
  title: string;
  current: string;
  target: string;
  delta: string;
  better?: boolean;
  neutral?: boolean;
  highlight?: boolean;
}) {
  const deltaColor = neutral ? "text-slate-400" : better ? "text-emerald-400" : "text-rose-400";
  return (
    <div className={`rounded-lg border p-3 space-y-1 ${
      highlight ? "border-emerald-700/40 bg-emerald-900/10" : "border-slate-800 bg-slate-950/40"
    }`}>
      <p className="text-[10px] uppercase tracking-widest text-slate-600">{title}</p>
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] text-slate-500">Current</span>
        <span className="text-sm font-semibold tabular-nums text-slate-200">{current}</span>
      </div>
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] text-slate-500">Target</span>
        <span className="text-sm font-semibold tabular-nums text-slate-200">{target}</span>
      </div>
      <div className="flex justify-between items-baseline pt-1 border-t border-slate-800/60">
        <span className="text-[10px] text-slate-600">Δ</span>
        <span className={`text-xs tabular-nums font-medium ${deltaColor}`}>{delta}</span>
      </div>
    </div>
  );
}

// =========================================================
//   Retirement Planner — combines personal profile, outlook,
//   shortfall analysis, and rebalancing actions
// =========================================================
function RetirementPlanner({
  // Profile
  age, setAge, retireAge, setRetireAge,
  retireIncome, setRetireIncome,
  annualSavings, setAnnualSavings,
  contribMode, setContribMode,
  salary, setSalary,
  savingsRate, setSavingsRate,
  raiseRate, setRaiseRate,
  riskTolerance, setRiskTolerance,
  // Portfolio
  rows, totalValue, targets, wealthBandLabel,
  // Pre-computed outlook
  yearsToRetire, requiredAtRetire,
  currStats, targetStats, currFV, targetFV, currProb, targetProb,
  effectiveContrib, effectiveGrowth,
  // Actions
  applyRebalancing,
}: {
  age: number; setAge: (n: number) => void;
  retireAge: number; setRetireAge: (n: number) => void;
  retireIncome: number; setRetireIncome: (n: number) => void;
  annualSavings: number; setAnnualSavings: (n: number) => void;
  contribMode: "flat" | "growing"; setContribMode: (m: "flat" | "growing") => void;
  salary: number; setSalary: (n: number) => void;
  savingsRate: number; setSavingsRate: (n: number) => void;
  raiseRate: number; setRaiseRate: (n: number) => void;
  riskTolerance: RiskTolerance; setRiskTolerance: (v: RiskTolerance) => void;
  rows: PortfolioInputs[]; totalValue: number;
  targets: Record<AssetKey, number>;
  wealthBandLabel: string;
  yearsToRetire: number; requiredAtRetire: number;
  currStats: { expRet: number; vol: number };
  targetStats: { expRet: number; vol: number };
  currFV: number; targetFV: number;
  currProb: number; targetProb: number;
  effectiveContrib: number; effectiveGrowth: number;
  applyRebalancing: () => void;
}) {
  if (totalValue <= 0) {
    return (
      <p className="text-xs text-slate-600">
        Add allocations across the asset rows to see retirement-planning analysis.
      </p>
    );
  }

  // Rebalancing items
  const items = ASSET_CLASSES.map(a => {
    const row = rows.find(r => r.key === a.key);
    const current = row?.amount ?? 0;
    const currentPct = current / totalValue;
    const targetPct = targets[a.key] ?? 0;
    const deltaPct = currentPct - targetPct;
    const targetDollar = targetPct * totalValue;
    const deltaDollar = current - targetDollar;
    return { asset: a, current, currentPct, targetPct, deltaPct, deltaDollar };
  });

  const TOL = 0.02;
  const sorted = [...items].sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
  const overweight  = sorted.filter(i => i.deltaPct >  TOL).slice(0, 4);
  const underweight = sorted.filter(i => i.deltaPct < -TOL).slice(0, 4);

  // Shortfall analysis
  const currGap   = currFV - requiredAtRetire;     // positive = surplus
  const targetGap = targetFV - requiredAtRetire;
  const onTrack   = currGap >= 0;
  const fvShortfall = Math.max(0, requiredAtRetire - currFV);
  const fvUplift = targetFV - currFV;              // dollars gained by rebalancing
  const yearsAddedReturn = currStats.expRet < targetStats.expRet
    ? (targetStats.expRet - currStats.expRet) * 100  // pp/yr return foregone
    : 0;

  const fmtPct1 = (n: number) => `${(n * 100).toFixed(1)}%`;
  const fmtPct0 = (n: number) => `${(n * 100).toFixed(0)}%`;
  const fmtPP  = (n: number) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}pp`;
  const fmtSign = (n: number) => `${n >= 0 ? "+" : ""}${fmt(Math.abs(n))}`;

  const Row = ({ kind, item }: { kind: "over" | "under"; item: typeof items[number] }) => (
    <div className="flex items-baseline gap-2 py-1">
      <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: item.asset.color }} />
      <span className="text-xs text-slate-300 font-medium w-32 shrink-0 truncate">{item.asset.label}</span>
      <span className="text-[10px] text-slate-500 tabular-nums w-24">
        {fmtPct1(item.currentPct)} <span className="text-slate-700">vs</span> {fmtPct0(item.targetPct)}
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Allocation Suggestions <span className="text-slate-700">·</span> Retirement Planning
        </p>
        <p className="text-[10px] text-slate-600">
          Goal: <span className="text-slate-400 font-semibold">{fmt(requiredAtRetire)}</span>
          {" "}({fmt(retireIncome)}/yr × 25, 4% rule)
        </p>
      </div>

      {/* Personal Profile */}
      <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ProfileSlider
            label="Current Age"
            value={age} setValue={v => { setAge(v); if (retireAge <= v) setRetireAge(v + 1); }}
            min={25} max={75} step={1}
            format={v => `${v} yrs`}
          />
          <ProfileSlider
            label="Retire at Age"
            value={retireAge} setValue={setRetireAge}
            min={Math.max(45, age + 1)} max={80} step={1}
            format={v => `${v} yrs`}
          />
          <ProfileSlider
            label="Required Income / yr"
            value={retireIncome} setValue={setRetireIncome}
            min={30_000} max={500_000} step={5_000}
            format={v => fmt(v)}
          />
          {/* Annual contribution: flat or growing */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">
                Annual Contribution
              </span>
              <select
                value={contribMode}
                onChange={e => setContribMode(e.target.value as "flat" | "growing")}
                className="text-[9px] uppercase tracking-wider bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-slate-400 focus:outline-none focus:border-slate-600"
              >
                <option value="flat">flat</option>
                <option value="growing">growing</option>
              </select>
            </div>
            {contribMode === "flat" ? (
              <>
                <div className="text-right text-xs tabular-nums font-semibold text-slate-200 mb-1">
                  {fmt(annualSavings)}
                </div>
                <input
                  type="range" min={0} max={500_000} step={5_000} value={annualSavings}
                  onChange={e => setAnnualSavings(parseFloat(e.target.value))}
                  className="w-full h-1 rounded-full appearance-none cursor-pointer bg-slate-800
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                    [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </>
            ) : (
              <div className="text-right text-xs tabular-nums font-semibold text-slate-200">
                {fmt(salary * savingsRate)}
                <span className="text-[9px] text-slate-600 ml-1 font-normal">yr 1 → grows {(raiseRate * 100).toFixed(1)}%/yr</span>
              </div>
            )}
          </div>
        </div>

        {/* Growing-contribution sub-sliders (visible only in growing mode) */}
        {contribMode === "growing" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-3 border-t border-slate-800/60">
            <ProfileSlider
              label="Income (salary)"
              value={salary} setValue={setSalary}
              min={50_000} max={1_000_000} step={5_000}
              format={v => fmt(v)}
            />
            <ProfileSlider
              label="Savings Rate"
              value={savingsRate} setValue={setSavingsRate}
              min={0} max={0.50} step={0.005}
              format={v => `${(v * 100).toFixed(1)}%`}
            />
            <ProfileSlider
              label="Annual Raise"
              value={raiseRate} setValue={setRaiseRate}
              min={0} max={0.10} step={0.0025}
              format={v => `${(v * 100).toFixed(2)}%`}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800/60">
          <span className="text-[10px] uppercase tracking-widest text-slate-500">Risk tolerance</span>
          <div className="inline-flex rounded-md border border-slate-800 bg-slate-950/60 p-0.5">
            {(["conservative", "moderate", "aggressive"] as const).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRiskTolerance(r)}
                className={`px-3 py-1 text-xs font-medium rounded capitalize transition-colors ${
                  riskTolerance === r
                    ? "bg-slate-700/40 text-slate-100 ring-1 ring-slate-600"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-slate-600 ml-auto tabular-nums">
            {yearsToRetire > 0 ? `${yearsToRetire} years to retirement` : "Already retired"}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Expected Annual Return"
          current={fmtPct1(currStats.expRet)}
          target={fmtPct1(targetStats.expRet)}
          delta={fmtPP(targetStats.expRet - currStats.expRet)}
          better={targetStats.expRet > currStats.expRet}
        />
        <StatCard
          title="Portfolio Volatility"
          current={fmtPct1(currStats.vol)}
          target={fmtPct1(targetStats.vol)}
          delta={fmtPP(targetStats.vol - currStats.vol)}
          neutral
        />
        <StatCard
          title={`FV @ Age ${retireAge}`}
          current={fmt(currFV)}
          target={fmt(targetFV)}
          delta={fmtSign(targetFV - currFV)}
          better={targetFV > currFV}
        />
        <StatCard
          title="P(Reach Goal)"
          current={fmtPct0(currProb)}
          target={fmtPct0(targetProb)}
          delta={`${targetProb - currProb >= 0 ? "+" : ""}${((targetProb - currProb) * 100).toFixed(0)}pp`}
          better={targetProb > currProb}
          highlight
        />
      </div>

      {/* Shortfall callout */}
      <div className={`rounded-lg border px-4 py-3 ${
        onTrack
          ? "border-emerald-700/40 bg-emerald-900/10"
          : "border-amber-700/40 bg-amber-900/10"
      }`}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
          {onTrack ? (
            <>
              <span className="text-emerald-300 font-semibold">✓ On track —</span>
              <span className="text-slate-300">
                projected to exceed goal by{" "}
                <span className="text-emerald-300 tabular-nums font-semibold">{fmt(currGap)}</span>{" "}
                at age {retireAge}.
              </span>
              {targetFV > currFV && (
                <span className="text-slate-500 text-xs">
                  Rebalancing to target adds another{" "}
                  <span className="text-emerald-400 tabular-nums">{fmt(fvUplift)}</span>{" "}
                  ({fmtPct0((targetProb - currProb))} more probability).
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-amber-300 font-semibold">⚠ Falls short by</span>
              <span className="text-amber-300 tabular-nums font-semibold text-base">{fmt(fvShortfall)}</span>
              <span className="text-slate-400">at age {retireAge}.</span>
              {targetGap >= 0 ? (
                <span className="text-emerald-400 text-xs">
                  → Rebalancing to target closes the gap (P(success) {fmtPct0(currProb)} → {fmtPct0(targetProb)}).
                </span>
              ) : targetFV > currFV ? (
                <span className="text-amber-400 text-xs">
                  → Target reduces shortfall to {fmt(Math.abs(targetGap))}; consider raising contributions or extending horizon.
                </span>
              ) : (
                <span className="text-rose-400 text-xs">
                  → Target alone insufficient; raise contributions or extend horizon.
                </span>
              )}
            </>
          )}
        </div>
        {yearsAddedReturn > 0 && (
          <p className="text-[10px] text-slate-500 mt-2">
            Current allocation forgoes ~{yearsAddedReturn.toFixed(1)}pp/yr in expected return vs target —
            roughly {fmt(totalValue * (targetStats.expRet - currStats.expRet))} in year-1 dollars on a {fmt(totalValue)} portfolio.
          </p>
        )}
      </div>

      {/* Rebalancing actions */}
      {(underweight.length > 0 || overweight.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Rebalance to Target</p>
            <button
              type="button"
              onClick={applyRebalancing}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/40 hover:bg-indigo-500/25 hover:text-indigo-200 transition-colors"
            >
              Apply rebalancing →
            </button>
          </div>
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
        </div>
      )}
      {underweight.length === 0 && overweight.length === 0 && (
        <p className="text-xs text-emerald-400">All positions within ±2pp of target — portfolio is well-balanced.</p>
      )}

      {/* Marginal contribution allocation */}
      {effectiveContrib > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">
              Ideal Marginal Allocation · per {fmt(effectiveContrib)}/yr saved
            </p>
            <p className="text-[10px] text-slate-600">
              {effectiveGrowth > 0
                ? `Year-1 contribution; grows at ${(effectiveGrowth * 100).toFixed(2)}%/yr`
                : `Constant annual contribution`}
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1.5">
            {ASSET_CLASSES
              .filter(a => (targets[a.key] ?? 0) > 0.005)
              .map(a => {
                const pct = targets[a.key] ?? 0;
                const dollars = effectiveContrib * pct;
                return (
                  <div key={a.key} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: a.color }} />
                    <span className="text-[11px] text-slate-400 flex-1 truncate">{a.label}</span>
                    <span className="text-[11px] tabular-nums text-slate-200 font-medium">{fmt(dollars)}</span>
                    <span className="text-[10px] tabular-nums text-slate-600 w-9 text-right">{(pct * 100).toFixed(0)}%</span>
                  </div>
                );
              })}
          </div>
          {yearsToRetire > 0 && (
            <p className="text-[10px] text-slate-600 mt-3 pt-2 border-t border-slate-800/60">
              Cumulative contributions over {yearsToRetire} yrs ≈{" "}
              <span className="text-slate-400 tabular-nums font-medium">
                {fmt(
                  effectiveGrowth > 0 && Math.abs(effectiveGrowth) > 1e-9
                    ? effectiveContrib * (Math.pow(1 + effectiveGrowth, yearsToRetire) - 1) / effectiveGrowth
                    : effectiveContrib * yearsToRetire
                )}
              </span>{" "}
              (undiscounted, future dollars).
            </p>
          )}
        </div>
      )}

      {/* Target portfolio bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-widest text-slate-600">
            Target portfolio · <span className="capitalize text-slate-500">{riskTolerance}</span>
            {" · "}<span className="text-slate-500">{wealthBandLabel}</span>
          </span>
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

      <p className="text-[10px] text-slate-600 leading-relaxed pt-1">
        <span className="text-slate-500">Method:</span> deterministic future-value projection of current portfolio + annual
        contributions, assuming the weighted expected return holds. P(success) uses a lognormal terminal distribution with
        portfolio Vol. scaled by √horizon, where Vol. = √(Σ wᵢ²σᵢ²) (independence). Required portfolio uses the 4% rule
        (25× target income).
      </p>
    </div>
  );
}

// =========================================================
//   Main component
// =========================================================
// Preloaded "typical but not sound" $3M portfolio: heavy S&P concentration,
// excess cash drag, light private allocations. Designed to give the suggestion
// box something to flag.
const PRESET_CAPITAL = 200_000;       // Co-Owner Fund position
const PRESET_PORTFOLIO: Record<AssetKey, number> = {
  fund:       0,             // not used; fund position is via `capital`
  sp500:      1_500_000,     // 50% — overweight
  realestate:   400_000,     // 13%
  privCredit:   100_000,     //  3% — underweight
  privEquity:   150_000,     //  5% — underweight
  crypto:       250_000,     //  8%
  cash:         400_000,     // 13% — overweight
};

export default function FeeCalculator() {
  // Top-level fee-calc inputs
  const [capital, setCapital] = useState(PRESET_CAPITAL);
  const [years, setYears] = useState(5);
  const [grossReturn, setGrossReturn] = useState(0.20);

  // Other portfolio asset state
  const [portAlloc, setPortAlloc] = useState<Record<AssetKey, number>>(PRESET_PORTFOLIO);
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

  // ---- Retirement planning state ----
  const [age, setAge] = useState(45);
  const [retireAge, setRetireAge] = useState(65);
  const [retireIncome, setRetireIncome] = useState(120_000);
  const [annualSavings, setAnnualSavings] = useState(50_000);
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>("moderate");
  // Growing-contribution mode
  const [contribMode, setContribMode] = useState<"flat" | "growing">("flat");
  const [salary, setSalary] = useState(200_000);
  const [savingsRate, setSavingsRate] = useState(0.20);
  const [raiseRate, setRaiseRate] = useState(0.03);

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

  // Wealth-band-aware targets
  const targets = getTargets(totalValue, riskTolerance);
  const wealthBandLabel = getWealthBandLabel(totalValue);

  // Returns/vols by asset key, with the fund using selected-net IRR / fund Vol.
  const allReturnsMap: Record<string, number> = {
    fund: selectedResult.lpNetIrr,
    sp500: portReturn.sp500, realestate: portReturn.realestate,
    privCredit: portReturn.privCredit, privEquity: portReturn.privEquity,
    crypto: portReturn.crypto, cash: portReturn.cash,
  };
  const allVolsMap: Record<string, number> = {
    fund: portVol.fund, sp500: portVol.sp500, realestate: portVol.realestate,
    privCredit: portVol.privCredit, privEquity: portVol.privEquity,
    crypto: portVol.crypto, cash: portVol.cash,
  };

  // Current weights (by amount)
  const currentWeights: Record<string, number> = totalValue > 0
    ? Object.fromEntries(allRows.map(r => [r.key, r.amount / totalValue]))
    : Object.fromEntries(ASSET_CLASSES.map(a => [a.key, 0]));

  // Effective contribution stream (year 1 dollars + growth rate)
  const effectiveContrib = contribMode === "growing" ? salary * savingsRate : annualSavings;
  const effectiveGrowth  = contribMode === "growing" ? raiseRate : 0;

  // Retirement projections
  const yearsToRetire = Math.max(0, retireAge - age);
  const requiredAtRetire = retireIncome * 25; // 4% rule
  const currStats = portfolioStats(currentWeights, allReturnsMap, allVolsMap);
  const targetStats = portfolioStats(targets, allReturnsMap, allVolsMap);
  const currFV  = projectFV(totalValue, effectiveContrib, currStats.expRet,  yearsToRetire, effectiveGrowth);
  const targetFV = projectFV(totalValue, effectiveContrib, targetStats.expRet, yearsToRetire, effectiveGrowth);
  const currProb   = probMeetGoal(currFV,  currStats.vol,  yearsToRetire, requiredAtRetire);
  const targetProb = probMeetGoal(targetFV, targetStats.vol, yearsToRetire, requiredAtRetire);

  // Apply target rebalancing — sets capital and portAlloc to match target weights
  const applyRebalancing = () => {
    if (totalValue <= 0) return;
    setCapital(totalValue * targets.fund);
    setPortAlloc({
      fund: 0,                                  // unused; fund position is via `capital`
      sp500:      totalValue * targets.sp500,
      realestate: totalValue * targets.realestate,
      privCredit: totalValue * targets.privCredit,
      privEquity: totalValue * targets.privEquity,
      crypto:     totalValue * targets.crypto,
      cash:       totalValue * targets.cash,
    });
  };

  // Fund accessors (special bindings)
  const setFundAmount = (v: number) => setCapital(Math.max(0, Math.min(10_000_000, v)));
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
            label="Committed Capital" value={capital} min={0} max={10_000_000} step={25_000}
            onChange={setCapital}
            display={capital >= 1_000_000 ? `$${(capital / 1_000_000).toFixed(2)}M` : `$${(capital / 1_000).toFixed(0)}k`}
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
                    {/* Current % of total portfolio (display only; Vol moved to dropdown) */}
                    <span className="text-xs tabular-nums w-12 text-right text-slate-400 px-1">
                      {totalValue > 0 ? `${((amount / totalValue) * 100).toFixed(0)}%` : "—"}
                    </span>
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
                        min={0} max={10_000_000} step={25_000}
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
                Bands shown are 90% CI on each asset&rsquo;s terminal value (lognormal, summed).
                Lognormal floors each asset at $0, so the band can&rsquo;t go negative even at high Vol.
                Per-asset Vol. is editable above.
              </p>
            )}
          </div>
        </div>

        {/* Allocation suggestions footer */}
        <div className="px-6 py-5 border-t border-slate-800 bg-slate-950/40">
          <RetirementPlanner
            age={age} setAge={setAge}
            retireAge={retireAge} setRetireAge={setRetireAge}
            retireIncome={retireIncome} setRetireIncome={setRetireIncome}
            annualSavings={annualSavings} setAnnualSavings={setAnnualSavings}
            contribMode={contribMode} setContribMode={setContribMode}
            salary={salary} setSalary={setSalary}
            savingsRate={savingsRate} setSavingsRate={setSavingsRate}
            raiseRate={raiseRate} setRaiseRate={setRaiseRate}
            riskTolerance={riskTolerance} setRiskTolerance={setRiskTolerance}
            rows={allRows} totalValue={totalValue} targets={targets}
            wealthBandLabel={wealthBandLabel}
            yearsToRetire={yearsToRetire} requiredAtRetire={requiredAtRetire}
            currStats={currStats} targetStats={targetStats}
            currFV={currFV} targetFV={targetFV}
            currProb={currProb} targetProb={targetProb}
            effectiveContrib={effectiveContrib} effectiveGrowth={effectiveGrowth}
            applyRebalancing={applyRebalancing}
          />
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
