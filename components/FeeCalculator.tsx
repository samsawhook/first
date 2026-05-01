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

function Slider({ label, value, min, max, step, onChange, display, sub }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; display: string; sub?: string;
}) {
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
        <span className="text-[10px] text-slate-600">{min === 100000 ? "$100k" : min === 1 ? "1yr" : min === 0 ? "0%" : `${min}×`}</span>
        <span className="text-[10px] text-slate-600">{min === 100000 ? "$10M" : min === 1 ? "15 yrs" : min === 0 ? "30%" : `${max}×`}</span>
      </div>
    </div>
  );
}

function StackBar({ exit, mgmtFee, carry, lpNet }: { exit: number; mgmtFee: number; carry: number; lpNet: number }) {
  const lpPct = (lpNet / exit) * 100;
  const carryPct = (carry / exit) * 100;
  const feePct = (mgmtFee / exit) * 100;
  return (
    <div className="w-full h-5 rounded-md overflow-hidden flex" title="Proceeds split">
      <div style={{ width: `${Math.max(lpPct, 0)}%` }} className="bg-emerald-500/70 transition-all duration-300" title={`LP net: ${fmt(lpNet)}`} />
      <div style={{ width: `${Math.max(carryPct, 0)}%` }} className="bg-violet-500/70 transition-all duration-300" title={`GP carry: ${fmt(carry)}`} />
      <div style={{ width: `${Math.max(feePct, 0)}%` }} className="bg-rose-500/60 transition-all duration-300" title={`Mgmt fee: ${fmt(mgmtFee)}`} />
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
    { label: "LP Net MOIC", value: fmtX(result.lpNetMoic), dim: false, color: result.lpNetMoic >= 1 ? "#10B981" : "#F87171" },
    { label: "LP Net IRR", value: fmtPct(result.lpNetIrr), dim: false, color: result.lpNetIrr >= 0.06 ? "#10B981" : "#F59E0B" },
    { label: "GP % of Gross Proceeds", value: fmtPct(result.gpTotal / result.exitValue), dim: true },
    { label: "LP % of Gross Proceeds", value: fmtPct(result.lpNet / result.exitValue), dim: true },
  ].filter(Boolean) as ({ label: string; value: string; dim: boolean; bold?: boolean; color?: string } | null)[];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden flex-1 min-w-0">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800" style={{ background: `${accentColor}10` }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: accentColor }}>{label}</p>
        <p className="text-base font-semibold text-slate-100">{title}</p>
      </div>

      {/* Stack bar */}
      <div className="px-5 pt-4 pb-2">
        <StackBar exit={result.exitValue} mgmtFee={result.mgmtFee} carry={result.gpCarry} lpNet={result.lpNet} />
        <div className="flex gap-4 mt-1.5 flex-wrap">
          <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-sm bg-emerald-500/70 inline-block" />LP net</span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-sm bg-violet-500/70 inline-block" />GP carry</span>
          {result.mgmtFee > 0 && <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-sm bg-rose-500/60 inline-block" />Mgmt fee</span>}
        </div>
      </div>

      {/* Rows */}
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

export default function FeeCalculator() {
  const [capital, setCapital] = useState(1_000_000);
  const [years, setYears] = useState(5);
  const [grossReturn, setGrossReturn] = useState(0.25); // annual return %

  const grossMoic = Math.pow(1 + grossReturn, years);

  const r2_20 = useMemo(() => calc2_20(capital, years, grossMoic), [capital, years, grossMoic]);
  const rBuf  = useMemo(() => calcBuffett(capital, years, grossMoic), [capital, years, grossMoic]);

  const lpDiff = rBuf.lpNet - r2_20.lpNet;

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
            label="Investment Horizon" value={years} min={1} max={15} step={1}
            onChange={setYears} display={`${years} yr${years !== 1 ? "s" : ""}`}
          />
          <Slider
            label="Gross Annual Return" value={grossReturn} min={0} max={0.30} step={0.005}
            onChange={setGrossReturn}
            display={fmtPct(grossReturn)}
            sub={`${fmtX(grossMoic)} MOIC`}
          />
        </div>

        {/* Summary line */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
          <span>Gross exit: <span className="text-slate-300 font-medium">{fmt(capital * grossMoic)}</span></span>
          <span>Gross IRR: <span className="text-slate-300 font-medium">{fmtPct(Math.pow(grossMoic, 1 / years) - 1)}</span></span>
          <span>6% hurdle amount: <span className="text-slate-300 font-medium">{fmt(capital * (Math.pow(1.06, years) - 1))}</span></span>
        </div>
      </div>

      {/* Side-by-side results */}
      <div className="flex flex-col sm:flex-row gap-5">
        <ResultCard
          title="2% Management Fee / 20% Carry"
          label="Traditional 2 / 20"
          accentColor="#6366F1"
          result={r2_20}
          capital={capital}
        />
        <ResultCard
          title="0% Management Fee / 50% Carry"
          label="Buffett Partnership Style  ·  0 / 50"
          accentColor="#F59E0B"
          result={rBuf}
          capital={capital}
        />
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
