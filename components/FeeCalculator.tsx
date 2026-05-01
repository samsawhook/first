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
  { key: "sp500",      label: "S&P 500",            color: "#60A5FA", defaultReturn: 0.10 },
  { key: "realestate", label: "Real Estate",         color: "#34D399", defaultReturn: 0.07 },
  { key: "crypto",     label: "Crypto",              color: "#FBBF24", defaultReturn: 0.20 },
  { key: "cash",       label: "Cash / Money Market", color: "#94A3B8", defaultReturn: 0.045 },
  { key: "privCredit", label: "Private Credit",      color: "#A78BFA", defaultReturn: 0.09 },
  { key: "privEquity", label: "Other Priv. Equity",  color: "#F87171", defaultReturn: 0.15 },
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

function PortfolioChart({ years, capital, grossReturn, r2_20, rBuf, portAlloc, portReturn }: {
  years: number;
  capital: number;
  grossReturn: number;
  r2_20: Result;
  rBuf: Result;
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

  const fundGross = Array.from({ length: years + 1 }, (_, t) => capital * Math.pow(1 + grossReturn, t));

  // LP net trajectories: smooth compound interpolation from capital → lpNet
  const lpTrajectory = (lpNet: number) => {
    const moic = lpNet / capital;
    return Array.from({ length: years + 1 }, (_, t) =>
      capital * Math.pow(Math.max(moic, 0), t / Math.max(years, 1))
    );
  };
  const lpNet2_20Values = lpTrajectory(r2_20.lpNet);
  const lpNetBufValues  = lpTrajectory(rBuf.lpNet);

  const allVals = [
    ...seriesData.flatMap(s => s.values),
    ...(totalValues ?? []),
    ...fundGross,
    ...lpNet2_20Values,
    ...lpNetBufValues,
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

  const y2_20 = yS(r2_20.lpNet);
  const yBuf  = yS(rBuf.lpNet);
  const labsTooClose = Math.abs(y2_20 - yBuf) < 18;

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

      {/* Fund LP net area fills */}
      <path d={mkArea(lpNet2_20Values)} fill="#6366F1" fillOpacity="0.07" />
      <path d={mkArea(lpNetBufValues)}  fill="#F59E0B" fillOpacity="0.07" />

      {/* Fund gross NAV (faint dashed reference) */}
      <path d={mkPath(fundGross)} fill="none" stroke="#64748B" strokeWidth="1" strokeDasharray="3 3" opacity="0.55" />

      {/* Fund LP net trajectories (solid) */}
      <path d={mkPath(lpNet2_20Values)} fill="none" stroke="#6366F1" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
      <path d={mkPath(lpNetBufValues)}  fill="none" stroke="#F59E0B" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />

      {/* LP net endpoint dots */}
      <circle cx={xS(years)} cy={y2_20} r="5.5" fill="#6366F1" />
      <circle cx={xS(years)} cy={yBuf}  r="5.5" fill="#F59E0B" />

      {/* Endpoint labels — shift if too close */}
      <text
        x={xS(years) - 10} y={labsTooClose ? y2_20 - 12 : y2_20 - 9}
        textAnchor="end" fontSize="8.5" fontWeight="600" fill="#818CF8"
      >
        2/20
      </text>
      <text
        x={xS(years) - 10} y={labsTooClose ? yBuf + 18 : yBuf + 14}
        textAnchor="end" fontSize="8.5" fontWeight="600" fill="#FCD34D"
      >
        0/50
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

  const activePortAssets = ASSET_CLASSES.filter(a => (portAlloc[a.key] || 0) > 0);
  const portEndVals = activePortAssets.map(a => ({
    ...a,
    alloc:  portAlloc[a.key],
    endVal: portAlloc[a.key] * Math.pow(1 + (portReturn[a.key] ?? a.defaultReturn), years),
  }));

  const setAlloc = (key: AssetKey, raw: string) => {
    const v = parseFloat(raw);
    setPortAlloc(prev => ({ ...prev, [key]: isFinite(v) && v > 0 ? v : 0 }));
  };
  const setRet = (key: AssetKey, raw: string) => {
    const v = parseFloat(raw);
    setPortReturn(prev => ({ ...prev, [key]: isFinite(v) ? v / 100 : prev[key] }));
  };

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
        <div className="px-6 py-4 border-b border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Portfolio Context</p>
          <p className="text-sm text-slate-400 mt-0.5">
            Input your other holdings to compare fund returns against liquid alternatives over the same horizon.
            Expected returns are editable.
          </p>
        </div>

        <div className="p-6 flex flex-col lg:flex-row gap-8">
          {/* Allocation inputs */}
          <div className="lg:w-80 shrink-0 space-y-5">
            <div>
              {/* Column headers */}
              <div className="flex items-center mb-2 pr-1">
                <span className="flex-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Asset</span>
                <span className="w-28 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-600">Amount ($)</span>
                <span className="w-16 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-600 ml-2">Exp. %/yr</span>
              </div>
              <div className="space-y-2.5">
                {ASSET_CLASSES.map(a => (
                  <div key={a.key} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
                    <span className="flex-1 text-xs text-slate-400 truncate">{a.label}</span>
                    {/* Dollar amount */}
                    <input
                      type="number"
                      value={portAlloc[a.key] || ""}
                      placeholder="—"
                      min={0}
                      onChange={e => setAlloc(a.key, e.target.value)}
                      className="w-28 bg-slate-800/80 border border-slate-700/60 rounded px-2 py-1 text-xs text-slate-200 text-right tabular-nums
                        focus:outline-none focus:border-slate-500
                        [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    {/* Return % */}
                    <div className="flex items-center gap-0.5 ml-2">
                      <input
                        type="number"
                        value={((portReturn[a.key] ?? a.defaultReturn) * 100).toFixed(1)}
                        step="0.5"
                        min={0}
                        max={100}
                        onChange={e => setRet(a.key, e.target.value)}
                        className="w-12 bg-slate-800/80 border border-slate-700/60 rounded px-1.5 py-1 text-xs text-slate-400 text-right tabular-nums
                          focus:outline-none focus:border-slate-500"
                      />
                      <span className="text-[10px] text-slate-600">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fund reference block */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">
                This Fund  ·  {fmt(capital)}
              </p>
              <div className="flex items-center gap-2">
                <svg width="20" height="6" className="shrink-0">
                  <line x1="0" y1="3" x2="20" y2="3" stroke="#64748B" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                </svg>
                <span className="text-xs text-slate-500 flex-1">Gross NAV at Yr {years}</span>
                <span className="text-xs text-slate-400 tabular-nums font-medium">{fmt(capital * Math.pow(1 + grossReturn, years))}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="20" height="6" className="shrink-0"><line x1="0" y1="3" x2="20" y2="3" stroke="#6366F1" strokeWidth="2.25" strokeLinecap="round" /></svg>
                <span className="text-xs text-slate-500 flex-1">2/20 LP net at Yr {years}</span>
                <span className="text-xs text-indigo-400 tabular-nums font-medium">{fmt(r2_20.lpNet)}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="20" height="6" className="shrink-0"><line x1="0" y1="3" x2="20" y2="3" stroke="#F59E0B" strokeWidth="2.25" strokeLinecap="round" /></svg>
                <span className="text-xs text-slate-500 flex-1">0/50 LP net at Yr {years}</span>
                <span className="text-xs text-amber-400 tabular-nums font-medium">{fmt(rBuf.lpNet)}</span>
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
                    <span className="text-[10px] text-slate-600 tabular-nums">
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
              grossReturn={grossReturn}
              r2_20={r2_20}
              rBuf={rBuf}
              portAlloc={portAlloc}
              portReturn={portReturn}
            />
            {activePortAssets.length === 0 && (
              <p className="text-xs text-slate-600 text-center -mt-4">
                Enter holdings above to overlay additional asset classes on the chart
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
