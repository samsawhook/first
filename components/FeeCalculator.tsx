"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

// =========================================================
//   Persisted state — localStorage-backed useState wrapper
// =========================================================
const STORAGE_VERSION = "v3-bonds";
function usePersistedState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const fullKey = `allocator.${STORAGE_VERSION}.${key}`;
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(fullKey);
      if (raw === null) return initial;
      const parsed = JSON.parse(raw);
      // Merge for object-shaped state to fill missing keys (e.g., new asset added)
      if (
        parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
        initial && typeof initial === "object" && !Array.isArray(initial)
      ) {
        return { ...(initial as object), ...parsed } as T;
      }
      return parsed as T;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(fullKey, JSON.stringify(state)); } catch {}
  }, [fullKey, state]);
  return [state, setState];
}

function fmt(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}
function fmtPct(n: number, digits = 1) { return `${(n * 100).toFixed(digits)}%`; }
function fmtX(n: number) { return `${n.toFixed(2)}x`; }

// $ increment for +/- buttons — 10% of current value or $25k, whichever is greater.
function dollarIncrement(amount: number): number {
  const ten = Math.abs(amount) * 0.10;
  return Math.max(25_000, Math.round(ten / 1_000) * 1_000);
}

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
  { key: "sp500",      label: "Public Equities",     color: "#60A5FA", defaultReturn: 0.09,  defaultVol: 0.16, isFund: false, targetPct: 0.35 },
  { key: "bonds",      label: "Bonds",               color: "#14B8A6", defaultReturn: 0.05,  defaultVol: 0.05, isFund: false, targetPct: 0.10 },
  { key: "realestate", label: "Real Estate",         color: "#34D399", defaultReturn: 0.07,  defaultVol: 0.12, isFund: false, targetPct: 0.15 },
  { key: "privCredit", label: "Private Credit",      color: "#A78BFA", defaultReturn: 0.09,  defaultVol: 0.06, isFund: false, targetPct: 0.10 },
  { key: "privEquity", label: "Other Priv. Equity",  color: "#F87171", defaultReturn: 0.12,  defaultVol: 0.25, isFund: false, targetPct: 0.10 },
  { key: "crypto",     label: "Crypto",              color: "#FBBF24", defaultReturn: 0.15,  defaultVol: 0.70, isFund: false, targetPct: 0.10 },
  { key: "cash",       label: "Cash / Money Market", color: "#94A3B8", defaultReturn: 0.04,  defaultVol: 0.01, isFund: false, targetPct: 0.05 },
] as const;

type AssetKey = typeof ASSET_CLASSES[number]["key"];

// Stacked-area draw order: bottom (most stable) to top (most volatile)
const STACK_ORDER: AssetKey[] = ["cash", "bonds", "privCredit", "sp500", "realestate", "privEquity", "fund", "crypto"];

// Asset grouping for rebalancing recommendations: Co-Owner Fund and other
// private equity are treated as a single "Private Equity" exposure so the
// recommender doesn't suggest splitting an existing fund position into
// generic PE, or vice versa.
type GroupKey = "private" | AssetKey;
const ASSET_GROUP: Partial<Record<AssetKey, GroupKey>> = {
  fund: "private",
  privEquity: "private",
};
function groupOf(k: AssetKey): GroupKey {
  return ASSET_GROUP[k] ?? k;
}
const GROUP_LABEL: Record<GroupKey, string> = {
  private: "Private Equity",
  fund: "Co-Owner Fund",
  sp500: "Public Equities",
  bonds: "Bonds",
  realestate: "Real Estate",
  privCredit: "Private Credit",
  privEquity: "Other Priv. Equity",
  crypto: "Crypto",
  cash: "Cash / Money Market",
};
const GROUP_COLOR: Record<GroupKey, string> = {
  private: "#A855F7",
  fund: "#A855F7",
  sp500: "#60A5FA",
  bonds: "#14B8A6",
  realestate: "#34D399",
  privCredit: "#A78BFA",
  privEquity: "#F87171",
  crypto: "#FBBF24",
  cash: "#94A3B8",
};

// Illiquid groups — selling these is hard / costly, so the recommender
// prefers to hold current value and use marginal contributions to balance
// rather than recommend reductions when these are over-target.
const ILLIQUID_GROUPS: GroupKey[] = ["private", "realestate"];

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
  prefix, value, setValue, min, max, step, format,
}: {
  prefix: string;
  value: number;
  setValue: (v: number) => void;
  min: number; max: number; step: number;
  format?: (v: number) => string;
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
      <span className="text-[10px] tabular-nums text-slate-300 w-14 text-right shrink-0">
        {format ? format(value) : value.toFixed(0)}
      </span>
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

function ResultCard({ title, label, accentColor, result, capital, waterfall }: {
  title: string; label: string; accentColor: string; result: Result; capital: number;
  waterfall: React.ReactNode;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
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
      {/* Header — always visible */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between" style={{ background: `${accentColor}10` }}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: accentColor }}>{label}</p>
          <p className="text-base font-semibold text-slate-100">{title}</p>
        </div>
        <div className="text-right ml-4 shrink-0">
          <p className="text-2xl font-bold tabular-nums text-slate-100 leading-none">{fmtX(result.lpNetMoic)}</p>
          <p className="text-xs tabular-nums text-slate-300 font-medium mt-0.5">{fmt(result.lpNet)}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">LP Net MOIC</p>
        </div>
      </div>
      {/* Breakdown bar — always visible */}
      <div className="px-5 pt-4 pb-3">
        <StackBar exit={result.exitValue} capital={capital} mgmtFee={result.mgmtFee} carry={result.gpCarry} lpNet={result.lpNet} />
        <div className="flex gap-4 mt-1.5 flex-wrap">
          <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-sm bg-slate-500/70 inline-block" />LP basis</span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-sm bg-emerald-500/70 inline-block" />LP return</span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-sm bg-violet-500/70 inline-block" />GP carry</span>
          {result.mgmtFee > 0 && <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-sm bg-rose-500/60 inline-block" />Mgmt fee</span>}
        </div>
        {/* Chevron to expand detail */}
        <button
          type="button"
          onClick={() => setDetailOpen(d => !d)}
          className="mt-2 flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
        >
          <ChevronDown size={11} className={`transition-transform ${detailOpen ? "rotate-180" : ""}`} />
          {detailOpen ? "Hide details" : "Show details"}
        </button>
      </div>
      {/* Collapsible: fee rows + waterfall explainer */}
      {detailOpen && (
        <>
          <div className="px-5 pb-4 border-t border-slate-800/50 space-y-0">
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
          <div className="px-5 pb-5 border-t border-slate-800/50 pt-4 text-xs text-slate-500 space-y-1">
            {waterfall}
          </div>
        </>
      )}
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

// Seeded PRNG (mulberry32) — deterministic so the spaghetti chart doesn't
// flicker between renders with the same inputs.
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Standard-normal sample via Box–Muller
function normalSample(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
// Independent-asset Monte Carlo at MONTHLY resolution. For each asset,
// annual log-drift μ = ln(1+r) split across 12 months; vol scaled by
// √12. PATH MEDIAN matches the user's expected (1+r)^t. Monthly resolution
// makes the spaghetti chart visibly look like Brownian motion rather than
// linear interpolations between yearly endpoints.
// Returns nPaths × (months+1) total-portfolio paths.
function simulatePathsMonthly(
  rows: { amount: number; retRate: number; vol: number }[],
  years: number,
  nPaths: number,
  seed: number,
  monthlySavings?: number,
): number[][] {
  const months = years * 12;
  const rng = makeRng(seed);
  const out: number[][] = new Array(nPaths);
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
  // Pre-compute per-asset monthly drift / vol
  const params = rows.map(r => ({
    amount: r.amount,
    weight: totalAmount > 0 ? r.amount / totalAmount : 0,
    muMo: Math.log(1 + Math.max(r.retRate, -0.999)) / 12,
    volMo: r.vol / Math.sqrt(12),
  }));
  for (let p = 0; p < nPaths; p++) {
    const totals = new Float64Array(months + 1);
    for (const pa of params) {
      let v = pa.amount;
      totals[0] += v;
      for (let m = 1; m <= months; m++) {
        const z = normalSample(rng);
        v *= Math.exp(pa.muMo + pa.volMo * z);
        if (monthlySavings) v += monthlySavings * pa.weight;
        totals[m] += v;
      }
    }
    out[p] = Array.from(totals);
  }
  return out;
}
// Spread a set of label Y-positions so none are closer than minGap.
// Preserves relative order; clamps to [clampTop, clampBottom].
// Returns adjusted positions in the same index order as input.
function spreadYLabels(
  naturalYs: number[],
  minGap: number,
  clampTop: number,
  clampBottom: number,
): number[] {
  const n = naturalYs.length;
  if (n <= 1) return [...naturalYs];
  // Work on sorted (index, position) pairs
  const items = naturalYs.map((y, i) => ({ i, y })).sort((a, b) => a.y - b.y);
  for (let pass = 0; pass < 200; pass++) {
    let moved = false;
    for (let j = 1; j < n; j++) {
      const gap = items[j].y - items[j - 1].y;
      if (gap < minGap) {
        const push = (minGap - gap) / 2;
        items[j - 1].y -= push;
        items[j].y     += push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  // Clamp and map back to original indices
  const out = new Array<number>(n);
  for (const item of items) out[item.i] = Math.max(clampTop, Math.min(clampBottom, item.y));
  return out;
}

// Empirical percentile across paths at a single timestep.
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)));
  return sorted[idx];
}

function PortfolioChart({
  view, years, rows, accentColor, idealRows, monthlySavings,
}: {
  view: ViewMode;
  years: number;
  rows: PortfolioInputs[];
  accentColor: string;
  idealRows?: PortfolioInputs[];   // target-allocation rows (same total value)
  monthlySavings?: number;         // additional monthly savings in $
}) {
  const W = 580, H = 320, PL = 66, PR = 24, PT = 16, PB = 34;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;
  const T = Math.max(years, 1);
  const currentYear = new Date().getFullYear();

  // Helper: FV of annuity contribution per asset
  function fvContribForRows(theRows: PortfolioInputs[], t: number, monthly: number): number {
    const totalAmt = theRows.reduce((s, r) => s + r.amount, 0);
    if (!monthly || totalAmt <= 0) return 0;
    return theRows.reduce((s, r) => {
      const w = r.amount / totalAmt;
      const mC = monthly * w;
      const rM = Math.pow(1 + Math.max(r.retRate, -0.999), 1 / 12) - 1;
      const m = t * 12;
      if (Math.abs(rM) < 1e-10) return s + mC * m;
      return s + mC * (Math.pow(1 + rM, m) - 1) / rM;
    }, 0);
  }

  // Per-asset deterministic median trajectory (= amount × (1+r)^t)
  const medians: { row: PortfolioInputs; values: number[] }[] = rows.map(r => ({
    row: r,
    values: Array.from({ length: years + 1 }, (_, t) => r.amount * Math.pow(1 + r.retRate, t)),
  }));

  // Analytic total median (used in stacked Median view + as overlay on
  // Variable view; matches the user's expected (1+r)^t per asset).
  const totalMedian = Array.from({ length: years + 1 }, (_, t) =>
    medians.reduce((s, m) => s + m.values[t], 0)
  );

  const ms = monthlySavings ?? 0;

  // savings-adjusted total median for current allocation
  const totalMedianAdj = Array.from({ length: years + 1 }, (_, t) =>
    totalMedian[t] + fvContribForRows(rows, t, ms)
  );

  // ideal allocation baseline median
  const idealMedianDet = idealRows && idealRows.length > 0
    ? Array.from({ length: years + 1 }, (_, t) =>
        idealRows.reduce((s, r) => s + r.amount * Math.pow(1 + Math.max(r.retRate, -0.999), t), 0)
        + fvContribForRows(idealRows, t, ms)
      )
    : null;

  // Stable serialization of inputs for useMemo deps — re-runs on any change
  const mcDepKey = useMemo(
    () => rows.map(r => `${r.key}:${r.amount.toFixed(2)}:${r.retRate.toFixed(4)}:${r.vol.toFixed(4)}`).join("|") + `|y${years}|s${ms}`,
    [rows, years, ms],
  );

  // Monte Carlo simulation for Variable view, MONTHLY resolution.
  // Re-runs whenever any allocation, return, or vol changes (via mcDepKey).
  const months = years * 12;
  const mc = useMemo(() => {
    if (view !== "variable" || rows.length === 0) return null;
    const N_PATHS = 400;
    const N_SPAGHETTI = 60;
    const seed = 4242;
    const paths = simulatePathsMonthly(rows, years, N_PATHS, seed, ms);
    const median: number[] = [];
    const p5: number[] = [];
    const p95: number[] = [];
    for (let m = 0; m <= months; m++) {
      const slice = paths.map(p => p[m]);
      median.push(percentile(slice, 0.5));
      p5.push(percentile(slice, 0.05));
      p95.push(percentile(slice, 0.95));
    }
    const stride = Math.max(1, Math.floor(N_PATHS / N_SPAGHETTI));
    const sample: number[][] = [];
    for (let i = 0; i < N_PATHS && sample.length < N_SPAGHETTI; i += stride) {
      sample.push(paths[i]);
    }
    return { sample, median, p5, p95, months };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, mcDepKey]);

  // Monthly-resolution analytic median — exact same formula as the stacked median view
  // but evaluated at each month so the variable view shows an identical median line.
  // This eliminates the MC sampling error that previously made the two modes disagree.
  const totalMedianMonthly = Array.from({ length: months + 1 }, (_, m) =>
    rows.reduce((s, r) => s + r.amount * Math.pow(1 + Math.max(r.retRate, -0.999), m / 12), 0)
    + fvContribForRows(rows, m / 12, ms)
  );
  const idealMedianMonthly = idealRows && idealRows.length > 0
    ? Array.from({ length: months + 1 }, (_, m) =>
        idealRows.reduce((s, r) => s + r.amount * Math.pow(1 + Math.max(r.retRate, -0.999), m / 12), 0)
        + fvContribForRows(idealRows, m / 12, ms)
      )
    : null;

  // y-axis max — clamp to P95 endpoint in Variable mode, total median in stacked.
  const maxVal = view === "median"
    ? Math.max(...(totalMedianAdj), ...(idealMedianDet ?? [0]), 1)
    : Math.max((mc?.p95[months] ?? 1), (idealMedianMonthly?.[months] ?? 0), 1);

  // x scaling — yearly index for stacked, monthly for variable.
  const xS = (t: number) => PL + (t / T) * innerW;
  const xSM = (m: number) => PL + (m / Math.max(months, 1)) * innerW;
  const yS = (v: number) => PT + innerH * (1 - Math.min(Math.max(v, 0) / maxVal, 1));
  const linePath = (vals: number[]) =>
    vals.map((v, t) => `${t === 0 ? "M" : "L"} ${xS(t).toFixed(1)} ${yS(v).toFixed(1)}`).join(" ");
  const linePathM = (vals: number[]) =>
    vals.map((v, m) => `${m === 0 ? "M" : "L"} ${xSM(m).toFixed(1)} ${yS(v).toFixed(1)}`).join(" ");
  const areaPathM = (lower: number[], upper: number[]) => {
    const top = upper.map((v, m) => `${m === 0 ? "M" : "L"} ${xSM(m).toFixed(1)} ${yS(v).toFixed(1)}`).join(" ");
    const N = lower.length;
    const bot = lower.map((_v, i) => {
      const idx = N - 1 - i;
      return `L ${xSM(idx).toFixed(1)} ${yS(lower[idx]).toFixed(1)}`;
    }).join(" ");
    return `${top} ${bot} Z`;
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
      {/* X axis labels (calendar years) */}
      {xTicks.map(t => (
        <text key={t} x={xS(t)} y={H - 8} textAnchor="middle" fontSize="9" fill="#475569">
          {currentYear + t}
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
          {/* Overlay lines (drawn before dots/labels so labels stay on top) */}
          {ms > 0 && <path d={linePath(totalMedianAdj)} fill="none" stroke="#F8FAFC" strokeWidth="1.5" strokeDasharray="4 3" strokeOpacity="0.5" />}
          {idealMedianDet && <path d={linePath(idealMedianDet)} fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="6 3" />}
          {/* Endpoint dots + collision-resolved labels */}
          {(() => {
            const xE = xS(years);
            type ML = { dataY: number; text: string; fill: string; fw: string; fs: number; dotR: number; opacity: number };
            const labels: ML[] = [];
            if (finalMedian > 0)
              labels.push({ dataY: yS(finalMedian), text: fmt(finalMedian), fill: "#F8FAFC", fw: "700", fs: 9, dotR: 4, opacity: 1 });
            if (ms > 0)
              labels.push({ dataY: yS(totalMedianAdj[years]), text: `+contrib ${fmt(totalMedianAdj[years])}`, fill: "#F8FAFC", fw: "600", fs: 9, dotR: 3.5, opacity: 0.8 });
            if (idealMedianDet)
              labels.push({ dataY: yS(idealMedianDet[years]), text: `ideal ${fmt(idealMedianDet[years])}`, fill: "#F59E0B", fw: "700", fs: 9, dotR: 4, opacity: 1 });
            const naturalYs = labels.map(l => l.dataY - 10);
            const adjYs = spreadYLabels(naturalYs, 13, PT + 4, PT + innerH - 4);
            return labels.map((l, i) => (
              <g key={i}>
                <circle cx={xE} cy={l.dataY} r={l.dotR} fill={l.fill} fillOpacity={l.opacity} />
                {Math.abs(adjYs[i] - naturalYs[i]) > 2 && (
                  <line x1={xE - 5} y1={l.dataY - 2} x2={xE - 5} y2={adjYs[i]} stroke={l.fill} strokeOpacity="0.3" strokeWidth="0.75" />
                )}
                <text x={xE - 8} y={adjYs[i]} textAnchor="end" fontSize={l.fs} fontWeight={l.fw} fill={l.fill} fillOpacity={l.opacity}>
                  {l.text}
                </text>
              </g>
            ));
          })()}
        </>
      )}

      {view === "variable" && mc && (
        <>
          {/* Empirical 5-95 CI envelope (drawn first as background) */}
          <path d={areaPathM(mc.p5, mc.p95)} fill={accentColor} fillOpacity="0.08" />
          {/* Spaghetti: sample of simulated total-portfolio paths */}
          {mc.sample.map((path, i) => (
            <path
              key={`s-${i}`}
              d={linePathM(path)}
              fill="none"
              stroke={accentColor}
              strokeOpacity="0.18"
              strokeWidth="0.7"
              strokeLinejoin="round"
            />
          ))}
          {/* P5/P95 edges */}
          <path d={linePathM(mc.p5)}  fill="none" stroke={accentColor} strokeOpacity="0.6" strokeWidth="1.25" strokeDasharray="3 3" />
          <path d={linePathM(mc.p95)} fill="none" stroke={accentColor} strokeOpacity="0.6" strokeWidth="1.25" strokeDasharray="3 3" />
          {/* Analytic median — identical to Median view, no MC sampling error */}
          <path d={linePathM(totalMedianMonthly)} fill="none" stroke={accentColor} strokeWidth="2.75" strokeLinejoin="round" strokeLinecap="round" />
          {/* Ideal line (drawn before dots/labels) */}
          {idealMedianMonthly && (
            <path d={linePathM(idealMedianMonthly)} fill="none" stroke="#F59E0B" strokeWidth="2.25" strokeDasharray="6 3" strokeLinejoin="round" strokeLinecap="round" />
          )}
          {/* Endpoint dots + collision-resolved labels */}
          {totalMedianMonthly[months] > 0 && (() => {
            const xE = xSM(months);
            type VL = { dataY: number; naturalY: number; text: string; fill: string; fw: string; fs: number; dotR: number; opacity: number };
            const labels: VL[] = [
              { dataY: yS(mc.p95[months]),              naturalY: yS(mc.p95[months]) - 11,             text: `P95 ${fmt(mc.p95[months])}`,                             fill: accentColor,  fw: "600", fs: 8, dotR: 3, opacity: 0.7 },
              { dataY: yS(totalMedianMonthly[months]),  naturalY: yS(totalMedianMonthly[months]) - 10,  text: `median ${fmt(totalMedianMonthly[months])}`,              fill: accentColor,  fw: "700", fs: 9, dotR: 5, opacity: 1   },
              { dataY: yS(mc.p5[months]),               naturalY: yS(mc.p5[months]) + 13,              text: `P5 ${fmt(mc.p5[months])}`,                               fill: accentColor,  fw: "600", fs: 8, dotR: 3, opacity: 0.7 },
              ...(idealMedianMonthly && idealMedianMonthly[months] > 0
                ? [{ dataY: yS(idealMedianMonthly[months]), naturalY: yS(idealMedianMonthly[months]) - 10, text: `ideal ${fmt(idealMedianMonthly[months])}`, fill: "#F59E0B", fw: "700", fs: 9, dotR: 0, opacity: 1 }]
                : []),
            ];
            const adjYs = spreadYLabels(labels.map(l => l.naturalY), 12, PT + 4, PT + innerH - 4);
            return labels.map((l, i) => (
              <g key={i}>
                {l.dotR > 0 && <circle cx={xE} cy={l.dataY} r={l.dotR} fill={l.fill} fillOpacity={l.opacity} />}
                {Math.abs(adjYs[i] - l.naturalY) > 2 && (
                  <line x1={xE - 5} y1={l.dataY} x2={xE - 5} y2={adjYs[i]} stroke={l.fill} strokeOpacity="0.3" strokeWidth="0.75" />
                )}
                <text x={xE - 8} y={adjYs[i]} textAnchor="end" fontSize={l.fs} fontWeight={l.fw} fill={l.fill} fillOpacity={l.opacity}>
                  {l.text}
                </text>
              </g>
            ));
          })()}
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
//   Established ($1M+): full diversification across alternatives
//
// Research basis: JPMorgan Model Portfolios (2024), Swensen Yale Endowment
// model adapted for individuals, Vanguard glide-path research, AQR
// alternative allocation studies. Crypto capped at 1-7% across bands.
// All rows sum to 1.00.
const TARGETS_STARTER: Record<RiskTolerance, Record<AssetKey, number>> = {
  conservative: { fund: 0,    sp500: 0.40, bonds: 0.22, realestate: 0.14, privCredit: 0,    privEquity: 0,    crypto: 0.01, cash: 0.23 },
  moderate:     { fund: 0,    sp500: 0.55, bonds: 0.13, realestate: 0.12, privCredit: 0,    privEquity: 0,    crypto: 0.03, cash: 0.17 },
  aggressive:   { fund: 0,    sp500: 0.65, bonds: 0.05, realestate: 0.10, privCredit: 0,    privEquity: 0,    crypto: 0.07, cash: 0.13 },
};
const TARGETS_BUILDER: Record<RiskTolerance, Record<AssetKey, number>> = {
  conservative: { fund: 0.05, sp500: 0.28, bonds: 0.18, realestate: 0.12, privCredit: 0.08, privEquity: 0.03, crypto: 0.01, cash: 0.25 },
  moderate:     { fund: 0.08, sp500: 0.40, bonds: 0.12, realestate: 0.12, privCredit: 0.06, privEquity: 0.05, crypto: 0.03, cash: 0.14 },
  aggressive:   { fund: 0.12, sp500: 0.47, bonds: 0.05, realestate: 0.10, privCredit: 0.03, privEquity: 0.08, crypto: 0.07, cash: 0.08 },
};
const TARGETS_ESTABLISHED: Record<RiskTolerance, Record<AssetKey, number>> = {
  conservative: { fund: 0.08, sp500: 0.22, bonds: 0.22, realestate: 0.13, privCredit: 0.18, privEquity: 0.04, crypto: 0.01, cash: 0.12 },
  moderate:     { fund: 0.12, sp500: 0.32, bonds: 0.14, realestate: 0.13, privCredit: 0.10, privEquity: 0.07, crypto: 0.04, cash: 0.08 },
  aggressive:   { fund: 0.17, sp500: 0.37, bonds: 0.06, realestate: 0.10, privCredit: 0.06, privEquity: 0.11, crypto: 0.06, cash: 0.07 },
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

// Weighted-average expected return + portfolio vol with uniform off-diagonal
// correlation rho. rho=0 → independent (simple sum of variances). rho=1 →
// perfect (Σwᵢσᵢ)². Closed-form: σ²ₚ = (1−ρ)·Σ wᵢ²σᵢ² + ρ·(Σ wᵢσᵢ)².
function portfolioStats(
  weights: Record<string, number>,
  returns: Record<string, number>,
  vols: Record<string, number>,
  rho: number = 0,
): { expRet: number; vol: number } {
  let expRet = 0;
  let sumW2S2 = 0;
  let sumWS = 0;
  for (const a of ASSET_CLASSES) {
    const w = weights[a.key] ?? 0;
    const r = returns[a.key] ?? 0;
    const v = vols[a.key] ?? 0;
    expRet += w * r;
    sumW2S2 += w * w * v * v;
    sumWS  += w * v;
  }
  const variance = (1 - rho) * sumW2S2 + rho * sumWS * sumWS;
  return { expRet, vol: Math.sqrt(Math.max(variance, 0)) };
}

const CORRELATION_RHO: Record<"independent" | "mild" | "crisis", number> = {
  independent: 0,
  mild: 0.30,
  crisis: 0.70,
};

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
  title, current, target, delta, better, neutral, highlight, tooltip,
}: {
  title: string;
  current: string;
  target: string;
  delta: string;
  better?: boolean;
  neutral?: boolean;
  highlight?: boolean;
  tooltip?: string;
}) {
  const deltaColor = neutral ? "text-slate-400" : better ? "text-emerald-400" : "text-rose-400";
  return (
    <div
      title={tooltip}
      className={`rounded-lg border p-3 space-y-1 ${
        highlight ? "border-emerald-700/40 bg-emerald-900/10" : "border-slate-800 bg-slate-950/40"
      }${tooltip ? " cursor-help" : ""}`}
    >
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
//   Pie chart of current allocation
// =========================================================
function AllocationPie({ rows, totalValue, size = 180 }: {
  rows: PortfolioInputs[];
  totalValue: number;
  size?: number;
}) {
  if (totalValue <= 0) return null;
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const active = rows.filter(rw => rw.amount > 0);
  if (active.length === 0) return null;

  let cum = -Math.PI / 2; // start at top
  const sectors = active.map(row => {
    const a = (row.amount / totalValue) * 2 * Math.PI;
    const start = cum;
    const end = cum + a;
    cum = end;
    if (active.length === 1) {
      // single asset = full circle (two semicircles to avoid degenerate arc)
      return { row, path: `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z` };
    }
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const largeArc = a > Math.PI ? 1 : 0;
    return { row, path: `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z` };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full" style={{ maxWidth: size, maxHeight: size }}>
      {sectors.map(({ row, path }) => (
        <path
          key={row.key}
          d={path}
          fill={row.color}
          fillOpacity="0.85"
          stroke="#0F172A"
          strokeWidth="1.5"
        >
          <title>{`${row.label}: ${fmt(row.amount)} (${((row.amount / totalValue) * 100).toFixed(1)}%)`}</title>
        </path>
      ))}
      <circle cx={cx} cy={cy} r={r * 0.42} fill="#0F172A" />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="9" fill="#64748B">Total</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="11" fontWeight="700" fill="#E2E8F0">{fmt(totalValue)}</text>
    </svg>
  );
}

// =========================================================
//   Retirement Planner — combines personal profile, outlook,
//   shortfall analysis, and rebalancing actions
// =========================================================
function RetirementPlanner({
  age, setAge, retireAge, setRetireAge,
  retireTarget, setRetireTarget,
  retireIncome, setRetireIncome,
  inflationRate, setInflationRate,
  drawdownRate, setDrawdownRate,
  annualSavings, setAnnualSavings,
  contribMode, setContribMode,
  salary, setSalary,
  savingsRate, setSavingsRate,
  raiseRate, setRaiseRate,
  riskTolerance, setRiskTolerance,
  planningOpen, setPlanningOpen,
  rows, totalValue, targets, wealthBandLabel,
  yearsToRetire, requiredAtRetire,
  currStats, targetStats, currFV, targetFV, currProb, targetProb,
  effectiveContrib, effectiveGrowth,
  applyRebalancing, undoRebalance, canUndo, resetToPreload,
}: {
  age: number; setAge: (n: number) => void;
  retireAge: number; setRetireAge: (n: number) => void;
  retireTarget: number; setRetireTarget: (n: number) => void;
  retireIncome: number; setRetireIncome: (n: number) => void;
  inflationRate: number; setInflationRate: (n: number) => void;
  drawdownRate: number; setDrawdownRate: (n: number) => void;
  annualSavings: number; setAnnualSavings: (n: number) => void;
  contribMode: "flat" | "growing"; setContribMode: (m: "flat" | "growing") => void;
  salary: number; setSalary: (n: number) => void;
  savingsRate: number; setSavingsRate: (n: number) => void;
  raiseRate: number; setRaiseRate: (n: number) => void;
  riskTolerance: RiskTolerance; setRiskTolerance: (v: RiskTolerance) => void;
  planningOpen: boolean; setPlanningOpen: (v: boolean) => void;
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
  undoRebalance: () => void;
  canUndo: boolean;
  resetToPreload: () => void;
}) {
  // Frequency selector for the marginal allocation breakdown
  const [contribFreq, setContribFreq] = useState<"month" | "quarter" | "year">("year");
  const freqDivisor: Record<typeof contribFreq, number> = { month: 12, quarter: 4, year: 1 };
  const freqUnit: Record<typeof contribFreq, string> = { month: "mo", quarter: "qtr", year: "yr" };

  // Per-cell expansion (for chevron dropdowns under target / contribution cells)
  const [targetExpanded, setTargetExpanded] = useState(false);
  const [contribExpanded, setContribExpanded] = useState(false);

  // Bidirectional sync helpers between target ($ at retirement) and income (today's $).
  // The most-recently-edited variable is canonical; the other is recomputed.
  const inflMult = (infl: number, ytr: number) => Math.pow(1 + infl, ytr);
  const incomeFromTarget = (t: number, infl: number, dd: number, ytr: number) =>
    dd > 0 ? (t * dd) / inflMult(infl, ytr) : 0;
  const targetFromIncome = (i: number, infl: number, dd: number, ytr: number) =>
    dd > 0 ? (i * inflMult(infl, ytr)) / dd : 0;
  const setRetireTargetSync = (v: number) => {
    setRetireTarget(v);
    setRetireIncome(incomeFromTarget(v, inflationRate, drawdownRate, yearsToRetire));
  };
  const setRetireIncomeSync = (v: number) => {
    setRetireIncome(v);
    setRetireTarget(targetFromIncome(v, inflationRate, drawdownRate, yearsToRetire));
  };
  const setInflationSync = (v: number) => {
    setInflationRate(v);
    setRetireIncome(incomeFromTarget(retireTarget, v, drawdownRate, yearsToRetire));
  };
  const setDrawdownSync = (v: number) => {
    setDrawdownRate(v);
    setRetireIncome(incomeFromTarget(retireTarget, inflationRate, v, yearsToRetire));
  };

  if (totalValue <= 0) {
    return (
      <p className="text-xs text-slate-600">
        Add allocations across the asset rows to see retirement-planning analysis.
      </p>
    );
  }

  // Group assets for rebalancing — Co-Owner Fund + Other Priv. Equity → "Private Equity".
  // Each group sums its constituent currents and target weights; we surface
  // group-level recommendations rather than per-asset within a group.
  type Item = {
    group: GroupKey;
    label: string;
    color: string;
    current: number;
    currentPct: number;
    targetPct: number;
    deltaPct: number;
    deltaDollar: number;
  };
  const groupItems: Item[] = (() => {
    const byGroup = new Map<GroupKey, { current: number; targetPct: number }>();
    for (const a of ASSET_CLASSES) {
      const g = groupOf(a.key);
      const row = rows.find(r => r.key === a.key);
      const cur = row?.amount ?? 0;
      const tgt = targets[a.key] ?? 0;
      const acc = byGroup.get(g) ?? { current: 0, targetPct: 0 };
      acc.current += cur;
      acc.targetPct += tgt;
      byGroup.set(g, acc);
    }
    return Array.from(byGroup.entries()).map(([g, v]) => {
      const currentPct = totalValue > 0 ? v.current / totalValue : 0;
      const deltaPct = currentPct - v.targetPct;
      const deltaDollar = v.current - v.targetPct * totalValue;
      return { group: g, label: GROUP_LABEL[g], color: GROUP_COLOR[g], current: v.current, currentPct, targetPct: v.targetPct, deltaPct, deltaDollar };
    });
  })();

  const TOL = 0.02;
  const sorted = [...groupItems].sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
  const overweight  = sorted.filter(i => i.deltaPct >  TOL);
  const underweight = sorted.filter(i => i.deltaPct < -TOL);

  // Prorate so displayed reduces == displayed adds (sum-to-zero guarantee).
  const totalOver  = overweight.reduce((s, i) => s + i.deltaDollar, 0);
  const totalUnder = underweight.reduce((s, i) => s + Math.abs(i.deltaDollar), 0);
  const rebalBudget = Math.min(totalOver, totalUnder);
  const overRatio  = totalOver  > 0 ? rebalBudget / totalOver  : 1;
  const underRatio = totalUnder > 0 ? rebalBudget / totalUnder : 1;

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

  const Row = ({ kind, item, prorateRatio = 1 }: { kind: "over" | "under"; item: Item; prorateRatio?: number }) => {
    const dollar = fmt(Math.abs(item.deltaDollar) * prorateRatio);
    const labelColor = kind === "over" ? "text-rose-400" : "text-emerald-400";
    const action = kind === "over" ? "↓ reduce" : "↑ add";
    return (
      <div className="flex items-baseline gap-2 py-1">
        <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: item.color }} />
        <span className="text-xs text-slate-300 font-medium w-32 shrink-0 truncate">{item.label}</span>
        <span className="text-[10px] text-slate-500 tabular-nums w-24">
          {fmtPct1(item.currentPct)} <span className="text-slate-700">vs</span> {fmtPct0(item.targetPct)}
        </span>
        <span className={`text-[11px] tabular-nums font-semibold flex-1 ${labelColor}`}>
          {action} ~{dollar}
        </span>
        <span className="text-[10px] text-slate-600 tabular-nums">
          {item.deltaPct > 0 ? "+" : ""}{(item.deltaPct * 100).toFixed(1)} pp
        </span>
      </div>
    );
  };

  // Profile inference: estimate income bracket from wealth band. Used to show
  // context-aware hints when the user hasn't refined their planner inputs.
  const inferredIncome = (() => {
    const band = getWealthBand(totalValue);
    if (band === "starter")     return 75_000;
    if (band === "builder")     return 175_000;
    return 350_000;
  })();
  // Infer likely age from retirement target and horizon (retireAge - horizon).
  // For now, the stored `age` is the source of truth (defaults to 45). We flag
  // whether it looks like an unmodified default so the UI can prompt refinement.
  const ageIsDefault = age === 45 && retireAge === 65;

  // Plain-English narrative — 2 sentences describing the situation.
  const probColor = currProb >= 0.75 ? "text-emerald-300" : currProb >= 0.5 ? "text-amber-300" : "text-rose-300";
  const probTargetColor = targetProb >= 0.75 ? "text-emerald-300" : targetProb >= 0.5 ? "text-amber-300" : "text-rose-300";
  const probLift = targetProb - currProb;
  const narrative = (
    <div className="space-y-2">
      <p className="text-sm text-slate-300 leading-relaxed">
        At <span className="text-slate-100 font-semibold">{age}</span>, retiring at{" "}
        <span className="text-slate-100 font-semibold">{retireAge}</span> with a{" "}
        <span className="text-slate-100 font-semibold tabular-nums">{fmt(requiredAtRetire)}</span> target,
        your current allocation has a{" "}
        <span className={`font-semibold ${probColor}`}>{(currProb * 100).toFixed(0)}%</span> chance
        of getting you there. Rebalancing to the{" "}
        <span className="text-slate-100 capitalize">{wealthBandLabel.split(" ")[0].toLowerCase()}</span>/
        <span className="text-slate-100 capitalize">{riskTolerance}</span> target{" "}
        {probLift > 0.005
          ? <>lifts that to <span className={`font-semibold ${probTargetColor}`}>{(targetProb * 100).toFixed(0)}%</span> ({probLift > 0 ? "+" : ""}{(probLift * 100).toFixed(0)}pp).</>
          : probLift < -0.005
          ? <>would drop it to <span className={`font-semibold ${probTargetColor}`}>{(targetProb * 100).toFixed(0)}%</span> — current is already over-aggressive.</>
          : <>holds at <span className={`font-semibold ${probTargetColor}`}>{(targetProb * 100).toFixed(0)}%</span> — already near-optimal.</>
        }
      </p>
      {ageIsDefault && (
        <p className="text-[11px] text-slate-500 leading-relaxed bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-3 py-2">
          <span className="text-amber-400 font-medium">Profile estimates</span>{" "}
          based on your {wealthBandLabel} portfolio: est. age <strong className="text-slate-400">{age}</strong>,
          est. income <strong className="text-slate-400">{fmt(inferredIncome)}/yr</strong>.
          {" "}Targets are blended toward conservative over {Math.max(0, retireAge - age)} yrs to retirement.
          {" "}<span className="text-slate-400 cursor-pointer underline decoration-dotted" onClick={() => setPlanningOpen(true)}>Update your profile in the planner</span>{" "}for personalized recommendations.
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlanningOpen(!planningOpen)}
            className="p-1 -m-0.5 text-slate-500 hover:text-slate-200 active:text-slate-100 transition-colors"
            aria-label={planningOpen ? "Collapse retirement planning" : "Expand retirement planning"}
          >
            <ChevronDown size={14} className={`transition-transform ${planningOpen ? "rotate-180" : ""}`} />
          </button>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Retirement Planning
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[10px] text-slate-600">
            Goal: <span className="text-slate-400 font-semibold">{fmt(requiredAtRetire)}</span>
            {" "}≈ <span className="text-slate-400 tabular-nums">{fmt(retireIncome)}</span>/yr today&rsquo;s $
            {" "}({(drawdownRate * 100).toFixed(1)}% drawdown, {(inflationRate * 100).toFixed(1)}% infl)
          </p>
          <button
            type="button"
            onClick={resetToPreload}
            className="text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-200 transition-colors"
            title="Reset all allocations and personal profile to the preloaded sample portfolio."
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {planningOpen && <>
      {/* Narrative summary */}
      <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3">
        {narrative}
      </div>

      {/* Personal Profile */}
      <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-start">
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

          {/* Retirement Target cell with chevron-expandable detail */}
          <div className={`space-y-1 ${targetExpanded ? "col-span-2 lg:col-span-1" : ""}`}>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">
                Retirement Target
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs tabular-nums font-semibold text-slate-200">{fmt(retireTarget)}</span>
                <button
                  type="button"
                  onClick={() => setTargetExpanded(v => !v)}
                  className="p-1.5 -m-1 text-slate-500 hover:text-slate-200 active:text-slate-100 transition-colors"
                  aria-label={targetExpanded ? "Collapse details" : "Expand details"}
                >
                  <ChevronDown size={12} className={`transition-transform ${targetExpanded ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>
            <input
              type="range" min={500_000} max={20_000_000} step={50_000} value={retireTarget}
              onChange={e => setRetireTargetSync(parseFloat(e.target.value))}
              className="w-full h-1 rounded-full appearance-none cursor-pointer bg-slate-800
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:cursor-pointer"
            />
            {targetExpanded && (
              <div className="pt-2 mt-2 space-y-2.5 border-t border-slate-800/60">
                <ProfileSlider
                  label="Income / yr (today's $)"
                  value={retireIncome} setValue={setRetireIncomeSync}
                  min={30_000} max={500_000} step={1_000}
                  format={v => fmt(v)}
                />
                <ProfileSlider
                  label="Inflation"
                  value={inflationRate} setValue={setInflationSync}
                  min={0} max={0.08} step={0.0025}
                  format={v => `${(v * 100).toFixed(2)}%`}
                />
                <ProfileSlider
                  label="Drawdown"
                  value={drawdownRate} setValue={setDrawdownSync}
                  min={0.02} max={0.08} step={0.001}
                  format={v => `${(v * 100).toFixed(1)}%`}
                />
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  {fmt(retireIncome)} today × {inflMult(inflationRate, yearsToRetire).toFixed(2)} infl ÷ {(drawdownRate * 100).toFixed(1)}%
                  {" = "}<span className="text-slate-300 tabular-nums">{fmt(retireTarget)}</span>
                </p>
              </div>
            )}
          </div>

          {/* Annual Contribution cell with chevron-expandable detail */}
          <div className={`space-y-1 ${contribExpanded ? "col-span-2 lg:col-span-1" : ""}`}>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">
                Annual Contribution
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs tabular-nums font-semibold text-slate-200">
                  {fmt(effectiveContrib)}
                  {contribMode === "growing" && (
                    <span className="text-[9px] text-slate-600 ml-1 font-normal">yr 1</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setContribExpanded(v => !v)}
                  className="p-1.5 -m-1 text-slate-500 hover:text-slate-200 active:text-slate-100 transition-colors"
                  aria-label={contribExpanded ? "Collapse details" : "Expand details"}
                >
                  <ChevronDown size={12} className={`transition-transform ${contribExpanded ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>
            {contribMode === "flat" ? (
              <input
                type="range" min={0} max={500_000} step={5_000} value={annualSavings}
                onChange={e => setAnnualSavings(parseFloat(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer bg-slate-800
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:cursor-pointer"
              />
            ) : (
              <div className="h-1" />
            )}
            {contribExpanded && (
              <div className="pt-2 mt-2 space-y-2.5 border-t border-slate-800/60">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-slate-600">Mode</span>
                  <select
                    value={contribMode}
                    onChange={e => setContribMode(e.target.value as "flat" | "growing")}
                    className="text-[10px] bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-slate-300 focus:outline-none focus:border-slate-600"
                  >
                    <option value="flat">Flat</option>
                    <option value="growing">Growing (income × rate)</option>
                  </select>
                </div>
                {contribMode === "growing" ? (
                  <>
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
                  </>
                ) : (
                  <ProfileSlider
                    label="Annual Contribution"
                    value={annualSavings} setValue={setAnnualSavings}
                    min={0} max={500_000} step={1_000}
                    format={v => fmt(v)}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800/60">
          <span className="text-[10px] uppercase tracking-widest text-slate-500" title="Sets the target portfolio used for rebalancing suggestions and projections.">Risk tolerance</span>
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
          tooltip="Weighted-average annual return: Σ wᵢ × rᵢ across asset weights and editable expected returns. The Co-Owner Fund uses LP net IRR after fees."
        />
        <StatCard
          title="Portfolio Volatility"
          current={fmtPct1(currStats.vol)}
          target={fmtPct1(targetStats.vol)}
          delta={fmtPP(targetStats.vol - currStats.vol)}
          neutral
          tooltip="Annualized portfolio standard deviation. Formula: √(Σ wᵢ²σᵢ²) under the simplifying assumption that asset returns are uncorrelated. ~68% of years fall within ±1σ of the mean return."
        />
        <StatCard
          title={`FV @ Age ${retireAge}`}
          current={fmt(currFV)}
          target={fmt(targetFV)}
          delta={fmtSign(targetFV - currFV)}
          better={targetFV > currFV}
          tooltip={`Deterministic future value at retirement age, in nominal future dollars. = current portfolio × (1+r)^${yearsToRetire} + ${effectiveGrowth > 0 ? "growing-annuity" : "flat-annuity"} of contributions.`}
        />
        <StatCard
          title="P(Reach Goal)"
          current={fmtPct0(currProb)}
          target={fmtPct0(targetProb)}
          delta={`${targetProb - currProb >= 0 ? "+" : ""}${((targetProb - currProb) * 100).toFixed(0)}pp`}
          better={targetProb > currProb}
          highlight
          tooltip="Probability the terminal portfolio meets the retirement target. Models the FV as lognormal with median = deterministic FV and log-vol = portfolio Vol × √horizon. P(V_T ≥ goal) = 1 − Φ((ln goal − ln median)/log-vol)."
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
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Rebalance to Target</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
            <div>
              {underweight.length > 0 && <p className="text-[10px] uppercase tracking-widest text-emerald-500/80 mb-1">Underweight · add</p>}
              {underweight.map(i => <Row key={i.group} kind="under" item={i} prorateRatio={underRatio} />)}
            </div>
            <div>
              {overweight.length > 0 && <p className="text-[10px] uppercase tracking-widest text-rose-500/80 mb-1">Overweight · reduce</p>}
              {overweight.map(i => <Row key={i.group} kind="over" item={i} prorateRatio={overRatio} />)}
            </div>
          </div>
        </div>
      )}
      {underweight.length === 0 && overweight.length === 0 && (
        <p className="text-xs text-emerald-400">All positions within ±2pp of target — portfolio is well-balanced.</p>
      )}

      {/* Marginal contribution allocation */}
      {effectiveContrib > 0 && (() => {
        const div = freqDivisor[contribFreq];
        const unit = freqUnit[contribFreq];
        const periodContrib = effectiveContrib / div;
        return (
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">
                  Ideal Marginal Allocation
                </p>
                <div className="inline-flex rounded border border-slate-800 bg-slate-950/60 p-0.5">
                  {(["month", "quarter", "year"] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setContribFreq(f)}
                      className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                        contribFreq === f
                          ? "bg-slate-700/40 text-slate-200 ring-1 ring-slate-600"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      /{freqUnit[f]}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 tabular-nums">
                  {fmt(periodContrib)}/{unit} saved
                </span>
              </div>
              <p className="text-[10px] text-slate-600">
                {effectiveGrowth > 0
                  ? `Year-1 amount; grows ${(effectiveGrowth * 100).toFixed(2)}%/yr`
                  : `Constant contribution`}
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1.5">
              {ASSET_CLASSES
                .filter(a => (targets[a.key] ?? 0) > 0.005)
                .map(a => {
                  const pct = targets[a.key] ?? 0;
                  const dollars = periodContrib * pct;
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
        );
      })()}

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
      </>}
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
  sp500:      1_400_000,     // 47% — overweight
  bonds:        100_000,     //  3% — underweight
  realestate:   400_000,     // 13%
  privCredit:   100_000,     //  3% — underweight
  privEquity:   150_000,     //  5% — underweight
  crypto:       250_000,     //  8%
  cash:         400_000,     // 13% — overweight
};

export default function FeeCalculator() {
  // Top-level fee-calc inputs (persisted)
  const [capital, setCapital] = usePersistedState("capital", PRESET_CAPITAL);
  const [years, setYears] = usePersistedState("years", 5);
  const [grossReturn, setGrossReturn] = usePersistedState("grossReturn", 0.20);

  // Other portfolio asset state (persisted; merged with defaults to handle new assets)
  const [portAlloc, setPortAlloc] = usePersistedState<Record<AssetKey, number>>("portAlloc", PRESET_PORTFOLIO);
  const [portReturn, setPortReturn] = usePersistedState<Record<AssetKey, number>>(
    "portReturn",
    Object.fromEntries(ASSET_CLASSES.map(a => [a.key, a.defaultReturn])) as Record<AssetKey, number>
  );
  const [portVol, setPortVol] = usePersistedState<Record<AssetKey, number>>(
    "portVol",
    Object.fromEntries(ASSET_CLASSES.map(a => [a.key, a.defaultVol])) as Record<AssetKey, number>
  );

  // Fee-calc results
  const grossMoic = Math.pow(1 + grossReturn, years);
  const r2_20 = useMemo(() => calc2_20(capital, years, grossMoic), [capital, years, grossMoic]);
  const rBuf  = useMemo(() => calcBuffett(capital, years, grossMoic), [capital, years, grossMoic]);
  const lpDiff = rBuf.lpNet - r2_20.lpNet;

  // Fee structure selector (persisted)
  const [feeStruct, setFeeStruct] = usePersistedState<"2/20" | "0/50">("feeStruct", "2/20");
  const selectedResult = feeStruct === "2/20" ? r2_20 : rBuf;
  const selectedColor  = feeStruct === "2/20" ? "#6366F1" : "#F59E0B";
  const selectedLabel  = feeStruct === "2/20" ? "2/20 LP net" : "0/50 LP net";
  const selectedTextCls = feeStruct === "2/20" ? "text-indigo-400" : "text-amber-400";

  // Portfolio view selector (persisted)
  const [portfolioView, setPortfolioView] = usePersistedState<ViewMode>("view", "median");
  const [showSavings, setShowSavings] = useState(false);

  // Per-asset slider expansion state (UI only, not persisted)
  const [expandedAssets, setExpandedAssets] = useState<Set<AssetKey>>(new Set());

  // ---- Retirement planning state (persisted) ----
  const [age, setAge] = usePersistedState("age", 45);
  const [retireAge, setRetireAge] = usePersistedState("retireAge", 65);
  const [retireTarget, setRetireTarget] = usePersistedState("retireTarget", 5_000_000);
  const [retireIncome, setRetireIncome] = usePersistedState(
    "retireIncome",
    (5_000_000 * 0.04) / Math.pow(1.03, 20)
  );
  const [inflationRate, setInflationRate] = usePersistedState("inflationRate", 0.03);
  const [drawdownRate, setDrawdownRate] = usePersistedState("drawdownRate", 0.04);
  const [annualSavings, setAnnualSavings] = usePersistedState("annualSavings", 50_000);
  const [riskTolerance, setRiskTolerance] = usePersistedState<RiskTolerance>("riskTolerance", "moderate");
  // Growing-contribution mode (persisted)
  const [contribMode, setContribMode] = usePersistedState<"flat" | "growing">("contribMode", "flat");
  const [salary, setSalary] = usePersistedState("salary", 200_000);
  const [savingsRate, setSavingsRate] = usePersistedState("savingsRate", 0.20);
  const [raiseRate, setRaiseRate] = usePersistedState("raiseRate", 0.03);
  // Section collapse state
  const [portfolioBodyOpen, setPortfolioBodyOpen] = usePersistedState<boolean>("portfolioBodyOpen", true);
  const [planningOpen, setPlanningOpen] = usePersistedState<boolean>("planningOpen", true);

  // ---- Saved scenarios ----
  type Scenario = {
    name: string;
    capital: number;
    portAlloc: Record<AssetKey, number>;
    portReturn: Record<AssetKey, number>;
    portVol: Record<AssetKey, number>;
    age: number; retireAge: number;
    retireTarget: number; retireIncome: number;
    inflationRate: number; drawdownRate: number;
    annualSavings: number;
    riskTolerance: RiskTolerance;
    contribMode: "flat" | "growing";
    salary: number; savingsRate: number; raiseRate: number;
    feeStruct: "2/20" | "0/50";
    years: number; grossReturn: number;
  };
  const [scenarios, setScenarios] = usePersistedState<Scenario[]>("scenarios", []);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const captureScenario = (name: string): Scenario => ({
    name, capital, portAlloc, portReturn, portVol,
    age, retireAge, retireTarget, retireIncome,
    inflationRate, drawdownRate, annualSavings, riskTolerance,
    contribMode, salary, savingsRate, raiseRate,
    feeStruct, years, grossReturn,
  });
  const loadScenario = (s: Scenario) => {
    setCapital(s.capital);
    setPortAlloc(s.portAlloc);
    setPortReturn(s.portReturn);
    setPortVol(s.portVol);
    setAge(s.age); setRetireAge(s.retireAge);
    setRetireTarget(s.retireTarget); setRetireIncome(s.retireIncome);
    setInflationRate(s.inflationRate); setDrawdownRate(s.drawdownRate);
    setAnnualSavings(s.annualSavings); setRiskTolerance(s.riskTolerance);
    setContribMode(s.contribMode);
    setSalary(s.salary); setSavingsRate(s.savingsRate); setRaiseRate(s.raiseRate);
    setFeeStruct(s.feeStruct);
    setYears(s.years); setGrossReturn(s.grossReturn);
  };
  const saveScenario = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const snap = captureScenario(trimmed);
    setScenarios(prev => [...prev.filter(s => s.name !== trimmed), snap]);
    setActiveScenario(trimmed);
  };
  const deleteScenario = (name: string) => {
    setScenarios(prev => prev.filter(s => s.name !== name));
    if (activeScenario === name) setActiveScenario(null);
  };

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

  // Wealth-band-aware targets, blended toward conservative as retirement nears
  // (linear over 0..20 yrs to retirement).
  const yearsToRetire = Math.max(0, retireAge - age);
  const targets: Record<AssetKey, number> = (() => {
    const baseTargets = getTargets(totalValue, riskTolerance);
    const consTargets = getTargets(totalValue, "conservative");
    const blend = Math.max(0, Math.min(1, yearsToRetire / 20));
    const out = {} as Record<AssetKey, number>;
    for (const a of ASSET_CLASSES) {
      out[a.key] = blend * (baseTargets[a.key] ?? 0) + (1 - blend) * (consTargets[a.key] ?? 0);
    }
    return out;
  })();
  const wealthBandLabel = getWealthBandLabel(totalValue);

  // Profile inference: estimate income bracket from wealth band. Used to show
  // context-aware hints when the user hasn't refined their planner inputs.
  const inferredIncome = (() => {
    const band = getWealthBand(totalValue);
    if (band === "starter")     return 75_000;
    if (band === "builder")     return 175_000;
    return 350_000;
  })();
  // Infer likely age from retirement target and horizon (retireAge - horizon).
  // For now, the stored `age` is the source of truth (defaults to 45). We flag
  // whether it looks like an unmodified default so the UI can prompt refinement.
  const ageIsDefault = age === 45 && retireAge === 65;

  // Returns/vols by asset key, with the fund using selected-net IRR / fund Vol.
  const allReturnsMap: Record<string, number> = {
    fund: selectedResult.lpNetIrr,
    sp500: portReturn.sp500, bonds: portReturn.bonds, realestate: portReturn.realestate,
    privCredit: portReturn.privCredit, privEquity: portReturn.privEquity,
    crypto: portReturn.crypto, cash: portReturn.cash,
  };
  const allVolsMap: Record<string, number> = {
    fund: portVol.fund, sp500: portVol.sp500, bonds: portVol.bonds, realestate: portVol.realestate,
    privCredit: portVol.privCredit, privEquity: portVol.privEquity,
    crypto: portVol.crypto, cash: portVol.cash,
  };

  // Target-allocation rows for the ideal overlay (same total value, target weights)
  const idealRows: PortfolioInputs[] = ASSET_CLASSES.map(a => ({
    key: a.key,
    label: a.label,
    color: a.color,
    amount: (targets[a.key] ?? 0) * totalValue,
    retRate: allReturnsMap[a.key] ?? a.defaultReturn,
    vol: allVolsMap[a.key] ?? a.defaultVol,
  })).filter(r => r.amount > 0);

  // Current weights (by amount)
  const currentWeights: Record<string, number> = totalValue > 0
    ? Object.fromEntries(allRows.map(r => [r.key, r.amount / totalValue]))
    : Object.fromEntries(ASSET_CLASSES.map(a => [a.key, 0]));

  // Effective contribution stream (year 1 dollars + growth rate)
  const effectiveContrib = contribMode === "growing" ? salary * savingsRate : annualSavings;
  const effectiveGrowth  = contribMode === "growing" ? raiseRate : 0;

  // Retirement projections — target is canonical; income is derived (and editable, syncs back).
  const requiredAtRetire = retireTarget;
  const currStats = portfolioStats(currentWeights, allReturnsMap, allVolsMap, 0);
  const targetStats = portfolioStats(targets, allReturnsMap, allVolsMap, 0);
  const currFV  = projectFV(totalValue, effectiveContrib, currStats.expRet,  yearsToRetire, effectiveGrowth);
  const targetFV = projectFV(totalValue, effectiveContrib, targetStats.expRet, yearsToRetire, effectiveGrowth);
  const currProb   = probMeetGoal(currFV,  currStats.vol,  yearsToRetire, requiredAtRetire);
  const targetProb = probMeetGoal(targetFV, targetStats.vol, yearsToRetire, requiredAtRetire);

  // Snapshot of last pre-rebalance state (for Undo)
  const [preRebalanceSnapshot, setPreRebalanceSnapshot] = useState<{
    capital: number; portAlloc: Record<AssetKey, number>;
  } | null>(null);

  // Highlight rows briefly after Apply Rebalancing (for #15 animate)
  const [recentlyChanged, setRecentlyChanged] = useState<boolean>(false);

  // Apply target rebalancing — sets capital and portAlloc to match target weights
  // Smart rebalance: don't sell illiquid (PE / RE) when overweight; hold them
  // at current value and rebalance the rest. For Private Equity (Co-Owner Fund
  // + Other Priv. Equity), allocate combined-bucket additions according to the
  // current Fund:OtherPE ratio; if both are zero, default to all-Fund.
  const applyRebalancing = () => {
    if (totalValue <= 0) return;
    setPreRebalanceSnapshot({ capital, portAlloc: { ...portAlloc } });

    // 1) Compute combined "private" current and target.
    const currentByKey: Record<AssetKey, number> = {
      fund: capital,
      sp500: portAlloc.sp500, bonds: portAlloc.bonds, realestate: portAlloc.realestate,
      privCredit: portAlloc.privCredit, privEquity: portAlloc.privEquity,
      crypto: portAlloc.crypto, cash: portAlloc.cash,
    };
    const privateCurrent = currentByKey.fund + currentByKey.privEquity;
    const privateTarget  = (targets.fund + targets.privEquity) * totalValue;
    const reTarget       = targets.realestate * totalValue;
    const reCurrent      = currentByKey.realestate;

    // 2) Lock illiquid at max(current, target) — never sell, but build up to target.
    const lockedPrivate = Math.max(privateCurrent, privateTarget);
    const lockedRE      = Math.max(reCurrent,      reTarget);

    // 3) Within the private bucket, split between Fund and Other PE in the
    //    current ratio (if both zero, all-Fund).
    let fundNew: number; let pEqNew: number;
    if (privateCurrent > 0) {
      const fundShare = currentByKey.fund / privateCurrent;
      fundNew = lockedPrivate * fundShare;
      pEqNew  = lockedPrivate * (1 - fundShare);
    } else {
      fundNew = lockedPrivate;
      pEqNew  = 0;
    }

    // 4) Liquid budget = remaining wealth after locking illiquid.
    const liquidBudget = Math.max(0, totalValue - lockedPrivate - lockedRE);
    const liquidTargetSum =
      (targets.sp500 + targets.bonds + targets.privCredit + targets.crypto + targets.cash);
    const liquidShare = (k: AssetKey) =>
      liquidTargetSum > 0 ? (targets[k] || 0) / liquidTargetSum : 0;

    setCapital(fundNew);
    setPortAlloc({
      fund:       0,
      sp500:      liquidBudget * liquidShare("sp500"),
      bonds:      liquidBudget * liquidShare("bonds"),
      realestate: lockedRE,
      privCredit: liquidBudget * liquidShare("privCredit"),
      privEquity: pEqNew,
      crypto:     liquidBudget * liquidShare("crypto"),
      cash:       liquidBudget * liquidShare("cash"),
    });
    setRecentlyChanged(true);
    setTimeout(() => setRecentlyChanged(false), 1400);
  };

  const undoRebalance = () => {
    if (!preRebalanceSnapshot) return;
    setCapital(preRebalanceSnapshot.capital);
    setPortAlloc(preRebalanceSnapshot.portAlloc);
    setPreRebalanceSnapshot(null);
  };

  const resetToPreload = () => {
    setPreRebalanceSnapshot({ capital, portAlloc: { ...portAlloc } });
    setCapital(PRESET_CAPITAL);
    setPortAlloc(PRESET_PORTFOLIO);
  };

  // Set total portfolio: scale non-fund holdings to match new total. If non-fund
  // is currently zero, distribute via target weights (excluding fund's slice).
  const setTotalAmount = (newTotal: number) => {
    const nonFundOld = totalValue - capital;
    const nonFundNew = Math.max(0, newTotal - capital);
    if (nonFundOld > 0) {
      const scale = nonFundNew / nonFundOld;
      setPortAlloc({
        fund: 0,
        sp500:      portAlloc.sp500 * scale,
        bonds:      portAlloc.bonds * scale,
        realestate: portAlloc.realestate * scale,
        privCredit: portAlloc.privCredit * scale,
        privEquity: portAlloc.privEquity * scale,
        crypto:     portAlloc.crypto * scale,
        cash:       portAlloc.cash * scale,
      });
    } else {
      const nonFundTargetSum = 1 - (targets.fund || 0);
      if (nonFundTargetSum > 1e-6) {
        setPortAlloc({
          fund: 0,
          sp500:      nonFundNew * (targets.sp500 / nonFundTargetSum),
          bonds:      nonFundNew * (targets.bonds / nonFundTargetSum),
          realestate: nonFundNew * (targets.realestate / nonFundTargetSum),
          privCredit: nonFundNew * (targets.privCredit / nonFundTargetSum),
          privEquity: nonFundNew * (targets.privEquity / nonFundTargetSum),
          crypto:     nonFundNew * (targets.crypto / nonFundTargetSum),
          cash:       nonFundNew * (targets.cash / nonFundTargetSum),
        });
      } else {
        const each = nonFundNew / 7;
        setPortAlloc({ fund: 0, sp500: each, bonds: each, realestate: each, privCredit: each, privEquity: each, crypto: each, cash: each });
      }
    }
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
          against the rest of your portfolio. State auto-saves to this browser; use Scenarios
          (under the chart) to snapshot &amp; switch between named what-ifs.
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
        <ResultCard
          title="2% Management Fee / 20% Carry"
          label="Traditional 2 / 20"
          accentColor="#6366F1"
          result={r2_20}
          capital={capital}
          waterfall={<>
            <p className="font-semibold text-slate-400 mb-1">2/20 Waterfall</p>
            <p>① Return of capital to LP</p>
            <p>② LP preferred return at 6% compounded</p>
            <p>③ 80/20 catchup until GP holds 20% of all profits</p>
            <p>④ 80% LP / 20% GP on remaining proceeds</p>
            <p className="pt-1 text-slate-600">Management fee paid annually regardless of performance.</p>
          </>}
        />
        <ResultCard
          title="0% Management Fee / 50% Carry"
          label="Buffett Partnership Style  ·  0 / 50"
          accentColor="#F59E0B"
          result={rBuf}
          capital={capital}
          waterfall={<>
            <p className="font-semibold text-slate-400 mb-1">Buffett Partnership 0/50 Waterfall</p>
            <p>① Return of capital to LP</p>
            <p>② LP preferred return at 6% compounded</p>
            <p>③ 50% LP / 50% GP on profits above hurdle</p>
            <p className="pt-1 text-slate-600">No management fee. No catchup. GP only earns on supra-hurdle returns.</p>
          </>}
        />
      </div>

      {/* Portfolio Context */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        {/* Header with two toggles */}
        <div className="px-6 py-4 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => setPortfolioBodyOpen(!portfolioBodyOpen)}
              className="p-1 -m-0.5 mt-0.5 text-slate-500 hover:text-slate-200 active:text-slate-100 transition-colors shrink-0"
              aria-label={portfolioBodyOpen ? "Collapse portfolio balancing" : "Expand portfolio balancing"}
            >
              <ChevronDown size={14} className={`transition-transform ${portfolioBodyOpen ? "rotate-180" : ""}`} />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Portfolio Balancing</p>
              <p className="text-sm text-slate-400 mt-0.5">
                Compare your full holdings — Co-Owner Fund alongside other assets — over the same horizon.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
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
            {/* Contributions toggle — uses planner annual contribution ÷ 12 */}
            <button
              type="button"
              onClick={() => setShowSavings(s => !s)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                showSavings
                  ? "border-amber-700/50 bg-amber-500/10 text-amber-400"
                  : "border-slate-800 bg-slate-950/60 text-slate-500 hover:text-slate-300"
              }`}
              title={`Include ${fmt(effectiveContrib)}/yr planner contributions in projection`}
            >
              + Contributions
              {showSavings && effectiveContrib > 0 && (
                <span className="text-[10px] opacity-70">{fmt(effectiveContrib / 12)}/mo</span>
              )}
            </button>
          </div>
        </div>

        {/* Body: input rows + chart */}
        {portfolioBodyOpen && (
        <div className="p-6 flex flex-col lg:flex-row gap-8">
          {/* Asset rows (Co-Owner Fund first, then others) */}
          <div className="lg:w-[28rem] shrink-0 space-y-1">
            {/* Column headers */}
            <div className="flex items-baseline gap-1.5 text-[9px] uppercase tracking-widest text-slate-600 px-1 pb-1.5 border-b border-slate-800/50">
              <span className="w-2 shrink-0" />
              <span className="flex-1 min-w-0">Asset</span>
              <span className="w-[6.5rem] text-center">Amount</span>
              <span className="w-12 text-right">Return</span>
              <span className="w-9 text-right">Alloc</span>
              <span className="w-12 text-right hidden md:inline-block">Δ$</span>
              <span className="w-6 shrink-0" />
            </div>
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
                <div
                  key={a.key}
                  className={`rounded-md border transition-all duration-700 ${
                    recentlyChanged
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-transparent hover:border-slate-800/60"
                  }`}
                >
                  {/* Header — editable inline fields + expand toggle */}
                  <div className="flex items-center gap-1.5 py-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
                    <span className="text-xs text-slate-300 font-medium flex-1 min-w-0 truncate">
                      {a.label}
                      {isFund && <span className="ml-1 text-[10px] text-slate-600 font-normal hidden lg:inline">({feeStruct})</span>}
                    </span>
                    {/* Amount with +/- buttons */}
                    <div className="flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => setAmt(Math.max(0, amount - dollarIncrement(amount)))}
                        className="w-6 h-6 text-sm leading-none text-slate-500 hover:text-slate-200 hover:bg-slate-800 active:bg-slate-700 rounded transition-colors"
                        aria-label="Decrease"
                      >−</button>
                      <InlineNum
                        value={amount}
                        displayFn={v => v > 0 ? fmt(v) : "—"}
                        editFn={v => Math.round(v).toString()}
                        parseFn={raw => parseFloat(raw.replace(/[^0-9.]/g, ""))}
                        onChange={setAmt}
                        widthClass="w-14"
                      />
                      <button
                        type="button"
                        onClick={() => setAmt(amount + dollarIncrement(Math.max(amount, 1_000)))}
                        className="w-6 h-6 text-sm leading-none text-slate-500 hover:text-slate-200 hover:bg-slate-800 active:bg-slate-700 rounded transition-colors"
                        aria-label="Increase"
                      >+</button>
                    </div>
                    {/* Return (inline editable). For fund, display = net IRR, edit = gross. */}
                    <InlineNum
                      value={headerReturn}
                      displayFn={v => `${(v * 100).toFixed(1)}%`}
                      editFn={() => (retRate * 100).toFixed(1)}
                      parseFn={raw => parseFloat(raw) / 100}
                      onChange={setRet}
                      widthClass="w-12"
                      color={a.color}
                      title={isFund ? `Edit gross return; current gross ${(retRate * 100).toFixed(1)}%` : undefined}
                    />
                    {/* Current % of total + Δ$ vs target. For Fund/Other PE,
                         use the COMBINED Private Equity bucket (Co-Owner Fund +
                         Other Priv. Equity) so the delta isn't double-counted.
                         For illiquid (PE / RE) overweights, show ✓ hold rather
                         than ↓ reduce — we don't recommend selling. */}
                    {(() => {
                      const g = groupOf(a.key);
                      const isPrivate = g === "private";
                      const groupCurrent = isPrivate ? capital + portAlloc.privEquity : amount;
                      const groupTargetPct = isPrivate ? (targets.fund + targets.privEquity) : (targets[a.key] ?? 0);
                      const groupTargetDollar = groupTargetPct * totalValue;
                      const currPct = totalValue > 0 ? amount / totalValue : 0;
                      const groupCurrPct = totalValue > 0 ? groupCurrent / totalValue : 0;
                      const groupDeltaPP = groupCurrPct - groupTargetPct;
                      const groupDeltaDollar = totalValue > 0 ? groupCurrent - groupTargetDollar : 0;
                      const ON_TARGET = 0.02;
                      const isOn = Math.abs(groupDeltaPP) < ON_TARGET;
                      const isOver = groupDeltaPP >= ON_TARGET;
                      const isIlliquid = ILLIQUID_GROUPS.includes(g);
                      const showHold = isOver && isIlliquid;
                      const dColor = isOn ? "text-slate-600" : showHold ? "text-amber-400" : isOver ? "text-rose-400" : "text-emerald-400";
                      const dArrow = isOn ? "✓" : showHold ? "✓" : isOver ? "↓" : "↑";
                      // For combined PE, only show the delta on the Fund row.
                      const showDelta = isPrivate ? (a.key === "fund") : true;
                      const titleText = isPrivate
                        ? `Combined Private Equity target ${(groupTargetPct * 100).toFixed(0)}% (${fmt(groupTargetDollar)}). Currently ${(groupCurrPct * 100).toFixed(1)}%.`
                        : `Target ${(groupTargetPct * 100).toFixed(0)}% (${fmt(groupTargetDollar)}). Currently ${(currPct * 100).toFixed(1)}%.`;
                      return (
                        <>
                          <span className="text-xs tabular-nums w-9 text-right text-slate-400 shrink-0">
                            {totalValue > 0 ? `${(currPct * 100).toFixed(0)}%` : "—"}
                          </span>
                          {totalValue > 0 && groupTargetPct > 0.005 && showDelta && (
                            <span
                              className={`text-[10px] tabular-nums ${dColor} w-12 text-right shrink-0 hidden md:inline-block`}
                              title={titleText}
                            >
                              {dArrow} {isOn || showHold ? (showHold ? "hold" : "") : fmt(Math.abs(groupDeltaDollar))}
                            </span>
                          )}
                          {totalValue > 0 && (groupTargetPct <= 0.005 || !showDelta) && (
                            <span className="text-[10px] text-slate-600 w-12 text-right shrink-0 hidden md:inline-block">—</span>
                          )}
                        </>
                      );
                    })()}
                    {/* Expand toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedAssets(prev => {
                        const next = new Set(prev);
                        if (next.has(a.key)) next.delete(a.key); else next.add(a.key);
                        return next;
                      })}
                      className="shrink-0 p-2 -m-1 text-slate-500 hover:text-slate-200 active:text-slate-100 transition-colors"
                      aria-label={expanded ? "Collapse" : "Expand sliders"}
                    >
                      <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  {/* Sliders — collapsible */}
                  {expanded && (
                    <div className="space-y-1.5 pb-2 pt-0.5">
                      {isFund && (
                        <div className="flex items-center gap-2 pl-4">
                          <span className="text-[10px] text-slate-600 w-9 shrink-0 uppercase tracking-wide">Fees</span>
                          <div className="inline-flex rounded border border-slate-800 bg-slate-950/60 p-0.5">
                            <button
                              type="button"
                              onClick={() => setFeeStruct("2/20")}
                              className={`px-2.5 py-0.5 text-[11px] font-medium rounded transition-colors ${
                                feeStruct === "2/20"
                                  ? "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/40"
                                  : "text-slate-500 hover:text-slate-300"
                              }`}
                            >
                              2/20
                            </button>
                            <button
                              type="button"
                              onClick={() => setFeeStruct("0/50")}
                              className={`px-2.5 py-0.5 text-[11px] font-medium rounded transition-colors ${
                                feeStruct === "0/50"
                                  ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40"
                                  : "text-slate-500 hover:text-slate-300"
                              }`}
                            >
                              0/50
                            </button>
                          </div>
                        </div>
                      )}
                      <SliderRow
                        prefix="$"
                        value={amount}
                        setValue={setAmt}
                        min={0} max={10_000_000} step={25_000}
                        format={v => fmt(v)}
                      />
                      <SliderRow
                        prefix="%"
                        value={retRate}
                        setValue={setRet}
                        min={0} max={0.35} step={0.005}
                        format={v => `${(v * 100).toFixed(1)}%`}
                      />
                      <SliderRow
                        prefix="Vol."
                        value={vol}
                        setValue={setVol}
                        min={0} max={1.0} step={0.01}
                        format={v => `${(v * 100).toFixed(0)}%`}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Total summary — editable with +/- */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300 flex-1">Total Portfolio</span>
                <button
                  type="button"
                  onClick={() => setTotalAmount(Math.max(0, totalValue - dollarIncrement(totalValue)))}
                  className="w-6 h-6 text-sm leading-none text-slate-500 hover:text-slate-200 hover:bg-slate-800 active:bg-slate-700 rounded transition-colors"
                  aria-label="Decrease total"
                >−</button>
                <InlineNum
                  value={totalValue}
                  displayFn={v => fmt(v)}
                  editFn={v => Math.round(v).toString()}
                  parseFn={raw => parseFloat(raw.replace(/[^0-9.]/g, ""))}
                  onChange={setTotalAmount}
                  widthClass="w-24"
                />
                <button
                  type="button"
                  onClick={() => setTotalAmount(totalValue + dollarIncrement(Math.max(totalValue, 1_000)))}
                  className="w-6 h-6 text-sm leading-none text-slate-500 hover:text-slate-200 hover:bg-slate-800 active:bg-slate-700 rounded transition-colors"
                  aria-label="Increase total"
                >+</button>
              </div>
              {/* Current vs Optimized allocation pies */}
              <div className="flex flex-wrap justify-center gap-3 pt-1">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">Current</p>
                  <AllocationPie rows={allRows} totalValue={totalValue} size={140} />
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">
                    Optimized · <span className="capitalize text-slate-500">{riskTolerance}</span>
                  </p>
                  <AllocationPie
                    rows={ASSET_CLASSES.map(a => ({
                      key: a.key,
                      label: a.label,
                      color: a.color,
                      amount: totalValue * (targets[a.key] || 0),
                      retRate: 0,
                      vol: 0,
                    }))}
                    totalValue={totalValue}
                    size={140}
                  />
                </div>
              </div>
              {/* Key rebalancing moves — grouped by bucket */}
              {(() => {
                const byGroup = new Map<GroupKey, { current: number; targetPct: number }>();
                for (const a of ASSET_CLASSES) {
                  const g = groupOf(a.key);
                  const cur = (allRows.find(r => r.key === a.key)?.amount) ?? 0;
                  const tgt = targets[a.key] ?? 0;
                  const acc = byGroup.get(g) ?? { current: 0, targetPct: 0 };
                  acc.current += cur;
                  acc.targetPct += tgt;
                  byGroup.set(g, acc);
                }
                const items = Array.from(byGroup.entries()).map(([g, v]) => {
                  const targetDollar = v.targetPct * totalValue;
                  const currPct = totalValue > 0 ? v.current / totalValue : 0;
                  return {
                    group: g,
                    label: GROUP_LABEL[g],
                    color: GROUP_COLOR[g],
                    current: v.current,
                    currPct,
                    targetPct: v.targetPct,
                    deltaDollar: v.current - targetDollar,
                  };
                });
                const tol = totalValue * 0.02;
                const allMoves = items
                  .filter(i => Math.abs(i.deltaDollar) > tol)
                  .sort((a, b) => Math.abs(b.deltaDollar) - Math.abs(a.deltaDollar));
                if (allMoves.length === 0) return (
                  <p className="text-[11px] text-emerald-400 pt-2 border-t border-slate-800/60 mt-1">
                    ✓ Allocation is within ±2% of target across all groups.
                  </p>
                );
                const overMoves = allMoves.filter(m => m.deltaDollar > 0);
                const underMoves = allMoves.filter(m => m.deltaDollar < 0);
                const totOver = overMoves.reduce((s, m) => s + m.deltaDollar, 0);
                const totUnder = underMoves.reduce((s, m) => s + Math.abs(m.deltaDollar), 0);
                const budget = Math.min(totOver, totUnder);
                const oRatio = totOver > 0 ? budget / totOver : 1;
                const uRatio = totUnder > 0 ? budget / totUnder : 1;
                const moves = allMoves.slice(0, 5);
                return (
                  <div className="pt-2 mt-1 border-t border-slate-800/60 space-y-1.5">
                    <p className="text-[10px] uppercase tracking-widest text-slate-600">Key Rebalancing Moves</p>
                    <ul className="space-y-1">
                      {moves.map(m => {
                        const isOver = m.deltaDollar > 0;
                        const ratio = isOver ? oRatio : uRatio;
                        const arrow = isOver ? "↓" : "↑";
                        const color = isOver ? "text-rose-400" : "text-emerald-400";
                        return (
                          <li key={m.group} className="text-[11px] flex items-baseline gap-2">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: m.color }} />
                            <span className={`shrink-0 font-semibold ${color}`}>{arrow}</span>
                            <span className="text-slate-300 flex-1">
                              <span className="tabular-nums font-semibold text-slate-100">{fmt(Math.abs(m.deltaDollar) * ratio)}</span>{" "}
                              {isOver ? "out of" : "into"} {m.label}
                              <span className="text-slate-600 tabular-nums">
                                {" "}({(m.currPct * 100).toFixed(0)}% → {(m.targetPct * 100).toFixed(0)}%)
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}
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
                idealRows={idealRows}
                monthlySavings={showSavings ? effectiveContrib / 12 : 0}
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
                Spaghetti = 60 sample paths from a 400-path Monte Carlo at monthly resolution (lognormal,
                uncorrelated, drift μ = ln(1+r)/12 so path median = (1+r)<sup>t</sup>). Dashed envelope is
                the empirical 5/95 percentile of the simulated total. Amber dashed line = ideal allocation median.
                Per-asset Vol. is editable above.
              </p>
            )}

            {/* Action toolbar — scenarios, attached to the chart */}
            <div className="flex flex-wrap items-center gap-2 mt-4 px-2 pt-3 border-t border-slate-800/60">
              <span className="hidden sm:block w-px h-6 bg-slate-800 mx-1" />
              <span className="text-[10px] uppercase tracking-widest text-slate-500" title="Save and switch between named portfolio + plan snapshots, persisted in this browser.">
                Scenarios
              </span>
              <select
                value={activeScenario ?? ""}
                onChange={e => {
                  const name = e.target.value;
                  if (!name) { setActiveScenario(null); return; }
                  const s = scenarios.find(x => x.name === name);
                  if (s) loadScenario(s);
                  setActiveScenario(name);
                }}
                className="text-xs bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-slate-600 max-w-[12rem]"
              >
                <option value="">— current —</option>
                {scenarios.map(s => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const name = window.prompt("Name this scenario:", activeScenario ?? "Base");
                  if (name) saveScenario(name);
                }}
                className="text-xs px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40 hover:bg-emerald-500/25 transition-colors"
                title="Save current state under a new (or existing) name."
              >
                + Save
              </button>
              {activeScenario && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete scenario "${activeScenario}"?`)) deleteScenario(activeScenario);
                  }}
                  className="text-xs px-2 py-1 rounded text-rose-400 ring-1 ring-rose-700/50 hover:bg-rose-500/10 transition-colors"
                  title="Delete the active scenario."
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Allocation suggestions footer */}
        <div className="px-6 py-5 border-t border-slate-800 bg-slate-950/40">
          <RetirementPlanner
            age={age} setAge={setAge}
            retireAge={retireAge} setRetireAge={setRetireAge}
            retireTarget={retireTarget} setRetireTarget={setRetireTarget}
            retireIncome={retireIncome} setRetireIncome={setRetireIncome}
            inflationRate={inflationRate} setInflationRate={setInflationRate}
            drawdownRate={drawdownRate} setDrawdownRate={setDrawdownRate}
            annualSavings={annualSavings} setAnnualSavings={setAnnualSavings}
            contribMode={contribMode} setContribMode={setContribMode}
            salary={salary} setSalary={setSalary}
            savingsRate={savingsRate} setSavingsRate={setSavingsRate}
            raiseRate={raiseRate} setRaiseRate={setRaiseRate}
            riskTolerance={riskTolerance} setRiskTolerance={setRiskTolerance}
            planningOpen={planningOpen} setPlanningOpen={setPlanningOpen}
            rows={allRows} totalValue={totalValue} targets={targets}
            wealthBandLabel={wealthBandLabel}
            yearsToRetire={yearsToRetire} requiredAtRetire={requiredAtRetire}
            currStats={currStats} targetStats={targetStats}
            currFV={currFV} targetFV={targetFV}
            currProb={currProb} targetProb={targetProb}
            effectiveContrib={effectiveContrib} effectiveGrowth={effectiveGrowth}
            applyRebalancing={applyRebalancing}
            undoRebalance={undoRebalance}
            canUndo={preRebalanceSnapshot !== null}
            resetToPreload={resetToPreload}
          />
        </div>
      </div>

    </div>
  );
}
