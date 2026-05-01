"use client";
import { useState, useMemo } from "react";

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
    const catchupPool = 0.25 * P; // 20% target ÷ 80% rate
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

const ASSET_CLASSES = [
  { key: "sp500",      label: "S&P 500",            color: "#60A5FA", defaultReturn: 0.09 },
  { key: "realestate", label: "Real Estate",         color: "#34D399", defaultReturn: 0.07 },
  { key: "crypto",     label: "Crypto",              color: "#FBBF24", defaultReturn: 0.15 },
  { key: "cash",       label: "Cash / Money Market", color: "#94A3B8", defaultReturn: 0.04 },
  { key: "privCredit", label: "Private Credit",      color: "#A78BFA", defaultReturn: 0.09 },
  { key: "privEquity", label: "Other Priv. Equity",  color: "#F87171", defaultReturn: 0.12 },
] as const;

type AssetKey = typeof ASSET_CLASSES[number]["key"];

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

function PortfolioChart({ years, capital, selectedResult, selectedColor, selectedLabel, portAlloc, portReturn }: {
  years: number;
  capital: number;
  selectedResult: Result;
  selectedColor: string;
  selectedLabel: string;
  portAlloc: Record<string, number>;
  portReturn: Record<string, number>;
}) {
  const W = 580, H = 300, PL = 66, PR = 24, PT = 16, PB = 34;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  const activeAssets = ASSET_CLASSES.filter(a => (portAlloc[a.key] || 0) > 0);

  const seriesData = activeAssets.map(a => ({
    key: a.key,
    label: a.label,
    color: a.color,
    values: Array.from({ length: years + 1 }, (_, t) =>
      (portAlloc[a.key] || 0) * Math.pow(1 + (portReturn[a.key] ?? a.defaultReturn), t)
    ),
  }));

  const totalValues: number[] | null = activeAssets.length > 1
    ? Array.from({ length: years + 1 }, (_, t) =>
        activeAssets.reduce((sum, a) =>
          sum + (portAlloc[a.key] || 0) * Math.pow(1 + (portReturn[a.key] ?? a.defaultReturn), t), 0
        )
      )
    : null;

  // LP net trajectory: smooth compound interpolation from capital → lpNet
  const moic = selectedResult.lpNet / capital;
  const lpValues = Array.from({ length: years + 1 }, (_, t) =>
    capital * Math.pow(Math.max(moic, 0), t / Math.max(years, 1))
  );

  const allVals = [
    ...seriesData.flatMap(s => s.values),
    ...(totalValues ?? []),
    ...lpValues,
    capital,
  ].filter(v => isFinite(v) && v >= 0);
  const maxVal = Math.max(...allVals, capital * 1.1);

  const xS = (t: number) => PL + (t / Math.max(years, 1)) * innerW;
  const yS = (v: number) => PT + innerH * (1 - Math.min(v / maxVal, 1));
  const mkPath = (vals: number[]) =>
    vals.map((v, t) => `${t === 0 ? "M" : "L"} ${xS(t).toFixed(1)} ${yS(v).toFixed(1)}`).join(" ");
  const mkArea = (vals: number[]) =>
    mkPath(vals) + ` L ${xS(years).toFixed(1)} ${(PT + innerH).toFixed(1)} L ${xS(0).toFixed(1)} ${(PT + innerH).toFixed(1)} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => maxVal * f);
  const tickCount = Math.min(years, 8);
  const xTicks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((i / tickCount) * years));

  const yLp = yS(selectedResult.lpNet);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: 220 }}>
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

      {/* Asset area fills */}
      {seriesData.map(s => (
        <path key={`${s.key}-area`} d={mkArea(s.values)} fill={s.color} fillOpacity="0.06" />
      ))}

      {/* Total portfolio area */}
      {totalValues && (
        <path d={mkArea(totalValues)} fill="#F8FAFC" fillOpacity="0.04" />
      )}

      {/* Asset lines */}
      {seriesData.map(s => (
        <path key={s.key} d={mkPath(s.values)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      ))}

      {/* Total other portfolio (dashed white) */}
      {totalValues && (
        <path d={mkPath(totalValues)} fill="none" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.4" />
      )}

      {/* Fund LP net area fill */}
      <path d={mkArea(lpValues)} fill={selectedColor} fillOpacity="0.10" />

      {/* Fund LP net trajectory (solid, slightly thicker to emphasize) */}
      <path d={mkPath(lpValues)} fill="none" stroke={selectedColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* LP net endpoint dot */}
      <circle cx={xS(years)} cy={yLp} r="6" fill={selectedColor} />
      <circle cx={xS(years)} cy={yLp} r="2.5" fill="#0F172A" />

      {/* Endpoint label */}
      <text
        x={xS(years) - 11} y={yLp - 10}
        textAnchor="end" fontSize="9" fontWeight="700" fill={selectedColor}
      >
        {selectedLabel}
      </text>
    </svg>
  );
}

export default function FeeCalculator() {
  const [capital, setCapital] = useState(1_000_000);
  const [years, setYears] = useState(5);
  const [grossReturn, setGrossReturn] = useState(0.20);

  const [portAlloc, setPortAlloc] = useState<Record<AssetKey, number>>(
    Object.fromEntries(ASSET_CLASSES.map(a => [a.key, 0])) as Record<AssetKey, number>
  );
  const [portReturn, setPortReturn] = useState<Record<AssetKey, number>>(
    Object.fromEntries(ASSET_CLASSES.map(a => [a.key, a.defaultReturn])) as Record<AssetKey, number>
  );

  const grossMoic = Math.pow(1 + grossReturn, years);
  const r2_20 = useMemo(() => calc2_20(capital, years, grossMoic), [capital, years, grossMoic]);
  const rBuf  = useMemo(() => calcBuffett(capital, years, grossMoic), [capital, years, grossMoic]);
  const lpDiff = rBuf.lpNet - r2_20.lpNet;

  // Default fee structure to whichever yields more to the LP at initial conditions
  const [feeStruct, setFeeStruct] = useState<"2/20" | "0/50">(() => {
    const m = Math.pow(1.20, 5);
    return calc2_20(1_000_000, 5, m).lpNet >= calcBuffett(1_000_000, 5, m).lpNet ? "2/20" : "0/50";
  });
  const selectedResult = feeStruct === "2/20" ? r2_20 : rBuf;
  const selectedColor  = feeStruct === "2/20" ? "#6366F1" : "#F59E0B";
  const selectedLabel  = feeStruct === "2/20" ? "2/20 LP net" : "0/50 LP net";
  const selectedTextCls = feeStruct === "2/20" ? "text-indigo-400" : "text-amber-400";

  const activePortAssets = ASSET_CLASSES.filter(a => (portAlloc[a.key] || 0) > 0);
  const portEndVals = activePortAssets.map(a => ({
    ...a,
    alloc:  portAlloc[a.key],
    endVal: portAlloc[a.key] * Math.pow(1 + (portReturn[a.key] ?? a.defaultReturn), years),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Fee Structure Calculator</h1>
        <p className="text-sm text-slate-500 mt-1">
          Compare LP and GP economics across fee structures. All calculations assume a single close,
          full capital deployed at inception, and a lump-sum exit at horizon.
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

      {/* Side-by-side results */}
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
        <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Portfolio Context</p>
            <p className="text-sm text-slate-400 mt-0.5">
              Input your other holdings to compare fund returns against liquid alternatives over the same horizon.
            </p>
          </div>
          {/* Fee structure selector */}
          <div className="inline-flex rounded-md border border-slate-800 bg-slate-950/60 p-0.5 shrink-0 self-start sm:self-auto">
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
        </div>

        <div className="p-6 flex flex-col lg:flex-row gap-8">
          {/* Allocation inputs */}
          <div className="lg:w-80 shrink-0 space-y-5">
            <div className="space-y-3.5">
              {ASSET_CLASSES.map(a => {
                const alloc = portAlloc[a.key] || 0;
                const ret   = portReturn[a.key] ?? a.defaultReturn;
                return (
                  <div key={a.key} className="space-y-1">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
                      <span className="text-xs text-slate-300 font-medium flex-1 truncate">{a.label}</span>
                      <span className="text-xs text-slate-200 tabular-nums">{alloc > 0 ? fmt(alloc) : "—"}</span>
                      <span className="text-[10px] text-slate-600">@</span>
                      <span className="text-xs tabular-nums w-12 text-right" style={{ color: a.color }}>
                        {(ret * 100).toFixed(1)}%
                      </span>
                    </div>
                    {/* Amount slider */}
                    <div className="flex items-center gap-2 pl-4">
                      <span className="text-[9px] text-slate-600 w-9 shrink-0 uppercase tracking-wide">amt</span>
                      <input
                        type="range"
                        min={0} max={10_000_000} step={25_000}
                        value={alloc}
                        onChange={e => setPortAlloc(prev => ({ ...prev, [a.key]: parseFloat(e.target.value) }))}
                        className="flex-1 h-1 rounded-full appearance-none cursor-pointer bg-slate-800
                          [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                          [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:bg-slate-300
                          [&::-webkit-slider-thumb]:cursor-pointer"
                      />
                    </div>
                    {/* Return slider */}
                    <div className="flex items-center gap-2 pl-4">
                      <span className="text-[9px] text-slate-600 w-9 shrink-0 uppercase tracking-wide">ret</span>
                      <input
                        type="range"
                        min={0} max={0.30} step={0.005}
                        value={ret}
                        onChange={e => setPortReturn(prev => ({ ...prev, [a.key]: parseFloat(e.target.value) }))}
                        className="flex-1 h-1 rounded-full appearance-none cursor-pointer bg-slate-800
                          [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                          [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:bg-slate-300
                          [&::-webkit-slider-thumb]:cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Fund reference block (selected structure only) */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">
                This Fund  ·  {fmt(capital)}  ·  {feeStruct}
              </p>
              <div className="flex items-center gap-2">
                <svg width="20" height="6" className="shrink-0">
                  <line x1="0" y1="3" x2="20" y2="3" stroke={selectedColor} strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <span className="text-xs text-slate-500 flex-1">LP net at Yr {years}</span>
                <span className={`text-xs tabular-nums font-medium ${selectedTextCls}`}>{fmt(selectedResult.lpNet)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 shrink-0" />
                <span className="text-xs text-slate-500 flex-1">LP net MOIC</span>
                <span className={`text-xs tabular-nums font-medium ${selectedTextCls}`}>{fmtX(selectedResult.lpNetMoic)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 shrink-0" />
                <span className="text-xs text-slate-500 flex-1">LP net IRR</span>
                <span className={`text-xs tabular-nums font-medium ${selectedTextCls}`}>{fmtPct(selectedResult.lpNetIrr)}</span>
              </div>
            </div>

            {/* End-value summary */}
            {portEndVals.length > 0 && (
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">
                  Other Portfolio at Yr {years}
                </p>
                {portEndVals.map(a => (
                  <div key={a.key} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
                    <span className="text-xs text-slate-500 flex-1 truncate">{a.label}</span>
                    <span className="text-xs text-slate-300 tabular-nums font-medium">{fmt(a.endVal)}</span>
                    <span className="text-[10px] text-slate-600 tabular-nums w-10 text-right">
                      {fmtX(a.endVal / a.alloc)}
                    </span>
                  </div>
                ))}
                {portEndVals.length > 1 && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/50">
                    <svg width="16" height="6" className="shrink-0">
                      <line x1="0" y1="3" x2="16" y2="3" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.4" />
                    </svg>
                    <span className="text-xs text-slate-500 flex-1">Total other portfolio</span>
                    <span className="text-xs text-slate-300 tabular-nums font-medium">
                      {fmt(portEndVals.reduce((s, a) => s + a.endVal, 0))}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="flex-1 min-w-0">
            <PortfolioChart
              years={years}
              capital={capital}
              selectedResult={selectedResult}
              selectedColor={selectedColor}
              selectedLabel={selectedLabel}
              portAlloc={portAlloc}
              portReturn={portReturn}
            />
            {activePortAssets.length === 0 && (
              <p className="text-xs text-slate-600 text-center -mt-4">
                Slide an allocation above to overlay additional asset classes on the chart
              </p>
            )}
          </div>
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
