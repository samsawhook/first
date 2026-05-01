"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  Zap,
  ArrowLeftRight,
  BookOpen,
  Lock,
  ChevronDown,
  Building2,
  User,
  Pencil,
  X,
  Check,
  RotateCcw,
} from "lucide-react";
import PortfolioAllocationChart from "@/components/PortfolioAllocationChart";
import FootballField from "@/components/FootballField";
import DealPipeline from "@/components/DealPipeline";
import SecondaryMarket from "@/components/SecondaryMarket";
import LettersSection from "@/components/LettersSection";
import CompanyPage from "@/components/CompanyPage";
import InvestorPortal from "@/components/InvestorPortal";
import {
  portfolio as basePortfolio,
  navHistory,
  fund as baseFund,
  cashPositions,
  LP_TOTAL_UNITS as BASE_LP_TOTAL_UNITS,
  FUND_LEVERAGE as BASE_FUND_LEVERAGE,
  managedFundPositions,
} from "@/lib/data";
import { investors } from "@/lib/investors";
import type { Investor, ShareTransaction, DebtPosition } from "@/lib/types";

const portfolio = basePortfolio;
const fund = baseFund;
const LP_TOTAL_UNITS = BASE_LP_TOTAL_UNITS;
const FUND_LEVERAGE = BASE_FUND_LEVERAGE;

// ── Proposal scenario additions (Proposal tab only) ───────────────────────────
const PROPOSAL_AUDILY_PREFERRED: DebtPosition = {
  id: "audily-pref-proposal",
  date: "May 2026",
  instrument: "Preferred",
  principal: 150_000,
  status: "Current",
  currentValue: 150_000,
  notes: "Proposed follow-on preferred share purchase.",
};

const PROPOSAL_NUECES_PREFERRED: DebtPosition = {
  id: "nueces-pref-proposal",
  date: "May 2026",
  instrument: "Preferred",
  principal: 200_000,
  status: "Current",
  currentValue: 200_000,
  notes: "Proposed initial preferred share purchase.",
};

const PROPOSAL_LP_BASIS_ADD = 350_000;   // $1/unit par value
const PROPOSAL_LEVERAGE_ADD  = 120_000;

type Tab = "overview" | "proposal" | "pipeline" | "secondary" | "letters" | "investor";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview",  label: "Overview",  icon: <LayoutDashboard size={15} /> },
  { id: "proposal",  label: "Proposal",  icon: <LayoutDashboard size={15} /> },
  { id: "letters",   label: "Letters",   icon: <BookOpen size={15} /> },
];

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
  : n >= 10_000   ? `$${(n / 1_000).toFixed(0)}K`
  : n >= 1_000    ? `$${(n / 1_000).toFixed(1)}K`
  :                 `$${Math.round(n)}`;

// ── Companies dropdown tab ────────────────────────────────────────────────────

function CompaniesDropdown({
  activeCompanyId,
  onSelect,
  openAbove = false,
  variant = "topnav",
}: {
  activeCompanyId: string | null;
  onSelect: (id: string) => void;
  openAbove?: boolean;
  variant?: "topnav" | "bottomnav";
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, bottom: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const openMenu = useCallback(() => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      if (openAbove) {
        setMenuPos({ top: 0, left: Math.max(4, Math.min(r.left, window.innerWidth - 244)), bottom: window.innerHeight - r.top + 4 });
      } else {
        setMenuPos({ top: r.bottom + 4, left: r.left, bottom: 0 });
      }
    }
    setOpen(true);
  }, [openAbove]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activeCompany = activeCompanyId ? portfolio.find((c) => c.id === activeCompanyId) : null;

  const menu = (
    <div
      ref={menuRef}
      style={openAbove
        ? { position: "fixed", bottom: menuPos.bottom, left: menuPos.left, zIndex: 9999 }
        : { position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
      className="w-60 bg-[#0D1421] border border-[#1E2D3D] rounded-xl shadow-2xl overflow-hidden"
    >
      <div className="p-1">
        {portfolio
          .filter((c) => c.status !== "written-off")
          .map((company) => (
            <button
              key={company.id}
              onClick={() => { onSelect(company.id); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                activeCompanyId === company.id
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-slate-300 hover:bg-[#111D2E]"
              }`}
            >
              {company.logoUrl ? (
                <div className="w-6 h-6 rounded overflow-hidden bg-white flex items-center justify-center p-0.5 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div
                  className="w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center shrink-0"
                  style={{ background: `${company.accentColor}20`, color: company.accentColor }}
                >
                  {company.initials[0]}
                </div>
              )}
              <span className="truncate flex-1">{company.name}</span>
            </button>
          ))}
      </div>
    </div>
  );

  if (variant === "bottomnav") {
    return (
      <>
        <button
          ref={btnRef}
          onClick={() => (open ? setOpen(false) : openMenu())}
          className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
            activeCompanyId !== null ? "text-emerald-400" : "text-slate-500"
          }`}
        >
          <Building2 size={15} />
          <span className="text-[10px] font-medium">
            {activeCompany ? activeCompany.name.split(" ")[0] : "Companies"}
          </span>
        </button>
        {mounted && open && createPortal(menu, document.body)}
      </>
    );
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={`flex items-center gap-2 px-3 lg:px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
          activeCompanyId !== null
            ? "border-emerald-500 text-emerald-400"
            : "border-transparent text-slate-500 hover:text-slate-300 hover:border-[#1E2D3D]"
        }`}
      >
        <Building2 size={15} />
        <span className="hidden lg:inline">{activeCompany ? activeCompany.name : "Companies"}</span>
        <ChevronDown size={13} className={`hidden lg:block transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {mounted && open && createPortal(menu, document.body)}
    </>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [selectedInvestorId, setSelectedInvestorId] = useState<string>("fund");
  const [openInstrumentTables, setOpenInstrumentTables] = useState<Set<string>>(new Set(["common", "credit", "convertibles", "options", "cash"]));
  const [lpCurrentUnits, setLpCurrentUnits]           = useState<string>("100000");
  const [lpViewMode, setLpViewMode]                   = useState<"fund" | "current">("fund");
  const [lpHypotheticalUnits, setLpHypotheticalUnits] = useState<string>("");
  const [optionVariances, setOptionVariances] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {};
    for (const c of portfolio) for (const o of (c.optionPositions ?? [])) defaults[o.id] = o.defaultVariancePct ?? 0;
    return defaults;
  });
  const [editingVarianceId, setEditingVarianceId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set<string>());

  // ── User-set valuations (persistent) ─────────────────────────────────────────
  const [userValuations, setUserValuations] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("nth-user-valuations") ?? "{}"); }
    catch { return {}; }
  });
  // Modal state: which company is being edited, and the live pending value
  const [valuationModal, setValuationModal] = useState<{ company: typeof portfolio[0]; pendingVal: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    try { localStorage.setItem("nth-user-valuations", JSON.stringify(userValuations)); } catch {}
  }, [userValuations]);

  // Helpers: effective implied valuation and portfolio current value
  const defaultImplied = useCallback((c: typeof portfolio[0]) =>
    c.customPricePerShare && c.totalShares
      ? c.customPricePerShare * c.totalShares
      : c.impliedValuation, []);
  const effectiveImplied = useCallback((c: typeof portfolio[0]) =>
    userValuations[c.id] ?? defaultImplied(c), [userValuations, defaultImplied]);
  const effectiveCurrVal = useCallback((c: typeof portfolio[0]) => {
    const base = defaultImplied(c);
    if (userValuations[c.id] === undefined) return c.currentValue * (base / c.impliedValuation);
    return c.currentValue * (userValuations[c.id] / c.impliedValuation);
  }, [userValuations, defaultImplied]);

  const toggleTable = (key: string) =>
    setOpenInstrumentTables((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleRow = (key: string) =>
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const selectedInvestor: Investor | undefined =
    selectedInvestorId === "fund"
      ? undefined
      : investors.find((i) => i.id === selectedInvestorId);

  const activeCompany = activeCompanyId
    ? portfolio.find((c) => c.id === activeCompanyId)
    : null;

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab);
    setActiveCompanyId(null);
  };

  return (
    <div className="min-h-screen bg-[#060B14]">
      {/* Top nav bar */}
      <header className="sticky top-0 z-30 bg-[#060B14]/90 backdrop-blur-md border-b border-[#1E2D3D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-stretch h-14">
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0 pr-4 border-r border-[#1E2D3D]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/1691979830329-NJ5W8U6WT1N0F60PRNXV/Nth.png"
                alt="nth Venture"
                className="h-7 w-auto"
                style={{ filter: "brightness(0) invert(1)" }}
              />
              <span className="text-xs text-slate-500 hidden lg:block">Investor Portal</span>
            </div>

            {/* Nav tabs — hidden on mobile, icon-only on sm–lg, full on lg+ */}
            <div className="hidden sm:flex flex-1 items-stretch">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center gap-2 px-3 lg:px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeCompanyId === null && activeTab === tab.id
                      ? "border-emerald-500 text-emerald-400"
                      : "border-transparent text-slate-500 hover:text-slate-300 hover:border-[#1E2D3D]"
                  }`}
                >
                  {tab.icon}
                  <span className="hidden lg:inline">{tab.label}</span>
                </button>
              ))}
              <CompaniesDropdown
                activeCompanyId={activeCompanyId}
                onSelect={(id) => setActiveCompanyId(id)}
              />
            </div>

            {/* Account + confidential — pushed right on mobile */}
            <div className="flex items-center gap-3 shrink-0 pl-4 border-l border-[#1E2D3D] ml-auto sm:ml-0">
              <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 border border-[#1E2D3D] rounded-lg px-2 py-1.5">
                <Lock size={10} />
                <span>Confidential</span>
              </div>
              <div className="flex items-center gap-2 bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-2.5 py-1.5">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-indigo-400">CF</span>
                </div>
                <div className="hidden sm:block leading-tight">
                  <p className="text-xs font-medium text-slate-200">Co-Owner Fund, LP</p>
                  <p className="text-[9px] text-slate-500">Fund View</p>
                </div>
                <User size={12} className="sm:hidden text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D1421]/95 backdrop-blur-md border-t border-[#1E2D3D]">
        <div className="flex items-stretch h-16">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                activeCompanyId === null && activeTab === tab.id
                  ? "text-emerald-400"
                  : "text-slate-500"
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
          {/* Companies item */}
          <CompaniesDropdown
            activeCompanyId={activeCompanyId}
            onSelect={(id) => setActiveCompanyId(id)}
            openAbove
            variant="bottomnav"
          />
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 sm:pb-8">
        {/* Company detail page */}
        {activeCompany && (
          <CompanyPage
            company={activeCompany}
            savedValuation={userValuations[activeCompany.id]}
            onSaveValuation={(v) => setUserValuations(prev => ({ ...prev, [activeCompany.id]: v }))}
            onResetValuation={() => setUserValuations(prev => { const n = { ...prev }; delete n[activeCompany.id]; return n; })}
          />
        )}

        {!activeCompany && activeTab === "overview" && (
          <div className="space-y-8">
            {/* ── Overview Hero ── */}
            {(() => {
              // ── LP multiplier — compute first so displayItems can use it ────────────
              const lpCurrent    = parseFloat(lpCurrentUnits) || 0;
              const lpCurrentPct = lpCurrent > 0 ? lpCurrent / LP_TOTAL_UNITS : 0;
              // Hypothetical additional units — expands denominator (dilutive)
              const lpHypo      = parseFloat(lpHypotheticalUnits) || 0;
              const lpHypoTotal = lpCurrent + lpHypo;
              const lpHypoDenom = LP_TOTAL_UNITS + lpHypo;               // new total outstanding
              const lpHypoPct   = lpHypoTotal > 0 ? lpHypoTotal / lpHypoDenom : 0;
              // Active pct: prefer hypo-adjusted when hypothetical units are set
              const activePct    = lpViewMode === "current" && lpCurrentPct > 0
                ? (lpHypo > 0 ? lpHypoPct : lpCurrentPct)
                : 1;
              const lpMultiplier = activePct;
              const isLpView     = lpMultiplier < 1;

              // ── Donut: total exposure per company (equity + debt + options) + managed ─
              const donutItems = [
                ...portfolio
                  .filter(c => c.status === "active")
                  .map(c => {
                    const pps = c.totalShares ? effectiveImplied(c) / c.totalShares : 0;
                    const sh  = (c.shareTransactions ?? []).filter(t => t.type === "Common")
                                  .reduce((s, t) => s + (t.shares ?? 0), 0);
                    const equityVal = pps > 0 && sh > 0 ? sh * pps : effectiveCurrVal(c);
                    const debtVal   = (c.debtPositions  ?? []).reduce((s, d) => s + d.currentValue, 0);
                    const optionVal = (c.optionPositions ?? []).reduce((s, o) => {
                      const intrinsic = o.shares * Math.max(pps - o.strikePrice, 0);
                      const timeVal   = o.shares * pps * ((optionVariances[o.id] ?? 0) / 100);
                      return s + intrinsic + timeVal;
                    }, 0);
                    return { label: c.name, value: equityVal + debtVal + optionVal, color: c.accentColor, id: c.id };
                  })
                  .filter(d => d.value > 0),
              ];
              const baseDonutTotal = donutItems.reduce((s, d) => s + d.value, 0);
              const grossTotal  = baseDonutTotal + lpHypo;          // includes hypothetical cash
              const netTotal    = grossTotal - FUND_LEVERAGE;
              // MOIC denominator expands when hypothetical units are outstanding
              const moicDenom   = lpHypoDenom;
              // Scaled display values — apply LP view multiplier to all dollar amounts
              const displayItems = [
                ...donutItems.map(d => ({ ...d, value: d.value * lpMultiplier })),
                ...(lpHypo > 0 ? [{ label: "To Deploy", value: lpHypo * lpMultiplier, color: "#94A3B8", id: "to-deploy" }] : []),
              ];
              const displayItemsTotal = displayItems.reduce((s, d) => s + d.value, 0);
              const displayTotal     = netTotal * lpMultiplier;

              // Build SVG donut arcs
              const cx = 80; const cy = 80; const R = 62; const r = 40;
              let angle = -Math.PI / 2;
              const arcs = displayItems.map(d => {
                const sweep = (d.value / displayItemsTotal) * 2 * Math.PI;
                const x1 = cx + R * Math.cos(angle); const y1 = cy + R * Math.sin(angle);
                angle += sweep;
                const x2 = cx + R * Math.cos(angle); const y2 = cy + R * Math.sin(angle);
                const ix1 = cx + r * Math.cos(angle - sweep); const iy1 = cy + r * Math.sin(angle - sweep);
                const ix2 = cx + r * Math.cos(angle); const iy2 = cy + r * Math.sin(angle);
                const large = sweep > Math.PI ? 1 : 0;
                return { ...d, path: `M${x1},${y1} A${R},${R},0,${large},1,${x2},${y2} L${ix2},${iy2} A${r},${r},0,${large},0,${ix1},${iy1} Z` };
              });


              // ── Allocation by security type ────────────────────────────────────
              const ALLOC_CREDIT_INSTR = ["Term Loan", "Line of Credit", "Revenue Based Financing"];
              let equityBasis = 0, creditBasis = 0, convertBasis = 0;
              for (const c of portfolio) {
                if (c.status === "active") {
                  const eqPps = c.totalShares ? effectiveImplied(c) / c.totalShares : 0;
                  const eqSh  = (c.shareTransactions ?? []).filter(t => t.type === "Common" || t.type === "Preferred").reduce((s, t) => s + (t.shares ?? 0), 0);
                  equityBasis += eqPps > 0 && eqSh > 0 ? eqSh * eqPps : effectiveCurrVal(c);
                }
                for (const d of (c.debtPositions ?? [])) {
                  if (d.status === "Repaid") continue;
                  if (ALLOC_CREDIT_INSTR.includes(d.instrument)) creditBasis += d.currentValue;
                  else convertBasis += d.currentValue;
                }
              }
              // Option total value: intrinsic + time value (variance-weighted)
              const optionsBasis = portfolio.reduce((sum, c) => {
                const pps = c.totalShares ? effectiveImplied(c) / c.totalShares : 0;
                return sum + (c.optionPositions ?? []).reduce((s, o) => {
                  const intrinsic = o.shares * Math.max(pps - o.strikePrice, 0);
                  const timeVal   = o.shares * pps * ((optionVariances[o.id] ?? 0) / 100);
                  return s + intrinsic + timeVal;
                }, 0);
              }, 0);
              const cashBasis   = cashPositions.reduce((s, cp) => s + cp.balance, 0) + lpHypo;
              const allocTotal  = equityBasis + creditBasis + convertBasis + optionsBasis + cashBasis;
              const allocTypes = [
                { label: "Equity",       amount: equityBasis,  color: "#10B981", pct: allocTotal > 0 ? equityBasis  / allocTotal : 0 },
                { label: "Credit",       amount: creditBasis,  color: "#6366F1", pct: allocTotal > 0 ? creditBasis  / allocTotal : 0 },
                { label: "Convertibles", amount: convertBasis, color: "#F59E0B", pct: allocTotal > 0 ? convertBasis / allocTotal : 0 },
                { label: "Options",      amount: optionsBasis, color: "#F43F5E", pct: allocTotal > 0 ? optionsBasis / allocTotal : 0 },
                { label: "Cash",         amount: cashBasis,    color: "#60A5FA", pct: allocTotal > 0 ? cashBasis    / allocTotal : 0 },
              ];
              // Total positions count across all instrument types
              const totalPositions =
                portfolio.filter(c => c.status === "active" && (c.shareTransactions ?? []).some(t => t.type === "Common")).length +
                portfolio.reduce((s, c) => s + (c.debtPositions ?? []).length, 0) +
                portfolio.reduce((s, c) => s + (c.optionPositions ?? []).length, 0);

              return (
              <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
                {/* ── Metrics strip ── */}
                {/* Metrics strip */}
                <div className={`grid grid-cols-2 sm:grid-cols-4 border-b border-[#1E2D3D] ${isLpView ? "bg-[#080E1A]" : ""}`}>
                  {/* Portfolio NAV Est. */}
                  <div className="px-3 py-3 sm:px-4 sm:py-3.5 border-r border-[#1E2D3D]">
                    <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium leading-tight">Portfolio NAV Est.</p>
                    <p className="text-sm font-bold mt-1 tabular-nums" style={{ color: "#10B981" }}>{fmt(displayTotal)}</p>
                    <p className="text-[9px] text-slate-600 tabular-nums mt-0.5">assets {fmt(grossTotal * lpMultiplier)}</p>
                    <p className="text-[9px] text-slate-600 tabular-nums">lev. -{fmt(FUND_LEVERAGE * lpMultiplier)}</p>
                    {isLpView && <p className="text-[9px] text-slate-500 tabular-nums">fund {fmt(netTotal)}</p>}
                  </div>
                  {/* LP Basis — fraction prominent in My Share mode */}
                  <div className="px-3 py-3 sm:px-4 sm:py-3.5 border-r border-[#1E2D3D]">
                    <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium leading-tight">{isLpView ? "My LP Basis" : "LP Basis"}</p>
                    <p className="text-sm font-bold mt-1 tabular-nums text-slate-200">{isLpView ? fmt(lpHypoTotal) : fmt(lpHypoDenom)}</p>
                    {isLpView && (
                      <>
                        <p className="text-base font-bold tabular-nums mt-0.5" style={{ color: "#34D399" }}>{(lpHypoPct * 100).toFixed(2)}%</p>
                        <p className="text-[9px] tabular-nums mt-0.5" style={{ color: "#6EE7B7" }}>
                          {lpHypoTotal.toLocaleString()} / {lpHypoDenom.toLocaleString()}
                        </p>
                      </>
                    )}
                  </div>
                  {/* MOIC */}
                  <div className="px-3 py-3 sm:px-4 sm:py-3.5 border-r border-[#1E2D3D]">
                    <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium leading-tight">MOIC</p>
                    <p className="text-sm font-bold mt-1 tabular-nums" style={{ color: netTotal >= moicDenom ? "#10B981" : "#F87171" }}>
                      {moicDenom > 0 ? `${(netTotal / moicDenom).toFixed(2)}×` : "—"}
                    </p>
                  </div>
                  {/* Active Co's & Positions — combined */}
                  <div className="px-3 py-3 sm:px-4 sm:py-3.5">
                    <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium leading-tight">Portfolio</p>
                    <p className="text-sm font-bold mt-1 tabular-nums text-slate-200">
                      {portfolio.filter(c => c.status === "active").length} <span className="text-xs font-normal text-slate-500">co's</span>
                    </p>
                    <p className="text-[9px] text-slate-600 tabular-nums mt-0.5">{totalPositions} positions</p>
                  </div>
                </div>

                {/* ── LP Unit Calculator ── */}
                <div className="border-b border-[#1E2D3D] px-4 sm:px-5 py-3 bg-[#080E1A]">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium shrink-0">LP View</p>

                    {/* View mode pills */}
                    <div className="flex items-center gap-1">
                      {([["fund","Fund Total"],["current","My Share"]] as const).map(([mode, label]) => (
                        <button
                          key={mode}
                          onClick={() => setLpViewMode(mode)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                            lpViewMode === mode
                              ? mode === "fund" ? "bg-slate-700 text-slate-200"
                                : "bg-emerald-600/30 text-emerald-400 ring-1 ring-emerald-500/40"
                              : "bg-[#111D2E] text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Units input — hidden in Fund Total mode */}
                    {lpViewMode === "current" && (
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-slate-500 whitespace-nowrap">My units</label>
                      <input
                        type="number" min={0} placeholder="e.g. 100000"
                        value={lpCurrentUnits}
                        onChange={e => { setLpCurrentUnits(e.target.value); if (parseFloat(e.target.value) > 0) setLpViewMode("current"); }}
                        className="w-28 bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-2 py-1 text-xs text-slate-200 tabular-nums focus:outline-none focus:border-slate-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    )}

                    {/* Add exposure — always shown; adds cash to fund assets */}
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-slate-500 whitespace-nowrap">+ add exposure</label>
                      <input
                        type="number" min={0} placeholder="units"
                        value={lpHypotheticalUnits}
                        onChange={e => setLpHypotheticalUnits(e.target.value)}
                        className="w-24 bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-2 py-1 text-xs text-slate-200 tabular-nums focus:outline-none focus:border-slate-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    <span className="text-[10px] text-slate-600 hidden md:inline">
                      {lpHypo > 0 ? lpHypoDenom.toLocaleString() : LP_TOTAL_UNITS.toLocaleString()} units outstanding · $1.00/unit
                    </span>
                  </div>
                </div>

                {/* ── Three charts ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[#1E2D3D]">

                  {/* ① Company allocation donut */}
                  <div className="p-5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-3">By Company</p>
                    <div className="flex justify-center mb-3">
                      <svg width="140" height="140" viewBox="0 0 160 160" className="shrink-0">
                        {arcs.map((a, i) => (
                          <path
                            key={i}
                            d={a.path}
                            fill={a.color}
                            opacity={0.85}
                            className="cursor-pointer hover:opacity-100 transition-opacity"
                            onClick={() => { if (a.id !== "to-deploy" && a.id !== "cash") setActiveCompanyId(a.id); }}
                          >
                            <title>{a.label}: {fmt(a.value)}</title>
                          </path>
                        ))}
                        <text x="80" y="76" textAnchor="middle" style={{ fontSize: 12, fontWeight: 700, fill: "#e2e8f0" }}>{fmt(displayTotal)}</text>
                        <text x="80" y="91" textAnchor="middle" style={{ fontSize: 9, fill: "#64748b" }}>{isLpView ? "my share" : "total value"}</text>
                      </svg>
                    </div>
                    <div className="flex flex-col gap-1">
                      {displayItems.map(d => (
                        <button
                          key={d.id}
                          onClick={() => { if (d.id !== "to-deploy" && d.id !== "cash") setActiveCompanyId(d.id); }}
                          className="grid items-center gap-x-2 group text-left w-full"
                          style={{ gridTemplateColumns: "8px 1fr 32px 44px" }}
                        >
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                          <span className="text-[11px] text-slate-400 group-hover:text-slate-200 transition-colors">{d.label}</span>
                          <span className="text-[10px] text-slate-600 tabular-nums text-right">{displayItemsTotal > 0 ? `${((d.value / displayItemsTotal) * 100).toFixed(1)}%` : "—"}</span>
                          <span className="text-[11px] text-slate-500 tabular-nums text-right">{fmt(d.value)}</span>
                        </button>
                      ))}
                    </div>
                  </div>


                  {/* ② Assets by type */}
                  <div className="p-5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-4">Assets</p>
                    <div className="space-y-3">
                      {allocTypes.map(t => (
                        <div key={t.label}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                              <span className="text-xs text-slate-300 font-medium">{t.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs tabular-nums text-slate-400">{fmt(t.amount * lpMultiplier)}</span>
                              <span className="text-[10px] tabular-nums text-slate-600 w-8 text-right">{(t.pct * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-[#111D2E] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${(t.pct * 100).toFixed(1)}%`, background: t.color, opacity: 0.8 }} />
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-[#1E2D3D] flex items-center justify-between">
                        <span className="text-[10px] text-slate-600 uppercase tracking-wider">Total{isLpView ? " (My Share)" : " Deployed"}</span>
                        <span className="text-xs font-semibold text-slate-300 tabular-nums">{fmt(allocTotal * lpMultiplier)}</span>
                      </div>
                    </div>
                  </div>

                  {/* ③ Fund Structure — vertical column chart */}
                  <div className="p-5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-3">Fund Structure</p>
                    {(() => {
                      // ── Top: fund-total vertical bars (always, never LP-scaled) ──
                      const fundCols = [
                        { label: "Assets",   val: grossTotal,    color: "#10B981" },
                        { label: "Leverage", val: FUND_LEVERAGE, color: "#F87171" },
                        { label: "NAV",      val: netTotal,      color: "#38BDF8" },
                        { label: "LP Basis", val: lpHypoDenom,   color: "#8B5CF6" },
                      ];
                      const maxVal = Math.max(...fundCols.map(c => c.val), 1);
                      const W3 = 280; const H3 = 120;
                      const PAD3 = { t: 16, r: 6, b: 24, l: 6 };
                      const cW3 = W3 - PAD3.l - PAD3.r;
                      const cH3 = H3 - PAD3.t - PAD3.b;
                      const n3 = fundCols.length;
                      const gap3 = 10;
                      const bW3 = (cW3 - gap3 * (n3 - 1)) / n3;
                      const fmtS = (v: number) => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${Math.round(v)}`;

                      // ── Bottom: My Share line gauges (only in LP view) ──
                      // Gauges use the same maxVal scale as the bars above so widths are proportional
                      const myRows = isLpView ? [
                        { label: "My Basis", val: lpHypoTotal,  color: "#A78BFA" },
                        { label: "My NAV",   val: displayTotal, color: "#34D399" },
                      ] : [];

                      return (
                        <div>
                          {/* Vertical bar chart — fund totals */}
                          <svg width="100%" viewBox={`0 0 ${W3} ${H3}`} preserveAspectRatio="xMidYMid meet">
                            {fundCols.map((c, i) => {
                              const x  = PAD3.l + i * (bW3 + gap3);
                              const bh = (c.val / maxVal) * cH3;
                              const y  = PAD3.t + cH3 - bh;
                              return (
                                <g key={c.label}>
                                  <rect x={x} y={y} width={bW3} height={bh} fill={c.color} opacity="0.75" rx="2" />
                                  <text x={x + bW3 / 2} y={y - 3} textAnchor="middle" style={{ fontSize: 7, fill: c.color, fontWeight: 600 }}>{fmtS(c.val)}</text>
                                  <text x={x + bW3 / 2} y={H3 - 4} textAnchor="middle" style={{ fontSize: 7, fill: "#64748B" }}>{c.label}</text>
                                </g>
                              );
                            })}
                          </svg>

                          {/* Line gauges — My Share (only when isLpView) */}
                          {myRows.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-[#1E2D3D] space-y-3">
                              <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium mb-2">My Share</p>
                              {myRows.map(row => {
                                const pct = Math.min(row.val / maxVal, 1);
                                return (
                                  <div key={row.label}>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-[9px] text-slate-500">{row.label}</span>
                                      <span className="text-[9px] tabular-nums font-semibold" style={{ color: row.color }}>{fmtS(row.val)}</span>
                                    </div>
                                    {/* Gauge line — same scale as top bars */}
                                    <div className="relative">
                                      <svg width="100%" viewBox="0 0 280 14" preserveAspectRatio="none">
                                        {/* Track */}
                                        <rect x="0" y="5" width="280" height="2" fill="#1E2D3D" rx="1" />
                                        {/* Fill */}
                                        <rect x="0" y="5" width={280 * pct} height="2" fill={row.color} opacity="0.7" rx="1" />
                                        {/* Start tick */}
                                        <line x1="0" y1="3" x2="0" y2="9" stroke="#1E2D3D" strokeWidth="1.5" />
                                        {/* End tick */}
                                        <line x1="280" y1="3" x2="280" y2="9" stroke="#1E2D3D" strokeWidth="1.5" />
                                        {/* Marker dot */}
                                        <circle cx={280 * pct} cy="6" r="4" fill={row.color} />
                                        <circle cx={280 * pct} cy="6" r="2" fill="#0D1421" />
                                        {/* End label — shared scale max */}
                                        <text x="280" y="14" textAnchor="end" style={{ fontSize: 6, fill: "#475569" }}>{fmtS(maxVal)}</text>
                                      </svg>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                </div>
              </div>
              );
            })()}

            {/* Portfolio at a Glance */}
            {(() => {
              const fmtPrice = (n: number) => `$${n.toFixed(3)}`;

              // Helpers
              const companyLogo = (c: typeof portfolio[0], size = "w-6 h-6") => c.logoUrl ? (
                <div className={`${size} rounded overflow-hidden bg-white flex items-center justify-center p-0.5 shrink-0`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.logoUrl} alt={c.name} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className={`${size} rounded font-bold flex items-center justify-center shrink-0 text-[10px]`}
                  style={{ background: `${c.accentColor}18`, color: c.accentColor }}>
                  {c.initials[0]}
                </div>
              );

              const TH = ({ children, wide }: { children?: React.ReactNode; wide?: boolean }) => (
                <th className={`py-2 px-3 text-left text-[10px] text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap${wide ? " min-w-[180px]" : ""}`}>{children}</th>
              );
              const TD = ({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
                <td className={`py-2.5 px-3 text-xs ${className}`} style={style}>{children}</td>
              );

              const SectionHeader = ({ label, tableKey, accent, stats }: {
                label: string; tableKey: string; accent: string;
                stats: { label: string; value: string; color?: string }[];
              }) => (
                <button
                  onClick={() => toggleTable(tableKey)}
                  className="w-full hover:bg-[#111D2E]/60 transition-colors"
                >
                  {/* Mobile: stacked label + grid of stats */}
                  <div className="sm:hidden">
                    <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
                        <span className="text-sm font-semibold text-slate-200">{label}</span>
                      </div>
                      <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${openInstrumentTables.has(tableKey) ? "rotate-180" : ""}`} />
                    </div>
                    <div className="grid grid-cols-4 border-t border-[#1E2D3D] divide-x divide-[#1E2D3D]">
                      {stats.map(s => (
                        <div key={s.label} className="flex flex-col justify-center px-2 py-2.5 min-w-0">
                          <p className="text-[8px] text-slate-600 uppercase tracking-widest font-medium leading-tight">{s.label}</p>
                          <p className="text-xs font-bold mt-0.5 tabular-nums" style={{ color: s.color ?? "#e2e8f0" }}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Desktop: original horizontal layout */}
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
                      <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${openInstrumentTables.has(tableKey) ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </button>
              );

              // ── Group transactions by company ──────────────────────────────────
              const CREDIT_INSTRUMENTS  = ["Term Loan", "Line of Credit", "Revenue Based Financing"];
              const CONVERT_INSTRUMENTS = ["SAFE", "Convertible Note", "Preferred"];
              const companiesWithCommon   = portfolio.filter(c => (c.shareTransactions ?? []).some(t => t.type === "Common"));
              const companiesWithCredit   = portfolio.filter(c => (c.debtPositions ?? []).some(d => CREDIT_INSTRUMENTS.includes(d.instrument)));
              const companiesWithConvert  = portfolio.filter(c => (c.debtPositions ?? []).some(d => CONVERT_INSTRUMENTS.includes(d.instrument)));
              const companiesWithOptions  = portfolio.filter(c => (c.optionPositions ?? []).length > 0);

              return (
              <div className="space-y-3">

                {/* ══ 1. EQUITY (Common Stock) ══════════════════════════════════════ */}
                <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
                  {(() => {
                    const totalCost = companiesWithCommon.reduce((s, c) => s + (c.shareTransactions ?? []).filter(t => t.type === "Common").reduce((a, t) => a + t.amount, 0), 0);
                    const estValue  = companiesWithCommon.reduce((s, c) => {
                      const txns = (c.shareTransactions ?? []).filter(t => t.type === "Common");
                      const sh = txns.reduce((a, t) => a + (t.shares ?? 0), 0);
                      const pps = c.totalShares ? effectiveImplied(c) / c.totalShares : null;
                      return s + (pps !== null ? sh * pps : 0);
                    }, 0);
                    const moic = totalCost > 0 && estValue > 0 ? estValue / totalCost : null;
                    return (
                      <>
                        <div className="border-b border-[#1E2D3D]">
                          <SectionHeader label="Equity" tableKey="common" accent="#10B981" stats={[
                            { label: "Cost Basis",     value: totalCost > 0 ? fmt(totalCost) : "—" },
                            { label: "Est. Value",     value: fmt(estValue), color: "#10B981" },
                            { label: "MOIC",           value: moic !== null ? `${moic.toFixed(2)}×` : "—", color: moic && moic >= 1 ? "#10B981" : undefined },
                          ]} />
                        </div>
                        {openInstrumentTables.has("common") && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                                <tr>
                                  <TH></TH><TH wide>Company</TH><TH>Shares</TH><TH>Cost Basis</TH>
                                  <TH>Share Price</TH><TH>Est. Value</TH><TH>MOIC</TH>
                                  <TH>% FD</TH><TH>Voting %</TH><TH></TH>
                                </tr>
                              </thead>
                              <tbody>
                                {companiesWithCommon.map((c) => {
                                  const txns = (c.shareTransactions ?? []).filter(t => t.type === "Common");
                                  const sh = txns.reduce((s, t) => s + (t.shares ?? 0), 0);
                                  const cost = txns.reduce((s, t) => s + t.amount, 0);
                                  const valPerSh = c.totalShares ? effectiveImplied(c) / c.totalShares : null;
                                  const currVal = valPerSh !== null ? sh * valPerSh : null;
                                  const cMoic = cost > 0 && currVal !== null ? currVal / cost : null;
                                  const rowKey = `common-${c.id}`;
                                  const isOpen = expandedRows.has(rowKey);
                                  return (
                                    <>
                                      <tr key={c.id} className="border-t border-[#111D2E] hover:bg-[#111D2E]/40 cursor-pointer" onClick={() => toggleRow(rowKey)}>
                                        <TD><ChevronDown size={12} className={`text-slate-600 transition-transform ${isOpen ? "rotate-180" : ""}`} /></TD>
                                        <TD>
                                          <div className="flex items-center gap-2">
                                            {companyLogo(c)}
                                            <div>
                                              <p className="font-semibold text-slate-200">{c.name}</p>
                                            </div>
                                          </div>
                                        </TD>
                                        <TD className="tabular-nums text-slate-400">{sh > 0 ? sh.toLocaleString() : "—"}</TD>
                                        <TD className="text-slate-300 tabular-nums">{cost > 0 ? fmt(cost) : <span className="text-slate-600">—</span>}</TD>
                                        <TD className="tabular-nums">
                                          {(() => {
                                            const defaultPps = c.totalShares ? defaultImplied(c) / c.totalShares : null;
                                            const customPps  = userValuations[c.id] !== undefined && c.totalShares ? userValuations[c.id] / c.totalShares : null;
                                            if (customPps !== null && defaultPps !== null) {
                                              return (
                                                <div className="flex items-start gap-1.5">
                                                  <div className="flex flex-col gap-0.5">
                                                    <span className="text-slate-600 line-through leading-tight">${defaultPps.toFixed(4)}</span>
                                                    <span className="text-emerald-400 font-semibold leading-tight">${customPps.toFixed(4)}</span>
                                                  </div>
                                                  <button
                                                    onClick={(e) => { e.stopPropagation(); setValuationModal({ company: c, pendingVal: effectiveImplied(c) }); }}
                                                    className="p-0.5 mt-0.5 rounded hover:bg-white/10 text-emerald-600 hover:text-emerald-300 transition-colors"
                                                    title="Edit share price / valuation"
                                                  >
                                                    <Pencil size={10} />
                                                  </button>
                                                </div>
                                              );
                                            }
                                            return (
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-slate-300">{defaultPps !== null ? `$${defaultPps.toFixed(4)}` : "—"}</span>
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); setValuationModal({ company: c, pendingVal: effectiveImplied(c) }); }}
                                                  className="p-0.5 rounded hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
                                                  title="Edit share price / valuation"
                                                >
                                                  <Pencil size={10} />
                                                </button>
                                              </div>
                                            );
                                          })()}
                                        </TD>
                                        <TD className="tabular-nums font-medium" style={{ color: c.accentColor }}>
                                          {currVal !== null ? fmt(currVal) : "—"}
                                        </TD>
                                        <TD className={`tabular-nums font-medium ${cMoic !== null && cMoic >= 1 ? "text-emerald-400" : "text-slate-600"}`}>
                                          {cMoic !== null ? `${cMoic.toFixed(2)}×` : "—"}
                                        </TD>
                                        <TD className="tabular-nums text-slate-400">
                                          {c.totalShares && sh > 0 ? `${((sh / c.totalShares) * 100).toFixed(1)}%` : "—"}
                                        </TD>
                                        <TD className="tabular-nums text-slate-400">
                                          {c.votingOwnership !== undefined ? `${c.votingOwnership.toFixed(1)}%` : "—"}
                                        </TD>
                                        <TD>
                                          {userValuations[c.id] !== undefined && (
                                            <button
                                              onClick={(e) => { e.stopPropagation(); setUserValuations(prev => { const n = { ...prev }; delete n[c.id]; return n; }); }}
                                              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors whitespace-nowrap"
                                              title="Reset to default valuation"
                                            >
                                              <RotateCcw size={9} /> Reset
                                            </button>
                                          )}
                                        </TD>
                                      </tr>
                                      {isOpen && txns.map((t, i) => (
                                        <tr key={i} className="border-t border-[#0D1421] bg-[#080E1A]">
                                          <td className="py-2 px-3 w-6" />
                                          <td className="py-2 px-3 pl-11">
                                            <div className="flex flex-col gap-0.5">
                                              <span className="text-[11px] text-slate-500">{t.date} · {t.type}</span>
                                              {t.certificateNumber && (
                                                <span className="text-[10px] font-mono text-slate-600 tracking-wide">{t.certificateNumber}</span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">{t.shares !== undefined ? t.shares.toLocaleString() : "—"}</td>
                                          <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">{t.amount > 0 ? fmt(t.amount) : <span className="text-slate-700">—</span>}</td>
                                          <td className="py-2 px-3 text-[11px] text-slate-500 tabular-nums">
                                            {t.pricePerShare !== undefined ? `$${t.pricePerShare.toFixed(4)}` : <span className="text-slate-700">—</span>}
                                          </td>
                                          <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">
                                            {t.shares !== undefined && valPerSh !== null ? fmt(t.shares * valPerSh) : "—"}
                                          </td>
                                          <td className="py-2 px-3" /><td className="py-2 px-3" /><td className="py-2 px-3" /><td className="py-2 px-3" /><td className="py-2 px-3" />
                                        </tr>
                                      ))}
                                    </>
                                  );
                                })}
                                <tr className="border-t border-[#1E2D3D] bg-[#080E1A]">
                                  <td /><td className="py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total / Wtd Avg</td>
                                  <td className="py-2 px-3 text-xs text-slate-500 tabular-nums">{companiesWithCommon.reduce((s,c)=>s+(c.shareTransactions??[]).filter(t=>t.type==="Common").reduce((a,t)=>a+(t.shares??0),0),0).toLocaleString()}</td>
                                  <td className="py-2 px-3 text-xs text-slate-200 tabular-nums font-semibold">{totalCost > 0 ? fmt(totalCost) : <span className="text-slate-600">—</span>}</td>
                                  <td />
                                  <td className="py-2 px-3 text-xs text-emerald-400 tabular-nums font-semibold">{fmt(estValue)}</td>
                                  <td className="py-2 px-3 text-xs text-emerald-400 tabular-nums font-semibold">{moic !== null ? `${moic.toFixed(2)}×` : "—"}</td>
                                  <td className="py-2 px-3">
                                    {Object.keys(userValuations).some(id => companiesWithCommon.some(c => c.id === id)) && (
                                      <button
                                        onClick={() => setUserValuations(prev => {
                                          const n = { ...prev };
                                          for (const c of companiesWithCommon) delete n[c.id];
                                          return n;
                                        })}
                                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors whitespace-nowrap"
                                      >
                                        <RotateCcw size={9} /> Reset All
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* ══ 2. CREDIT ════════════════════════════════════════════════════ */}
                <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
                  {(() => {
                    const monthlyPmt = (principal: number, annualRate: number, months = 12) => {
                      const r = annualRate / 100 / 12;
                      return r > 0 ? principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1) : principal / months;
                    };
                    const calcPmt = (d: typeof allCreditPos[0]): number | null => {
                      if (d.interestRate === undefined || d.instrument === "Line of Credit") return null;
                      return d.termMonths === 1
                        ? Math.round(d.principal * d.interestRate / 1200)
                        : Math.round(monthlyPmt(d.principal, d.interestRate, 12));
                    };
                    const allCreditPos = companiesWithCredit.flatMap(c =>
                      (c.debtPositions ?? []).filter(d => CREDIT_INSTRUMENTS.includes(d.instrument))
                    );
                    const activeCreditPos = allCreditPos.filter(d => d.status !== "Repaid");
                    const totalOutstanding = activeCreditPos.reduce((s, d) => s + d.currentValue, 0);
                    const ratedPos = activeCreditPos.filter(d => d.interestRate !== undefined && d.currentValue > 0);
                    const wtdRate = ratedPos.length > 0
                      ? ratedPos.reduce((s, d) => s + d.currentValue * d.interestRate!, 0) / ratedPos.reduce((s, d) => s + d.currentValue, 0)
                      : null;
                    const totalMonthly = activeCreditPos.reduce((s, d) => { const p = calcPmt(d); return p !== null ? s + p : s; }, 0);
                    return (
                      <>
                        <div className="border-b border-[#1E2D3D]">
                          <SectionHeader label="Credit" tableKey="credit" accent="#6366F1" stats={[
                            { label: "Outstanding",  value: fmt(totalOutstanding), color: "#6366F1" },
                            { label: "Wtd Rate",     value: wtdRate !== null ? `${wtdRate.toFixed(1)}%` : "—" },
                            { label: "Monthly",      value: totalMonthly > 0 ? fmt(totalMonthly) : "—" },
                          ]} />
                        </div>
                        {openInstrumentTables.has("credit") && (
                          companiesWithCredit.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                                  <tr>
                                    <TH></TH><TH wide>Company</TH><TH>Type</TH>
                                    <TH>Original</TH><TH>Repaid</TH><TH>Outstanding</TH><TH>Rate</TH><TH>Monthly</TH><TH></TH>
                                  </tr>
                                </thead>
                                <tbody>
                                  {companiesWithCredit.map((c) => {
                                    const positions  = (c.debtPositions ?? []).filter(d => CREDIT_INSTRUMENTS.includes(d.instrument));
                                    const activePos  = positions.filter(d => d.status !== "Repaid");
                                    const repaidPos  = positions.filter(d => d.status === "Repaid");
                                    const compOrig   = positions.reduce((s, d) => s + d.principal, 0);
                                    const compRepaid = positions.reduce((s, d) => s + (d.principal - d.currentValue), 0);
                                    const compOut    = activePos.reduce((s, d) => s + d.currentValue, 0);
                                    const ratedP     = activePos.filter(d => d.interestRate !== undefined && d.currentValue > 0);
                                    const compRate   = ratedP.length > 0
                                      ? ratedP.reduce((s, d) => s + d.currentValue * d.interestRate!, 0) / ratedP.reduce((s, d) => s + d.currentValue, 0)
                                      : null;
                                    const compMonthly  = activePos.reduce((s, d) => { const p = calcPmt(d); return p !== null ? s + p : s; }, 0);
                                    const hasVariable  = activePos.some(d => d.instrument === "Line of Credit" && d.interestRate === undefined);
                                    const rowKey       = `credit-${c.id}`;
                                    const isOpen       = expandedRows.has(rowKey);
                                    const activeTypes  = activePos.map(d => d.instrument).filter((v, i, a) => a.indexOf(v) === i);
                                    const instrType    = activeTypes.length === 1 ? activeTypes[0] : `${activePos.length} instruments`;
                                    const rateLabel    = (d: typeof positions[0]) =>
                                      d.interestRate !== undefined ? `${d.interestRate}%`
                                        : d.instrument === "Line of Credit" ? "Variable" : "—";
                                    const pmtLabel     = (d: typeof positions[0]) => {
                                      if (d.instrument === "Line of Credit" && d.interestRate === undefined) return "Variable";
                                      const p = calcPmt(d); return p !== null ? fmt(p) : "—";
                                    };
                                    return (
                                      <>
                                        <tr key={c.id} className="border-t border-[#111D2E] hover:bg-[#111D2E]/40 cursor-pointer" onClick={() => toggleRow(rowKey)}>
                                          <TD><ChevronDown size={12} className={`text-slate-600 transition-transform ${isOpen ? "rotate-180" : ""}`} /></TD>
                                          <TD>
                                            <div className="flex items-center gap-2">
                                              {companyLogo(c)}
                                              <div>
                                                <p className="font-semibold text-slate-200">{c.name}</p>
                                                <p className="text-[10px] text-slate-600">{activePos.length} active{repaidPos.length > 0 ? `, ${repaidPos.length} repaid` : ""}</p>
                                              </div>
                                            </div>
                                          </TD>
                                          <TD><span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-medium">{instrType}</span></TD>
                                          <TD className="text-slate-500 tabular-nums">{fmt(compOrig)}</TD>
                                          <TD className="text-slate-500 tabular-nums">{fmt(compRepaid)}</TD>
                                          <TD className="text-slate-200 tabular-nums font-semibold">{fmt(compOut)}</TD>
                                          <TD className="text-indigo-400 tabular-nums">{compRate !== null ? `${compRate.toFixed(1)}%` : hasVariable ? <span className="text-slate-400 italic text-[10px]">Variable</span> : <span className="text-slate-500">—</span>}</TD>
                                          <TD className="text-slate-300 tabular-nums">{compMonthly > 0 ? fmt(compMonthly) : hasVariable ? <span className="text-slate-400 italic text-[10px]">+Variable</span> : "—"}</TD>
                                          <td />
                                        </tr>
                                        {isOpen && (
                                          <>
                                            {activePos.map((d, i) => (
                                              <tr key={`a-${i}`} className="border-t border-[#0D1421] bg-[#080E1A]">
                                                <td className="py-2 px-3 w-6" />
                                                <td className="py-2 px-3 pl-11">
                                                  <p className="text-[11px] text-slate-500">{d.date}{d.maturityDate ? ` → ${d.maturityDate}` : ""}</p>
                                                  {d.notes && <p className="text-[10px] text-slate-600 max-w-xs">{d.notes}</p>}
                                                </td>
                                                <td className="py-2 px-3">
                                                  <span className="text-[10px] px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-400">{d.instrument}</span>
                                                </td>
                                                <td className="py-2 px-3 text-[11px] text-slate-500 tabular-nums">{fmt(d.principal)}</td>
                                                <td className="py-2 px-3 text-[11px] text-slate-500 tabular-nums">{fmt(d.principal - d.currentValue)}</td>
                                                <td className="py-2 px-3 text-[11px] text-slate-200 tabular-nums font-medium">{fmt(d.currentValue)}</td>
                                                <td className="py-2 px-3 text-[11px] text-indigo-400 tabular-nums">{rateLabel(d)}</td>
                                                <td className="py-2 px-3 text-[11px] text-slate-300 tabular-nums">{pmtLabel(d)}</td>
                                                <td className="py-2 px-3">
                                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">Active</span>
                                                </td>
                                              </tr>
                                            ))}
                                            {repaidPos.map((d, i) => (
                                              <tr key={`r-${i}`} className="border-t border-[#0D1421] bg-[#080E1A] opacity-40">
                                                <td className="py-2 px-3 w-6" />
                                                <td className="py-2 px-3 pl-11">
                                                  <p className="text-[11px] text-slate-500">{d.date}</p>
                                                  {d.notes && <p className="text-[10px] text-slate-600 max-w-xs">{d.notes}</p>}
                                                </td>
                                                <td className="py-2 px-3">
                                                  <span className="text-[10px] px-1 py-0.5 rounded bg-slate-500/10 text-slate-500">{d.instrument}</span>
                                                </td>
                                                <td className="py-2 px-3 text-[11px] text-slate-500 tabular-nums">{fmt(d.principal)}</td>
                                                <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">{fmt(d.principal)}</td>
                                                <td className="py-2 px-3 text-[11px] text-slate-600 tabular-nums">—</td>
                                                <td className="py-2 px-3 text-[11px] text-slate-600 tabular-nums">{rateLabel(d)}</td>
                                                <td className="py-2 px-3 text-[11px] text-slate-600 tabular-nums">—</td>
                                                <td className="py-2 px-3">
                                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-500 font-medium">Repaid</span>
                                                </td>
                                              </tr>
                                            ))}
                                          </>
                                        )}
                                      </>
                                    );
                                  })}
                                  <tr className="border-t border-[#1E2D3D] bg-[#080E1A]">
                                    <td /><td className="py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total / Wtd Avg</td>
                                    <td />
                                    <td className="py-2 px-3 text-xs text-slate-500 tabular-nums font-semibold">{fmt(allCreditPos.reduce((s, d) => s + d.principal, 0))}</td>
                                    <td className="py-2 px-3 text-xs text-slate-500 tabular-nums font-semibold">{fmt(allCreditPos.reduce((s, d) => s + (d.principal - d.currentValue), 0))}</td>
                                    <td className="py-2 px-3 text-xs text-slate-200 tabular-nums font-semibold">{fmt(totalOutstanding)}</td>
                                    <td className="py-2 px-3 text-xs text-indigo-400 tabular-nums font-semibold">{wtdRate !== null ? `${wtdRate.toFixed(1)}%` : "—"}</td>
                                    <td className="py-2 px-3 text-xs text-slate-300 tabular-nums font-semibold">{totalMonthly > 0 ? fmt(totalMonthly) : "—"}</td>
                                    <td />
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="px-5 py-8 text-center text-xs text-slate-600">No credit positions in portfolio.</div>
                          )
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* ══ 3. CONVERTIBLES ══════════════════════════════════════════════ */}
                <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
                  {(() => {
                    const allConvPos = companiesWithConvert.flatMap(c =>
                      (c.debtPositions ?? []).filter(d => CONVERT_INSTRUMENTS.includes(d.instrument))
                    );
                    const totalPrincipal = allConvPos.reduce((s, d) => s + d.principal, 0);
                    const totalCurrVal   = allConvPos.reduce((s, d) => s + d.currentValue, 0);
                    const ratedPositions = allConvPos.filter(d => d.interestRate !== undefined);
                    const wtdRate = ratedPositions.length > 0
                      ? ratedPositions.reduce((s, d) => s + d.principal * d.interestRate!, 0) / ratedPositions.reduce((s, d) => s + d.principal, 0)
                      : null;
                    return (
                      <>
                        <div className="border-b border-[#1E2D3D]">
                          <SectionHeader label="Convertibles" tableKey="convertibles" accent="#F59E0B" stats={[
                            { label: "Basis",         value: fmt(totalPrincipal), color: "#F59E0B" },
                            { label: "Wtd Yield",     value: wtdRate !== null ? `${wtdRate.toFixed(1)}%` : "—" },
                            { label: "Current Value", value: fmt(totalCurrVal) },
                            { label: "Accrued",       value: totalCurrVal > totalPrincipal ? `+${fmt(totalCurrVal - totalPrincipal)}` : "—", color: "#10B981" },
                          ]} />
                        </div>
                        {openInstrumentTables.has("convertibles") && (
                          companiesWithConvert.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                                  <tr>
                                    <TH></TH><TH wide>Company</TH><TH>Type</TH>
                                    <TH>Principal</TH><TH>Yield</TH><TH>Current Value</TH><TH>Accrued</TH>
                                  </tr>
                                </thead>
                                <tbody>
                                  {companiesWithConvert.map((c) => {
                                    const positions = (c.debtPositions ?? []).filter(d => CONVERT_INSTRUMENTS.includes(d.instrument));
                                    const principal = positions.reduce((s, d) => s + d.principal, 0);
                                    const currVal   = positions.reduce((s, d) => s + d.currentValue, 0);
                                    const accrued   = currVal - principal;
                                    const ratedPos  = positions.filter(d => d.interestRate !== undefined);
                                    const compRate  = ratedPos.length > 0
                                      ? ratedPos.reduce((s, d) => s + d.principal * d.interestRate!, 0) / ratedPos.reduce((s, d) => s + d.principal, 0)
                                      : null;
                                    const rowKey = `conv-${c.id}`;
                                    const isOpen = expandedRows.has(rowKey);
                                    const instrType = positions.length === 1 ? positions[0].instrument : `${positions.length} instruments`;
                                    return (
                                      <>
                                        <tr key={c.id} className="border-t border-[#111D2E] hover:bg-[#111D2E]/40 cursor-pointer" onClick={() => toggleRow(rowKey)}>
                                          <TD><ChevronDown size={12} className={`text-slate-600 transition-transform ${isOpen ? "rotate-180" : ""}`} /></TD>
                                          <TD>
                                            <div className="flex items-center gap-2">
                                              {companyLogo(c)}
                                              <div>
                                                <p className="font-semibold text-slate-200">{c.name}</p>
                                                <p className="text-[10px] text-slate-600">{positions.length} instrument{positions.length !== 1 ? "s" : ""}</p>
                                              </div>
                                            </div>
                                          </TD>
                                          <TD>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">{instrType}</span>
                                          </TD>
                                          <TD className="text-slate-300 tabular-nums font-medium">{fmt(principal)}</TD>
                                          <TD className="text-amber-400 tabular-nums">{compRate !== null ? `${compRate.toFixed(1)}%` : <span className="text-slate-500">—</span>}</TD>
                                          <TD className="text-slate-300 tabular-nums font-medium">{fmt(currVal)}</TD>
                                          <TD className={`tabular-nums ${accrued > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                                            {accrued > 0 ? `+${fmt(accrued)}` : "—"}
                                          </TD>
                                        </tr>
                                        {isOpen && positions.map((d, i) => (
                                          <tr key={i} className="border-t border-[#0D1421] bg-[#080E1A]">
                                            <td className="py-2 px-3 w-6" />
                                            <td className="py-2 px-3 pl-11">
                                              <p className="text-[11px] text-slate-500">{d.date}</p>
                                              {d.notes && <p className="text-[10px] text-slate-600 max-w-xs">{d.notes}</p>}
                                            </td>
                                            <td className="py-2 px-3">
                                              <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400">{d.instrument}</span>
                                            </td>
                                            <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">{fmt(d.principal)}</td>
                                            <td className="py-2 px-3 text-[11px] text-amber-400 tabular-nums">
                                              {d.interestRate !== undefined ? `${d.interestRate}%` : d.discountRate !== undefined ? `${d.discountRate}% disc.` : "—"}
                                            </td>
                                            <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">{fmt(d.currentValue)}</td>
                                            <td className="py-2 px-3 text-[11px] tabular-nums">
                                              {d.currentValue > d.principal
                                                ? <span className="text-emerald-400">+{fmt(d.currentValue - d.principal)}</span>
                                                : <span className="text-slate-600">—</span>}
                                            </td>
                                          </tr>
                                        ))}
                                      </>
                                    );
                                  })}
                                  <tr className="border-t border-[#1E2D3D] bg-[#080E1A]">
                                    <td /><td className="py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total / Wtd Avg</td>
                                    <td />
                                    <td className="py-2 px-3 text-xs text-slate-300 tabular-nums font-semibold">{fmt(totalPrincipal)}</td>
                                    <td className="py-2 px-3 text-xs text-amber-400 tabular-nums font-semibold">{wtdRate !== null ? `${wtdRate.toFixed(1)}%` : "—"}</td>
                                    <td className="py-2 px-3 text-xs text-slate-300 tabular-nums font-semibold">{fmt(totalCurrVal)}</td>
                                    <td className="py-2 px-3 text-xs text-emerald-400 tabular-nums font-semibold">
                                      {totalCurrVal > totalPrincipal ? `+${fmt(totalCurrVal - totalPrincipal)}` : "—"}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="px-5 py-8 text-center text-xs text-slate-600">No convertible positions in portfolio.</div>
                          )
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* ══ 4. OPTIONS & WARRANTS ═══════════════════════════════════════ */}
                <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
                  {(() => {
                    const optPps    = (c: typeof portfolio[0]) => c.totalShares ? effectiveImplied(c) / c.totalShares : 0;
                    type OptPos = NonNullable<typeof portfolio[0]["optionPositions"]>[0];
                    const intrinsic = (o: OptPos, pps: number) => o.shares * Math.max(pps - o.strikePrice, 0);
                    const timeVal   = (o: OptPos, pps: number) => o.shares * pps * ((optionVariances[o.id] ?? 0) / 100);

                    const allRows = companiesWithOptions.flatMap(c => (c.optionPositions ?? []).map(o => ({ o, c, pps: optPps(c) })));
                    const grandIntrinsic = allRows.reduce((s, { o, pps }) => s + intrinsic(o, pps), 0);
                    const grandTime      = allRows.reduce((s, { o, pps }) => s + timeVal(o, pps), 0);
                    const grandTotal     = grandIntrinsic + grandTime;
                    const grandBasis     = allRows.reduce((s, { o }) => s + (o.costBasis ?? 0), 0);
                    const grandMoic      = grandBasis > 0 ? grandTotal / grandBasis : null;
                    return (
                      <>
                        <div className="border-b border-[#1E2D3D]">
                          <SectionHeader label="Options & Warrants" tableKey="options" accent="#F43F5E" stats={[
                            { label: "Basis",           value: grandBasis > 0 ? fmt(grandBasis) : "—" },
                            { label: "Intrinsic Value", value: fmt(grandIntrinsic) },
                            { label: "Time Value",      value: fmt(grandTime),  color: "#F43F5E" },
                            { label: "Total Value",     value: fmt(grandTotal), color: "#F43F5E" },
                            { label: "MOIC",            value: grandMoic !== null ? `${grandMoic.toFixed(2)}×` : "—", color: grandMoic && grandMoic >= 1 ? "#10B981" : undefined },
                          ]} />
                        </div>
                        {openInstrumentTables.has("options") && (
                          companiesWithOptions.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                                  <tr>
                                    <TH></TH><TH wide>Company</TH><TH>Type</TH>
                                    <TH>Shares</TH><TH>Strike</TH><TH>Curr. PPS</TH>
                                    <TH>Basis</TH><TH>Intrinsic</TH><TH>Variance %</TH><TH>Time Value</TH><TH>Total Value</TH><TH>MOIC</TH><TH>Expiration</TH>
                                  </tr>
                                </thead>
                                <tbody>
                                  {allRows.map(({ o, c, pps }) => {
                                    const iv      = intrinsic(o, pps);
                                    const tv      = timeVal(o, pps);
                                    const tot     = iv + tv;
                                    const varPct  = optionVariances[o.id] ?? 0;
                                    const defVar  = o.defaultVariancePct ?? 0;
                                    const isCustom = varPct !== defVar;
                                    const isEditing = editingVarianceId === o.id;
                                    const rowKey = `opt-notes-${o.id}`;
                                    const isOpen = expandedRows.has(rowKey);
                                    return (
                                      <>
                                        <tr key={o.id} className="border-t border-[#111D2E] hover:bg-[#111D2E]/40 cursor-pointer" onClick={() => o.notes && toggleRow(rowKey)}>
                                          <TD><ChevronDown size={12} className={`transition-transform ${o.notes ? "text-slate-600" : "text-[#1E2D3D]"} ${isOpen ? "rotate-180" : ""}`} /></TD>
                                          <TD>
                                            <div className="flex items-center gap-2">
                                              {companyLogo(c)}
                                              <div>
                                                <p className="font-semibold text-slate-200">{c.name}</p>
                                              </div>
                                            </div>
                                          </TD>
                                          <TD>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-medium">{o.instrument}</span>
                                          </TD>
                                          <TD className="text-slate-300 tabular-nums font-medium">{(o.shares / 1_000_000).toFixed(1)}M</TD>
                                          <TD className="text-rose-400 tabular-nums">${o.strikePrice.toFixed(4)}</TD>
                                          <TD className="text-slate-400 tabular-nums">{pps > 0 ? `$${pps.toFixed(4)}` : "—"}</TD>
                                          <TD className="text-slate-500 tabular-nums">{o.costBasis ? fmt(o.costBasis) : "—"}</TD>
                                          <TD className={`tabular-nums font-medium ${iv > 0 ? "text-emerald-400" : "text-slate-600"}`}>{iv > 0 ? fmt(iv) : "—"}</TD>
                                          <td className="py-2 px-3" onClick={e => e.stopPropagation()}>
                                            {isEditing ? (
                                              <div className="flex items-center gap-1">
                                                <input
                                                  autoFocus
                                                  type="number" min={0} max={500}
                                                  defaultValue={varPct}
                                                  onBlur={e  => { setOptionVariances(p => ({ ...p, [o.id]: Math.max(0, Number(e.target.value)) })); setEditingVarianceId(null); }}
                                                  onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur(); }}
                                                  className="w-14 bg-[#111D2E] border border-rose-500/50 rounded px-1.5 py-0.5 text-[11px] text-slate-200 tabular-nums text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <span className="text-[10px] text-slate-600">%</span>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-1.5">
                                                {isCustom ? (
                                                  <div className="flex flex-col gap-0.5">
                                                    <span className="text-slate-600 line-through leading-tight">{defVar}%</span>
                                                    <span className="text-rose-400 font-semibold leading-tight">{varPct}%</span>
                                                  </div>
                                                ) : (
                                                  <span className="text-slate-300 tabular-nums">{varPct}%</span>
                                                )}
                                                <button
                                                  onClick={e => { e.stopPropagation(); setEditingVarianceId(o.id); }}
                                                  className={`p-0.5 rounded hover:bg-white/10 transition-colors ${isCustom ? "text-rose-600 hover:text-rose-300" : "text-slate-500 hover:text-slate-300"}`}
                                                  title="Edit variance %"
                                                >
                                                  <Pencil size={10} />
                                                </button>
                                              </div>
                                            )}
                                          </td>
                                          <TD className="text-rose-400 tabular-nums font-medium">{tv > 0 ? fmt(tv) : "—"}</TD>
                                          <TD className="text-slate-200 tabular-nums font-semibold">{tot > 0 ? fmt(tot) : "—"}</TD>
                                          <TD className="tabular-nums">{(() => { const m = o.costBasis && tot > 0 ? tot / o.costBasis : null; return m ? <span style={{ color: m >= 1 ? "#10B981" : "#EF4444" }}>{m.toFixed(2)}×</span> : <span className="text-slate-600">—</span>; })()}</TD>
                                          <TD className="text-slate-500">{o.expirationDate ?? <span className="text-emerald-500/60 text-[10px]">No expiry</span>}</TD>
                                        </tr>
                                        {isOpen && o.notes && (
                                          <tr className="border-t border-[#0D1421] bg-[#080E1A]">
                                            <td />
                                            <td colSpan={10} className="py-2 px-3 pl-11">
                                              <p className="text-[10px] text-slate-500 max-w-lg">{o.notes}</p>
                                            </td>
                                          </tr>
                                        )}
                                      </>
                                    );
                                  })}
                                  <tr className="border-t border-[#1E2D3D] bg-[#080E1A]">
                                    <td /><td className="py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total</td>
                                    <td /><td /><td /><td />
                                    <td className="py-2 px-3 text-xs text-slate-500 tabular-nums font-semibold">{grandBasis > 0 ? fmt(grandBasis) : "—"}</td>
                                    <td className="py-2 px-3 text-xs tabular-nums font-semibold text-emerald-400">{grandIntrinsic > 0 ? fmt(grandIntrinsic) : "—"}</td>
                                    <td />
                                    <td className="py-2 px-3 text-xs text-rose-400 tabular-nums font-semibold">{grandTime > 0 ? fmt(grandTime) : "—"}</td>
                                    <td className="py-2 px-3 text-xs text-slate-200 tabular-nums font-semibold">{grandTotal > 0 ? fmt(grandTotal) : "—"}</td>
                                    <td className="py-2 px-3 text-xs tabular-nums font-semibold">{grandMoic !== null ? <span style={{ color: grandMoic >= 1 ? "#10B981" : "#EF4444" }}>{grandMoic.toFixed(2)}×</span> : "—"}</td>
                                    <td />
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="px-5 py-8 text-center text-xs text-slate-600">No option or warrant positions in portfolio.</div>
                          )
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* ══ 5. CASH & EQUIVALENTS ════════════════════════════════════════ */}
                <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
                  {(() => {
                    const totalCash = cashPositions.reduce((s, p) => s + p.balance, 0);
                    return (
                      <>
                        <div className="border-b border-[#1E2D3D]">
                          <SectionHeader label="Cash & Equivalents" tableKey="cash" accent="#06B6D4" stats={[
                            { label: "Total Balance", value: totalCash > 0 ? fmt(totalCash) : "—", color: "#06B6D4" },
                            { label: "Positions",     value: String(cashPositions.length) },
                          ]} />
                        </div>
                        {openInstrumentTables.has("cash") && (
                          cashPositions.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                                  <tr>
                                    <TH wide>Account</TH><TH>Institution</TH><TH>Type</TH>
                                    <TH>Balance</TH><TH>Yield</TH><TH>As Of</TH>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cashPositions.map(p => (
                                    <tr key={p.id} className="border-t border-[#111D2E] hover:bg-[#111D2E]/40">
                                      <TD>
                                        <div>
                                          <p className="font-semibold text-slate-200">{p.name}</p>
                                          {p.notes && <p className="text-[10px] text-slate-600 mt-0.5">{p.notes}</p>}
                                        </div>
                                      </TD>
                                      <TD className="text-slate-400">{p.institution}</TD>
                                      <TD className="text-slate-400">{p.type}</TD>
                                      <TD className="tabular-nums font-medium text-cyan-400">{fmt(p.balance)}</TD>
                                      <TD className="tabular-nums text-slate-400">{p.yieldPct != null ? `${p.yieldPct.toFixed(2)}%` : "—"}</TD>
                                      <TD className="text-slate-500">{p.asOf ?? "—"}</TD>
                                    </tr>
                                  ))}
                                  <tr className="border-t border-[#1E2D3D] bg-[#080E1A]">
                                    <td className="py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total</td>
                                    <td /><td /><td className="py-2 px-3 text-xs text-cyan-400 tabular-nums font-semibold">{fmt(totalCash)}</td>
                                    <td /><td />
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="px-5 py-8 text-center">
                              <p className="text-xs text-slate-600 italic">No cash positions on record — add accounts to <code className="font-mono text-[10px]">lib/data.ts → cashPositions</code></p>
                            </div>
                          )
                        )}
                      </>
                    );
                  })()}
                </div>

              </div>
              );
            })()}

            {/* Thesis */}
            <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-6 flex flex-col justify-between gap-5">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-[#1E2D3D] flex items-center justify-center shrink-0 p-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/1691979830329-NJ5W8U6WT1N0F60PRNXV/Nth.png"
                      alt="nth" className="w-full h-full object-contain" style={{ filter: "brightness(0) invert(1)" }} />
                  </div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">Investment Thesis</p>
                </div>
                <ul className="space-y-3 mb-4">
                  {[
                    "Invest for the long-term",
                    "Minimize fees",
                    "Ensure proper – but not excessive – diversification",
                    "In straightforward businesses",
                    "With passionate, effective and high-integrity managers",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500" />
                      <span className="text-sm text-slate-200">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#1E2D3D]">
                <span className="text-xs text-slate-600">Corpus Christi, TX · Founded 2021 · Venture Studio</span>
                <a
                  href="https://sawhook.substack.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1.5 text-xs font-medium text-orange-400 hover:text-orange-300 border border-orange-500/20 hover:border-orange-500/40 bg-orange-500/5 hover:bg-orange-500/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" aria-hidden="true">
                    <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/>
                  </svg>
                  sawhook.substack.com
                </a>
              </div>
            </div>
          </div>
        )}

        {!activeCompany && activeTab === "proposal" && (() => {
          // ── Proposal scenario shadowing ──────────────────────────────────────
          const portfolio = basePortfolio.map(c => {
            if (c.id === "audily") {
              return { ...c, debtPositions: [...(c.debtPositions ?? []), PROPOSAL_AUDILY_PREFERRED] };
            }
            if (c.id === "nueces-brewing") {
              return {
                ...c,
                invested: 200_000,
                currentValue: 200_000,
                debtPositions: [...(c.debtPositions ?? []), PROPOSAL_NUECES_PREFERRED],
              };
            }
            return c;
          });
          const LP_TOTAL_UNITS = BASE_LP_TOTAL_UNITS + PROPOSAL_LP_BASIS_ADD;
          const FUND_LEVERAGE  = BASE_FUND_LEVERAGE  + PROPOSAL_LEVERAGE_ADD;
          const fund = { ...baseFund, calledCapital: baseFund.calledCapital + PROPOSAL_LP_BASIS_ADD };
          return (
          <div className="space-y-8">
            {/* ── Overview Hero ── */}
            {(() => {
              // ── LP multiplier — compute first so displayItems can use it ────────────
              const lpCurrent    = parseFloat(lpCurrentUnits) || 0;
              const lpCurrentPct = lpCurrent > 0 ? lpCurrent / LP_TOTAL_UNITS : 0;
              // Hypothetical additional units — expands denominator (dilutive)
              const lpHypo      = parseFloat(lpHypotheticalUnits) || 0;
              const lpHypoTotal = lpCurrent + lpHypo;
              const lpHypoDenom = LP_TOTAL_UNITS + lpHypo;               // new total outstanding
              const lpHypoPct   = lpHypoTotal > 0 ? lpHypoTotal / lpHypoDenom : 0;
              // Active pct: prefer hypo-adjusted when hypothetical units are set
              const activePct    = lpViewMode === "current" && lpCurrentPct > 0
                ? (lpHypo > 0 ? lpHypoPct : lpCurrentPct)
                : 1;
              const lpMultiplier = activePct;
              const isLpView     = lpMultiplier < 1;

              // ── Donut: total exposure per company (equity + debt + options) + managed ─
              const donutItems = [
                ...portfolio
                  .filter(c => c.status === "active")
                  .map(c => {
                    const pps = c.totalShares ? effectiveImplied(c) / c.totalShares : 0;
                    const sh  = (c.shareTransactions ?? []).filter(t => t.type === "Common")
                                  .reduce((s, t) => s + (t.shares ?? 0), 0);
                    const equityVal = pps > 0 && sh > 0 ? sh * pps : effectiveCurrVal(c);
                    const debtVal   = (c.debtPositions  ?? []).reduce((s, d) => s + d.currentValue, 0);
                    const optionVal = (c.optionPositions ?? []).reduce((s, o) => {
                      const intrinsic = o.shares * Math.max(pps - o.strikePrice, 0);
                      const timeVal   = o.shares * pps * ((optionVariances[o.id] ?? 0) / 100);
                      return s + intrinsic + timeVal;
                    }, 0);
                    return { label: c.name, value: equityVal + debtVal + optionVal, color: c.accentColor, id: c.id };
                  })
                  .filter(d => d.value > 0),
              ];
              const baseDonutTotal = donutItems.reduce((s, d) => s + d.value, 0);
              const grossTotal  = baseDonutTotal + lpHypo;          // includes hypothetical cash
              const netTotal    = grossTotal - FUND_LEVERAGE;
              // MOIC denominator expands when hypothetical units are outstanding
              const moicDenom   = lpHypoDenom;
              // Scaled display values — apply LP view multiplier to all dollar amounts
              const displayItems = [
                ...donutItems.map(d => ({ ...d, value: d.value * lpMultiplier })),
                ...(lpHypo > 0 ? [{ label: "To Deploy", value: lpHypo * lpMultiplier, color: "#94A3B8", id: "to-deploy" }] : []),
              ];
              const displayItemsTotal = displayItems.reduce((s, d) => s + d.value, 0);
              const displayTotal     = netTotal * lpMultiplier;

              // Build SVG donut arcs
              const cx = 80; const cy = 80; const R = 62; const r = 40;
              let angle = -Math.PI / 2;
              const arcs = displayItems.map(d => {
                const sweep = (d.value / displayItemsTotal) * 2 * Math.PI;
                const x1 = cx + R * Math.cos(angle); const y1 = cy + R * Math.sin(angle);
                angle += sweep;
                const x2 = cx + R * Math.cos(angle); const y2 = cy + R * Math.sin(angle);
                const ix1 = cx + r * Math.cos(angle - sweep); const iy1 = cy + r * Math.sin(angle - sweep);
                const ix2 = cx + r * Math.cos(angle); const iy2 = cy + r * Math.sin(angle);
                const large = sweep > Math.PI ? 1 : 0;
                return { ...d, path: `M${x1},${y1} A${R},${R},0,${large},1,${x2},${y2} L${ix2},${iy2} A${r},${r},0,${large},0,${ix1},${iy1} Z` };
              });


              // ── Allocation by security type ────────────────────────────────────
              const ALLOC_CREDIT_INSTR = ["Term Loan", "Line of Credit", "Revenue Based Financing"];
              let equityBasis = 0, creditBasis = 0, convertBasis = 0;
              for (const c of portfolio) {
                if (c.status === "active") {
                  const eqPps = c.totalShares ? effectiveImplied(c) / c.totalShares : 0;
                  const eqSh  = (c.shareTransactions ?? []).filter(t => t.type === "Common" || t.type === "Preferred").reduce((s, t) => s + (t.shares ?? 0), 0);
                  equityBasis += eqPps > 0 && eqSh > 0 ? eqSh * eqPps : effectiveCurrVal(c);
                }
                for (const d of (c.debtPositions ?? [])) {
                  if (d.status === "Repaid") continue;
                  if (ALLOC_CREDIT_INSTR.includes(d.instrument)) creditBasis += d.currentValue;
                  else convertBasis += d.currentValue;
                }
              }
              // Option total value: intrinsic + time value (variance-weighted)
              const optionsBasis = portfolio.reduce((sum, c) => {
                const pps = c.totalShares ? effectiveImplied(c) / c.totalShares : 0;
                return sum + (c.optionPositions ?? []).reduce((s, o) => {
                  const intrinsic = o.shares * Math.max(pps - o.strikePrice, 0);
                  const timeVal   = o.shares * pps * ((optionVariances[o.id] ?? 0) / 100);
                  return s + intrinsic + timeVal;
                }, 0);
              }, 0);
              const cashBasis   = cashPositions.reduce((s, cp) => s + cp.balance, 0) + lpHypo;
              const allocTotal  = equityBasis + creditBasis + convertBasis + optionsBasis + cashBasis;
              const allocTypes = [
                { label: "Equity",       amount: equityBasis,  color: "#10B981", pct: allocTotal > 0 ? equityBasis  / allocTotal : 0 },
                { label: "Credit",       amount: creditBasis,  color: "#6366F1", pct: allocTotal > 0 ? creditBasis  / allocTotal : 0 },
                { label: "Convertibles", amount: convertBasis, color: "#F59E0B", pct: allocTotal > 0 ? convertBasis / allocTotal : 0 },
                { label: "Options",      amount: optionsBasis, color: "#F43F5E", pct: allocTotal > 0 ? optionsBasis / allocTotal : 0 },
                { label: "Cash",         amount: cashBasis,    color: "#60A5FA", pct: allocTotal > 0 ? cashBasis    / allocTotal : 0 },
              ];
              // Total positions count across all instrument types
              const totalPositions =
                portfolio.filter(c => c.status === "active" && (c.shareTransactions ?? []).some(t => t.type === "Common")).length +
                portfolio.reduce((s, c) => s + (c.debtPositions ?? []).length, 0) +
                portfolio.reduce((s, c) => s + (c.optionPositions ?? []).length, 0);

              return (
              <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
                {/* ── Metrics strip ── */}
                {/* Metrics strip */}
                <div className={`grid grid-cols-2 sm:grid-cols-4 border-b border-[#1E2D3D] ${isLpView ? "bg-[#080E1A]" : ""}`}>
                  {/* Portfolio NAV Est. */}
                  <div className="px-3 py-3 sm:px-4 sm:py-3.5 border-r border-[#1E2D3D]">
                    <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium leading-tight">Portfolio NAV Est.</p>
                    <p className="text-sm font-bold mt-1 tabular-nums" style={{ color: "#10B981" }}>{fmt(displayTotal)}</p>
                    <p className="text-[9px] text-slate-600 tabular-nums mt-0.5">assets {fmt(grossTotal * lpMultiplier)}</p>
                    <p className="text-[9px] text-slate-600 tabular-nums">lev. -{fmt(FUND_LEVERAGE * lpMultiplier)}</p>
                    {isLpView && <p className="text-[9px] text-slate-500 tabular-nums">fund {fmt(netTotal)}</p>}
                  </div>
                  {/* LP Basis — fraction prominent in My Share mode */}
                  <div className="px-3 py-3 sm:px-4 sm:py-3.5 border-r border-[#1E2D3D]">
                    <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium leading-tight">{isLpView ? "My LP Basis" : "LP Basis"}</p>
                    <p className="text-sm font-bold mt-1 tabular-nums text-slate-200">{isLpView ? fmt(lpHypoTotal) : fmt(lpHypoDenom)}</p>
                    {isLpView && (
                      <>
                        <p className="text-base font-bold tabular-nums mt-0.5" style={{ color: "#34D399" }}>{(lpHypoPct * 100).toFixed(2)}%</p>
                        <p className="text-[9px] tabular-nums mt-0.5" style={{ color: "#6EE7B7" }}>
                          {lpHypoTotal.toLocaleString()} / {lpHypoDenom.toLocaleString()}
                        </p>
                      </>
                    )}
                  </div>
                  {/* MOIC */}
                  <div className="px-3 py-3 sm:px-4 sm:py-3.5 border-r border-[#1E2D3D]">
                    <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium leading-tight">MOIC</p>
                    <p className="text-sm font-bold mt-1 tabular-nums" style={{ color: netTotal >= moicDenom ? "#10B981" : "#F87171" }}>
                      {moicDenom > 0 ? `${(netTotal / moicDenom).toFixed(2)}×` : "—"}
                    </p>
                  </div>
                  {/* Active Co's & Positions — combined */}
                  <div className="px-3 py-3 sm:px-4 sm:py-3.5">
                    <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium leading-tight">Portfolio</p>
                    <p className="text-sm font-bold mt-1 tabular-nums text-slate-200">
                      {portfolio.filter(c => c.status === "active").length} <span className="text-xs font-normal text-slate-500">co's</span>
                    </p>
                    <p className="text-[9px] text-slate-600 tabular-nums mt-0.5">{totalPositions} positions</p>
                  </div>
                </div>

                {/* ── LP Unit Calculator ── */}
                <div className="border-b border-[#1E2D3D] px-4 sm:px-5 py-3 bg-[#080E1A]">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium shrink-0">LP View</p>

                    {/* View mode pills */}
                    <div className="flex items-center gap-1">
                      {([["fund","Fund Total"],["current","My Share"]] as const).map(([mode, label]) => (
                        <button
                          key={mode}
                          onClick={() => setLpViewMode(mode)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                            lpViewMode === mode
                              ? mode === "fund" ? "bg-slate-700 text-slate-200"
                                : "bg-emerald-600/30 text-emerald-400 ring-1 ring-emerald-500/40"
                              : "bg-[#111D2E] text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Units input — hidden in Fund Total mode */}
                    {lpViewMode === "current" && (
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-slate-500 whitespace-nowrap">My units</label>
                      <input
                        type="number" min={0} placeholder="e.g. 100000"
                        value={lpCurrentUnits}
                        onChange={e => { setLpCurrentUnits(e.target.value); if (parseFloat(e.target.value) > 0) setLpViewMode("current"); }}
                        className="w-28 bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-2 py-1 text-xs text-slate-200 tabular-nums focus:outline-none focus:border-slate-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    )}

                    {/* Add exposure — always shown; adds cash to fund assets */}
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-slate-500 whitespace-nowrap">+ add exposure</label>
                      <input
                        type="number" min={0} placeholder="units"
                        value={lpHypotheticalUnits}
                        onChange={e => setLpHypotheticalUnits(e.target.value)}
                        className="w-24 bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-2 py-1 text-xs text-slate-200 tabular-nums focus:outline-none focus:border-slate-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    <span className="text-[10px] text-slate-600 hidden md:inline">
                      {lpHypo > 0 ? lpHypoDenom.toLocaleString() : LP_TOTAL_UNITS.toLocaleString()} units outstanding · $1.00/unit
                    </span>
                  </div>
                </div>

                {/* ── Three charts ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[#1E2D3D]">

                  {/* ① Company allocation donut */}
                  <div className="p-5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-3">By Company</p>
                    <div className="flex justify-center mb-3">
                      <svg width="140" height="140" viewBox="0 0 160 160" className="shrink-0">
                        {arcs.map((a, i) => (
                          <path
                            key={i}
                            d={a.path}
                            fill={a.color}
                            opacity={0.85}
                            className="cursor-pointer hover:opacity-100 transition-opacity"
                            onClick={() => { if (a.id !== "to-deploy" && a.id !== "cash") setActiveCompanyId(a.id); }}
                          >
                            <title>{a.label}: {fmt(a.value)}</title>
                          </path>
                        ))}
                        <text x="80" y="76" textAnchor="middle" style={{ fontSize: 12, fontWeight: 700, fill: "#e2e8f0" }}>{fmt(displayTotal)}</text>
                        <text x="80" y="91" textAnchor="middle" style={{ fontSize: 9, fill: "#64748b" }}>{isLpView ? "my share" : "total value"}</text>
                      </svg>
                    </div>
                    <div className="flex flex-col gap-1">
                      {displayItems.map(d => (
                        <button
                          key={d.id}
                          onClick={() => { if (d.id !== "to-deploy" && d.id !== "cash") setActiveCompanyId(d.id); }}
                          className="grid items-center gap-x-2 group text-left w-full"
                          style={{ gridTemplateColumns: "8px 1fr 32px 44px" }}
                        >
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                          <span className="text-[11px] text-slate-400 group-hover:text-slate-200 transition-colors">{d.label}</span>
                          <span className="text-[10px] text-slate-600 tabular-nums text-right">{displayItemsTotal > 0 ? `${((d.value / displayItemsTotal) * 100).toFixed(1)}%` : "—"}</span>
                          <span className="text-[11px] text-slate-500 tabular-nums text-right">{fmt(d.value)}</span>
                        </button>
                      ))}
                    </div>
                  </div>


                  {/* ② Assets by type */}
                  <div className="p-5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-4">Assets</p>
                    <div className="space-y-3">
                      {allocTypes.map(t => (
                        <div key={t.label}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                              <span className="text-xs text-slate-300 font-medium">{t.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs tabular-nums text-slate-400">{fmt(t.amount * lpMultiplier)}</span>
                              <span className="text-[10px] tabular-nums text-slate-600 w-8 text-right">{(t.pct * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-[#111D2E] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${(t.pct * 100).toFixed(1)}%`, background: t.color, opacity: 0.8 }} />
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-[#1E2D3D] flex items-center justify-between">
                        <span className="text-[10px] text-slate-600 uppercase tracking-wider">Total{isLpView ? " (My Share)" : " Deployed"}</span>
                        <span className="text-xs font-semibold text-slate-300 tabular-nums">{fmt(allocTotal * lpMultiplier)}</span>
                      </div>
                    </div>
                  </div>

                  {/* ③ Fund Structure — vertical column chart */}
                  <div className="p-5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-3">Fund Structure</p>
                    {(() => {
                      // ── Top: fund-total vertical bars (always, never LP-scaled) ──
                      const fundCols = [
                        { label: "Assets",   val: grossTotal,    color: "#10B981" },
                        { label: "Leverage", val: FUND_LEVERAGE, color: "#F87171" },
                        { label: "NAV",      val: netTotal,      color: "#38BDF8" },
                        { label: "LP Basis", val: lpHypoDenom,   color: "#8B5CF6" },
                      ];
                      const maxVal = Math.max(...fundCols.map(c => c.val), 1);
                      const W3 = 280; const H3 = 120;
                      const PAD3 = { t: 16, r: 6, b: 24, l: 6 };
                      const cW3 = W3 - PAD3.l - PAD3.r;
                      const cH3 = H3 - PAD3.t - PAD3.b;
                      const n3 = fundCols.length;
                      const gap3 = 10;
                      const bW3 = (cW3 - gap3 * (n3 - 1)) / n3;
                      const fmtS = (v: number) => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${Math.round(v)}`;

                      // ── Bottom: My Share line gauges (only in LP view) ──
                      // Gauges use the same maxVal scale as the bars above so widths are proportional
                      const myRows = isLpView ? [
                        { label: "My Basis", val: lpHypoTotal,  color: "#A78BFA" },
                        { label: "My NAV",   val: displayTotal, color: "#34D399" },
                      ] : [];

                      return (
                        <div>
                          {/* Vertical bar chart — fund totals */}
                          <svg width="100%" viewBox={`0 0 ${W3} ${H3}`} preserveAspectRatio="xMidYMid meet">
                            {fundCols.map((c, i) => {
                              const x  = PAD3.l + i * (bW3 + gap3);
                              const bh = (c.val / maxVal) * cH3;
                              const y  = PAD3.t + cH3 - bh;
                              return (
                                <g key={c.label}>
                                  <rect x={x} y={y} width={bW3} height={bh} fill={c.color} opacity="0.75" rx="2" />
                                  <text x={x + bW3 / 2} y={y - 3} textAnchor="middle" style={{ fontSize: 7, fill: c.color, fontWeight: 600 }}>{fmtS(c.val)}</text>
                                  <text x={x + bW3 / 2} y={H3 - 4} textAnchor="middle" style={{ fontSize: 7, fill: "#64748B" }}>{c.label}</text>
                                </g>
                              );
                            })}
                          </svg>

                          {/* Line gauges — My Share (only when isLpView) */}
                          {myRows.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-[#1E2D3D] space-y-3">
                              <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium mb-2">My Share</p>
                              {myRows.map(row => {
                                const pct = Math.min(row.val / maxVal, 1);
                                return (
                                  <div key={row.label}>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-[9px] text-slate-500">{row.label}</span>
                                      <span className="text-[9px] tabular-nums font-semibold" style={{ color: row.color }}>{fmtS(row.val)}</span>
                                    </div>
                                    {/* Gauge line — same scale as top bars */}
                                    <div className="relative">
                                      <svg width="100%" viewBox="0 0 280 14" preserveAspectRatio="none">
                                        {/* Track */}
                                        <rect x="0" y="5" width="280" height="2" fill="#1E2D3D" rx="1" />
                                        {/* Fill */}
                                        <rect x="0" y="5" width={280 * pct} height="2" fill={row.color} opacity="0.7" rx="1" />
                                        {/* Start tick */}
                                        <line x1="0" y1="3" x2="0" y2="9" stroke="#1E2D3D" strokeWidth="1.5" />
                                        {/* End tick */}
                                        <line x1="280" y1="3" x2="280" y2="9" stroke="#1E2D3D" strokeWidth="1.5" />
                                        {/* Marker dot */}
                                        <circle cx={280 * pct} cy="6" r="4" fill={row.color} />
                                        <circle cx={280 * pct} cy="6" r="2" fill="#0D1421" />
                                        {/* End label — shared scale max */}
                                        <text x="280" y="14" textAnchor="end" style={{ fontSize: 6, fill: "#475569" }}>{fmtS(maxVal)}</text>
                                      </svg>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                </div>
              </div>
              );
            })()}

            {/* Portfolio at a Glance */}
            {(() => {
              const fmtPrice = (n: number) => `$${n.toFixed(3)}`;

              // Helpers
              const companyLogo = (c: typeof portfolio[0], size = "w-6 h-6") => c.logoUrl ? (
                <div className={`${size} rounded overflow-hidden bg-white flex items-center justify-center p-0.5 shrink-0`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.logoUrl} alt={c.name} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className={`${size} rounded font-bold flex items-center justify-center shrink-0 text-[10px]`}
                  style={{ background: `${c.accentColor}18`, color: c.accentColor }}>
                  {c.initials[0]}
                </div>
              );

              const TH = ({ children, wide }: { children?: React.ReactNode; wide?: boolean }) => (
                <th className={`py-2 px-3 text-left text-[10px] text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap${wide ? " min-w-[180px]" : ""}`}>{children}</th>
              );
              const TD = ({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
                <td className={`py-2.5 px-3 text-xs ${className}`} style={style}>{children}</td>
              );

              const SectionHeader = ({ label, tableKey, accent, stats }: {
                label: string; tableKey: string; accent: string;
                stats: { label: string; value: string; color?: string }[];
              }) => (
                <button
                  onClick={() => toggleTable(tableKey)}
                  className="w-full hover:bg-[#111D2E]/60 transition-colors"
                >
                  {/* Mobile: stacked label + grid of stats */}
                  <div className="sm:hidden">
                    <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
                        <span className="text-sm font-semibold text-slate-200">{label}</span>
                      </div>
                      <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${openInstrumentTables.has(tableKey) ? "rotate-180" : ""}`} />
                    </div>
                    <div className="grid grid-cols-4 border-t border-[#1E2D3D] divide-x divide-[#1E2D3D]">
                      {stats.map(s => (
                        <div key={s.label} className="flex flex-col justify-center px-2 py-2.5 min-w-0">
                          <p className="text-[8px] text-slate-600 uppercase tracking-widest font-medium leading-tight">{s.label}</p>
                          <p className="text-xs font-bold mt-0.5 tabular-nums" style={{ color: s.color ?? "#e2e8f0" }}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Desktop: original horizontal layout */}
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
                      <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${openInstrumentTables.has(tableKey) ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </button>
              );

              // ── Group transactions by company ──────────────────────────────────
              const CREDIT_INSTRUMENTS  = ["Term Loan", "Line of Credit", "Revenue Based Financing"];
              const CONVERT_INSTRUMENTS = ["SAFE", "Convertible Note", "Preferred"];
              const companiesWithCommon   = portfolio.filter(c => (c.shareTransactions ?? []).some(t => t.type === "Common"));
              const companiesWithCredit   = portfolio.filter(c => (c.debtPositions ?? []).some(d => CREDIT_INSTRUMENTS.includes(d.instrument)));
              const companiesWithConvert  = portfolio.filter(c => (c.debtPositions ?? []).some(d => CONVERT_INSTRUMENTS.includes(d.instrument)));
              const companiesWithOptions  = portfolio.filter(c => (c.optionPositions ?? []).length > 0);

              return (
              <div className="space-y-3">

                {/* ══ 1. EQUITY (Common Stock) ══════════════════════════════════════ */}
                <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
                  {(() => {
                    const totalCost = companiesWithCommon.reduce((s, c) => s + (c.shareTransactions ?? []).filter(t => t.type === "Common").reduce((a, t) => a + t.amount, 0), 0);
                    const estValue  = companiesWithCommon.reduce((s, c) => {
                      const txns = (c.shareTransactions ?? []).filter(t => t.type === "Common");
                      const sh = txns.reduce((a, t) => a + (t.shares ?? 0), 0);
                      const pps = c.totalShares ? effectiveImplied(c) / c.totalShares : null;
                      return s + (pps !== null ? sh * pps : 0);
                    }, 0);
                    const moic = totalCost > 0 && estValue > 0 ? estValue / totalCost : null;
                    return (
                      <>
                        <div className="border-b border-[#1E2D3D]">
                          <SectionHeader label="Equity" tableKey="common" accent="#10B981" stats={[
                            { label: "Cost Basis",     value: totalCost > 0 ? fmt(totalCost) : "—" },
                            { label: "Est. Value",     value: fmt(estValue), color: "#10B981" },
                            { label: "MOIC",           value: moic !== null ? `${moic.toFixed(2)}×` : "—", color: moic && moic >= 1 ? "#10B981" : undefined },
                          ]} />
                        </div>
                        {openInstrumentTables.has("common") && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                                <tr>
                                  <TH></TH><TH wide>Company</TH><TH>Shares</TH><TH>Cost Basis</TH>
                                  <TH>Share Price</TH><TH>Est. Value</TH><TH>MOIC</TH>
                                  <TH>% FD</TH><TH>Voting %</TH><TH></TH>
                                </tr>
                              </thead>
                              <tbody>
                                {companiesWithCommon.map((c) => {
                                  const txns = (c.shareTransactions ?? []).filter(t => t.type === "Common");
                                  const sh = txns.reduce((s, t) => s + (t.shares ?? 0), 0);
                                  const cost = txns.reduce((s, t) => s + t.amount, 0);
                                  const valPerSh = c.totalShares ? effectiveImplied(c) / c.totalShares : null;
                                  const currVal = valPerSh !== null ? sh * valPerSh : null;
                                  const cMoic = cost > 0 && currVal !== null ? currVal / cost : null;
                                  const rowKey = `common-${c.id}`;
                                  const isOpen = expandedRows.has(rowKey);
                                  return (
                                    <>
                                      <tr key={c.id} className="border-t border-[#111D2E] hover:bg-[#111D2E]/40 cursor-pointer" onClick={() => toggleRow(rowKey)}>
                                        <TD><ChevronDown size={12} className={`text-slate-600 transition-transform ${isOpen ? "rotate-180" : ""}`} /></TD>
                                        <TD>
                                          <div className="flex items-center gap-2">
                                            {companyLogo(c)}
                                            <div>
                                              <p className="font-semibold text-slate-200">{c.name}</p>
                                            </div>
                                          </div>
                                        </TD>
                                        <TD className="tabular-nums text-slate-400">{sh > 0 ? sh.toLocaleString() : "—"}</TD>
                                        <TD className="text-slate-300 tabular-nums">{cost > 0 ? fmt(cost) : <span className="text-slate-600">—</span>}</TD>
                                        <TD className="tabular-nums">
                                          {(() => {
                                            const defaultPps = c.totalShares ? defaultImplied(c) / c.totalShares : null;
                                            const customPps  = userValuations[c.id] !== undefined && c.totalShares ? userValuations[c.id] / c.totalShares : null;
                                            if (customPps !== null && defaultPps !== null) {
                                              return (
                                                <div className="flex items-start gap-1.5">
                                                  <div className="flex flex-col gap-0.5">
                                                    <span className="text-slate-600 line-through leading-tight">${defaultPps.toFixed(4)}</span>
                                                    <span className="text-emerald-400 font-semibold leading-tight">${customPps.toFixed(4)}</span>
                                                  </div>
                                                  <button
                                                    onClick={(e) => { e.stopPropagation(); setValuationModal({ company: c, pendingVal: effectiveImplied(c) }); }}
                                                    className="p-0.5 mt-0.5 rounded hover:bg-white/10 text-emerald-600 hover:text-emerald-300 transition-colors"
                                                    title="Edit share price / valuation"
                                                  >
                                                    <Pencil size={10} />
                                                  </button>
                                                </div>
                                              );
                                            }
                                            return (
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-slate-300">{defaultPps !== null ? `$${defaultPps.toFixed(4)}` : "—"}</span>
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); setValuationModal({ company: c, pendingVal: effectiveImplied(c) }); }}
                                                  className="p-0.5 rounded hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
                                                  title="Edit share price / valuation"
                                                >
                                                  <Pencil size={10} />
                                                </button>
                                              </div>
                                            );
                                          })()}
                                        </TD>
                                        <TD className="tabular-nums font-medium" style={{ color: c.accentColor }}>
                                          {currVal !== null ? fmt(currVal) : "—"}
                                        </TD>
                                        <TD className={`tabular-nums font-medium ${cMoic !== null && cMoic >= 1 ? "text-emerald-400" : "text-slate-600"}`}>
                                          {cMoic !== null ? `${cMoic.toFixed(2)}×` : "—"}
                                        </TD>
                                        <TD className="tabular-nums text-slate-400">
                                          {c.totalShares && sh > 0 ? `${((sh / c.totalShares) * 100).toFixed(1)}%` : "—"}
                                        </TD>
                                        <TD className="tabular-nums text-slate-400">
                                          {c.votingOwnership !== undefined ? `${c.votingOwnership.toFixed(1)}%` : "—"}
                                        </TD>
                                        <TD>
                                          {userValuations[c.id] !== undefined && (
                                            <button
                                              onClick={(e) => { e.stopPropagation(); setUserValuations(prev => { const n = { ...prev }; delete n[c.id]; return n; }); }}
                                              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors whitespace-nowrap"
                                              title="Reset to default valuation"
                                            >
                                              <RotateCcw size={9} /> Reset
                                            </button>
                                          )}
                                        </TD>
                                      </tr>
                                      {isOpen && txns.map((t, i) => (
                                        <tr key={i} className="border-t border-[#0D1421] bg-[#080E1A]">
                                          <td className="py-2 px-3 w-6" />
                                          <td className="py-2 px-3 pl-11">
                                            <div className="flex flex-col gap-0.5">
                                              <span className="text-[11px] text-slate-500">{t.date} · {t.type}</span>
                                              {t.certificateNumber && (
                                                <span className="text-[10px] font-mono text-slate-600 tracking-wide">{t.certificateNumber}</span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">{t.shares !== undefined ? t.shares.toLocaleString() : "—"}</td>
                                          <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">{t.amount > 0 ? fmt(t.amount) : <span className="text-slate-700">—</span>}</td>
                                          <td className="py-2 px-3 text-[11px] text-slate-500 tabular-nums">
                                            {t.pricePerShare !== undefined ? `$${t.pricePerShare.toFixed(4)}` : <span className="text-slate-700">—</span>}
                                          </td>
                                          <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">
                                            {t.shares !== undefined && valPerSh !== null ? fmt(t.shares * valPerSh) : "—"}
                                          </td>
                                          <td className="py-2 px-3" /><td className="py-2 px-3" /><td className="py-2 px-3" /><td className="py-2 px-3" /><td className="py-2 px-3" />
                                        </tr>
                                      ))}
                                    </>
                                  );
                                })}
                                <tr className="border-t border-[#1E2D3D] bg-[#080E1A]">
                                  <td /><td className="py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total / Wtd Avg</td>
                                  <td className="py-2 px-3 text-xs text-slate-500 tabular-nums">{companiesWithCommon.reduce((s,c)=>s+(c.shareTransactions??[]).filter(t=>t.type==="Common").reduce((a,t)=>a+(t.shares??0),0),0).toLocaleString()}</td>
                                  <td className="py-2 px-3 text-xs text-slate-200 tabular-nums font-semibold">{totalCost > 0 ? fmt(totalCost) : <span className="text-slate-600">—</span>}</td>
                                  <td />
                                  <td className="py-2 px-3 text-xs text-emerald-400 tabular-nums font-semibold">{fmt(estValue)}</td>
                                  <td className="py-2 px-3 text-xs text-emerald-400 tabular-nums font-semibold">{moic !== null ? `${moic.toFixed(2)}×` : "—"}</td>
                                  <td className="py-2 px-3">
                                    {Object.keys(userValuations).some(id => companiesWithCommon.some(c => c.id === id)) && (
                                      <button
                                        onClick={() => setUserValuations(prev => {
                                          const n = { ...prev };
                                          for (const c of companiesWithCommon) delete n[c.id];
                                          return n;
                                        })}
                                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors whitespace-nowrap"
                                      >
                                        <RotateCcw size={9} /> Reset All
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* ══ 2. CREDIT ════════════════════════════════════════════════════ */}
                <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
                  {(() => {
                    const monthlyPmt = (principal: number, annualRate: number, months = 12) => {
                      const r = annualRate / 100 / 12;
                      return r > 0 ? principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1) : principal / months;
                    };
                    const calcPmt = (d: typeof allCreditPos[0]): number | null => {
                      if (d.interestRate === undefined || d.instrument === "Line of Credit") return null;
                      return d.termMonths === 1
                        ? Math.round(d.principal * d.interestRate / 1200)
                        : Math.round(monthlyPmt(d.principal, d.interestRate, 12));
                    };
                    const allCreditPos = companiesWithCredit.flatMap(c =>
                      (c.debtPositions ?? []).filter(d => CREDIT_INSTRUMENTS.includes(d.instrument))
                    );
                    const activeCreditPos = allCreditPos.filter(d => d.status !== "Repaid");
                    const totalOutstanding = activeCreditPos.reduce((s, d) => s + d.currentValue, 0);
                    const ratedPos = activeCreditPos.filter(d => d.interestRate !== undefined && d.currentValue > 0);
                    const wtdRate = ratedPos.length > 0
                      ? ratedPos.reduce((s, d) => s + d.currentValue * d.interestRate!, 0) / ratedPos.reduce((s, d) => s + d.currentValue, 0)
                      : null;
                    const totalMonthly = activeCreditPos.reduce((s, d) => { const p = calcPmt(d); return p !== null ? s + p : s; }, 0);
                    return (
                      <>
                        <div className="border-b border-[#1E2D3D]">
                          <SectionHeader label="Credit" tableKey="credit" accent="#6366F1" stats={[
                            { label: "Outstanding",  value: fmt(totalOutstanding), color: "#6366F1" },
                            { label: "Wtd Rate",     value: wtdRate !== null ? `${wtdRate.toFixed(1)}%` : "—" },
                            { label: "Monthly",      value: totalMonthly > 0 ? fmt(totalMonthly) : "—" },
                          ]} />
                        </div>
                        {openInstrumentTables.has("credit") && (
                          companiesWithCredit.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                                  <tr>
                                    <TH></TH><TH wide>Company</TH><TH>Type</TH>
                                    <TH>Original</TH><TH>Repaid</TH><TH>Outstanding</TH><TH>Rate</TH><TH>Monthly</TH><TH></TH>
                                  </tr>
                                </thead>
                                <tbody>
                                  {companiesWithCredit.map((c) => {
                                    const positions  = (c.debtPositions ?? []).filter(d => CREDIT_INSTRUMENTS.includes(d.instrument));
                                    const activePos  = positions.filter(d => d.status !== "Repaid");
                                    const repaidPos  = positions.filter(d => d.status === "Repaid");
                                    const compOrig   = positions.reduce((s, d) => s + d.principal, 0);
                                    const compRepaid = positions.reduce((s, d) => s + (d.principal - d.currentValue), 0);
                                    const compOut    = activePos.reduce((s, d) => s + d.currentValue, 0);
                                    const ratedP     = activePos.filter(d => d.interestRate !== undefined && d.currentValue > 0);
                                    const compRate   = ratedP.length > 0
                                      ? ratedP.reduce((s, d) => s + d.currentValue * d.interestRate!, 0) / ratedP.reduce((s, d) => s + d.currentValue, 0)
                                      : null;
                                    const compMonthly  = activePos.reduce((s, d) => { const p = calcPmt(d); return p !== null ? s + p : s; }, 0);
                                    const hasVariable  = activePos.some(d => d.instrument === "Line of Credit" && d.interestRate === undefined);
                                    const rowKey       = `credit-${c.id}`;
                                    const isOpen       = expandedRows.has(rowKey);
                                    const activeTypes  = activePos.map(d => d.instrument).filter((v, i, a) => a.indexOf(v) === i);
                                    const instrType    = activeTypes.length === 1 ? activeTypes[0] : `${activePos.length} instruments`;
                                    const rateLabel    = (d: typeof positions[0]) =>
                                      d.interestRate !== undefined ? `${d.interestRate}%`
                                        : d.instrument === "Line of Credit" ? "Variable" : "—";
                                    const pmtLabel     = (d: typeof positions[0]) => {
                                      if (d.instrument === "Line of Credit" && d.interestRate === undefined) return "Variable";
                                      const p = calcPmt(d); return p !== null ? fmt(p) : "—";
                                    };
                                    return (
                                      <>
                                        <tr key={c.id} className="border-t border-[#111D2E] hover:bg-[#111D2E]/40 cursor-pointer" onClick={() => toggleRow(rowKey)}>
                                          <TD><ChevronDown size={12} className={`text-slate-600 transition-transform ${isOpen ? "rotate-180" : ""}`} /></TD>
                                          <TD>
                                            <div className="flex items-center gap-2">
                                              {companyLogo(c)}
                                              <div>
                                                <p className="font-semibold text-slate-200">{c.name}</p>
                                                <p className="text-[10px] text-slate-600">{activePos.length} active{repaidPos.length > 0 ? `, ${repaidPos.length} repaid` : ""}</p>
                                              </div>
                                            </div>
                                          </TD>
                                          <TD><span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-medium">{instrType}</span></TD>
                                          <TD className="text-slate-500 tabular-nums">{fmt(compOrig)}</TD>
                                          <TD className="text-slate-500 tabular-nums">{fmt(compRepaid)}</TD>
                                          <TD className="text-slate-200 tabular-nums font-semibold">{fmt(compOut)}</TD>
                                          <TD className="text-indigo-400 tabular-nums">{compRate !== null ? `${compRate.toFixed(1)}%` : hasVariable ? <span className="text-slate-400 italic text-[10px]">Variable</span> : <span className="text-slate-500">—</span>}</TD>
                                          <TD className="text-slate-300 tabular-nums">{compMonthly > 0 ? fmt(compMonthly) : hasVariable ? <span className="text-slate-400 italic text-[10px]">+Variable</span> : "—"}</TD>
                                          <td />
                                        </tr>
                                        {isOpen && (
                                          <>
                                            {activePos.map((d, i) => (
                                              <tr key={`a-${i}`} className="border-t border-[#0D1421] bg-[#080E1A]">
                                                <td className="py-2 px-3 w-6" />
                                                <td className="py-2 px-3 pl-11">
                                                  <p className="text-[11px] text-slate-500">{d.date}{d.maturityDate ? ` → ${d.maturityDate}` : ""}</p>
                                                  {d.notes && <p className="text-[10px] text-slate-600 max-w-xs">{d.notes}</p>}
                                                </td>
                                                <td className="py-2 px-3">
                                                  <span className="text-[10px] px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-400">{d.instrument}</span>
                                                </td>
                                                <td className="py-2 px-3 text-[11px] text-slate-500 tabular-nums">{fmt(d.principal)}</td>
                                                <td className="py-2 px-3 text-[11px] text-slate-500 tabular-nums">{fmt(d.principal - d.currentValue)}</td>
                                                <td className="py-2 px-3 text-[11px] text-slate-200 tabular-nums font-medium">{fmt(d.currentValue)}</td>
                                                <td className="py-2 px-3 text-[11px] text-indigo-400 tabular-nums">{rateLabel(d)}</td>
                                                <td className="py-2 px-3 text-[11px] text-slate-300 tabular-nums">{pmtLabel(d)}</td>
                                                <td className="py-2 px-3">
                                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">Active</span>
                                                </td>
                                              </tr>
                                            ))}
                                            {repaidPos.map((d, i) => (
                                              <tr key={`r-${i}`} className="border-t border-[#0D1421] bg-[#080E1A] opacity-40">
                                                <td className="py-2 px-3 w-6" />
                                                <td className="py-2 px-3 pl-11">
                                                  <p className="text-[11px] text-slate-500">{d.date}</p>
                                                  {d.notes && <p className="text-[10px] text-slate-600 max-w-xs">{d.notes}</p>}
                                                </td>
                                                <td className="py-2 px-3">
                                                  <span className="text-[10px] px-1 py-0.5 rounded bg-slate-500/10 text-slate-500">{d.instrument}</span>
                                                </td>
                                                <td className="py-2 px-3 text-[11px] text-slate-500 tabular-nums">{fmt(d.principal)}</td>
                                                <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">{fmt(d.principal)}</td>
                                                <td className="py-2 px-3 text-[11px] text-slate-600 tabular-nums">—</td>
                                                <td className="py-2 px-3 text-[11px] text-slate-600 tabular-nums">{rateLabel(d)}</td>
                                                <td className="py-2 px-3 text-[11px] text-slate-600 tabular-nums">—</td>
                                                <td className="py-2 px-3">
                                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-500 font-medium">Repaid</span>
                                                </td>
                                              </tr>
                                            ))}
                                          </>
                                        )}
                                      </>
                                    );
                                  })}
                                  <tr className="border-t border-[#1E2D3D] bg-[#080E1A]">
                                    <td /><td className="py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total / Wtd Avg</td>
                                    <td />
                                    <td className="py-2 px-3 text-xs text-slate-500 tabular-nums font-semibold">{fmt(allCreditPos.reduce((s, d) => s + d.principal, 0))}</td>
                                    <td className="py-2 px-3 text-xs text-slate-500 tabular-nums font-semibold">{fmt(allCreditPos.reduce((s, d) => s + (d.principal - d.currentValue), 0))}</td>
                                    <td className="py-2 px-3 text-xs text-slate-200 tabular-nums font-semibold">{fmt(totalOutstanding)}</td>
                                    <td className="py-2 px-3 text-xs text-indigo-400 tabular-nums font-semibold">{wtdRate !== null ? `${wtdRate.toFixed(1)}%` : "—"}</td>
                                    <td className="py-2 px-3 text-xs text-slate-300 tabular-nums font-semibold">{totalMonthly > 0 ? fmt(totalMonthly) : "—"}</td>
                                    <td />
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="px-5 py-8 text-center text-xs text-slate-600">No credit positions in portfolio.</div>
                          )
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* ══ 3. CONVERTIBLES ══════════════════════════════════════════════ */}
                <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
                  {(() => {
                    const allConvPos = companiesWithConvert.flatMap(c =>
                      (c.debtPositions ?? []).filter(d => CONVERT_INSTRUMENTS.includes(d.instrument))
                    );
                    const totalPrincipal = allConvPos.reduce((s, d) => s + d.principal, 0);
                    const totalCurrVal   = allConvPos.reduce((s, d) => s + d.currentValue, 0);
                    const ratedPositions = allConvPos.filter(d => d.interestRate !== undefined);
                    const wtdRate = ratedPositions.length > 0
                      ? ratedPositions.reduce((s, d) => s + d.principal * d.interestRate!, 0) / ratedPositions.reduce((s, d) => s + d.principal, 0)
                      : null;
                    return (
                      <>
                        <div className="border-b border-[#1E2D3D]">
                          <SectionHeader label="Convertibles" tableKey="convertibles" accent="#F59E0B" stats={[
                            { label: "Basis",         value: fmt(totalPrincipal), color: "#F59E0B" },
                            { label: "Wtd Yield",     value: wtdRate !== null ? `${wtdRate.toFixed(1)}%` : "—" },
                            { label: "Current Value", value: fmt(totalCurrVal) },
                            { label: "Accrued",       value: totalCurrVal > totalPrincipal ? `+${fmt(totalCurrVal - totalPrincipal)}` : "—", color: "#10B981" },
                          ]} />
                        </div>
                        {openInstrumentTables.has("convertibles") && (
                          companiesWithConvert.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                                  <tr>
                                    <TH></TH><TH wide>Company</TH><TH>Type</TH>
                                    <TH>Principal</TH><TH>Yield</TH><TH>Current Value</TH><TH>Accrued</TH>
                                  </tr>
                                </thead>
                                <tbody>
                                  {companiesWithConvert.map((c) => {
                                    const positions = (c.debtPositions ?? []).filter(d => CONVERT_INSTRUMENTS.includes(d.instrument));
                                    const principal = positions.reduce((s, d) => s + d.principal, 0);
                                    const currVal   = positions.reduce((s, d) => s + d.currentValue, 0);
                                    const accrued   = currVal - principal;
                                    const ratedPos  = positions.filter(d => d.interestRate !== undefined);
                                    const compRate  = ratedPos.length > 0
                                      ? ratedPos.reduce((s, d) => s + d.principal * d.interestRate!, 0) / ratedPos.reduce((s, d) => s + d.principal, 0)
                                      : null;
                                    const rowKey = `conv-${c.id}`;
                                    const isOpen = expandedRows.has(rowKey);
                                    const instrType = positions.length === 1 ? positions[0].instrument : `${positions.length} instruments`;
                                    return (
                                      <>
                                        <tr key={c.id} className="border-t border-[#111D2E] hover:bg-[#111D2E]/40 cursor-pointer" onClick={() => toggleRow(rowKey)}>
                                          <TD><ChevronDown size={12} className={`text-slate-600 transition-transform ${isOpen ? "rotate-180" : ""}`} /></TD>
                                          <TD>
                                            <div className="flex items-center gap-2">
                                              {companyLogo(c)}
                                              <div>
                                                <p className="font-semibold text-slate-200">{c.name}</p>
                                                <p className="text-[10px] text-slate-600">{positions.length} instrument{positions.length !== 1 ? "s" : ""}</p>
                                              </div>
                                            </div>
                                          </TD>
                                          <TD>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">{instrType}</span>
                                          </TD>
                                          <TD className="text-slate-300 tabular-nums font-medium">{fmt(principal)}</TD>
                                          <TD className="text-amber-400 tabular-nums">{compRate !== null ? `${compRate.toFixed(1)}%` : <span className="text-slate-500">—</span>}</TD>
                                          <TD className="text-slate-300 tabular-nums font-medium">{fmt(currVal)}</TD>
                                          <TD className={`tabular-nums ${accrued > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                                            {accrued > 0 ? `+${fmt(accrued)}` : "—"}
                                          </TD>
                                        </tr>
                                        {isOpen && positions.map((d, i) => (
                                          <tr key={i} className="border-t border-[#0D1421] bg-[#080E1A]">
                                            <td className="py-2 px-3 w-6" />
                                            <td className="py-2 px-3 pl-11">
                                              <p className="text-[11px] text-slate-500">{d.date}</p>
                                              {d.notes && <p className="text-[10px] text-slate-600 max-w-xs">{d.notes}</p>}
                                            </td>
                                            <td className="py-2 px-3">
                                              <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400">{d.instrument}</span>
                                            </td>
                                            <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">{fmt(d.principal)}</td>
                                            <td className="py-2 px-3 text-[11px] text-amber-400 tabular-nums">
                                              {d.interestRate !== undefined ? `${d.interestRate}%` : d.discountRate !== undefined ? `${d.discountRate}% disc.` : "—"}
                                            </td>
                                            <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">{fmt(d.currentValue)}</td>
                                            <td className="py-2 px-3 text-[11px] tabular-nums">
                                              {d.currentValue > d.principal
                                                ? <span className="text-emerald-400">+{fmt(d.currentValue - d.principal)}</span>
                                                : <span className="text-slate-600">—</span>}
                                            </td>
                                          </tr>
                                        ))}
                                      </>
                                    );
                                  })}
                                  <tr className="border-t border-[#1E2D3D] bg-[#080E1A]">
                                    <td /><td className="py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total / Wtd Avg</td>
                                    <td />
                                    <td className="py-2 px-3 text-xs text-slate-300 tabular-nums font-semibold">{fmt(totalPrincipal)}</td>
                                    <td className="py-2 px-3 text-xs text-amber-400 tabular-nums font-semibold">{wtdRate !== null ? `${wtdRate.toFixed(1)}%` : "—"}</td>
                                    <td className="py-2 px-3 text-xs text-slate-300 tabular-nums font-semibold">{fmt(totalCurrVal)}</td>
                                    <td className="py-2 px-3 text-xs text-emerald-400 tabular-nums font-semibold">
                                      {totalCurrVal > totalPrincipal ? `+${fmt(totalCurrVal - totalPrincipal)}` : "—"}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="px-5 py-8 text-center text-xs text-slate-600">No convertible positions in portfolio.</div>
                          )
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* ══ 4. OPTIONS & WARRANTS ═══════════════════════════════════════ */}
                <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
                  {(() => {
                    const optPps    = (c: typeof portfolio[0]) => c.totalShares ? effectiveImplied(c) / c.totalShares : 0;
                    type OptPos = NonNullable<typeof portfolio[0]["optionPositions"]>[0];
                    const intrinsic = (o: OptPos, pps: number) => o.shares * Math.max(pps - o.strikePrice, 0);
                    const timeVal   = (o: OptPos, pps: number) => o.shares * pps * ((optionVariances[o.id] ?? 0) / 100);

                    const allRows = companiesWithOptions.flatMap(c => (c.optionPositions ?? []).map(o => ({ o, c, pps: optPps(c) })));
                    const grandIntrinsic = allRows.reduce((s, { o, pps }) => s + intrinsic(o, pps), 0);
                    const grandTime      = allRows.reduce((s, { o, pps }) => s + timeVal(o, pps), 0);
                    const grandTotal     = grandIntrinsic + grandTime;
                    const grandBasis     = allRows.reduce((s, { o }) => s + (o.costBasis ?? 0), 0);
                    const grandMoic      = grandBasis > 0 ? grandTotal / grandBasis : null;
                    return (
                      <>
                        <div className="border-b border-[#1E2D3D]">
                          <SectionHeader label="Options & Warrants" tableKey="options" accent="#F43F5E" stats={[
                            { label: "Basis",           value: grandBasis > 0 ? fmt(grandBasis) : "—" },
                            { label: "Intrinsic Value", value: fmt(grandIntrinsic) },
                            { label: "Time Value",      value: fmt(grandTime),  color: "#F43F5E" },
                            { label: "Total Value",     value: fmt(grandTotal), color: "#F43F5E" },
                            { label: "MOIC",            value: grandMoic !== null ? `${grandMoic.toFixed(2)}×` : "—", color: grandMoic && grandMoic >= 1 ? "#10B981" : undefined },
                          ]} />
                        </div>
                        {openInstrumentTables.has("options") && (
                          companiesWithOptions.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                                  <tr>
                                    <TH></TH><TH wide>Company</TH><TH>Type</TH>
                                    <TH>Shares</TH><TH>Strike</TH><TH>Curr. PPS</TH>
                                    <TH>Basis</TH><TH>Intrinsic</TH><TH>Variance %</TH><TH>Time Value</TH><TH>Total Value</TH><TH>MOIC</TH><TH>Expiration</TH>
                                  </tr>
                                </thead>
                                <tbody>
                                  {allRows.map(({ o, c, pps }) => {
                                    const iv      = intrinsic(o, pps);
                                    const tv      = timeVal(o, pps);
                                    const tot     = iv + tv;
                                    const varPct  = optionVariances[o.id] ?? 0;
                                    const defVar  = o.defaultVariancePct ?? 0;
                                    const isCustom = varPct !== defVar;
                                    const isEditing = editingVarianceId === o.id;
                                    const rowKey = `opt-notes-${o.id}`;
                                    const isOpen = expandedRows.has(rowKey);
                                    return (
                                      <>
                                        <tr key={o.id} className="border-t border-[#111D2E] hover:bg-[#111D2E]/40 cursor-pointer" onClick={() => o.notes && toggleRow(rowKey)}>
                                          <TD><ChevronDown size={12} className={`transition-transform ${o.notes ? "text-slate-600" : "text-[#1E2D3D]"} ${isOpen ? "rotate-180" : ""}`} /></TD>
                                          <TD>
                                            <div className="flex items-center gap-2">
                                              {companyLogo(c)}
                                              <div>
                                                <p className="font-semibold text-slate-200">{c.name}</p>
                                              </div>
                                            </div>
                                          </TD>
                                          <TD>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-medium">{o.instrument}</span>
                                          </TD>
                                          <TD className="text-slate-300 tabular-nums font-medium">{(o.shares / 1_000_000).toFixed(1)}M</TD>
                                          <TD className="text-rose-400 tabular-nums">${o.strikePrice.toFixed(4)}</TD>
                                          <TD className="text-slate-400 tabular-nums">{pps > 0 ? `$${pps.toFixed(4)}` : "—"}</TD>
                                          <TD className="text-slate-500 tabular-nums">{o.costBasis ? fmt(o.costBasis) : "—"}</TD>
                                          <TD className={`tabular-nums font-medium ${iv > 0 ? "text-emerald-400" : "text-slate-600"}`}>{iv > 0 ? fmt(iv) : "—"}</TD>
                                          <td className="py-2 px-3" onClick={e => e.stopPropagation()}>
                                            {isEditing ? (
                                              <div className="flex items-center gap-1">
                                                <input
                                                  autoFocus
                                                  type="number" min={0} max={500}
                                                  defaultValue={varPct}
                                                  onBlur={e  => { setOptionVariances(p => ({ ...p, [o.id]: Math.max(0, Number(e.target.value)) })); setEditingVarianceId(null); }}
                                                  onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur(); }}
                                                  className="w-14 bg-[#111D2E] border border-rose-500/50 rounded px-1.5 py-0.5 text-[11px] text-slate-200 tabular-nums text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <span className="text-[10px] text-slate-600">%</span>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-1.5">
                                                {isCustom ? (
                                                  <div className="flex flex-col gap-0.5">
                                                    <span className="text-slate-600 line-through leading-tight">{defVar}%</span>
                                                    <span className="text-rose-400 font-semibold leading-tight">{varPct}%</span>
                                                  </div>
                                                ) : (
                                                  <span className="text-slate-300 tabular-nums">{varPct}%</span>
                                                )}
                                                <button
                                                  onClick={e => { e.stopPropagation(); setEditingVarianceId(o.id); }}
                                                  className={`p-0.5 rounded hover:bg-white/10 transition-colors ${isCustom ? "text-rose-600 hover:text-rose-300" : "text-slate-500 hover:text-slate-300"}`}
                                                  title="Edit variance %"
                                                >
                                                  <Pencil size={10} />
                                                </button>
                                              </div>
                                            )}
                                          </td>
                                          <TD className="text-rose-400 tabular-nums font-medium">{tv > 0 ? fmt(tv) : "—"}</TD>
                                          <TD className="text-slate-200 tabular-nums font-semibold">{tot > 0 ? fmt(tot) : "—"}</TD>
                                          <TD className="tabular-nums">{(() => { const m = o.costBasis && tot > 0 ? tot / o.costBasis : null; return m ? <span style={{ color: m >= 1 ? "#10B981" : "#EF4444" }}>{m.toFixed(2)}×</span> : <span className="text-slate-600">—</span>; })()}</TD>
                                          <TD className="text-slate-500">{o.expirationDate ?? <span className="text-emerald-500/60 text-[10px]">No expiry</span>}</TD>
                                        </tr>
                                        {isOpen && o.notes && (
                                          <tr className="border-t border-[#0D1421] bg-[#080E1A]">
                                            <td />
                                            <td colSpan={10} className="py-2 px-3 pl-11">
                                              <p className="text-[10px] text-slate-500 max-w-lg">{o.notes}</p>
                                            </td>
                                          </tr>
                                        )}
                                      </>
                                    );
                                  })}
                                  <tr className="border-t border-[#1E2D3D] bg-[#080E1A]">
                                    <td /><td className="py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total</td>
                                    <td /><td /><td /><td />
                                    <td className="py-2 px-3 text-xs text-slate-500 tabular-nums font-semibold">{grandBasis > 0 ? fmt(grandBasis) : "—"}</td>
                                    <td className="py-2 px-3 text-xs tabular-nums font-semibold text-emerald-400">{grandIntrinsic > 0 ? fmt(grandIntrinsic) : "—"}</td>
                                    <td />
                                    <td className="py-2 px-3 text-xs text-rose-400 tabular-nums font-semibold">{grandTime > 0 ? fmt(grandTime) : "—"}</td>
                                    <td className="py-2 px-3 text-xs text-slate-200 tabular-nums font-semibold">{grandTotal > 0 ? fmt(grandTotal) : "—"}</td>
                                    <td className="py-2 px-3 text-xs tabular-nums font-semibold">{grandMoic !== null ? <span style={{ color: grandMoic >= 1 ? "#10B981" : "#EF4444" }}>{grandMoic.toFixed(2)}×</span> : "—"}</td>
                                    <td />
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="px-5 py-8 text-center text-xs text-slate-600">No option or warrant positions in portfolio.</div>
                          )
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* ══ 5. CASH & EQUIVALENTS ════════════════════════════════════════ */}
                <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
                  {(() => {
                    const totalCash = cashPositions.reduce((s, p) => s + p.balance, 0);
                    return (
                      <>
                        <div className="border-b border-[#1E2D3D]">
                          <SectionHeader label="Cash & Equivalents" tableKey="cash" accent="#06B6D4" stats={[
                            { label: "Total Balance", value: totalCash > 0 ? fmt(totalCash) : "—", color: "#06B6D4" },
                            { label: "Positions",     value: String(cashPositions.length) },
                          ]} />
                        </div>
                        {openInstrumentTables.has("cash") && (
                          cashPositions.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                                  <tr>
                                    <TH wide>Account</TH><TH>Institution</TH><TH>Type</TH>
                                    <TH>Balance</TH><TH>Yield</TH><TH>As Of</TH>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cashPositions.map(p => (
                                    <tr key={p.id} className="border-t border-[#111D2E] hover:bg-[#111D2E]/40">
                                      <TD>
                                        <div>
                                          <p className="font-semibold text-slate-200">{p.name}</p>
                                          {p.notes && <p className="text-[10px] text-slate-600 mt-0.5">{p.notes}</p>}
                                        </div>
                                      </TD>
                                      <TD className="text-slate-400">{p.institution}</TD>
                                      <TD className="text-slate-400">{p.type}</TD>
                                      <TD className="tabular-nums font-medium text-cyan-400">{fmt(p.balance)}</TD>
                                      <TD className="tabular-nums text-slate-400">{p.yieldPct != null ? `${p.yieldPct.toFixed(2)}%` : "—"}</TD>
                                      <TD className="text-slate-500">{p.asOf ?? "—"}</TD>
                                    </tr>
                                  ))}
                                  <tr className="border-t border-[#1E2D3D] bg-[#080E1A]">
                                    <td className="py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total</td>
                                    <td /><td /><td className="py-2 px-3 text-xs text-cyan-400 tabular-nums font-semibold">{fmt(totalCash)}</td>
                                    <td /><td />
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="px-5 py-8 text-center">
                              <p className="text-xs text-slate-600 italic">No cash positions on record — add accounts to <code className="font-mono text-[10px]">lib/data.ts → cashPositions</code></p>
                            </div>
                          )
                        )}
                      </>
                    );
                  })()}
                </div>

              </div>
              );
            })()}

            {/* Thesis */}
            <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-6 flex flex-col justify-between gap-5">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-[#1E2D3D] flex items-center justify-center shrink-0 p-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/1691979830329-NJ5W8U6WT1N0F60PRNXV/Nth.png"
                      alt="nth" className="w-full h-full object-contain" style={{ filter: "brightness(0) invert(1)" }} />
                  </div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">Investment Thesis</p>
                </div>
                <ul className="space-y-3 mb-4">
                  {[
                    "Invest for the long-term",
                    "Minimize fees",
                    "Ensure proper – but not excessive – diversification",
                    "In straightforward businesses",
                    "With passionate, effective and high-integrity managers",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500" />
                      <span className="text-sm text-slate-200">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#1E2D3D]">
                <span className="text-xs text-slate-600">Corpus Christi, TX · Founded 2021 · Venture Studio</span>
                <a
                  href="https://sawhook.substack.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1.5 text-xs font-medium text-orange-400 hover:text-orange-300 border border-orange-500/20 hover:border-orange-500/40 bg-orange-500/5 hover:bg-orange-500/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" aria-hidden="true">
                    <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/>
                  </svg>
                  sawhook.substack.com
                </a>
              </div>
            </div>
          </div>
          );
        })()}

        {!activeCompany && activeTab === "pipeline" && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold text-slate-100">Investment Opportunities</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Private deals curated by nth Venture — acquisitions, buyouts, energy infrastructure, and portfolio company options.
                  Full details provided under NDA. For accredited investors only.
                </p>
              </div>
            </div>
            <DealPipeline onCompanyClick={setActiveCompanyId} />
          </div>
        )}

        {!activeCompany && activeTab === "secondary" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-100">Bulletin Board</h1>
              <p className="text-sm text-slate-500 mt-1">
                Non-binding indications of interest posted by accredited co-owners and portfolio company employees.
                nth Venture does not facilitate, match, or intermediate any transaction.
              </p>
            </div>
            <SecondaryMarket />
          </div>
        )}

        {!activeCompany && activeTab === "letters" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-100">Letters to LPs</h1>
              <p className="text-sm text-slate-500 mt-1">
                Quarterly and annual letters from the nth Venture management team. Confidential.
              </p>
            </div>
            <LettersSection />
          </div>
        )}

        {!activeCompany && activeTab === "investor" && (
          <InvestorPortal
            userValuations={userValuations}
            setUserValuations={setUserValuations}
            onOpenValuationModal={(c, v) => setValuationModal({ company: c, pendingVal: v })}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1E2D3D] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
              This portal is for informational purposes only and is intended solely for accredited investors.
              Nothing here constitutes an offer to sell or a solicitation to buy any security.
              Past performance is not indicative of future results. nth Venture Inc. is not a
              registered broker-dealer or investment adviser.
            </p>
            <p className="text-xs text-slate-600 whitespace-nowrap">
              © 2026 nth Venture Inc. · Confidential
            </p>
          </div>
        </div>
      </footer>

      {/* ── Valuation Modal ── */}
      {mounted && valuationModal && createPortal(
        (() => {
          const { company: mc, pendingVal } = valuationModal;
          // Live preview metrics at pending valuation
          const txns = (mc.shareTransactions ?? []).filter(t => t.type === "Common");
          const sh = txns.reduce((s, t) => s + (t.shares ?? 0), 0);
          const cost = txns.reduce((s, t) => s + t.amount, 0);
          const estVal = mc.totalShares ? sh * (pendingVal / mc.totalShares) : null;
          const moicLive = cost > 0 && estVal !== null ? estVal / cost : null;
          const prevVal = userValuations[mc.id] ?? mc.impliedValuation;
          const hasCustom = userValuations[mc.id] !== undefined;
          const delta = pendingVal - prevVal;
          const deltaStr = delta === 0 ? "no change"
            : `${delta > 0 ? "+" : ""}${fmt(Math.abs(delta))} vs ${hasCustom ? "custom" : "default"}`;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-[#060B14]/80 backdrop-blur-sm"
                onClick={() => setValuationModal(null)}
              />
              {/* Panel */}
              <div className="relative w-full max-w-2xl bg-[#0D1421] border border-[#1E2D3D] rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2D3D]">
                  <div className="flex items-center gap-3">
                    {mc.logoUrl ? (
                      <div className="w-7 h-7 rounded overflow-hidden bg-white flex items-center justify-center p-0.5 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mc.logoUrl} alt={mc.name} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded font-bold flex items-center justify-center text-[10px]"
                        style={{ background: `${mc.accentColor}18`, color: mc.accentColor }}>{mc.initials[0]}</div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{mc.name}</p>
                      <p className="text-[10px] text-slate-500">Set estimated equity valuation</p>
                    </div>
                  </div>
                  <button onClick={() => setValuationModal(null)} className="text-slate-500 hover:text-slate-300 transition-colors">
                    <X size={16} />
                  </button>
                </div>

                {/* Football field */}
                <div className="px-5 pt-4 pb-2">
                  <FootballField
                    company={mc}
                    controlled={{
                      value: pendingVal,
                      onChange: (v) => setValuationModal(prev => prev ? { ...prev, pendingVal: v } : null),
                    }}
                  />
                </div>

                {/* Live preview strip */}
                <div className="mx-5 mb-4 border border-[#1E2D3D] rounded-xl overflow-hidden">
                  <div className="flex divide-x divide-[#1E2D3D]">
                    {[
                      { label: "Est. Value (common)", value: estVal !== null ? fmt(estVal) : "—", color: mc.accentColor },
                      { label: "MOIC", value: moicLive !== null ? `${moicLive.toFixed(2)}×` : "—", color: moicLive !== null && moicLive >= 1 ? "#10B981" : "#F87171" },
                      { label: "vs. prev", value: deltaStr, color: delta > 0 ? "#10B981" : delta < 0 ? "#F87171" : "#64748B" },
                    ].map(s => (
                      <div key={s.label} className="flex-1 px-3 py-2.5 bg-[#080E1A]">
                        <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium">{s.label}</p>
                        <p className="text-xs font-bold mt-0.5 tabular-nums" style={{ color: s.color }}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer actions */}
                <div className="flex items-center justify-between px-5 pb-5 gap-3">
                  {hasCustom && (
                    <button
                      onClick={() => {
                        setUserValuations(prev => { const n = { ...prev }; delete n[mc.id]; return n; });
                        setValuationModal(null);
                      }}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 border border-[#1E2D3D] hover:border-slate-500 px-3 py-2 rounded-lg transition-colors"
                    >
                      <RotateCcw size={12} />
                      Reset to default
                    </button>
                  )}
                  {!hasCustom && <div />}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setValuationModal(null)}
                      className="text-xs text-slate-500 hover:text-slate-300 px-4 py-2 rounded-lg border border-[#1E2D3D] hover:border-slate-500 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setUserValuations(prev => ({ ...prev, [mc.id]: pendingVal }));
                        setValuationModal(null);
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-white px-4 py-2 rounded-lg transition-colors"
                      style={{ background: mc.accentColor }}
                    >
                      <Check size={12} />
                      Set Value
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
}
