"use client";
import { useState } from "react";
import { LayoutDashboard, Briefcase, Zap, ArrowLeftRight, BookOpen, Lock } from "lucide-react";
import PortfolioAllocationChart from "@/components/PortfolioAllocationChart";
import PortfolioGrid from "@/components/PortfolioGrid";
import DealPipeline from "@/components/DealPipeline";
import SecondaryMarket from "@/components/SecondaryMarket";
import LettersSection from "@/components/LettersSection";
import PerformanceChart from "@/components/PerformanceChart";
import { portfolio } from "@/lib/data";
import { investors } from "@/lib/investors";
import type { Investor } from "@/lib/types";

type Tab = "overview" | "portfolio" | "pipeline" | "secondary" | "letters";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard size={15} /> },
  { id: "portfolio", label: "Portfolio", icon: <Briefcase size={15} /> },
  { id: "pipeline", label: "Pipeline", icon: <Zap size={15} /> },
  { id: "secondary", label: "Secondary", icon: <ArrowLeftRight size={15} /> },
  { id: "letters", label: "Letters", icon: <BookOpen size={15} /> },
];

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1_000).toFixed(0)}K`;

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedInvestorId, setSelectedInvestorId] = useState<string>("fund");
  const selectedInvestor: Investor | undefined =
    selectedInvestorId === "fund"
      ? undefined
      : investors.find((i) => i.id === selectedInvestorId);

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

            {/* Confidential badge */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 border border-[#1E2D3D] rounded-lg px-2.5 py-1.5">
              <Lock size={11} />
              <span className="hidden sm:inline">Confidential · Accredited Investors Only</span>
              <span className="sm:hidden">Confidential</span>
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
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-slate-500 hover:text-slate-300 hover:border-[#1E2D3D]"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "overview" && (
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
              <PortfolioAllocationChart investor={selectedInvestor} />
            </div>

            {/* Performance chart card */}
            <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">Fund Performance</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    NAV vs Called Capital · Q4 2021 – Q1 2026
                  </p>
                </div>
                <span className="text-xs text-slate-500 bg-[#111D2E] border border-[#1E2D3D] px-2.5 py-1 rounded-lg">
                  As of March 31, 2026
                </span>
              </div>
              <PerformanceChart />
            </div>

            {/* Portfolio allocation */}
            <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-100 mb-4">
                Portfolio at a Glance
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1E2D3D]">
                      {["Company", "Sector", "Invested", "Current Value", "MOIC", "Ownership", "Status"].map(
                        (h) => (
                          <th
                            key={h}
                            className="pb-2 pr-4 text-left text-slate-500 font-medium uppercase tracking-wide"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#111D2E]">
                    {portfolio.map((c) => {
                      const moic = (c.currentValue / c.invested).toFixed(2);
                      return (
                        <tr key={c.id} className="hover:bg-[#111D2E]/50 transition-colors">
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2">
                              {c.logoUrl ? (
                                <div className="w-6 h-6 rounded overflow-hidden bg-white flex items-center justify-center p-0.5 shrink-0">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={c.logoUrl} alt={c.name} className="w-full h-full object-contain" />
                                </div>
                              ) : (
                                <div
                                  className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center shrink-0"
                                  style={{ background: `${c.accentColor}18`, color: c.accentColor }}
                                >
                                  {c.initials[0]}
                                </div>
                              )}
                              <span className="font-medium text-slate-200">{c.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-4 text-slate-500">{c.sector}</td>
                          <td className="py-2.5 pr-4 text-slate-300 tabular-nums">{fmt(c.invested)}</td>
                          <td className="py-2.5 pr-4 tabular-nums" style={{ color: c.accentColor }}>
                            {fmt(c.currentValue)}
                          </td>
                          <td className="py-2.5 pr-4 tabular-nums">
                            <span
                              className={
                                parseFloat(moic) >= 1.5
                                  ? "text-emerald-400"
                                  : parseFloat(moic) >= 1
                                  ? "text-slate-300"
                                  : "text-rose-400"
                              }
                            >
                              {moic}x
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-slate-300 tabular-nums">{c.ownership}%</td>
                          <td className="py-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                c.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : c.status === "realized"
                                  ? "bg-violet-500/10 text-violet-400"
                                  : "bg-slate-500/10 text-slate-400"
                              }`}
                            >
                              {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Thesis reminder */}
            <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-900 border border-[#1E2D3D] flex items-center justify-center shrink-0 p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/1691979830329-NJ5W8U6WT1N0F60PRNXV/Nth.png"
                    alt="nth"
                    className="w-full h-full object-contain"
                    style={{ filter: "brightness(0) invert(1)" }}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 mb-2">Investment Thesis</h3>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
                    We build companies where employees are owners — not just workers. Radical incentive alignment
                    produces better products, lower churn, and outcomes that are good for everyone. Every company
                    in this portfolio was built with that principle as the foundation, not an afterthought.
                  </p>
                  <p className="text-xs text-slate-500 mt-3">
                    Corpus Christi, TX · Founded 2021 · Venture Studio
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "portfolio" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-100">Portfolio Companies</h1>
              <p className="text-sm text-slate-500 mt-1">
                {portfolio.length} companies · {portfolio.filter((c) => c.secondaryAvailable).length} with secondary market access
              </p>
            </div>
            <PortfolioGrid />
          </div>
        )}

        {activeTab === "pipeline" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-100">Deal Pipeline</h1>
              <p className="text-sm text-slate-500 mt-1">
                Active opportunities and upcoming allocations. For accredited investors only.
              </p>
            </div>
            <DealPipeline />
          </div>
        )}

        {activeTab === "secondary" && (
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

        {activeTab === "letters" && (
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
