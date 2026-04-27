"use client";
import { useState, useEffect, useCallback } from "react";
import { PlusCircle, Trash2, Save, RotateCcw, TrendingUp, TrendingDown } from "lucide-react";
import { portfolio, fund, LP_TOTAL_UNITS } from "@/lib/data";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DirectHolding {
  companyId: string;
  shares: number;
  costBasis: number;  // total dollars invested
}

interface PortalState {
  lpUnits: number;
  lpCostBasis: number;  // total dollars invested in LP position
  directHoldings: DirectHolding[];
}

const STORAGE_KEY = "nth-investor-portal";

const DEFAULT_STATE: PortalState = {
  lpUnits: 0,
  lpCostBasis: 0,
  directHoldings: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 10_000   ? `$${(n / 1_000).toFixed(0)}K`
  : n >= 1_000    ? `$${(n / 1_000).toFixed(1)}K`
  :                 `$${Math.round(n)}`;

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

const moicColor = (m: number) =>
  m >= 2 ? "text-emerald-400" : m >= 1 ? "text-sky-400" : "text-rose-400";

function pricePerShare(companyId: string): number {
  const c = portfolio.find((p) => p.id === companyId);
  if (!c) return 0;
  if (c.customPricePerShare) return c.customPricePerShare;
  if (c.totalShares) return c.impliedValuation / c.totalShares;
  return 0;
}

function navPerUnit(): number {
  return fund.nav / LP_TOTAL_UNITS;
}

// ── Input ─────────────────────────────────────────────────────────────────────

function NumInput({
  value,
  onChange,
  placeholder,
  prefix,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  prefix?: string;
  className?: string;
}) {
  const [raw, setRaw] = useState(value === 0 ? "" : String(value));

  useEffect(() => {
    setRaw(value === 0 ? "" : String(value));
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      {prefix && (
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type="number"
        min={0}
        step="any"
        placeholder={placeholder ?? "0"}
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          const n = parseFloat(e.target.value);
          onChange(isNaN(n) ? 0 : n);
        }}
        className={`w-full bg-[#111D2E] border border-[#1E2D3D] rounded-lg py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-slate-600 ${prefix ? "pl-6 pr-2" : "px-2.5"}`}
      />
    </div>
  );
}

// ── KPI Chip ──────────────────────────────────────────────────────────────────

function KPI({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-[#111D2E] rounded-xl px-4 py-3">
      <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className="text-lg font-semibold tabular-nums" style={color ? { color } : undefined}>{value}</p>
      {sub && <p className="text-xs mt-0.5 text-slate-500">{sub}</p>}
    </div>
  );
}

// ── Summary bar ───────────────────────────────────────────────────────────────

function SummaryBar({ state }: { state: PortalState }) {
  const lpValue = state.lpUnits * navPerUnit();

  const directValue = state.directHoldings.reduce((sum, h) => {
    const pps = pricePerShare(h.companyId);
    return sum + h.shares * pps;
  }, 0);

  const totalValue = lpValue + directValue;
  const totalCost =
    state.lpCostBasis +
    state.directHoldings.reduce((s, h) => s + h.costBasis, 0);

  const gain = totalValue - totalCost;
  const moic = totalCost > 0 ? totalValue / totalCost : 0;
  const pctGain = totalCost > 0 ? (gain / totalCost) * 100 : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <KPI label="Total Portfolio Value" value={fmt(totalValue)} color="#e2e8f0" />
      <KPI label="Total Cost Basis" value={fmt(totalCost)} />
      <KPI
        label="Unrealized Gain / Loss"
        value={`${gain >= 0 ? "+" : ""}${fmt(Math.abs(gain))}`}
        sub={totalCost > 0 ? fmtPct(pctGain) : undefined}
        color={gain >= 0 ? "#10B981" : "#F87171"}
      />
      <KPI
        label="MOIC"
        value={moic > 0 ? `${moic.toFixed(2)}×` : "—"}
        sub={moic > 0 ? (moic >= 1 ? "above water" : "below cost") : undefined}
        color={moic > 0 ? (moic >= 1 ? "#10B981" : "#F87171") : undefined}
      />
    </div>
  );
}

// ── LP Section ────────────────────────────────────────────────────────────────

function LPSection({
  state,
  onChange,
}: {
  state: PortalState;
  onChange: (s: PortalState) => void;
}) {
  const npv = navPerUnit();
  const currentValue = state.lpUnits * npv;
  const gain = currentValue - state.lpCostBasis;
  const moic = state.lpCostBasis > 0 ? currentValue / state.lpCostBasis : 0;

  return (
    <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-emerald-500 to-sky-500" />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Co-Owner Fund, LP</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              NAV/unit: <span className="text-slate-300">${npv.toFixed(4)}</span>
              &nbsp;·&nbsp;Total units: <span className="text-slate-300">{LP_TOTAL_UNITS.toLocaleString()}</span>
              &nbsp;·&nbsp;Fund NAV: <span className="text-slate-300">{fmt(fund.nav)}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-1.5">Units Held</p>
            <NumInput
              value={state.lpUnits}
              onChange={(v) => onChange({ ...state, lpUnits: v })}
              placeholder="0"
            />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-1.5">Cost Basis ($)</p>
            <NumInput
              value={state.lpCostBasis}
              onChange={(v) => onChange({ ...state, lpCostBasis: v })}
              placeholder="0"
              prefix="$"
            />
          </div>
          <div className="bg-[#111D2E] rounded-lg px-3 py-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-0.5">Current Value</p>
            <p className="text-sm font-semibold text-slate-100 tabular-nums">{fmt(currentValue)}</p>
          </div>
          <div className="bg-[#111D2E] rounded-lg px-3 py-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-0.5">MOIC / Gain</p>
            <p className={`text-sm font-semibold tabular-nums ${moic > 0 ? moicColor(moic) : "text-slate-500"}`}>
              {moic > 0 ? `${moic.toFixed(2)}×` : "—"}
            </p>
            {state.lpCostBasis > 0 && (
              <p className={`text-[10px] mt-0.5 ${gain >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {gain >= 0 ? "+" : ""}{fmt(Math.abs(gain))}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Direct Holdings Table ─────────────────────────────────────────────────────

function DirectSection({
  state,
  onChange,
}: {
  state: PortalState;
  onChange: (s: PortalState) => void;
}) {
  const [addingId, setAddingId] = useState("");

  const addCompany = () => {
    if (!addingId) return;
    if (state.directHoldings.find((h) => h.companyId === addingId)) return;
    onChange({
      ...state,
      directHoldings: [
        ...state.directHoldings,
        { companyId: addingId, shares: 0, costBasis: 0 },
      ],
    });
    setAddingId("");
  };

  const updateHolding = (idx: number, field: keyof DirectHolding, value: number) => {
    const next = state.directHoldings.map((h, i) =>
      i === idx ? { ...h, [field]: value } : h
    );
    onChange({ ...state, directHoldings: next });
  };

  const removeHolding = (idx: number) => {
    onChange({
      ...state,
      directHoldings: state.directHoldings.filter((_, i) => i !== idx),
    });
  };

  const availableCompanies = portfolio
    .filter((c) => c.status !== "written-off")
    .filter((c) => !state.directHoldings.find((h) => h.companyId === c.id));

  return (
    <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
      <div className="h-0.5" style={{ background: "linear-gradient(to right, #8B5CF6, #EC4899)" }} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Direct Equity Holdings</h2>
            <p className="text-xs text-slate-500 mt-0.5">Shares held directly in portfolio companies</p>
          </div>
          {availableCompanies.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={addingId}
                onChange={(e) => setAddingId(e.target.value)}
                className="bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-slate-600"
              >
                <option value="">Add company…</option>
                {availableCompanies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={addCompany}
                disabled={!addingId}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <PlusCircle size={12} /> Add
              </button>
            </div>
          )}
        </div>

        {state.directHoldings.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-sm">
            No direct holdings yet. Add a company above.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1E2D3D]">
                  <th className="text-left pb-2 text-slate-500 font-medium uppercase tracking-wide">Company</th>
                  <th className="text-left pb-2 text-slate-500 font-medium uppercase tracking-wide pl-2">Shares</th>
                  <th className="text-left pb-2 text-slate-500 font-medium uppercase tracking-wide pl-2">Cost Basis</th>
                  <th className="text-right pb-2 text-slate-500 font-medium uppercase tracking-wide">Price/Share</th>
                  <th className="text-right pb-2 text-slate-500 font-medium uppercase tracking-wide">Current Value</th>
                  <th className="text-right pb-2 text-slate-500 font-medium uppercase tracking-wide">MOIC</th>
                  <th className="text-right pb-2 text-slate-500 font-medium uppercase tracking-wide">Gain / Loss</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {state.directHoldings.map((h, idx) => {
                  const company = portfolio.find((c) => c.id === h.companyId);
                  if (!company) return null;
                  const pps = pricePerShare(h.companyId);
                  const currentVal = h.shares * pps;
                  const gain = currentVal - h.costBasis;
                  const moic = h.costBasis > 0 ? currentVal / h.costBasis : 0;
                  const pctGain = h.costBasis > 0 ? (gain / h.costBasis) * 100 : 0;

                  return (
                    <tr key={h.companyId} className="border-b border-[#1E2D3D]/60 last:border-0">
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-2">
                          {company.logoUrl ? (
                            <div className="w-5 h-5 rounded overflow-hidden bg-white flex items-center justify-center p-0.5 shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center shrink-0"
                              style={{ background: `${company.accentColor}20`, color: company.accentColor }}>
                              {company.initials[0]}
                            </div>
                          )}
                          <span className="text-slate-200 font-medium">{company.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pl-2 pr-2 w-28">
                        <NumInput
                          value={h.shares}
                          onChange={(v) => updateHolding(idx, "shares", v)}
                          placeholder="0"
                        />
                      </td>
                      <td className="py-3 pl-2 pr-2 w-32">
                        <NumInput
                          value={h.costBasis}
                          onChange={(v) => updateHolding(idx, "costBasis", v)}
                          placeholder="0"
                          prefix="$"
                        />
                      </td>
                      <td className="py-3 text-right text-slate-400 tabular-nums">
                        ${pps < 0.01 ? pps.toFixed(5) : pps.toFixed(4)}
                      </td>
                      <td className="py-3 text-right text-slate-200 font-medium tabular-nums">
                        {fmt(currentVal)}
                      </td>
                      <td className={`py-3 text-right font-semibold tabular-nums ${moic > 0 ? moicColor(moic) : "text-slate-600"}`}>
                        {moic > 0 ? `${moic.toFixed(2)}×` : "—"}
                      </td>
                      <td className={`py-3 text-right tabular-nums ${gain >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {h.costBasis > 0 ? (
                          <>
                            <span>{gain >= 0 ? "+" : ""}{fmt(Math.abs(gain))}</span>
                            <span className="text-slate-500 ml-1">({fmtPct(pctGain)})</span>
                          </>
                        ) : "—"}
                      </td>
                      <td className="py-3 text-right pl-2">
                        <button onClick={() => removeHolding(idx)} className="text-slate-600 hover:text-rose-400 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Company Price Reference ───────────────────────────────────────────────────

function PriceReferenceTable() {
  return (
    <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
      <div className="p-5">
        <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-4">Fund Price Reference</h2>
        <p className="text-xs text-slate-600 mb-4">
          Fund Est. prices used above — based on <span className="text-slate-500">customPricePerShare</span> or implied valuation ÷ fully diluted shares. These are fund-level estimates, not appraisals.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1E2D3D]">
                <th className="text-left pb-2 text-slate-500 font-medium uppercase tracking-wide">Company</th>
                <th className="text-right pb-2 text-slate-500 font-medium uppercase tracking-wide">Price/Share</th>
                <th className="text-right pb-2 text-slate-500 font-medium uppercase tracking-wide">FD Shares</th>
                <th className="text-right pb-2 text-slate-500 font-medium uppercase tracking-wide">Implied Val.</th>
                <th className="text-right pb-2 text-slate-500 font-medium uppercase tracking-wide">Stage</th>
              </tr>
            </thead>
            <tbody>
              {portfolio
                .filter((c) => c.status !== "written-off" && c.totalShares)
                .map((c) => {
                  const pps = pricePerShare(c.id);
                  return (
                    <tr key={c.id} className="border-b border-[#1E2D3D]/60 last:border-0">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center shrink-0"
                            style={{ background: `${c.accentColor}20`, color: c.accentColor }}>
                            {c.initials[0]}
                          </div>
                          <span className="text-slate-300">{c.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right text-slate-200 tabular-nums font-medium">
                        ${pps < 0.01 ? pps.toFixed(5) : pps.toFixed(4)}
                      </td>
                      <td className="py-2.5 text-right text-slate-400 tabular-nums">
                        {c.totalShares ? (c.totalShares / 1_000_000).toFixed(1) + "M" : "—"}
                      </td>
                      <td className="py-2.5 text-right text-slate-400 tabular-nums">
                        {fmt(c.impliedValuation)}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="text-slate-500 text-[10px] bg-[#111D2E] px-1.5 py-0.5 rounded">{c.stage}</span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function InvestorPortal() {
  const [state, setStateRaw] = useState<PortalState>(DEFAULT_STATE);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setStateRaw(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  // Auto-save on change (debounced via flag)
  const setState = useCallback((next: PortalState) => {
    setStateRaw(next);
    setSaved(false);
  }, []);

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  const reset = () => {
    if (!confirm("Clear all holdings? This cannot be undone.")) return;
    setStateRaw(DEFAULT_STATE);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  if (!loaded) return null;

  const totalValue =
    state.lpUnits * navPerUnit() +
    state.directHoldings.reduce((s, h) => s + h.shares * pricePerShare(h.companyId), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">My Portfolio</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter your holdings to calculate current value, gain/loss, and MOIC using fund pricing.
            {totalValue > 0 && (
              <span className="text-emerald-400 ml-2 font-medium">Total: {fmt(totalValue)}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 border border-[#1E2D3D] rounded-lg transition-colors"
          >
            <RotateCcw size={11} /> Reset
          </button>
          <button
            onClick={save}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
              saved
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-[#111D2E] text-slate-300 hover:text-slate-100 border-[#1E2D3D]"
            }`}
          >
            <Save size={11} /> {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <SummaryBar state={state} />

      {/* LP Position */}
      <LPSection state={state} onChange={setState} />

      {/* Direct Holdings */}
      <DirectSection state={state} onChange={setState} />

      {/* Price Reference */}
      <PriceReferenceTable />

      <p className="text-[10px] text-slate-700 text-center pb-2">
        Holdings are saved locally in your browser. Prices reflect fund estimates as of {fund.asOf} — not appraisals.
      </p>
    </div>
  );
}
