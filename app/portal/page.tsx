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
  FileText,
  Calculator,
  LogOut,
} from "lucide-react";
import PortfolioAllocationChart from "@/components/PortfolioAllocationChart";
import FootballField from "@/components/FootballField";
import DealPipeline from "@/components/DealPipeline";
import SecondaryMarket from "@/components/SecondaryMarket";
import LettersSection from "@/components/LettersSection";
import CompanyPage from "@/components/CompanyPage";
import InvestorPortal from "@/components/InvestorPortal";
import NDAGate from "@/components/NDAGate";
import AccessGate from "@/components/AccessGate";
import FeeCalculator from "@/components/FeeCalculator";
import DirectHoldingsTab from "@/components/DirectHoldingsTab";
import { findDirectInvestor } from "@/lib/investors";
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

// Audily Series A Preferred — dividends began accruing 03/18/2026.
// Accrued amount is computed dynamically and folded into the position's
// currentValue so it flows through NAV, donut allocations, and convertible
// breakdowns consistently. Must be declared above any module-level `const`
// that calls withAudilyAccrued — function decls hoist, but the const
// AUDILY_PREFERRED_ACCRUAL_START it reads does not.
const AUDILY_PREFERRED_ACCRUAL_START = new Date("2026-03-18T00:00:00Z");
function audilyPreferredAccrued(): number {
  const pref = basePortfolio.find(c => c.id === "audily")?.debtPositions?.find(d => d.id === "audily-pref-a");
  if (!pref?.interestRate) return 0;
  const days = Math.max(0, (Date.now() - AUDILY_PREFERRED_ACCRUAL_START.getTime()) / 86_400_000);
  return pref.principal * (pref.interestRate / 100) * (days / 365);
}
function withAudilyAccrued<T extends typeof basePortfolio[number]>(p: T[]): T[] {
  const accrued = audilyPreferredAccrued();
  if (accrued <= 0) return p;
  return p.map(c => {
    if (c.id !== "audily") return c;
    return {
      ...c,
      debtPositions: (c.debtPositions ?? []).map(d =>
        d.id === "audily-pref-a" ? { ...d, currentValue: d.currentValue + accrued } : d
      ),
    };
  });
}

const portfolio = withAudilyAccrued(basePortfolio);
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

const PROPOSAL_LP_BASIS_ADD = 350_000;   // $1/unit par value
const PROPOSAL_LEVERAGE_ADD  = 120_000;

// ── Scenario additions (Scenario tab only — builds on top of Proposal) ─────────
const SCENARIO_AUDILY_PREFERRED: DebtPosition = {
  id: "audily-pref-scenario",
  date: "May 2026",
  instrument: "Preferred",
  principal: 300_000,
  status: "Current",
  currentValue: 300_000,
  notes: "Proposed Audily preferred share purchase (Scenario).",
};
const SCENARIO_MB_SHARES       = 4_593_450;
const SCENARIO_AUDILY_SHARES   = 4_606_158;
const SCENARIO_SBR2TH_SHARES   = 3_108_640;
const SCENARIO_PIGEON_SHARES   = 3_079_061;
const SCENARIO_FALCONER_SHARES = 4_532_840;
const SCENARIOB_PIGEON_SHARES   = 3_216_930;
const SCENARIOB_FALCONER_SHARES  = 4_735_803;
const SCENARIOB_SBR2TH_SHARES    = 3_247_832;
const SCENARIOB_MB_SHARES        = 4_804_351;

type Tab = "overview" | "proposal" | "scenario" | "scenario-b" | "pipeline" | "secondary" | "investor" | "fees" | "direct" | "palash-memo";

// ── Palash Deal Memo additions (palash-memo tab only) ─────────────────────────
// Palash's LP basis = his rolled-in portfolio value (at default PPS) + cash contribution.
const PALASH_CASH_CONTRIBUTION = 100_000;   // Cash Palash adds alongside his in-kind roll-in
const PALASH_OTHER_LP_BASIS    = 250_000;   // Cash raised elsewhere (one other new LP)
// Palash rolls in his Class A Common (purchased + earned)
const PALASH_ROLLUP_SHARES: Record<string, number> = {
  audily:           72_850 + 4_606_158,    // purchased + earned
  sbr2th:        2_500_000 + 250_000 + 3_108_640,
  certd:         2_500_000 + 250_000 + 3_079_061,
  sentius:       2_500_000 + 250_000,      // purchased only
  galileo:       2_500_000 + 250_000,      // purchased only
  "merchant-boxes": 4_593_450,             // earned only
  falconer:        4_532_840,              // earned only
};
// LP D rolls in (matches scenario-b shares)
const PALASH_LP_D_SHARES: Record<string, number> = {
  certd:           SCENARIOB_PIGEON_SHARES,
  falconer:        SCENARIOB_FALCONER_SHARES,
  sbr2th:          SCENARIOB_SBR2TH_SHARES,
  "merchant-boxes": SCENARIOB_MB_SHARES,
};

const BASE_TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview",  label: "Fund Overview",  icon: <LayoutDashboard size={15} /> },
  { id: "proposal",  label: "Deal Memo",  icon: <FileText size={15} /> },
  { id: "fees",      label: "Allocator", icon: <Calculator size={15} /> },
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
  const [directInvestorId, setDirectInvestorId] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  useEffect(() => {
    setMounted(true);
    setDirectInvestorId(localStorage.getItem("nth_investor_id_v1"));
  }, []);
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
    if (!c.impliedValuation) return c.currentValue;   // avoid 0/0 → NaN
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

  const handleLogout = () => {
    localStorage.removeItem("nth_access_granted_v1");
    localStorage.removeItem("nth_investor_id_v1");
    window.location.reload();
  };

  const directInvestor = directInvestorId ? findDirectInvestor(directInvestorId) : undefined;
  const isPalash = directInvestor?.id === "palash-jillian";
  // Hide the regular Deal Memo (proposal) tab when Palash is signed in — they get the
  // dedicated "My Deal Memo" tab instead.
  const tabs = directInvestor
    ? [
        ...(isPalash ? BASE_TABS.filter(t => t.id !== "proposal") : BASE_TABS),
        ...(isPalash
          ? [{ id: "palash-memo" as Tab, label: "My Deal Memo", icon: <FileText size={15} /> }]
          : []),
        { id: "direct" as Tab, label: "My Holdings", icon: <User size={15} /> },
      ]
    : BASE_TABS;

  return (
    <AccessGate onGranted={(id) => setDirectInvestorId(id)}>
    <NDAGate>
    <div className="min-h-screen bg-[#060B14]">
      {/* Top nav bar */}
      <header className="sticky top-0 z-30 bg-[#060B14]/90 backdrop-blur-md border-b border-[#1E2D3D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-stretch h-14">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2 shrink-0 pr-4 border-r border-[#1E2D3D] no-underline hover:opacity-80 transition-opacity">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/1691979830329-NJ5W8U6WT1N0F60PRNXV/Nth.png"
                alt="nth Venture"
                className="h-7 w-auto"
                style={{ filter: "brightness(0) invert(1)" }}
              />
              <span className="text-xs text-slate-500 hidden lg:block">Investor Portal</span>
            </a>

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
              {/* Account widget with dropdown */}
              <div className="relative">
                <button
                  onClick={() => setAccountOpen(o => !o)}
                  className="flex items-center gap-2 bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-2.5 py-1.5 hover:bg-[#1A2940] transition-colors"
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: directInvestor ? "#3B0764" : "#1E3A5F" }}>
                    <span className="text-[9px] font-bold" style={{ color: directInvestor ? "#C4B5FD" : "#60A5FA" }}>
                      {directInvestor
                        ? directInvestor.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)
                        : "CF"}
                    </span>
                  </div>
                  <div className="hidden sm:block leading-tight text-left">
                    <p className="text-xs font-medium text-slate-200">
                      {directInvestor ? directInvestor.name : "Co-Owner Fund LP"}
                    </p>
                    <p className="text-[9px] text-slate-500">
                      {directInvestor ? "Investor" : "Fund View"}
                    </p>
                  </div>
                  <ChevronDown size={10} className="text-slate-500 hidden sm:block" />
                  <User size={12} className="sm:hidden text-slate-400" />
                </button>
                {accountOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setAccountOpen(false)} />
                    <div className="absolute right-0 top-full mt-1.5 w-56 bg-[#0D1421] border border-[#1E2D3D] rounded-xl shadow-2xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#1E2D3D]">
                        <p className="text-xs font-semibold text-slate-200">
                          {directInvestor ? directInvestor.name : "Co-Owner Fund LP"}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {directInvestor
                            ? `Investor since ${directInvestor.investorSince}`
                            : "Fund View"}
                        </p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 transition-colors"
                      >
                        <LogOut size={12} />
                        Log out
                      </button>
                    </div>
                  </>
                )}
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
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 sm:pb-8">
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
              const activePct    = lpViewMode === "current" && (lpCurrentPct > 0 || lpHypo > 0)
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
                    {(() => {
                      const accrued = audilyPreferredAccrued() * lpMultiplier;
                      return accrued > 0 ? (
                        <p className="text-[9px] text-slate-600 tabular-nums mt-0.5" title="Audily Series A Preferred dividends accrued since 03/18/26 at 13.4% — included in NAV.">
                          incl. {fmt(accrued)} accrued
                        </p>
                      ) : null;
                    })()}
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
                        onChange={e => { setLpHypotheticalUnits(e.target.value); if (parseFloat(e.target.value) > 0) setLpViewMode("current"); }}
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
                                          {c.commonSharesOutstanding && sh > 0 ? `${((sh / c.commonSharesOutstanding) * 100).toFixed(1)}%` : c.votingOwnership !== undefined ? `${c.votingOwnership.toFixed(1)}%` : "—"}
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

        {!activeCompany && activeTab === "proposal" && !isPalash && (() => {
          // ── Proposal scenario shadowing ──────────────────────────────────────
          const portfolio = withAudilyAccrued(basePortfolio).map(c => {
            if (c.id === "audily") {
              return { ...c, debtPositions: [...(c.debtPositions ?? []), PROPOSAL_AUDILY_PREFERRED] };
            }
            if (c.id === "nueces-brewing") {
              return {
                ...c,
                invested: 320_000,
                currentValue: 320_000,
                ownership: 50,
                votingOwnership: 50,
                impliedValuation: 640_000,
                customPricePerShare: 6.40,
                totalShares: 100_000,
                shareTransactions: [
                  ...(c.shareTransactions ?? []),
                  {
                    date: "May 2026",
                    type: "Common" as const,
                    shares: 50_000,
                    amount: 320_000,
                    notes: "Proposed initial common share purchase — 50% of economic and voting.",
                  },
                ],
              };
            }
            return c;
          });
          const LP_TOTAL_UNITS = BASE_LP_TOTAL_UNITS + PROPOSAL_LP_BASIS_ADD;
          const FUND_LEVERAGE  = BASE_FUND_LEVERAGE  + PROPOSAL_LEVERAGE_ADD;
          const fund = { ...baseFund, calledCapital: baseFund.calledCapital + PROPOSAL_LP_BASIS_ADD };
          return (
          <div className="space-y-8">
            {/* ── Proposal Summary ── */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-3">Deal Memo — Proposed Transactions</p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-amber-400">•</span>
                  <span>Take in <span className="text-white font-medium">$350k</span> of new LP capital</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-amber-400">•</span>
                  <span>Purchase <span className="text-white font-medium">50% of <a href="https://nuecesbrewing.com" target="_blank" rel="noopener noreferrer" className="underline decoration-amber-500/50 hover:decoration-amber-400 transition-colors">Nueces Brewing</a></span> for <span className="text-white font-medium">$320k</span> (<span className="text-white font-medium">$120k seller note</span>)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-amber-400">•</span>
                  <span>Purchase <span className="text-white font-medium">$150k</span> of <span className="text-white font-medium">Audily Preferred</span></span>
                </li>
              </ul>
            </div>
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
              const activePct    = lpViewMode === "current" && (lpCurrentPct > 0 || lpHypo > 0)
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
                    {(() => {
                      const accrued = audilyPreferredAccrued() * lpMultiplier;
                      return accrued > 0 ? (
                        <p className="text-[9px] text-slate-600 tabular-nums mt-0.5" title="Audily Series A Preferred dividends accrued since 03/18/26 at 13.4% — included in NAV.">
                          incl. {fmt(accrued)} accrued
                        </p>
                      ) : null;
                    })()}
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
                        onChange={e => { setLpHypotheticalUnits(e.target.value); if (parseFloat(e.target.value) > 0) setLpViewMode("current"); }}
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
                                          {c.commonSharesOutstanding && sh > 0 ? `${((sh / c.commonSharesOutstanding) * 100).toFixed(1)}%` : c.votingOwnership !== undefined ? `${c.votingOwnership.toFixed(1)}%` : "—"}
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

        {!activeCompany && activeTab === "palash-memo" && directInvestor?.id === "palash-jillian" && (() => {
          // ── Helpers (mirror DirectHoldingsTab estVal logic) ──────────────────
          const ppsForCompany = (id: string): number => {
            const c = basePortfolio.find(p => p.id === id);
            if (!c || !c.totalShares) return 0;
            const implied = c.customPricePerShare ? c.customPricePerShare * c.totalShares : c.impliedValuation;
            return implied / c.totalShares;
          };

          // ── Palash's portfolio value (= DirectHoldingsTab portfolioValue, $880.2K) ──
          // Class A Common (purchased + earned): use shares × default PPS where the company
          // is in the fund portfolio; otherwise fall back to the position's estimatedValue.
          // Convertibles + preferred: estimatedValue. RSUs excluded. Outstanding notes are
          // tracked separately as palashActiveCreditValue (Credit allocation, not Equity).
          const palashPortfolioValue = directInvestor.positions.reduce((s, p) => {
            if (p.securityType === "RSU") return s;
            if (p.category === "Short-term Notes") return s;
            if (p.shares && p.companyId && p.securityType === "Class A Common") {
              const pps = ppsForCompany(p.companyId);
              if (pps > 0) return s + p.shares * pps;
            }
            return s + (p.estimatedValue ?? 0);
          }, 0);
          // Active outstanding credit Palash is rolling in — currently the $25k working
          // portion of the 2026-02-03 Audily note. Goes onto the fund as debt + into LP basis.
          const palashActiveCreditValue = directInvestor.positions
            .filter(p => p.category === "Short-term Notes" && (p.estimatedValue ?? 0) > 0)
            .reduce((s, p) => s + (p.estimatedValue ?? 0), 0);

          // ── Palash's KPI inputs ──────────────────────────────────────────────
          // Original basis = total cost basis - total principal repaid (= principalBasis).
          const palashOriginalBasis = directInvestor.positions.reduce((s, p) =>
            s + (p.costBasis ?? 0) - (p.repaid ?? 0), 0);
          const palashUnrealizedGains = palashPortfolioValue - palashOriginalBasis;
          // Cash already returned to Palash from his direct holdings (notes + interest + dividends).
          const palashHistoricalDistributions = directInvestor.positions.reduce((s, p) =>
            s + (p.repaid ?? 0) + (p.interestDividend ?? 0), 0);
          // LP basis = portfolio value (equity, in-kind) + active credit (in-kind) + $100k cash
          const palashLpBasis = palashPortfolioValue + palashActiveCreditValue + PALASH_CASH_CONTRIBUTION;

          // ── LP D in-kind roll-in (at default PPS) ────────────────────────────
          const lpDValue = Object.entries(PALASH_LP_D_SHARES).reduce((s, [id, sh]) =>
            s + sh * ppsForCompany(id), 0);
          const lpDBasis = Math.round(lpDValue);

          // ── Deal economics ───────────────────────────────────────────────────
          const audilyPrefCost   = 150_000;
          const nuecesEquityCost = 320_000;
          const nuecesNote       = 120_000;
          const nuecesCash       = nuecesEquityCost - nuecesNote;     // $200k
          const dealCashTotal    = audilyPrefCost + nuecesCash;        // $350k
          const newCashFromLPs   = PALASH_CASH_CONTRIBUTION + PALASH_OTHER_LP_BASIS; // $350k
          const cashGapVsDeal    = dealCashTotal - newCashFromLPs;     // 0

          // ── Palash's roll-in as new debtPositions on existing companies ──────
          // Convertibles, preferred, and the active outstanding short-term note.
          const palashAudilyPrefRollIn: DebtPosition = {
            id: "palash-audily-pref-rollin", date: "May 2026", instrument: "Preferred",
            principal: 200_000, status: "Current", currentValue: 200_000,
            notes: "Palash roll-in: Audily Series A Preferred (2,000 shares).",
          };
          const palashAudilySafeRollIn: DebtPosition = {
            id: "palash-audily-safe-rollin", date: "Mar 2024", instrument: "SAFE",
            principal: 100_000, status: "Current", currentValue: 125_000,
            notes: "Palash roll-in: SAFE → Series A (1,250 shares).",
          };
          // Active outstanding portion of the 2026-02-03 Audily working note ($25k).
          // Term Loan instrument so it lands in the Credit allocation bucket.
          const palashAudilyNoteRollIn: DebtPosition = {
            id: "palash-audily-note-rollin", date: "Feb 2026", instrument: "Term Loan",
            principal: 25_000, status: "Current", currentValue: palashActiveCreditValue,
            notes: "Palash roll-in: outstanding portion of 2026-02-03 short-term note.",
          };

          // ── Build modified portfolio (bottom-up, mirrors proposal tab) ───────
          const portfolioPalash = withAudilyAccrued(basePortfolio).map(c => {
            let modified: typeof c = c;

            if (c.id === "audily") {
              modified = { ...modified, debtPositions: [
                ...(modified.debtPositions ?? []),
                PROPOSAL_AUDILY_PREFERRED,
                palashAudilyPrefRollIn,
                palashAudilySafeRollIn,
                ...(palashActiveCreditValue > 0 ? [palashAudilyNoteRollIn] : []),
              ]};
            }

            if (c.id === "nueces-brewing") {
              modified = {
                ...modified,
                invested: 320_000,
                currentValue: 320_000,
                ownership: 50,
                votingOwnership: 50,
                impliedValuation: 640_000,
                customPricePerShare: 6.40,
                totalShares: 100_000,
                shareTransactions: [
                  ...(modified.shareTransactions ?? []),
                  { date: "May 2026", type: "Common" as const, shares: 50_000, amount: 320_000, notes: "Nueces Brewing 50% acquisition." },
                ],
              };
            }

            // Common roll-ins from Palash and LP D
            const palashCommonAdd = PALASH_ROLLUP_SHARES[c.id] ?? 0;
            const lpDCommonAdd    = PALASH_LP_D_SHARES[c.id] ?? 0;
            if (palashCommonAdd > 0 || lpDCommonAdd > 0) {
              const pps = ppsForCompany(c.id);
              const additions: ShareTransaction[] = [];
              if (palashCommonAdd > 0) {
                additions.push({ date: "May 2026", type: "Common", shares: palashCommonAdd, amount: Math.round(palashCommonAdd * pps), notes: "Palash in-kind roll-in." });
              }
              if (lpDCommonAdd > 0) {
                additions.push({ date: "May 2026", type: "Common", shares: lpDCommonAdd, amount: Math.round(lpDCommonAdd * pps), notes: "LP D in-kind roll-in." });
              }
              modified = { ...modified, shareTransactions: [...(modified.shareTransactions ?? []), ...additions] };
            }

            return modified;
          });

          // Synthetic entries for companies Palash holds that aren't in basePortfolio.
          type CompanyLike = {
            id: string; name: string; accentColor?: string; status: string;
            currentValue?: number; totalShares?: number; customPricePerShare?: number; impliedValuation?: number;
            shareTransactions?: ShareTransaction[]; debtPositions?: DebtPosition[]; optionPositions?: typeof basePortfolio[number]["optionPositions"];
          };
          // nth Venture — Palash's SAFE + Convertible Notes roll-in (debt-only).
          const nthVentureSynthetic: CompanyLike = {
            id: "nth-venture",
            name: "nth Venture",
            accentColor: "#64748B",
            status: "active",
            currentValue: 170_000,
            shareTransactions: [],
            debtPositions: [
              { id: "palash-nth-safe", date: "Feb 2022", instrument: "SAFE", principal: 20_000, status: "Current", currentValue: 20_000, notes: "Palash roll-in: nth Venture SAFE → Series A (200,000 shares)." },
              { id: "palash-nth-conv", date: "Jun 2023", instrument: "Convertible Note", principal: 150_000, status: "Current", currentValue: 150_000, notes: "Palash roll-in: nth Venture Convertible Notes." },
            ],
          };
          // Sentius Development — Palash's Class A Common roll-in (no PPS in fund data; use estVal).
          const palashSentiusShares = PALASH_ROLLUP_SHARES["sentius"] ?? 0;
          const sentiusSynthetic: CompanyLike = {
            id: "sentius",
            name: "Sentius Development",
            accentColor: "#06B6D4",
            status: "active",
            currentValue: 27_500,   // sum of Palash's Sentius position estimatedValue
            shareTransactions: palashSentiusShares > 0
              ? [{ date: "May 2026", type: "Common", shares: palashSentiusShares, amount: 27_500, notes: "Palash in-kind roll-in." }]
              : [],
            debtPositions: [],
          };

          // ── Bottom-up per-company values (no fake NAV) ───────────────────────
          const ALLOC_CREDIT_INSTR = ["Term Loan", "Line of Credit", "Revenue Based Financing"];
          const allCompanies: CompanyLike[] = [
            ...portfolioPalash.filter(c => c.status === "active"),
            sentiusSynthetic,
            nthVentureSynthetic,
          ];

          const companyRows = allCompanies.map(c => {
            const pps = c.totalShares
              ? (c.customPricePerShare ? c.customPricePerShare * c.totalShares : (c.impliedValuation ?? 0)) / c.totalShares
              : 0;

            // Pre-deal Common shares (excluding rollups + deal additions; checks transaction notes)
            const commonAll = (c.shareTransactions ?? []).filter(t => t.type === "Common");
            const fundCommonPre = commonAll
              .filter(t => !t.notes?.startsWith("Palash") && !t.notes?.startsWith("LP D") && !t.notes?.startsWith("Nueces Brewing 50%"))
              .reduce((s, t) => s + (t.shares ?? 0), 0);
            const palashRollIn = PALASH_ROLLUP_SHARES[c.id] ?? 0;
            const lpDRollIn    = PALASH_LP_D_SHARES[c.id] ?? 0;
            const dealShares   = c.id === "nueces-brewing" ? 50_000 : 0;
            const postShares   = fundCommonPre + palashRollIn + lpDRollIn + dealShares;

            const equityVal = pps > 0 && postShares > 0
              ? postShares * pps
              : (c.id === "nth-venture" ? 0 : (c.currentValue ?? 0));
            const debtVal = (c.debtPositions ?? [])
              .filter(d => d.status !== "Repaid")
              .reduce((s, d) => s + d.currentValue, 0);
            const optionVal = (c.optionPositions ?? []).reduce((s: number, o) => {
              const intrinsic = o.shares * Math.max(pps - o.strikePrice, 0);
              const timeVal   = o.shares * pps * ((optionVariances[o.id] ?? 0) / 100);
              return s + intrinsic + timeVal;
            }, 0);

            return {
              id: c.id,
              name: c.name,
              accent: c.accentColor || "#64748B",
              pps,
              fundCommonPre, palashRollIn, lpDRollIn, dealShares, postShares,
              equityVal, debtVal, optionVal,
              value: equityVal + debtVal + optionVal,
              isNew: c.id === "nueces-brewing" || c.id === "nth-venture",
            };
          }).filter(r => r.value > 0).sort((a, b) => b.value - a.value);

          // Allocation by security type (post-deal, post-rollup)
          const equityTypeBasis  = companyRows.reduce((s, r) => s + r.equityVal, 0);
          const optionsTypeBasis = companyRows.reduce((s, r) => s + r.optionVal, 0);
          let creditTypeBasis = 0, convertTypeBasis = 0;
          for (const c of allCompanies) {
            for (const d of (c.debtPositions ?? [])) {
              if (d.status === "Repaid") continue;
              if (ALLOC_CREDIT_INSTR.includes(d.instrument)) creditTypeBasis += d.currentValue;
              else convertTypeBasis += d.currentValue;
            }
          }
          // Fund cash: existing + new from LPs - deal cash spend = existing only ($2,329.95)
          const cashTypeBasis = cashPositions.reduce((s, c) => s + c.balance, 0);

          const allocByType = [
            { label: "Equity",       amount: equityTypeBasis,  color: "#10B981" },
            { label: "Convertibles", amount: convertTypeBasis, color: "#F59E0B" },
            { label: "Credit",       amount: creditTypeBasis,  color: "#6366F1" },
            { label: "Options",      amount: optionsTypeBasis, color: "#F43F5E" },
            { label: "Cash",         amount: cashTypeBasis,    color: "#60A5FA" },
          ].filter(a => a.amount > 0);
          const allocTotalByType = allocByType.reduce((s, a) => s + a.amount, 0);

          // ── NAV: bottom-up gross assets minus leverage ───────────────────────
          const grossAssets    = companyRows.reduce((s, r) => s + r.value, 0) + cashTypeBasis;
          const newFundLeverage = BASE_FUND_LEVERAGE + nuecesNote;
          const newFundNav      = grossAssets - newFundLeverage;

          // ── LP units ($1/unit par convention) ────────────────────────────────
          const newLpBasis      = palashLpBasis + PALASH_OTHER_LP_BASIS + lpDBasis;
          const newLpUnitsTotal = BASE_LP_TOTAL_UNITS + newLpBasis;
          const palashPct       = newLpUnitsTotal > 0 ? palashLpBasis / newLpUnitsTotal : 0;
          const palashNav       = palashPct * newFundNav;
          const palashMoic      = palashLpBasis > 0 ? palashNav / palashLpBasis : 0;
          // DPI/TVPI from Palash's LP perspective post lock-in: no fund distributions to him yet.
          const palashDpi       = 0;
          const palashTvpi      = palashMoic;

          // ── Look-through: Palash's pro-rata share of fund ────────────────────
          const lookThroughByType = allocByType.map(a => ({ ...a, palashShare: a.amount * palashPct }));
          const lookThroughByCompany = companyRows.map(r => ({ ...r, palashShare: r.value * palashPct }));

          // ── Donut arcs ───────────────────────────────────────────────────────
          const donutItems = companyRows;
          const donutTotal = donutItems.reduce((s, d) => s + d.value, 0);
          const cx = 80, cy = 80, R = 62, r = 40;
          let ang = -Math.PI / 2;
          const arcs = donutItems.map(d => {
            const sweep = donutTotal > 0 ? (d.value / donutTotal) * 2 * Math.PI : 0;
            const x1 = cx + R * Math.cos(ang),       y1 = cy + R * Math.sin(ang);
            ang += sweep;
            const x2 = cx + R * Math.cos(ang),       y2 = cy + R * Math.sin(ang);
            const ix1 = cx + r * Math.cos(ang - sweep), iy1 = cy + r * Math.sin(ang - sweep);
            const ix2 = cx + r * Math.cos(ang),         iy2 = cy + r * Math.sin(ang);
            const large = sweep > Math.PI ? 1 : 0;
            return { ...d, path: `M${x1},${y1} A${R},${R},0,${large},1,${x2},${y2} L${ix2},${iy2} A${r},${r},0,${large},0,${ix1},${iy1} Z` };
          });

          // ── LP cap-table rows ────────────────────────────────────────────────
          const lpRows = [
            { id: "existing", name: "Existing Co-Owner Fund LPs",  units: BASE_LP_TOTAL_UNITS,    basis: BASE_LP_TOTAL_UNITS,    type: "—",                                                                          accent: "#64748B" },
            { id: "palash",   name: `${directInvestor.name} (you)`, units: palashLpBasis,         basis: palashLpBasis,          type: `in-kind ${fmt(palashPortfolioValue + palashActiveCreditValue)} + ${fmt(PALASH_CASH_CONTRIBUTION)} cash`, accent: "#A78BFA" },
            { id: "cashLP",   name: "Cash LP (raised elsewhere)",   units: PALASH_OTHER_LP_BASIS, basis: PALASH_OTHER_LP_BASIS,  type: "cash",                                                                       accent: "#34D399" },
            { id: "lpD",      name: "LP D",                         units: lpDBasis,              basis: lpDBasis,               type: "in-kind equity roll-up",                                                     accent: "#F59E0B" },
          ];

          return (
          <div className="space-y-4 sm:space-y-6">
            {/* ── Header summary ── */}
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 px-4 py-4 sm:px-6 sm:py-5">
              <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-purple-400 mb-2 sm:mb-3">My Deal Memo — LP Roll-up Scenario</p>
              <ul className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-sm text-slate-300 leading-snug">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-purple-400">•</span>
                  <span>Roll all direct holdings into Co-Owner Fund LP at default PPS — portfolio value <span className="text-white font-medium">{fmt(palashPortfolioValue)}</span> + outstanding credit <span className="text-white font-medium">{fmt(palashActiveCreditValue)}</span> + <span className="text-white font-medium">{fmt(PALASH_CASH_CONTRIBUTION)}</span> cash → LP basis (locked) <span className="text-emerald-400 font-medium">{fmt(palashLpBasis)}</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-purple-400">•</span>
                  <span>Another LP contributes <span className="text-white font-medium">{fmt(PALASH_OTHER_LP_BASIS)}</span> cash (raised elsewhere)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-purple-400">•</span>
                  <span>LP D rolls in 4 portfolio company positions at default PPS — total <span className="text-white font-medium">{fmt(lpDBasis)}</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-purple-400">•</span>
                  <span>Fund executes the deal: <span className="text-white font-medium">{fmt(audilyPrefCost)}</span> Audily Series A Preferred + <span className="text-white font-medium">50% of <a href="https://nuecesbrewing.com" target="_blank" rel="noopener noreferrer" className="underline decoration-purple-500/50 hover:decoration-purple-400 transition-colors">Nueces Brewing</a></span> for <span className="text-white font-medium">{fmt(nuecesEquityCost)}</span> ({fmt(nuecesNote)} seller note, {fmt(nuecesCash)} cash) — <span className="text-amber-300">{fmt(dealCashTotal)} total cash required</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-purple-400">•</span>
                  <span>New LP basis: <span className="text-emerald-400 font-medium">{fmt(newLpBasis)}</span> · New cash in: <span className="text-emerald-400 font-medium">{fmt(newCashFromLPs)}</span> ({fmt(PALASH_CASH_CONTRIBUTION)} from you + {fmt(PALASH_OTHER_LP_BASIS)} from other LP) · Deal cash gap: <span style={{ color: cashGapVsDeal === 0 ? "#34D399" : "#F59E0B" }} className="font-medium">{fmt(cashGapVsDeal)}</span> {cashGapVsDeal === 0 && "— fully funded"}</span>
                </li>
              </ul>
            </div>

            {/* ── My Holdings KPIs (progression + LP metrics) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl border border-[#1E2D3D] bg-[#0D1421] p-3 sm:p-4">
                <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-slate-500">① Original Basis</p>
                <p className="text-sm sm:text-base font-bold tabular-nums text-slate-300 mt-1">{fmt(palashOriginalBasis)}</p>
                <p className="text-[9px] sm:text-[10px] text-slate-600 mt-1">cost basis − principal repaid</p>
              </div>
              <div className="rounded-xl border border-purple-500/40 bg-purple-500/10 p-3 sm:p-4">
                <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-purple-300">② LP Basis (Lock-in)</p>
                <p className="text-sm sm:text-base font-bold tabular-nums text-purple-200 mt-1">{fmt(palashLpBasis)}</p>
                <p className="text-[9px] sm:text-[10px] text-purple-400/70 mt-1 leading-tight">{fmt(palashPortfolioValue)} equity + {fmt(palashActiveCreditValue)} credit + {fmt(PALASH_CASH_CONTRIBUTION)} cash</p>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 sm:p-4">
                <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-emerald-400">③ NAV (Post Deal)</p>
                <p className="text-sm sm:text-base font-bold tabular-nums text-emerald-300 mt-1">{fmt(palashNav)}</p>
                <p className="text-[9px] sm:text-[10px] text-slate-500 mt-1 leading-tight">{(palashPct * 100).toFixed(2)}% × fund NAV {fmt(newFundNav)}</p>
              </div>
              <div className="rounded-xl border border-[#1E2D3D] bg-[#0D1421] p-3 sm:p-4">
                <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-slate-500">④ LP MOIC</p>
                <p className="text-sm sm:text-base font-bold tabular-nums mt-1" style={{ color: palashMoic >= 1 ? "#10B981" : "#F87171" }}>{palashMoic.toFixed(2)}×</p>
                <p className="text-[9px] sm:text-[10px] text-slate-600 mt-1">NAV ÷ LP basis</p>
              </div>
              <div className="rounded-xl border border-[#1E2D3D] bg-[#0D1421] p-3 sm:p-4">
                <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-slate-500">⑤ DPI</p>
                <p className="text-sm sm:text-base font-bold tabular-nums text-slate-300 mt-1">{palashDpi.toFixed(2)}×</p>
                <p className="text-[9px] sm:text-[10px] text-slate-600 mt-1">distributions ÷ basis</p>
              </div>
              <div className="rounded-xl border border-[#1E2D3D] bg-[#0D1421] p-3 sm:p-4">
                <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-slate-500">⑥ TVPI</p>
                <p className="text-sm sm:text-base font-bold tabular-nums mt-1" style={{ color: palashTvpi >= 1 ? "#10B981" : "#F87171" }}>{palashTvpi.toFixed(2)}×</p>
                <p className="text-[9px] sm:text-[10px] text-slate-600 mt-1">(NAV + dist.) ÷ basis</p>
              </div>
            </div>

            {/* ── Fund Holdings Breakdown (proposal-tab style, bottom-up) ── */}
            <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
              <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#1E2D3D] divide-x sm:divide-x divide-[#1E2D3D]">
                <div className="px-3 sm:px-4 py-3 sm:py-3.5 border-b sm:border-b-0 border-[#1E2D3D]">
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium">Fund NAV</p>
                  <p className="text-sm font-bold mt-1 tabular-nums" style={{ color: "#10B981" }}>{fmt(newFundNav)}</p>
                  <p className="text-[9px] text-slate-600 mt-0.5 leading-tight">assets {fmt(grossAssets)} · lev. -{fmt(newFundLeverage)}</p>
                </div>
                <div className="px-3 sm:px-4 py-3 sm:py-3.5 border-b sm:border-b-0 border-[#1E2D3D]">
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium">LP Basis Total</p>
                  <p className="text-sm font-bold mt-1 tabular-nums text-slate-200">{fmt(BASE_LP_TOTAL_UNITS + newLpBasis)}</p>
                  <p className="text-[9px] text-slate-600 mt-0.5 leading-tight">{(BASE_LP_TOTAL_UNITS + newLpBasis).toLocaleString()} units · $1/unit par</p>
                </div>
                <div className="px-3 sm:px-4 py-3 sm:py-3.5">
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium">Fund MOIC</p>
                  <p className="text-sm font-bold mt-1 tabular-nums" style={{ color: "#10B981" }}>{(newFundNav / (BASE_LP_TOTAL_UNITS + newLpBasis)).toFixed(2)}×</p>
                  <p className="text-[9px] text-slate-600 mt-0.5">NAV ÷ LP basis</p>
                </div>
                <div className="px-3 sm:px-4 py-3 sm:py-3.5">
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium">Companies</p>
                  <p className="text-sm font-bold mt-1 tabular-nums text-slate-200">{companyRows.length}</p>
                  <p className="text-[9px] text-slate-600 mt-0.5">active positions</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-[#1E2D3D]">
                {/* LEFT: Allocation by security type */}
                <div className="flex-1 px-4 sm:px-5 py-4 sm:py-5">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-medium mb-3">Allocation by Security Type</p>
                  {allocByType.map(a => {
                    const pct = allocTotalByType > 0 ? a.amount / allocTotalByType : 0;
                    return (
                      <div key={a.label}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                            <span className="text-xs text-slate-300 font-medium">{a.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs tabular-nums text-slate-400">{fmt(a.amount)}</span>
                            <span className="text-[10px] tabular-nums text-slate-600 w-10 text-right">{(pct * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#111D2E] rounded-full overflow-hidden mb-3">
                          <div className="h-full rounded-full" style={{ width: `${(pct * 100).toFixed(1)}%`, background: a.color, opacity: 0.8 }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-[#1E2D3D] flex items-center justify-between">
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider">Total</span>
                    <span className="text-xs font-semibold text-slate-300 tabular-nums">{fmt(allocTotalByType)}</span>
                  </div>
                </div>

                {/* RIGHT: Donut by company */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 px-4 sm:px-5 py-4 sm:py-5 flex-1">
                  <div className="shrink-0 flex justify-center">
                    <svg width={140} height={140} viewBox="0 0 160 160" className="sm:w-40 sm:h-40">
                      {arcs.map((a, i) => <path key={i} d={a.path} fill={a.accent} fillOpacity={0.85} />)}
                      <text x={80} y={76} textAnchor="middle" fill="#e2e8f0" fontSize={13} fontWeight="700" fontFamily="inherit">{fmt(donutTotal)}</text>
                      <text x={80} y={91} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="inherit">gross</text>
                    </svg>
                  </div>
                  <div className="flex flex-col gap-2 content-center justify-center min-w-0 flex-1">
                    {donutItems.map((d, i) => (
                      <div key={i} className="flex items-center gap-2.5 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.accent }} />
                        <span className="text-xs text-slate-400 truncate flex-1">{d.name.replace(" Inc.", "").replace(" Recruiting", "")}{d.isNew && <span className="ml-1 text-[8px] text-emerald-400">NEW</span>}</span>
                        <span className="text-xs font-semibold tabular-nums text-slate-200 shrink-0">{fmt(d.value)}</span>
                        <span className="text-[10px] text-slate-600 shrink-0 w-10 text-right">{donutTotal > 0 ? ((d.value / donutTotal) * 100).toFixed(1) : "0.0"}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Look-through Asset Allocation (Palash's pro-rata view) ── */}
            <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
              <div className="border-b border-[#1E2D3D] px-4 sm:px-5 py-2.5 sm:py-3 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#A78BFA" }} />
                <p className="text-xs sm:text-sm font-semibold text-slate-200">My Look-through ({(palashPct * 100).toFixed(2)}% of fund)</p>
              </div>
              <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-[#1E2D3D]">
                {/* By type */}
                <div className="flex-1 px-4 sm:px-5 py-4 sm:py-5">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-medium mb-3">By Security Type</p>
                  {lookThroughByType.map(a => {
                    const pct = allocTotalByType > 0 ? a.amount / allocTotalByType : 0;
                    return (
                      <div key={a.label}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                            <span className="text-xs text-slate-300 font-medium">{a.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs tabular-nums text-purple-300">{fmt(a.palashShare)}</span>
                            <span className="text-[10px] tabular-nums text-slate-600 w-10 text-right">{(pct * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#111D2E] rounded-full overflow-hidden mb-3">
                          <div className="h-full rounded-full" style={{ width: `${(pct * 100).toFixed(1)}%`, background: a.color, opacity: 0.8 }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-[#1E2D3D] flex items-center justify-between">
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider">My Total</span>
                    <span className="text-xs font-semibold text-purple-300 tabular-nums">{fmt(lookThroughByType.reduce((s, a) => s + a.palashShare, 0))}</span>
                  </div>
                </div>

                {/* By company */}
                <div className="flex-1 px-4 sm:px-5 py-4 sm:py-5">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-medium mb-3">By Company</p>
                  {lookThroughByCompany.map(c => {
                    const pct = donutTotal > 0 ? c.value / donutTotal : 0;
                    return (
                      <div key={c.id}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.accent }} />
                            <span className="text-xs text-slate-300 font-medium truncate">{c.name.replace(" Inc.", "").replace(" Recruiting", "")}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs tabular-nums text-purple-300">{fmt(c.palashShare)}</span>
                            <span className="text-[10px] tabular-nums text-slate-600 w-10 text-right">{(pct * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#111D2E] rounded-full overflow-hidden mb-2">
                          <div className="h-full rounded-full" style={{ width: `${(pct * 100).toFixed(1)}%`, background: c.accent, opacity: 0.8 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── 3 LP Contribution cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              {lpRows.filter(l => l.id !== "existing").map(lp => {
                const pct = newLpUnitsTotal > 0 ? lp.units / newLpUnitsTotal : 0;
                return (
                  <div key={lp.id} className="rounded-xl border border-[#1E2D3D] bg-[#0D1421] p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: lp.accent }} />
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 truncate">{lp.name}</p>
                    </div>
                    <p className="text-sm sm:text-base font-bold tabular-nums" style={{ color: lp.accent }}>{fmt(lp.basis)}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">LP basis · {lp.type}</p>
                    <div className="mt-2 pt-2 border-t border-[#1E2D3D]/60">
                      <p className="text-[10px] text-slate-500 tabular-nums">{lp.units.toLocaleString()} units</p>
                      <p className="text-[10px] text-slate-600 tabular-nums">{(pct * 100).toFixed(2)}% of post-roll-up fund</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Resulting Fund Portfolio table ── */}
            <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
              <div className="border-b border-[#1E2D3D] px-4 sm:px-5 py-2.5 sm:py-3 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#10B981" }} />
                <p className="text-xs sm:text-sm font-semibold text-slate-200">Resulting Fund Portfolio</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                    <tr>
                      <th className="py-2 px-3 text-left text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Company</th>
                      <th className="py-2 px-3 text-right text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Common Pre</th>
                      <th className="py-2 px-3 text-right text-[10px] text-slate-500 font-semibold uppercase tracking-wider">+ Palash</th>
                      <th className="py-2 px-3 text-right text-[10px] text-slate-500 font-semibold uppercase tracking-wider">+ LP D</th>
                      <th className="py-2 px-3 text-right text-[10px] text-slate-500 font-semibold uppercase tracking-wider">+ Deal</th>
                      <th className="py-2 px-3 text-right text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Common Post</th>
                      <th className="py-2 px-3 text-right text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Equity Value</th>
                      <th className="py-2 px-3 text-right text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Debt/Pref</th>
                      <th className="py-2 px-3 text-right text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Options</th>
                      <th className="py-2 px-3 text-right text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Company Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0D1421]">
                    {companyRows.map(row => (
                      <tr key={row.id} className="hover:bg-[#111D2E]/40 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: row.accent }} />
                            <span className="font-medium text-slate-200">{row.name.replace(" Inc.", "").replace(" Recruiting", "")}</span>
                            {row.isNew && <span className="text-[8px] font-semibold px-1 py-0.5 rounded" style={{ background: "#064E3B", color: "#34D399" }}>NEW</span>}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-slate-400">{row.fundCommonPre > 0 ? row.fundCommonPre.toLocaleString() : "—"}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: row.palashRollIn > 0 ? "#A78BFA" : "#475569" }}>{row.palashRollIn > 0 ? `+${row.palashRollIn.toLocaleString()}` : "—"}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: row.lpDRollIn > 0 ? "#F59E0B" : "#475569" }}>{row.lpDRollIn > 0 ? `+${row.lpDRollIn.toLocaleString()}` : "—"}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: row.dealShares > 0 ? "#34D399" : "#475569" }}>{row.dealShares > 0 ? `+${row.dealShares.toLocaleString()}` : "—"}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-slate-200 font-semibold">{row.postShares > 0 ? row.postShares.toLocaleString() : "—"}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: row.equityVal > 0 ? "#10B981" : "#475569" }}>{row.equityVal > 0 ? fmt(row.equityVal) : "—"}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: row.debtVal > 0 ? "#F59E0B" : "#475569" }}>{row.debtVal > 0 ? fmt(row.debtVal) : "—"}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: row.optionVal > 0 ? "#F43F5E" : "#475569" }}>{row.optionVal > 0 ? fmt(row.optionVal) : "—"}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-semibold" style={{ color: row.accent }}>{fmt(row.value)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-[#1E2D3D] bg-[#080E1A]">
                      <td className="py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total</td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-300">{companyRows.reduce((s, r) => s + r.fundCommonPre, 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right tabular-nums" style={{ color: "#A78BFA" }}>+{companyRows.reduce((s, r) => s + r.palashRollIn, 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right tabular-nums" style={{ color: "#F59E0B" }}>+{companyRows.reduce((s, r) => s + r.lpDRollIn, 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right tabular-nums" style={{ color: "#34D399" }}>+{companyRows.reduce((s, r) => s + r.dealShares, 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-200 font-semibold">{companyRows.reduce((s, r) => s + r.postShares, 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-emerald-400 font-semibold">{fmt(equityTypeBasis)}</td>
                      <td className="py-2 px-3 text-right tabular-nums" style={{ color: "#F59E0B" }}>{fmt(creditTypeBasis + convertTypeBasis)}</td>
                      <td className="py-2 px-3 text-right tabular-nums" style={{ color: "#F43F5E" }}>{fmt(optionsTypeBasis)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-emerald-400 font-semibold">{fmt(grossAssets - cashTypeBasis)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── LP Cap Table ── */}
            <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
              <div className="border-b border-[#1E2D3D] px-4 sm:px-5 py-2.5 sm:py-3 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#8B5CF6" }} />
                <p className="text-xs sm:text-sm font-semibold text-slate-200">LP Cap Table — Post Roll-up</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                    <tr>
                      <th className="py-2 px-3 text-left text-[10px] text-slate-500 font-semibold uppercase tracking-wider">LP</th>
                      <th className="py-2 px-3 text-left text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Type</th>
                      <th className="py-2 px-3 text-right text-[10px] text-slate-500 font-semibold uppercase tracking-wider">LP Basis</th>
                      <th className="py-2 px-3 text-right text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Units</th>
                      <th className="py-2 px-3 text-right text-[10px] text-slate-500 font-semibold uppercase tracking-wider">% of Fund</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0D1421]">
                    {lpRows.map(lp => {
                      const pct = newLpUnitsTotal > 0 ? lp.units / newLpUnitsTotal : 0;
                      const isPalash = lp.id === "palash";
                      return (
                        <tr key={lp.id} className={`hover:bg-[#111D2E]/40 transition-colors ${isPalash ? "bg-purple-500/5" : ""}`}>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: lp.accent }} />
                              <span className="font-medium text-slate-200">{lp.name}</span>
                              {isPalash && <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "#4C1D95", color: "#C4B5FD" }}>YOU</span>}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">{lp.type}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-slate-200 font-medium">{fmt(lp.basis)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-slate-400">{lp.units.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-semibold" style={{ color: isPalash ? "#A78BFA" : "#94A3B8" }}>
                            {(pct * 100).toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t border-[#1E2D3D] bg-[#080E1A]">
                      <td className="py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider" colSpan={2}>Total</td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-200 font-semibold">{fmt(newLpUnitsTotal)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-200 font-semibold">{newLpUnitsTotal.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-200 font-semibold">100.00%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          );
        })()}

        {!activeCompany && activeTab === "scenario" && (() => {
          // ── Scenario shadowing (Proposal + additional equity positions) ────────
          const mbPps       = basePortfolio.find(c => c.id === "merchant-boxes")!.customPricePerShare!;
          const audilyPps   = basePortfolio.find(c => c.id === "audily")!.customPricePerShare!;
          const sbr2thPps   = basePortfolio.find(c => c.id === "sbr2th")!.customPricePerShare!;
          const pigeonPps   = basePortfolio.find(c => c.id === "certd")!.customPricePerShare!;
          const falconerPps = basePortfolio.find(c => c.id === "falconer")!.customPricePerShare!;
          const mbAmt       = Math.round(SCENARIO_MB_SHARES       * mbPps);
          const audilyAmt   = Math.round(SCENARIO_AUDILY_SHARES   * audilyPps);
          const sbr2thAmt   = Math.round(SCENARIO_SBR2TH_SHARES   * sbr2thPps);
          const pigeonAmt   = Math.round(SCENARIO_PIGEON_SHARES   * pigeonPps);
          const falconerAmt = Math.round(SCENARIO_FALCONER_SHARES * falconerPps);
          const scenarioEquityBasis = mbAmt + audilyAmt + sbr2thAmt + pigeonAmt + falconerAmt + 300_000;
          const portfolio = withAudilyAccrued(basePortfolio).map(c => {
            if (c.id === "audily") {
              return {
                ...c,
                invested: (c.invested || 0) + audilyAmt,
                currentValue: c.currentValue + audilyAmt,
                debtPositions: [...(c.debtPositions ?? []), PROPOSAL_AUDILY_PREFERRED, SCENARIO_AUDILY_PREFERRED],
                shareTransactions: [
                  ...(c.shareTransactions ?? []),
                  { date: "May 2026", type: "Common" as const, shares: SCENARIO_AUDILY_SHARES, amount: audilyAmt, notes: "Scenario additional common share purchase." },
                ],
              };
            }
            if (c.id === "nueces-brewing") {
              return {
                ...c,
                invested: 320_000,
                currentValue: 320_000,
                ownership: 50,
                votingOwnership: 50,
                impliedValuation: 640_000,
                customPricePerShare: 6.40,
                totalShares: 100_000,
                shareTransactions: [
                  ...(c.shareTransactions ?? []),
                  { date: "May 2026", type: "Common" as const, shares: 50_000, amount: 320_000, notes: "Proposed initial common share purchase — 50% of economic and voting." },
                ],
              };
            }
            if (c.id === "merchant-boxes") {
              return {
                ...c,
                invested: (c.invested || 0) + mbAmt,
                currentValue: c.currentValue + mbAmt,
                shareTransactions: [
                  ...(c.shareTransactions ?? []),
                  { date: "May 2026", type: "Common" as const, shares: SCENARIO_MB_SHARES, amount: mbAmt, notes: "Scenario common share purchase." },
                ],
              };
            }
            if (c.id === "sbr2th") {
              return {
                ...c,
                invested: (c.invested || 0) + sbr2thAmt,
                currentValue: c.currentValue + sbr2thAmt,
                shareTransactions: [
                  ...(c.shareTransactions ?? []),
                  { date: "May 2026", type: "Common" as const, shares: SCENARIO_SBR2TH_SHARES, amount: sbr2thAmt, notes: "Scenario common share purchase." },
                ],
              };
            }
            if (c.id === "certd") {
              return {
                ...c,
                invested: (c.invested || 0) + pigeonAmt,
                currentValue: c.currentValue + pigeonAmt,
                shareTransactions: [
                  ...(c.shareTransactions ?? []),
                  { date: "May 2026", type: "Common" as const, shares: SCENARIO_PIGEON_SHARES, amount: pigeonAmt, notes: "Scenario common share purchase." },
                ],
              };
            }
            if (c.id === "falconer") {
              return {
                ...c,
                invested: (c.invested || 0) + falconerAmt,
                currentValue: c.currentValue + falconerAmt,
                shareTransactions: [
                  ...(c.shareTransactions ?? []),
                  { date: "May 2026", type: "Common" as const, shares: SCENARIO_FALCONER_SHARES, amount: falconerAmt, notes: "Scenario common share purchase." },
                ],
              };
            }
            return c;
          });
          const SCENARIO_LP_ADD = PROPOSAL_LP_BASIS_ADD + scenarioEquityBasis;
          const LP_TOTAL_UNITS = BASE_LP_TOTAL_UNITS + SCENARIO_LP_ADD;
          const FUND_LEVERAGE  = BASE_FUND_LEVERAGE  + PROPOSAL_LEVERAGE_ADD;
          const fund = { ...baseFund, calledCapital: baseFund.calledCapital + SCENARIO_LP_ADD };
          return (
          <div className="space-y-8">
            {/* ── Scenario Summary ── */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-3">Scenario — Proposed Transactions</p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-amber-400">•</span>
                  <span>Take in <span className="text-white font-medium">${(SCENARIO_LP_ADD / 1000).toFixed(0)}k</span> of new LP capital (includes all positions below at default values)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-amber-400">•</span>
                  <span>Purchase <span className="text-white font-medium">50% of <a href="https://nuecesbrewing.com" target="_blank" rel="noopener noreferrer" className="underline decoration-amber-500/50 hover:decoration-amber-400 transition-colors">Nueces Brewing</a></span> for <span className="text-white font-medium">$320k</span> (<span className="text-white font-medium">$120k seller note</span>)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-amber-400">•</span>
                  <span>Purchase <span className="text-white font-medium">$150k</span> of <span className="text-white font-medium">Audily Preferred</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-amber-400">•</span>
                  <span>Purchase <span className="text-white font-medium">{SCENARIO_MB_SHARES.toLocaleString()}</span> shares of <span className="text-white font-medium">Merchant Boxes</span> for <span className="text-white font-medium">${mbAmt.toLocaleString()}</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-amber-400">•</span>
                  <span>Purchase <span className="text-white font-medium">{SCENARIO_AUDILY_SHARES.toLocaleString()}</span> shares of <span className="text-white font-medium">Audily</span> for <span className="text-white font-medium">${audilyAmt.toLocaleString()}</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-amber-400">•</span>
                  <span>Purchase <span className="text-white font-medium">{SCENARIO_SBR2TH_SHARES.toLocaleString()}</span> shares of <span className="text-white font-medium">SBR2TH Recruiting</span> for <span className="text-white font-medium">${sbr2thAmt.toLocaleString()}</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-amber-400">•</span>
                  <span>Purchase <span className="text-white font-medium">{SCENARIO_PIGEON_SHARES.toLocaleString()}</span> shares of <span className="text-white font-medium">Pigeon Service</span> for <span className="text-white font-medium">${pigeonAmt.toLocaleString()}</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-amber-400">•</span>
                  <span>Purchase <span className="text-white font-medium">{SCENARIO_FALCONER_SHARES.toLocaleString()}</span> shares of <span className="text-white font-medium">Falconer</span> for <span className="text-white font-medium">${falconerAmt.toLocaleString()}</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-amber-400">•</span>
                  <span>Purchase <span className="text-white font-medium">$300k</span> of <span className="text-white font-medium">Audily Preferred</span></span>
                </li>
              </ul>
            </div>
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
              const activePct    = lpViewMode === "current" && (lpCurrentPct > 0 || lpHypo > 0)
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
                    {(() => {
                      const accrued = audilyPreferredAccrued() * lpMultiplier;
                      return accrued > 0 ? (
                        <p className="text-[9px] text-slate-600 tabular-nums mt-0.5" title="Audily Series A Preferred dividends accrued since 03/18/26 at 13.4% — included in NAV.">
                          incl. {fmt(accrued)} accrued
                        </p>
                      ) : null;
                    })()}
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
                        onChange={e => { setLpHypotheticalUnits(e.target.value); if (parseFloat(e.target.value) > 0) setLpViewMode("current"); }}
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
                                          {c.commonSharesOutstanding && sh > 0 ? `${((sh / c.commonSharesOutstanding) * 100).toFixed(1)}%` : c.votingOwnership !== undefined ? `${c.votingOwnership.toFixed(1)}%` : "—"}
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

        {!activeCompany && activeTab === "scenario-b" && (() => {
          // ── Scenario B shadowing ────────────────────────────────────────────
          const pigeonPps   = basePortfolio.find(c => c.id === "certd")!.customPricePerShare!;
          const falconerPps = basePortfolio.find(c => c.id === "falconer")!.customPricePerShare!;
          const sbr2thPps   = basePortfolio.find(c => c.id === "sbr2th")!.customPricePerShare!;
          const mbPps       = basePortfolio.find(c => c.id === "merchant-boxes")!.customPricePerShare!;
          const pigeonAmt   = Math.round(SCENARIOB_PIGEON_SHARES   * pigeonPps);
          const falconerAmt = Math.round(SCENARIOB_FALCONER_SHARES * falconerPps);
          const sbr2thAmt   = Math.round(SCENARIOB_SBR2TH_SHARES   * sbr2thPps);
          const mbAmt       = Math.round(SCENARIOB_MB_SHARES        * mbPps);
          const scenarioBEquityBasis = pigeonAmt + falconerAmt + sbr2thAmt + mbAmt;
          const portfolio = withAudilyAccrued(basePortfolio).map(c => {
            if (c.id === "audily") {
              return { ...c, debtPositions: [...(c.debtPositions ?? []), PROPOSAL_AUDILY_PREFERRED] };
            }
            if (c.id === "nueces-brewing") {
              return {
                ...c,
                invested: 320_000,
                currentValue: 320_000,
                ownership: 50,
                votingOwnership: 50,
                impliedValuation: 640_000,
                customPricePerShare: 6.40,
                totalShares: 100_000,
                shareTransactions: [
                  ...(c.shareTransactions ?? []),
                  { date: "May 2026", type: "Common" as const, shares: 50_000, amount: 320_000, notes: "Proposed initial common share purchase — 50% of economic and voting." },
                ],
              };
            }
            if (c.id === "certd") {
              return {
                ...c,
                invested: (c.invested || 0) + pigeonAmt,
                currentValue: c.currentValue + pigeonAmt,
                shareTransactions: [
                  ...(c.shareTransactions ?? []),
                  { date: "May 2026", type: "Common" as const, shares: SCENARIOB_PIGEON_SHARES, amount: pigeonAmt, notes: "Scenario B common share purchase." },
                ],
              };
            }
            if (c.id === "falconer") {
              return {
                ...c,
                invested: (c.invested || 0) + falconerAmt,
                currentValue: c.currentValue + falconerAmt,
                shareTransactions: [
                  ...(c.shareTransactions ?? []),
                  { date: "May 2026", type: "Common" as const, shares: SCENARIOB_FALCONER_SHARES, amount: falconerAmt, notes: "Scenario B common share purchase." },
                ],
              };
            }
            if (c.id === "sbr2th") {
              return {
                ...c,
                invested: (c.invested || 0) + sbr2thAmt,
                currentValue: c.currentValue + sbr2thAmt,
                shareTransactions: [
                  ...(c.shareTransactions ?? []),
                  { date: "May 2026", type: "Common" as const, shares: SCENARIOB_SBR2TH_SHARES, amount: sbr2thAmt, notes: "Scenario B common share purchase." },
                ],
              };
            }
            if (c.id === "merchant-boxes") {
              return {
                ...c,
                invested: (c.invested || 0) + mbAmt,
                currentValue: c.currentValue + mbAmt,
                shareTransactions: [
                  ...(c.shareTransactions ?? []),
                  { date: "May 2026", type: "Common" as const, shares: SCENARIOB_MB_SHARES, amount: mbAmt, notes: "Scenario B common share purchase." },
                ],
              };
            }
            return c;
          });
          const SCENARIOB_LP_ADD = PROPOSAL_LP_BASIS_ADD + scenarioBEquityBasis;
          const LP_TOTAL_UNITS = BASE_LP_TOTAL_UNITS + SCENARIOB_LP_ADD;
          const FUND_LEVERAGE  = BASE_FUND_LEVERAGE  + PROPOSAL_LEVERAGE_ADD;
          const fund = { ...baseFund, calledCapital: baseFund.calledCapital + SCENARIOB_LP_ADD };
          return (
          <div className="space-y-8">
            {/* ── Scenario B Summary ── */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-3">Scenario B — Proposed Transactions</p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2"><span className="mt-0.5 text-amber-400">•</span><span>Take in <span className="text-white font-medium">${(SCENARIOB_LP_ADD / 1000).toFixed(0)}k</span> of new LP capital (includes all positions below at default values)</span></li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-amber-400">•</span><span>Purchase <span className="text-white font-medium">50% of <a href="https://nuecesbrewing.com" target="_blank" rel="noopener noreferrer" className="underline decoration-amber-500/50 hover:decoration-amber-400 transition-colors">Nueces Brewing</a></span> for <span className="text-white font-medium">$320k</span> (<span className="text-white font-medium">$120k seller note</span>)</span></li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-amber-400">•</span><span>Purchase <span className="text-white font-medium">$150k</span> of <span className="text-white font-medium">Audily Preferred</span></span></li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-amber-400">•</span><span>Purchase <span className="text-white font-medium">{SCENARIOB_PIGEON_SHARES.toLocaleString()}</span> shares of <span className="text-white font-medium">Pigeon Service</span> for <span className="text-white font-medium">${pigeonAmt.toLocaleString()}</span></span></li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-amber-400">•</span><span>Purchase <span className="text-white font-medium">{SCENARIOB_FALCONER_SHARES.toLocaleString()}</span> shares of <span className="text-white font-medium">Falconer</span> for <span className="text-white font-medium">${falconerAmt.toLocaleString()}</span></span></li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-amber-400">•</span><span>Purchase <span className="text-white font-medium">{SCENARIOB_SBR2TH_SHARES.toLocaleString()}</span> shares of <span className="text-white font-medium">SBR2TH Recruiting</span> for <span className="text-white font-medium">${sbr2thAmt.toLocaleString()}</span></span></li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-amber-400">•</span><span>Purchase <span className="text-white font-medium">{SCENARIOB_MB_SHARES.toLocaleString()}</span> shares of <span className="text-white font-medium">Merchant Boxes</span> for <span className="text-white font-medium">${mbAmt.toLocaleString()}</span></span></li>
              </ul>
            </div>
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
              const activePct    = lpViewMode === "current" && (lpCurrentPct > 0 || lpHypo > 0)
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
                    {(() => {
                      const accrued = audilyPreferredAccrued() * lpMultiplier;
                      return accrued > 0 ? (
                        <p className="text-[9px] text-slate-600 tabular-nums mt-0.5" title="Audily Series A Preferred dividends accrued since 03/18/26 at 13.4% — included in NAV.">
                          incl. {fmt(accrued)} accrued
                        </p>
                      ) : null;
                    })()}
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
                        onChange={e => { setLpHypotheticalUnits(e.target.value); if (parseFloat(e.target.value) > 0) setLpViewMode("current"); }}
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
                                          {c.commonSharesOutstanding && sh > 0 ? `${((sh / c.commonSharesOutstanding) * 100).toFixed(1)}%` : c.votingOwnership !== undefined ? `${c.votingOwnership.toFixed(1)}%` : "—"}
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

        {!activeCompany && activeTab === "fees" && (
          <FeeCalculator />
        )}

        {!activeCompany && activeTab === "direct" && directInvestor && (
          <DirectHoldingsTab
            investor={directInvestor}
            portfolio={portfolio}
            userValuations={userValuations}
            onOpenValuationModal={(c, v) => setValuationModal({ company: c, pendingVal: v })}
            onResetValuation={(id) => setUserValuations(prev => { const n = { ...prev }; delete n[id]; return n; })}
            onSelectCompany={(id) => setActiveCompanyId(id)}
          />
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          <div className="rounded-lg border border-[#1E2D3D] bg-[#080E1A] px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1.5">
              Important Disclosures
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-400">No investment advice.</span>{" "}
              The information presented in this portal is provided solely for informational and
              illustrative purposes and does not constitute investment, legal, tax, or accounting
              advice or any recommendation to buy, sell, or hold any security or to pursue any
              investment strategy.{" "}
              <span className="font-semibold text-slate-400">Not an offer.</span>{" "}
              Nothing herein constitutes an offer to sell or a solicitation of an offer to buy any
              securities or interests; any such offer or solicitation will be made only by means of
              definitive offering documents to qualified investors and only in jurisdictions where
              permitted.{" "}
              <span className="font-semibold text-slate-400">Estimates and forward-looking statements.</span>{" "}
              Valuations, projections, scenario analyses, Monte Carlo simulations, allocation
              targets, and similar outputs are estimates based on assumptions that may prove
              incorrect; actual results may differ materially. Past performance is not indicative of
              future results. Private investments are illiquid, speculative, and may result in the
              loss of all invested capital.{" "}
              <span className="font-semibold text-slate-400">Beta software.</span>{" "}
              This portal is a beta tool under active development and may contain calculation errors,
              stale data, or display defects; figures are not audited and should not be relied upon
              for financial, regulatory, or tax reporting. Users should independently verify any
              information before acting on it and should consult their own qualified advisors.{" "}
              <span className="font-semibold text-slate-400">Confidentiality.</span>{" "}
              All content is confidential and intended only for the named recipient. nth Venture Inc.
              is not a registered broker-dealer or investment adviser.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className="text-[10px] text-slate-600">
              © 2026 nth Venture Inc. · For accredited investors only · All rights reserved
            </p>
            <p className="text-[10px] text-slate-600 whitespace-nowrap">Confidential</p>
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
    </NDAGate>
    </AccessGate>
  );
}
