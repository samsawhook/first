"use client";
import { useState, useEffect, useCallback } from "react";
import { PlusCircle, Trash2, Save, RotateCcw, ChevronDown, Pencil } from "lucide-react";
import { portfolio, fund, LP_TOTAL_UNITS } from "@/lib/data";
import type { PortfolioCompany } from "@/lib/types";

interface DirectHolding {
  companyId: string;
  shares: number;
  costBasis: number;
}

interface CreditEntry {
  id: string;
  name: string;
  instrument: "Term Loan" | "Line of Credit" | "Revenue Based Financing" | "SAFE" | "Convertible Note" | "Preferred";
  principal: number;
  outstanding: number;
  interestRate: number;
}

interface CashEntry {
  id: string;
  account: string;
  institution: string;
  type: "Checking" | "Savings" | "Money Market" | "CD" | "Treasury";
  balance: number;
  yieldPct: number;
}

interface PortalState {
  lpUnits: number;
  lpCostBasis: number;
  directHoldings: DirectHolding[];
  creditEntries: CreditEntry[];
  cashEntries: CashEntry[];
}

export interface InvestorPortalProps {
  userValuations: Record<string, number>;
  setUserValuations: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onOpenValuationModal: (company: PortfolioCompany, pendingVal: number) => void;
}

const STORAGE_KEY = "nth-investor-portal";

const DEFAULT_STATE: PortalState = {
  lpUnits: 0,
  lpCostBasis: 0,
  directHoldings: [],
  creditEntries: [],
  cashEntries: [],
};

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 10_000   ? `$${(n / 1_000).toFixed(0)}K`
  : n >= 1_000    ? `$${(n / 1_000).toFixed(1)}K`
  :                 `$${Math.round(n)}`;

function NumInput({ value, onChange, placeholder, prefix, className = "" }: {
  value: number; onChange: (v: number) => void; placeholder?: string; prefix?: string; className?: string;
}) {
  const [raw, setRaw] = useState(value === 0 ? "" : String(value));
  useEffect(() => { setRaw(value === 0 ? "" : String(value)); }, [value]);
  return (
    <div className={`relative ${className}`}>
      {prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-[11px] pointer-events-none">{prefix}</span>}
      <input
        type="number" min={0} step="any" placeholder={placeholder ?? "0"} value={raw}
        onChange={(e) => { setRaw(e.target.value); const n = parseFloat(e.target.value); onChange(isNaN(n) ? 0 : n); }}
        className={`w-full bg-[#111D2E] border border-[#1E2D3D] rounded-lg py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-slate-600 ${prefix ? "pl-5 pr-2" : "px-2"}`}
      />
    </div>
  );
}

export default function InvestorPortal({ userValuations, setUserValuations, onOpenValuationModal }: InvestorPortalProps) {
  const [state, setStateRaw] = useState<PortalState>(DEFAULT_STATE);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["lp", "direct"]));
  const [addingId, setAddingId] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setStateRaw({
          lpUnits: parsed.lpUnits ?? 0,
          lpCostBasis: parsed.lpCostBasis ?? 0,
          directHoldings: parsed.directHoldings ?? [],
          creditEntries: parsed.creditEntries ?? [],
          cashEntries: parsed.cashEntries ?? [],
        });
      }
    } catch {}
    setLoaded(true);
  }, []);

  const setState = useCallback((next: PortalState) => { setStateRaw(next); setSaved(false); }, []);

  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); setSaved(true); setTimeout(() => setSaved(false), 2000); } catch {}
  };

  const reset = () => {
    if (!confirm("Clear all holdings? This cannot be undone.")) return;
    setStateRaw(DEFAULT_STATE);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  const toggleSection = (key: string) =>
    setOpenSections(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const defaultImplied = useCallback((c: PortfolioCompany) =>
    c.customPricePerShare && c.totalShares ? c.customPricePerShare * c.totalShares : c.impliedValuation, []);

  const effectiveImplied = useCallback((c: PortfolioCompany) =>
    userValuations[c.id] ?? defaultImplied(c), [userValuations, defaultImplied]);

  const npv = fund.nav / LP_TOTAL_UNITS;
  const lpValue = state.lpUnits * npv;
  const lpMoic = state.lpCostBasis > 0 ? lpValue / state.lpCostBasis : null;

  const directValue = state.directHoldings.reduce((sum, h) => {
    const c = portfolio.find(p => p.id === h.companyId);
    if (!c || !c.totalShares) return sum;
    return sum + h.shares * (effectiveImplied(c) / c.totalShares);
  }, 0);
  const directCost = state.directHoldings.reduce((s, h) => s + h.costBasis, 0);
  const directMoic = directCost > 0 ? directValue / directCost : null;

  const creditPrincipal   = state.creditEntries.reduce((s, c) => s + c.principal, 0);
  const creditOutstanding = state.creditEntries.reduce((s, c) => s + c.outstanding, 0);
  const wtdCreditRate     = creditOutstanding > 0
    ? state.creditEntries.reduce((s, c) => s + c.outstanding * c.interestRate, 0) / creditOutstanding
    : null;

  const cashTotal = state.cashEntries.reduce((s, c) => s + c.balance, 0);
  const wtdCashYield = cashTotal > 0
    ? state.cashEntries.reduce((s, c) => s + c.balance * c.yieldPct, 0) / cashTotal
    : null;

  const totalValue = lpValue + directValue + creditOutstanding + cashTotal;
  const totalCost  = state.lpCostBasis + directCost + creditPrincipal + cashTotal;
  const totalGain  = totalValue - totalCost;
  const totalMoic  = totalCost > 0 ? totalValue / totalCost : 0;

  const availableCompanies = portfolio
    .filter(c => c.status !== "written-off" && c.totalShares)
    .filter(c => !state.directHoldings.find(h => h.companyId === c.id));

  const addCompany = () => {
    if (!addingId) return;
    setState({ ...state, directHoldings: [...state.directHoldings, { companyId: addingId, shares: 0, costBasis: 0 }] });
    setAddingId("");
  };

  const updateHolding = (idx: number, field: keyof DirectHolding, value: number) => {
    setState({ ...state, directHoldings: state.directHoldings.map((h, i) => i === idx ? { ...h, [field]: value } : h) });
  };

  const removeHolding = (idx: number) => {
    setState({ ...state, directHoldings: state.directHoldings.filter((_, i) => i !== idx) });
  };

  const addCredit = () => {
    setState({
      ...state,
      creditEntries: [...state.creditEntries, {
        id: `c-${Date.now()}`, name: "", instrument: "Term Loan",
        principal: 0, outstanding: 0, interestRate: 0,
      }],
    });
  };
  const updateCredit = <K extends keyof CreditEntry>(idx: number, field: K, value: CreditEntry[K]) => {
    setState({ ...state, creditEntries: state.creditEntries.map((c, i) => i === idx ? { ...c, [field]: value } : c) });
  };
  const removeCredit = (idx: number) => {
    setState({ ...state, creditEntries: state.creditEntries.filter((_, i) => i !== idx) });
  };

  const addCash = () => {
    setState({
      ...state,
      cashEntries: [...state.cashEntries, {
        id: `cash-${Date.now()}`, account: "", institution: "", type: "Checking",
        balance: 0, yieldPct: 0,
      }],
    });
  };
  const updateCash = <K extends keyof CashEntry>(idx: number, field: K, value: CashEntry[K]) => {
    setState({ ...state, cashEntries: state.cashEntries.map((c, i) => i === idx ? { ...c, [field]: value } : c) });
  };
  const removeCash = (idx: number) => {
    setState({ ...state, cashEntries: state.cashEntries.filter((_, i) => i !== idx) });
  };

  if (!loaded) return null;

  // ── Inline helpers (mirrors overview page) ──────────────────────────────────
  const TH = ({ children, wide }: { children?: React.ReactNode; wide?: boolean }) => (
    <th className={`py-2 px-3 text-left text-[10px] text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap${wide ? " min-w-[160px]" : ""}`}>{children}</th>
  );
  const TD = ({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
    <td className={`py-2.5 px-3 text-xs ${className}`} style={style}>{children}</td>
  );

  const SectionHeader = ({ label, sectionKey, accent, stats }: {
    label: string; sectionKey: string; accent: string;
    stats: { label: string; value: string; color?: string }[];
  }) => (
    <button onClick={() => toggleSection(sectionKey)} className="w-full hover:bg-[#111D2E]/60 transition-colors">
      <div className="sm:hidden">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
            <span className="text-sm font-semibold text-slate-200">{label}</span>
          </div>
          <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${openSections.has(sectionKey) ? "rotate-180" : ""}`} />
        </div>
        <div className="border-t border-[#1E2D3D] divide-x divide-[#1E2D3D]" style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}>
          {stats.map(s => (
            <div key={s.label} className="flex flex-col justify-center px-2 py-2.5 min-w-0">
              <p className="text-[8px] text-slate-600 uppercase tracking-widest font-medium leading-tight">{s.label}</p>
              <p className="text-xs font-bold mt-0.5 tabular-nums" style={{ color: s.color ?? "#e2e8f0" }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden sm:flex items-stretch">
        <div className="flex items-center gap-3 px-4 py-3.5 shrink-0 min-w-[140px] border-r border-[#1E2D3D]">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: accent }} />
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
          <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${openSections.has(sectionKey) ? "rotate-180" : ""}`} />
        </div>
      </div>
    </button>
  );

  const companyLogo = (c: PortfolioCompany) => c.logoUrl ? (
    <div className="w-6 h-6 rounded overflow-hidden bg-white flex items-center justify-center p-0.5 shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.logoUrl} alt={c.name} className="w-full h-full object-contain" />
    </div>
  ) : (
    <div className="w-6 h-6 rounded font-bold flex items-center justify-center shrink-0 text-[10px]"
      style={{ background: `${c.accentColor}18`, color: c.accentColor }}>
      {c.initials[0]}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">My Portfolio</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Add your own holdings — equity, credit, and cash — to track current value, gain/loss, and MOIC. Mirrors the overview structure; nothing is pre-filled.
            {totalValue > 0 && <span className="text-emerald-400 ml-2 font-medium">Total: {fmt(totalValue)}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 border border-[#1E2D3D] rounded-lg transition-colors">
            <RotateCcw size={11} /> Reset
          </button>
          <button onClick={save} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${saved ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-[#111D2E] text-slate-300 hover:text-slate-100 border-[#1E2D3D]"}`}>
            <Save size={11} /> {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: "Total Portfolio Value", value: fmt(totalValue), color: "#e2e8f0" },
          { label: "Total Cost Basis",      value: totalCost > 0 ? fmt(totalCost) : "—" },
          { label: "Unrealized Gain / Loss", value: totalCost > 0 ? `${totalGain >= 0 ? "+" : ""}${fmt(Math.abs(totalGain))}` : "—", color: totalGain >= 0 ? "#10B981" : "#F87171" },
          { label: "MOIC", value: totalMoic > 0 ? `${totalMoic.toFixed(2)}×` : "—", color: totalMoic > 0 ? (totalMoic >= 1 ? "#10B981" : "#F87171") : undefined },
        ] as { label: string; value: string; color?: string }[]).map(k => (
          <div key={k.label} className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl px-4 py-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-1">{k.label}</p>
            <p className="text-lg font-semibold tabular-nums" style={k.color ? { color: k.color } : undefined}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── 1. Fund Units ───────────────────────────────────────────────────── */}
      <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
        <div className="border-b border-[#1E2D3D]">
          <SectionHeader
            label="Fund Units"
            sectionKey="lp"
            accent="#10B981"
            stats={[
              { label: "Cost Basis",     value: state.lpCostBasis > 0 ? fmt(state.lpCostBasis) : "—" },
              { label: "NAV / Unit",     value: `$${npv.toFixed(4)}` },
              { label: "Current Value",  value: state.lpUnits > 0 ? fmt(lpValue) : "—", color: "#10B981" },
              { label: "MOIC",           value: lpMoic !== null ? `${lpMoic.toFixed(2)}×` : "—", color: lpMoic !== null && lpMoic >= 1 ? "#10B981" : undefined },
            ]}
          />
        </div>
        {openSections.has("lp") && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                <tr>
                  <TH wide>Position</TH><TH>Units Held</TH><TH>Cost Basis</TH>
                  <TH>NAV / Unit</TH><TH>Current Value</TH><TH>MOIC</TH>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[#111D2E]">
                  <TD>
                    <div>
                      <p className="font-semibold text-slate-200">Co-Owner Fund, LP</p>
                      <p className="text-[10px] text-slate-600">Fund NAV: {fmt(fund.nav)} · {LP_TOTAL_UNITS.toLocaleString()} total units · as of {fund.asOf}</p>
                    </div>
                  </TD>
                  <TD>
                    <NumInput value={state.lpUnits} onChange={v => setState({ ...state, lpUnits: v })} placeholder="0" className="w-28" />
                  </TD>
                  <TD>
                    <NumInput value={state.lpCostBasis} onChange={v => setState({ ...state, lpCostBasis: v })} placeholder="0" prefix="$" className="w-32" />
                  </TD>
                  <TD className="text-slate-300 tabular-nums">${npv.toFixed(4)}</TD>
                  <TD className="tabular-nums font-medium text-emerald-400">{state.lpUnits > 0 ? fmt(lpValue) : "—"}</TD>
                  <TD className={`tabular-nums font-medium ${lpMoic !== null && lpMoic >= 1 ? "text-emerald-400" : lpMoic !== null ? "text-rose-400" : "text-slate-600"}`}>
                    {lpMoic !== null ? `${lpMoic.toFixed(2)}×` : "—"}
                  </TD>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 2. Direct Equity ────────────────────────────────────────────────── */}
      <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
        <div className="border-b border-[#1E2D3D]">
          <SectionHeader
            label="Direct Equity"
            sectionKey="direct"
            accent="#8B5CF6"
            stats={[
              { label: "Cost Basis",  value: directCost > 0 ? fmt(directCost) : "—" },
              { label: "Est. Value",  value: directValue > 0 ? fmt(directValue) : "—", color: "#8B5CF6" },
              { label: "MOIC",        value: directMoic !== null ? `${directMoic.toFixed(2)}×` : "—", color: directMoic !== null && directMoic >= 1 ? "#10B981" : undefined },
            ]}
          />
        </div>
        {openSections.has("direct") && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                <tr>
                  <TH wide>Company</TH><TH>Shares</TH><TH>Cost Basis</TH>
                  <TH>Share Price</TH><TH>Est. Value</TH><TH>MOIC</TH><TH>% FD</TH><TH></TH>
                </tr>
              </thead>
              <tbody>
                {state.directHoldings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-slate-600">
                      No direct holdings yet. Add a company below.
                    </td>
                  </tr>
                ) : state.directHoldings.map((h, idx) => {
                  const c = portfolio.find(p => p.id === h.companyId);
                  if (!c) return null;
                  const defaultPps = c.totalShares ? defaultImplied(c) / c.totalShares : null;
                  const customPps  = userValuations[c.id] !== undefined && c.totalShares ? userValuations[c.id] / c.totalShares : null;
                  const pps        = c.totalShares ? effectiveImplied(c) / c.totalShares : null;
                  const estVal     = pps !== null ? h.shares * pps : null;
                  const moic       = h.costBasis > 0 && estVal !== null ? estVal / h.costBasis : null;
                  const fdPct      = c.totalShares && h.shares > 0 ? (h.shares / c.totalShares) * 100 : null;
                  return (
                    <tr key={h.companyId} className="border-t border-[#111D2E] hover:bg-[#111D2E]/30">
                      <TD>
                        <div className="flex items-center gap-2">
                          {companyLogo(c)}
                          <span className="font-semibold text-slate-200">{c.name}</span>
                        </div>
                      </TD>
                      <TD>
                        <NumInput value={h.shares} onChange={v => updateHolding(idx, "shares", v)} placeholder="0" className="w-28" />
                      </TD>
                      <TD>
                        <NumInput value={h.costBasis} onChange={v => updateHolding(idx, "costBasis", v)} placeholder="0" prefix="$" className="w-32" />
                      </TD>
                      <TD className="tabular-nums">
                        {customPps !== null && defaultPps !== null ? (
                          <div className="flex items-start gap-1.5">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-slate-600 line-through leading-tight">${defaultPps.toFixed(4)}</span>
                              <span className="text-emerald-400 font-semibold leading-tight">${customPps.toFixed(4)}</span>
                            </div>
                            <button
                              onClick={() => onOpenValuationModal(c, effectiveImplied(c))}
                              className="p-0.5 mt-0.5 rounded hover:bg-white/10 text-emerald-600 hover:text-emerald-300 transition-colors"
                              title="Edit valuation"
                            ><Pencil size={10} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-300">{defaultPps !== null ? `$${defaultPps.toFixed(4)}` : "—"}</span>
                            <button
                              onClick={() => onOpenValuationModal(c, effectiveImplied(c))}
                              className="p-0.5 rounded hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
                              title="Edit valuation"
                            ><Pencil size={10} /></button>
                          </div>
                        )}
                      </TD>
                      <TD className="tabular-nums font-medium" style={{ color: c.accentColor }}>
                        {estVal !== null && estVal > 0 ? fmt(estVal) : "—"}
                      </TD>
                      <TD className={`tabular-nums font-medium ${moic !== null && moic >= 1 ? "text-emerald-400" : moic !== null ? "text-rose-400" : "text-slate-600"}`}>
                        {moic !== null ? `${moic.toFixed(2)}×` : "—"}
                      </TD>
                      <TD className="tabular-nums text-slate-400">
                        {fdPct !== null ? `${fdPct.toFixed(2)}%` : "—"}
                      </TD>
                      <TD>
                        <div className="flex items-center gap-1">
                          {userValuations[c.id] !== undefined && (
                            <button
                              onClick={() => setUserValuations(prev => { const n = { ...prev }; delete n[c.id]; return n; })}
                              className="p-1 rounded text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Reset custom price"
                            ><RotateCcw size={9} /></button>
                          )}
                          <button onClick={() => removeHolding(idx)} className="p-1 rounded text-slate-600 hover:text-rose-400 transition-colors">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </TD>
                    </tr>
                  );
                })}
                {/* Totals row */}
                {state.directHoldings.length > 0 && (
                  <tr className="border-t border-[#1E2D3D] bg-[#080E1A]">
                    <td className="py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total</td>
                    <td /><td /><td />
                    <td className="py-2 px-3 text-xs text-purple-400 tabular-nums font-semibold">{directValue > 0 ? fmt(directValue) : "—"}</td>
                    <td className="py-2 px-3 text-xs tabular-nums font-semibold" style={{ color: directMoic !== null && directMoic >= 1 ? "#10B981" : directMoic !== null ? "#F87171" : "#64748b" }}>
                      {directMoic !== null ? `${directMoic.toFixed(2)}×` : "—"}
                    </td>
                    <td colSpan={2} />
                  </tr>
                )}
                {/* Add company row */}
                {availableCompanies.length > 0 && (
                  <tr className="border-t border-[#1E2D3D]">
                    <td colSpan={8} className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <select
                          value={addingId}
                          onChange={e => setAddingId(e.target.value)}
                          className="bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-slate-600"
                        >
                          <option value="">Add company…</option>
                          {availableCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button
                          onClick={addCompany}
                          disabled={!addingId}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <PlusCircle size={12} /> Add
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-700 text-center pb-2">
        Holdings are saved locally in your browser. Prices reflect fund estimates as of {fund.asOf} — not appraisals.
      </p>
    </div>
  );
}
