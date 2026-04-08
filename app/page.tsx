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
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);

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
              const fmtPrice = (n: number) => n < 1 ? `$${n.toFixed(3)}` : `$${n.toFixed(2)}`;
              const weightedAvg = (txns: ShareTransaction[]) => {
                const totalShares = txns.reduce((s, t) => s + (t.shares ?? 0), 0);
                const totalAmount = txns.reduce((s, t) => s + t.amount, 0);
                return totalShares > 0 ? totalAmount / totalShares : null;
              };
              return (
              <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-5">
                <h2 className="text-sm font-semibold text-slate-100 mb-4">
                  Portfolio at a Glance
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#1E2D3D]">
                        <th className="pb-2 w-6" />
                        {["Company", "Invested", "Curr Value", "MOIC", "Economic %", "Voting %", "Avg Cost/Share", "Status"].map((h) => (
                          <th key={h} className="pb-2 pr-4 text-left text-slate-500 font-medium uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.map((c) => {
                        const moic = (c.currentValue / c.invested).toFixed(2);
                        const txns = c.shareTransactions;
                        const avg = txns ? weightedAvg(txns) : null;
                        const isExpanded = expandedCompanyId === c.id;
                        const totalTxnShares = txns ? txns.reduce((s, t) => s + (t.shares ?? 0), 0) : 0;
                        return (
                          <>
                            <tr
                              key={c.id}
                              className="border-t border-[#111D2E] hover:bg-[#111D2E]/50 transition-colors cursor-pointer"
                              onClick={() => setActiveCompanyId(c.id)}
                            >
                              {/* Expand toggle */}
                              <td className="py-2.5 pr-2 w-6">
                                {txns && txns.length > 0 ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedCompanyId(isExpanded ? null : c.id);
                                    }}
                                    className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-slate-300 hover:bg-[#1E2D3D] transition-colors"
                                  >
                                    <ChevronDown size={12} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                  </button>
                                ) : (
                                  <span className="w-5 inline-block" />
                                )}
                              </td>
                              <td className="py-2.5 pr-4">
                                <div className="flex items-center gap-2">
                                  {c.logoUrl ? (
                                    <div className="w-6 h-6 rounded overflow-hidden bg-white flex items-center justify-center p-0.5 shrink-0">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={c.logoUrl} alt={c.name} className="w-full h-full object-contain" />
                                    </div>
                                  ) : (
                                    <div className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center shrink-0"
                                      style={{ background: `${c.accentColor}18`, color: c.accentColor }}>
                                      {c.initials[0]}
                                    </div>
                                  )}
                                  <span className="font-medium text-slate-200 hover:text-emerald-400 transition-colors">{c.name}</span>
                                </div>
                              </td>
                              <td className="py-2.5 pr-4 text-slate-300 tabular-nums">{fmt(c.invested)}</td>
                              <td className="py-2.5 pr-4 tabular-nums" style={{ color: c.accentColor }}>{fmt(c.currentValue)}</td>
                              <td className="py-2.5 pr-4 tabular-nums">
                                <span className={parseFloat(moic) >= 1.5 ? "text-emerald-400" : parseFloat(moic) >= 1 ? "text-slate-300" : "text-rose-400"}>
                                  {moic}x
                                </span>
                              </td>
                              <td className="py-2.5 pr-4 text-slate-300 tabular-nums">{c.ownership}%</td>
                              <td className="py-2.5 pr-4 tabular-nums">
                                {c.votingOwnership !== undefined ? (
                                  <span className={c.votingOwnership < c.ownership ? "text-amber-400" : "text-slate-300"}>
                                    {c.votingOwnership}%
                                  </span>
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>
                              <td className="py-2.5 pr-4 text-slate-400 tabular-nums">
                                {avg !== null ? fmtPrice(avg) : <span className="text-slate-600">—</span>}
                              </td>
                              <td className="py-2.5">
                                <span className={`px-1.5 py-0.5 rounded font-medium ${
                                  c.status === "active" ? "bg-emerald-500/10 text-emerald-400"
                                  : c.status === "realized" ? "bg-violet-500/10 text-violet-400"
                                  : "bg-slate-500/10 text-slate-400"
                                }`}>
                                  {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                                </span>
                              </td>
                            </tr>
                            {/* Expanded share transaction detail */}
                            {isExpanded && txns && txns.length > 0 && (
                              <tr key={`${c.id}-expanded`} className="bg-[#080E1A]">
                                <td />
                                <td colSpan={8} className="pb-3 pt-1 pr-4">
                                  <div className="rounded-lg border border-[#1E2D3D] overflow-hidden ml-2">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-[#1E2D3D] bg-[#0D1421]">
                                          {["Date", "Type", "Shares", "Price / Share", "Amount"].map((h) => (
                                            <th key={h} className="py-1.5 px-3 text-left text-slate-600 font-medium uppercase tracking-wide">{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {txns.map((t, i) => (
                                          <tr key={i} className="border-t border-[#111D2E]">
                                            <td className="py-1.5 px-3 text-slate-400">{t.date}</td>
                                            <td className="py-1.5 px-3">
                                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                                style={{ background: `${c.accentColor}15`, color: c.accentColor }}>
                                                {t.type}
                                              </span>
                                            </td>
                                            <td className="py-1.5 px-3 text-slate-300 tabular-nums">
                                              {t.shares !== undefined ? t.shares.toLocaleString() : "—"}
                                            </td>
                                            <td className="py-1.5 px-3 text-slate-300 tabular-nums">
                                              {t.pricePerShare !== undefined ? fmtPrice(t.pricePerShare) : "—"}
                                            </td>
                                            <td className="py-1.5 px-3 text-slate-300 tabular-nums">{fmt(t.amount)}</td>
                                          </tr>
                                        ))}
                                        {/* Weighted average footer */}
                                        <tr className="border-t border-[#1E2D3D] bg-[#0D1421]/60">
                                          <td className="py-1.5 px-3 text-slate-500 font-medium uppercase tracking-wide">Weighted Avg</td>
                                          <td className="py-1.5 px-3" />
                                          <td className="py-1.5 px-3 text-slate-300 tabular-nums font-medium">{totalTxnShares.toLocaleString()}</td>
                                          <td className="py-1.5 px-3 text-emerald-400 tabular-nums font-medium">
                                            {avg !== null ? fmtPrice(avg) : "—"}
                                          </td>
                                          <td className="py-1.5 px-3 text-slate-300 tabular-nums font-medium">{fmt(c.invested)}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
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
