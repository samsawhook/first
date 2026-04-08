"use client";
import { useState, useRef, useEffect, useCallback } from "react";
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
} from "lucide-react";
import PortfolioAllocationChart from "@/components/PortfolioAllocationChart";
import DealPipeline from "@/components/DealPipeline";
import SecondaryMarket from "@/components/SecondaryMarket";
import LettersSection from "@/components/LettersSection";
import CompanyPage from "@/components/CompanyPage";
import { portfolio } from "@/lib/data";
import { investors } from "@/lib/investors";
import type { Investor, ShareTransaction } from "@/lib/types";

type Tab = "overview" | "pipeline" | "secondary" | "letters";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview",  label: "Overview",  icon: <LayoutDashboard size={15} /> },
  { id: "pipeline",  label: "Pipeline",  icon: <Zap size={15} /> },
  { id: "secondary", label: "Secondary", icon: <ArrowLeftRight size={15} /> },
  { id: "letters",   label: "Letters",   icon: <BookOpen size={15} /> },
];

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1_000).toFixed(0)}K`;

// ── Companies dropdown tab ────────────────────────────────────────────────────

function CompaniesDropdown({
  activeCompanyId,
  onSelect,
}: {
  activeCompanyId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const openMenu = useCallback(() => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen(true);
  }, []);

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
      style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
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
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                style={{ background: `${company.accentColor}15`, color: company.accentColor }}
              >
                {company.stage.split(" ")[0]}
              </span>
            </button>
          ))}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
          activeCompanyId !== null
            ? "border-emerald-500 text-emerald-400"
            : "border-transparent text-slate-500 hover:text-slate-300 hover:border-[#1E2D3D]"
        }`}
      >
        <Building2 size={15} />
        {activeCompany ? activeCompany.name : "Companies"}
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
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
  const [openInstrumentTables, setOpenInstrumentTables] = useState<Set<string>>(new Set(["common", "preferred", "debt"]));
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set<string>());

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
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/1691979830329-NJ5W8U6WT1N0F60PRNXV/Nth.png"
                alt="nth Venture"
                className="h-8 w-auto"
                style={{ filter: "brightness(0) invert(1)" }}
              />
              <span className="text-xs text-slate-500 leading-tight hidden sm:block border-l border-[#1E2D3D] pl-3">
                Investor Portal
              </span>
            </div>

            {/* Quick stats */}
            {(() => {
              const active = portfolio.filter((c) => c.status === "active");
              const totalValue = active.reduce((s, c) => s + c.currentValue, 0);
              const totalInvested = active.reduce((s, c) => s + c.invested, 0);
              const moic = (totalValue / totalInvested).toFixed(2);
              return (
                <div className="hidden lg:flex items-center gap-6 text-xs">
                  <div className="text-right">
                    <p className="text-slate-500">Portfolio Value</p>
                    <p className="text-emerald-400 font-semibold tabular-nums">{fmt(totalValue)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500">MOIC</p>
                    <p className="text-slate-200 font-semibold tabular-nums">{moic}x</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500">Companies</p>
                    <p className="text-slate-200 font-semibold tabular-nums">{active.length}</p>
                  </div>
                </div>
              );
            })()}

            {/* Account + confidential */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 border border-[#1E2D3D] rounded-lg px-2 py-1.5">
                <Lock size={10} />
                <span>Confidential</span>
              </div>
              <div className="flex items-center gap-2 bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-2.5 py-1.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-emerald-400">NW</span>
                </div>
                <div className="hidden sm:block leading-tight">
                  <p className="text-xs font-medium text-slate-200">Neil Wolfson</p>
                  <p className="text-[9px] text-slate-500">Accredited Investor</p>
                </div>
                <User size={12} className="sm:hidden text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="sticky top-14 z-20 bg-[#060B14]/90 backdrop-blur-md border-b border-[#1E2D3D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-0 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeCompanyId === null && activeTab === tab.id
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-slate-500 hover:text-slate-300 hover:border-[#1E2D3D]"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}

            {/* Companies dropdown tab */}
            <CompaniesDropdown
              activeCompanyId={activeCompanyId}
              onSelect={(id) => {
                setActiveCompanyId(id);
              }}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Company detail page */}
        {activeCompany && (
          <CompanyPage company={activeCompany} />
        )}

        {!activeCompany && activeTab === "overview" && (
          <div className="space-y-8">
            {/* Portfolio allocation */}
            <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">
                    {selectedInvestor ? `${selectedInvestor.name}'s Holdings` : "Fund Holdings"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedInvestor
                      ? "Equity, LP units, and debt positions · marked at implied valuations"
                      : "Co-Owner Fund, LP · portfolio allocation by current value"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-xs text-slate-500 whitespace-nowrap">Viewing as</label>
                  <select
                    value={selectedInvestorId}
                    onChange={(e) => setSelectedInvestorId(e.target.value)}
                    className="text-xs bg-[#111D2E] border border-[#1E2D3D] text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                  >
                    <option value="fund">Co-Owner Fund, LP (fund view)</option>
                    <optgroup label="Investors">
                      {investors.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
              <PortfolioAllocationChart investor={selectedInvestor} onCompanyClick={setActiveCompanyId} />
            </div>

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

              const TH = ({ children }: { children?: React.ReactNode }) => (
                <th className="py-2 px-3 text-left text-[10px] text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap">{children}</th>
              );
              const TD = ({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
                <td className={`py-2.5 px-3 text-xs ${className}`} style={style}>{children}</td>
              );

              const SectionHeader = ({ label, tableKey, accent, pills }: {
                label: string; tableKey: string; accent: string; pills: React.ReactNode;
              }) => (
                <button
                  onClick={() => toggleTable(tableKey)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#111D2E]/60 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
                    <span className="text-sm font-semibold text-slate-200">{label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2">{pills}</div>
                    <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${openInstrumentTables.has(tableKey) ? "rotate-180" : ""}`} />
                  </div>
                </button>
              );

              // ── Group transactions by company ──────────────────────────────────
              const companiesWithCommon = portfolio.filter(c => c.shareTransactions?.some(t => t.type === "Common"));
              const companiesWithPref   = portfolio.filter(c => c.shareTransactions?.some(t => t.type === "Preferred"));
              const companiesWithDebt   = portfolio.filter(c => c.debtPositions?.length);

              return (
              <div className="space-y-3">

                {/* ══ 1. EQUITY (Common Stock) ══════════════════════════════════════ */}
                <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
                  {(() => {
                    const totalShares = companiesWithCommon.reduce((s, c) => s + (c.shareTransactions ?? []).filter(t => t.type === "Common").reduce((a, t) => a + (t.shares ?? 0), 0), 0);
                    const totalCost   = companiesWithCommon.reduce((s, c) => s + (c.shareTransactions ?? []).filter(t => t.type === "Common").reduce((a, t) => a + t.amount, 0), 0);
                    const wtdAvg      = totalShares > 0 ? totalCost / totalShares : null;
                    return (
                      <>
                        <div className="border-b border-[#1E2D3D]">
                          <SectionHeader label="Equity" tableKey="common" accent="#10B981" pills={
                            <>
                              <span className="text-[10px] text-slate-500">{totalShares.toLocaleString()} shares</span>
                              <span className="text-slate-700 text-[10px]">·</span>
                              <span className="text-[10px] text-slate-500">{wtdAvg !== null ? `${fmtPrice(wtdAvg)} wtd avg` : ""}</span>
                              <span className="text-[10px] font-semibold text-emerald-400">{fmt(totalCost)}</span>
                            </>
                          } />
                        </div>
                        {openInstrumentTables.has("common") && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                                <tr>
                                  <TH></TH><TH>Company</TH><TH>Total Shares</TH>
                                  <TH>Avg Cost/sh</TH><TH>Cost Basis</TH><TH>Curr Value</TH><TH>Gain / Loss</TH>
                                </tr>
                              </thead>
                              <tbody>
                                {companiesWithCommon.map((c) => {
                                  const txns = (c.shareTransactions ?? []).filter(t => t.type === "Common");
                                  const sh = txns.reduce((s, t) => s + (t.shares ?? 0), 0);
                                  const cost = txns.reduce((s, t) => s + t.amount, 0);
                                  const avg = sh > 0 ? cost / sh : null;
                                  const valPerSh = c.totalShares ? c.impliedValuation / c.totalShares : null;
                                  const currVal = valPerSh !== null ? sh * valPerSh : null;
                                  const gain = currVal !== null ? currVal - cost : null;
                                  const rowKey = `common-${c.id}`;
                                  const isOpen = expandedRows.has(rowKey);
                                  return (
                                    <>
                                      <tr key={c.id} className="border-t border-[#111D2E] hover:bg-[#111D2E]/40 cursor-pointer" onClick={() => toggleRow(rowKey)}>
                                        <TD>
                                          <ChevronDown size={12} className={`text-slate-600 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                                        </TD>
                                        <TD>
                                          <div className="flex items-center gap-2">
                                            {companyLogo(c)}
                                            <div>
                                              <p className="font-semibold text-slate-200">{c.name}</p>
                                              <p className="text-[10px] text-slate-600">{c.stage}</p>
                                            </div>
                                          </div>
                                        </TD>
                                        <TD className="text-slate-300 tabular-nums">{sh.toLocaleString()}</TD>
                                        <TD className="text-emerald-400 tabular-nums">{avg !== null ? fmtPrice(avg) : "—"}</TD>
                                        <TD className="text-slate-300 tabular-nums">{fmt(cost)}</TD>
                                        <TD className="tabular-nums font-medium" style={{ color: c.accentColor }}>
                                          {currVal !== null ? fmt(currVal) : "—"}
                                        </TD>
                                        <TD>
                                          {gain !== null ? (
                                            <span className={gain >= 0 ? "text-emerald-400 tabular-nums" : "text-rose-400 tabular-nums"}>
                                              {gain >= 0 ? "+" : ""}{fmt(gain)}
                                            </span>
                                          ) : "—"}
                                        </TD>
                                      </tr>
                                      {isOpen && txns.map((t, i) => (
                                        <tr key={i} className="border-t border-[#0D1421] bg-[#080E1A]">
                                          <td className="py-2 px-3 w-6" />
                                          <td className="py-2 px-3 text-[11px] text-slate-500 pl-11">{t.date}</td>
                                          <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">{t.shares?.toLocaleString() ?? "—"}</td>
                                          <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">{t.pricePerShare !== undefined ? fmtPrice(t.pricePerShare) : "—"}</td>
                                          <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">{fmt(t.amount)}</td>
                                          <td className="py-2 px-3" />
                                          <td className="py-2 px-3 text-[11px] text-slate-600">{t.notes ?? ""}</td>
                                        </tr>
                                      ))}
                                    </>
                                  );
                                })}
                                <tr className="border-t border-[#1E2D3D] bg-[#080E1A]">
                                  <td /><td className="py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total / Wtd Avg</td>
                                  <td className="py-2 px-3 text-xs text-slate-300 tabular-nums font-semibold">{totalShares.toLocaleString()}</td>
                                  <td className="py-2 px-3 text-xs text-emerald-400 tabular-nums font-semibold">{wtdAvg !== null ? fmtPrice(wtdAvg) : "—"}</td>
                                  <td className="py-2 px-3 text-xs text-slate-200 tabular-nums font-semibold">{fmt(totalCost)}</td>
                                  <td /><td />
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* ══ 2. CREDIT (Preferred Stock) ══════════════════════════════════ */}
                <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
                  {(() => {
                    const totalShares = companiesWithPref.reduce((s, c) => s + (c.shareTransactions ?? []).filter(t => t.type === "Preferred").reduce((a, t) => a + (t.shares ?? 0), 0), 0);
                    const totalCost   = companiesWithPref.reduce((s, c) => s + (c.shareTransactions ?? []).filter(t => t.type === "Preferred").reduce((a, t) => a + t.amount, 0), 0);
                    const wtdAvg      = totalShares > 0 ? totalCost / totalShares : null;
                    return (
                      <>
                        <div className="border-b border-[#1E2D3D]">
                          <SectionHeader label="Credit" tableKey="preferred" accent="#6366F1" pills={
                            <>
                              <span className="text-[10px] text-slate-500">{totalShares.toLocaleString()} shares</span>
                              <span className="text-slate-700 text-[10px]">·</span>
                              <span className="text-[10px] text-slate-500">{wtdAvg !== null ? `${fmtPrice(wtdAvg)} wtd avg` : ""}</span>
                              <span className="text-[10px] font-semibold text-indigo-400">{fmt(totalCost)}</span>
                            </>
                          } />
                        </div>
                        {openInstrumentTables.has("preferred") && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                                <tr>
                                  <TH></TH><TH>Company</TH><TH>Shares</TH><TH>Type</TH>
                                  <TH>Liq Pref</TH><TH>Conv Ratio</TH><TH>Sh if Conv</TH>
                                  <TH>Div Rate</TH><TH>Avg Cost/sh</TH><TH>Cost Basis</TH>
                                </tr>
                              </thead>
                              <tbody>
                                {companiesWithPref.map((c) => {
                                  const txns = (c.shareTransactions ?? []).filter(t => t.type === "Preferred");
                                  const sh = txns.reduce((s, t) => s + (t.shares ?? 0), 0);
                                  const cost = txns.reduce((s, t) => s + t.amount, 0);
                                  const avg = sh > 0 ? cost / sh : null;
                                  // Weighted liq pref (weighted by share count)
                                  const wtdLiq = sh > 0 ? txns.reduce((s, t) => s + (t.shares ?? 0) * (t.liquidationMultiple ?? 1), 0) / sh : null;
                                  // Weighted conv ratio
                                  const wtdConv = sh > 0 ? txns.reduce((s, t) => s + (t.shares ?? 0) * (t.conversionRatio ?? 1), 0) / sh : 1;
                                  const sharesIfConv = Math.round(sh * (wtdConv ?? 1));
                                  // Weighted div rate
                                  const hasDivs = txns.some(t => t.dividendRate !== undefined);
                                  const wtdDiv = hasDivs && sh > 0 ? txns.reduce((s, t) => s + (t.shares ?? 0) * (t.dividendRate ?? 0), 0) / sh : null;
                                  const rowKey = `pref-${c.id}`;
                                  const isOpen = expandedRows.has(rowKey);
                                  // Representative type (most common)
                                  const prefType = txns[0]?.preferredType ?? "—";
                                  return (
                                    <>
                                      <tr key={c.id} className="border-t border-[#111D2E] hover:bg-[#111D2E]/40 cursor-pointer" onClick={() => toggleRow(rowKey)}>
                                        <TD><ChevronDown size={12} className={`text-slate-600 transition-transform ${isOpen ? "rotate-180" : ""}`} /></TD>
                                        <TD>
                                          <div className="flex items-center gap-2">
                                            {companyLogo(c)}
                                            <div>
                                              <p className="font-semibold text-slate-200">{c.name}</p>
                                              <p className="text-[10px] text-slate-600">{c.stage}</p>
                                            </div>
                                          </div>
                                        </TD>
                                        <TD className="text-slate-300 tabular-nums">{sh.toLocaleString()}</TD>
                                        <TD>
                                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-indigo-500/10 text-indigo-400">{prefType}</span>
                                        </TD>
                                        <TD className="text-slate-300 tabular-nums">{wtdLiq !== null ? `${wtdLiq.toFixed(1)}×` : "—"}</TD>
                                        <TD className="text-slate-300 tabular-nums">{wtdConv !== null ? `${wtdConv.toFixed(2)}:1` : "—"}</TD>
                                        <TD className="text-slate-300 tabular-nums">{sharesIfConv.toLocaleString()}</TD>
                                        <TD className="text-slate-300 tabular-nums">{wtdDiv !== null ? `${wtdDiv.toFixed(1)}%` : <span className="text-slate-700">—</span>}</TD>
                                        <TD className="text-indigo-400 tabular-nums">{avg !== null ? fmtPrice(avg) : "—"}</TD>
                                        <TD className="text-slate-300 tabular-nums font-medium">{fmt(cost)}</TD>
                                      </tr>
                                      {isOpen && txns.map((t, i) => (
                                        <tr key={i} className="border-t border-[#0D1421] bg-[#080E1A]">
                                          <td className="py-2 px-3 w-6" />
                                          <td className="py-2 px-3 text-[11px] text-slate-500 pl-11">{t.date}</td>
                                          <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">{t.shares?.toLocaleString()}</td>
                                          <td className="py-2 px-3">
                                            {t.preferredType && <span className="text-[10px] px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-400">{t.preferredType}</span>}
                                          </td>
                                          <td className="py-2 px-3 text-[11px] text-slate-400">{t.liquidationMultiple !== undefined ? `${t.liquidationMultiple}×` : "—"}</td>
                                          <td className="py-2 px-3 text-[11px] text-slate-400">{t.conversionRatio !== undefined ? `${t.conversionRatio}:1` : "—"}</td>
                                          <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">{t.shares && t.conversionRatio !== undefined ? Math.round(t.shares * t.conversionRatio).toLocaleString() : "—"}</td>
                                          <td className="py-2 px-3 text-[11px] text-slate-400">{t.dividendRate !== undefined ? `${t.dividendRate}%` : "—"}</td>
                                          <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">{t.pricePerShare !== undefined ? fmtPrice(t.pricePerShare) : "—"}</td>
                                          <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">{fmt(t.amount)}</td>
                                        </tr>
                                      ))}
                                    </>
                                  );
                                })}
                                <tr className="border-t border-[#1E2D3D] bg-[#080E1A]">
                                  <td /><td className="py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total / Wtd Avg</td>
                                  <td className="py-2 px-3 text-xs text-slate-300 tabular-nums font-semibold">{totalShares.toLocaleString()}</td>
                                  <td /><td /><td />
                                  <td className="py-2 px-3 text-xs text-slate-300 tabular-nums font-semibold">
                                    {companiesWithPref.reduce((s, c) => s + (c.shareTransactions ?? []).filter(t => t.type === "Preferred").reduce((a, t) => a + Math.round((t.shares ?? 0) * (t.conversionRatio ?? 1)), 0), 0).toLocaleString()}
                                  </td>
                                  <td />
                                  <td className="py-2 px-3 text-xs text-indigo-400 tabular-nums font-semibold">{wtdAvg !== null ? fmtPrice(wtdAvg) : "—"}</td>
                                  <td className="py-2 px-3 text-xs text-slate-200 tabular-nums font-semibold">{fmt(totalCost)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* ══ 3. CONVERTIBLES ══════════════════════════════════════════════ */}
                <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
                  {(() => {
                    const totalPrincipal = companiesWithDebt.reduce((s, c) => s + (c.debtPositions ?? []).reduce((a, d) => a + d.principal, 0), 0);
                    const totalCurrVal   = companiesWithDebt.reduce((s, c) => s + (c.debtPositions ?? []).reduce((a, d) => a + d.currentValue, 0), 0);
                    const allPositions   = companiesWithDebt.flatMap(c => c.debtPositions ?? []);
                    const ratedPositions = allPositions.filter(d => d.interestRate !== undefined);
                    const wtdRate = ratedPositions.length > 0
                      ? ratedPositions.reduce((s, d) => s + d.principal * (d.interestRate!), 0) / ratedPositions.reduce((s, d) => s + d.principal, 0)
                      : null;
                    return (
                      <>
                        <div className="border-b border-[#1E2D3D]">
                          <SectionHeader label="Convertibles" tableKey="debt" accent="#F59E0B" pills={
                            <>
                              <span className="text-[10px] text-slate-500">{companiesWithDebt.length} companies</span>
                              <span className="text-slate-700 text-[10px]">·</span>
                              {wtdRate !== null && <span className="text-[10px] text-slate-500">{wtdRate.toFixed(1)}% wtd rate</span>}
                              {wtdRate !== null && <span className="text-slate-700 text-[10px]">·</span>}
                              <span className="text-[10px] font-semibold text-amber-400">{fmt(totalPrincipal)} principal</span>
                            </>
                          } />
                        </div>
                        {openInstrumentTables.has("debt") && (
                          companiesWithDebt.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                                  <tr>
                                    <TH></TH><TH>Company</TH><TH>Principal</TH>
                                    <TH>Wtd Rate</TH><TH>Curr Value</TH><TH>Accrued</TH><TH>Status</TH>
                                  </tr>
                                </thead>
                                <tbody>
                                  {companiesWithDebt.map((c) => {
                                    const positions = c.debtPositions ?? [];
                                    const principal = positions.reduce((s, d) => s + d.principal, 0);
                                    const currVal   = positions.reduce((s, d) => s + d.currentValue, 0);
                                    const accrued   = currVal - principal;
                                    const ratedPos  = positions.filter(d => d.interestRate !== undefined);
                                    const compRate  = ratedPos.length > 0
                                      ? ratedPos.reduce((s, d) => s + d.principal * d.interestRate!, 0) / ratedPos.reduce((s, d) => s + d.principal, 0)
                                      : null;
                                    const rowKey = `debt-${c.id}`;
                                    const isOpen = expandedRows.has(rowKey);
                                    // Aggregate status — if any extended/default, show that
                                    const status = positions.find(d => d.status === "Extended")?.status
                                      ?? positions.find(d => d.status === "Current")?.status
                                      ?? positions[0]?.status ?? "—";
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
                                          <TD className="text-slate-300 tabular-nums font-medium">{fmt(principal)}</TD>
                                          <TD className="text-amber-400 tabular-nums">{compRate !== null ? `${compRate.toFixed(1)}%` : <span className="text-slate-500">SAFE</span>}</TD>
                                          <TD className="text-slate-300 tabular-nums font-medium">{fmt(currVal)}</TD>
                                          <TD className={accrued > 0 ? "text-emerald-400 tabular-nums" : "text-slate-600 tabular-nums"}>
                                            {accrued > 0 ? `+${fmt(accrued)}` : "—"}
                                          </TD>
                                          <TD>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                              status === "Extended" ? "bg-amber-500/10 text-amber-400"
                                              : status === "Accruing" ? "bg-blue-500/10 text-blue-400"
                                              : status === "Converted" ? "bg-violet-500/10 text-violet-400"
                                              : status === "Repaid" ? "bg-emerald-500/10 text-emerald-400"
                                              : "bg-slate-500/10 text-slate-400"
                                            }`}>{status}</span>
                                          </TD>
                                        </tr>
                                        {isOpen && positions.map((d, i) => (
                                          <tr key={i} className="border-t border-[#0D1421] bg-[#080E1A]">
                                            <td className="py-2 px-3 w-6" />
                                            <td className="py-2 px-3 pl-11">
                                              <p className="text-[11px] text-slate-400 font-medium">{d.instrument}</p>
                                              <p className="text-[10px] text-slate-600">{d.date}</p>
                                            </td>
                                            <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">{fmt(d.principal)}</td>
                                            <td className="py-2 px-3 text-[11px] text-amber-400 tabular-nums">
                                              {d.interestRate !== undefined ? `${d.interestRate}%` : d.discountRate !== undefined ? `${d.discountRate}% disc.` : "—"}
                                            </td>
                                            <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">{fmt(d.currentValue)}</td>
                                            <td className="py-2 px-3 text-[11px] text-slate-500">
                                              {d.valuationCap ? `$${(d.valuationCap / 1_000_000).toFixed(1)}M cap` : ""}
                                              {d.maturityDate ? ` · ${d.maturityDate}` : ""}
                                            </td>
                                            <td className="py-2 px-3">
                                              <span className={`text-[10px] px-1 py-0.5 rounded font-medium ${
                                                d.status === "Extended" ? "bg-amber-500/10 text-amber-400"
                                                : d.status === "Accruing" ? "bg-blue-500/10 text-blue-400"
                                                : d.status === "Converted" ? "bg-violet-500/10 text-violet-400"
                                                : "bg-emerald-500/10 text-emerald-400"
                                              }`}>{d.status}</span>
                                            </td>
                                          </tr>
                                        ))}
                                      </>
                                    );
                                  })}
                                  <tr className="border-t border-[#1E2D3D] bg-[#080E1A]">
                                    <td /><td className="py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total / Wtd Avg</td>
                                    <td className="py-2 px-3 text-xs text-slate-300 tabular-nums font-semibold">{fmt(totalPrincipal)}</td>
                                    <td className="py-2 px-3 text-xs text-amber-400 tabular-nums font-semibold">{wtdRate !== null ? `${wtdRate.toFixed(1)}%` : "—"}</td>
                                    <td className="py-2 px-3 text-xs text-slate-200 tabular-nums font-semibold">{fmt(totalCurrVal)}</td>
                                    <td className="py-2 px-3 text-xs text-emerald-400 tabular-nums font-semibold">+{fmt(totalCurrVal - totalPrincipal)}</td>
                                    <td />
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="px-5 py-8 text-center text-xs text-slate-600">No debt positions in portfolio.</div>
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
              <h1 className="text-xl font-semibold text-slate-100">Secondary Market</h1>
              <p className="text-sm text-slate-500 mt-1">
                Non-binding indications of interest for secondary transfers in nth Venture portfolio companies.
                All transactions occur bilaterally — this platform does not intermediate.
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
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1E2D3D] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
              This portal is for informational purposes only and is intended solely for accredited investors.
              Nothing here constitutes an offer to sell or a solicitation to buy any security.
              Past performance is not indicative of future results. nth Venture LLC is not a
              registered broker-dealer or investment adviser.
            </p>
            <p className="text-xs text-slate-600 whitespace-nowrap">
              © 2026 nth Venture LLC · Confidential
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
