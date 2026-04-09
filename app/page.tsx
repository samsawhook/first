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
import { portfolio, navHistory, fund, managedFundPositions } from "@/lib/data";
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
        className={`flex items-center gap-2 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
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
  const [openInstrumentTables, setOpenInstrumentTables] = useState<Set<string>>(new Set(["common", "credit", "convertibles", "managed"]));
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
  const effectiveImplied = useCallback((c: typeof portfolio[0]) =>
    userValuations[c.id] ?? c.impliedValuation, [userValuations]);
  const effectiveCurrVal = useCallback((c: typeof portfolio[0]) => {
    if (userValuations[c.id] === undefined) return c.currentValue;
    return c.currentValue * (userValuations[c.id] / c.impliedValuation);
  }, [userValuations]);

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
            <div className="flex items-center gap-3 shrink-0 pr-4 border-r border-[#1E2D3D]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/1691979830329-NJ5W8U6WT1N0F60PRNXV/Nth.png"
                alt="nth Venture"
                className="h-7 w-auto"
                style={{ filter: "brightness(0) invert(1)" }}
              />
              <span className="text-xs text-slate-500 hidden sm:block">Investor Portal</span>
            </div>

            {/* Nav tabs */}
            <div className="flex flex-1 items-stretch overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center gap-2 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeCompanyId === null && activeTab === tab.id
                      ? "border-emerald-500 text-emerald-400"
                      : "border-transparent text-slate-500 hover:text-slate-300 hover:border-[#1E2D3D]"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
              <CompaniesDropdown
                activeCompanyId={activeCompanyId}
                onSelect={(id) => setActiveCompanyId(id)}
              />
            </div>

            {/* Account + confidential */}
            <div className="flex items-center gap-3 shrink-0 pl-4 border-l border-[#1E2D3D]">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 border border-[#1E2D3D] rounded-lg px-2 py-1.5">
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

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Company detail page */}
        {activeCompany && (
          <CompanyPage company={activeCompany} />
        )}

        {!activeCompany && activeTab === "overview" && (
          <div className="space-y-8">
            {/* ── Overview Hero ── */}
            {(() => {
              // ── Donut data (by effective current value) ────────────────────────
              const donutItems = portfolio
                .filter(c => c.status === "active")
                .map(c => ({ label: c.name, value: effectiveCurrVal(c), color: c.accentColor, id: c.id }));
              const donutTotal = donutItems.reduce((s, d) => s + d.value, 0);

              // Build SVG donut arcs
              const cx = 80; const cy = 80; const R = 62; const r = 40;
              let angle = -Math.PI / 2;
              const arcs = donutItems.map(d => {
                const sweep = (d.value / donutTotal) * 2 * Math.PI;
                const x1 = cx + R * Math.cos(angle); const y1 = cy + R * Math.sin(angle);
                angle += sweep;
                const x2 = cx + R * Math.cos(angle); const y2 = cy + R * Math.sin(angle);
                const ix1 = cx + r * Math.cos(angle - sweep); const iy1 = cy + r * Math.sin(angle - sweep);
                const ix2 = cx + r * Math.cos(angle); const iy2 = cy + r * Math.sin(angle);
                const large = sweep > Math.PI ? 1 : 0;
                return { ...d, path: `M${x1},${y1} A${R},${R},0,${large},1,${x2},${y2} L${ix2},${iy2} A${r},${r},0,${large},0,${ix1},${iy1} Z` };
              });

              // ── NAV time chart ─────────────────────────────────────────────────
              const W = 360; const H = 130; const PAD = { t: 10, r: 10, b: 28, l: 44 };
              const chartW = W - PAD.l - PAD.r; const chartH = H - PAD.t - PAD.b;
              const hasNavHistory = navHistory.length >= 2;
              const maxY = hasNavHistory ? Math.max(...navHistory.map(d => d.nav)) * 1.08 : 1;
              const xS = (i: number) => PAD.l + (i / Math.max(navHistory.length - 1, 1)) * chartW;
              const yS = (v: number) => PAD.t + chartH - (v / maxY) * chartH;
              const navLine  = navHistory.map((d, i) => `${i === 0 ? "M" : "L"}${xS(i).toFixed(1)},${yS(d.nav).toFixed(1)}`).join(" ");
              const navFill = hasNavHistory ? navLine + ` L${xS(navHistory.length - 1)},${(PAD.t + chartH).toFixed(1)} L${xS(0)},${(PAD.t + chartH).toFixed(1)} Z` : "";
              const yTicks = hasNavHistory ? [0, maxY * 0.25, maxY * 0.5, maxY * 0.75, maxY] : [];
              const xLabels = navHistory.filter((_, i) => i % 4 === 0);

              // ── Allocation by security type ────────────────────────────────────
              const ALLOC_CREDIT_INSTR = ["Term Loan", "Line of Credit", "Revenue Based Financing"];
              // Equity cost basis unknown — use est. current value as size proxy
              let equityBasis = 0, creditBasis = 0, convertBasis = 0;
              for (const c of portfolio) {
                if (c.status === "active") equityBasis += effectiveCurrVal(c);
                for (const d of (c.debtPositions ?? [])) {
                  if (ALLOC_CREDIT_INSTR.includes(d.instrument)) creditBasis += d.principal;
                  else convertBasis += d.principal;
                }
              }
              const managedBasis = managedFundPositions.reduce((s, p) => s + p.called, 0);
              const allocTotal = equityBasis + creditBasis + convertBasis + managedBasis;
              const allocTypes = [
                { label: "Equity",        amount: equityBasis,  color: "#10B981", pct: allocTotal > 0 ? equityBasis  / allocTotal : 0 },
                { label: "Credit",        amount: creditBasis,  color: "#6366F1", pct: allocTotal > 0 ? creditBasis  / allocTotal : 0 },
                { label: "Convertibles",  amount: convertBasis, color: "#F59E0B", pct: allocTotal > 0 ? convertBasis / allocTotal : 0 },
                { label: "Managed Funds", amount: managedBasis, color: "#EC4899", pct: allocTotal > 0 ? managedBasis / allocTotal : 0 },
              ].filter(t => t.amount > 0);

              return (
              <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
                {/* ── Metrics strip ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-b border-[#1E2D3D]">
                  {[
                    { label: "Portfolio Value", value: fmt(portfolio.filter(c => c.status === "active").reduce((s, c) => s + effectiveCurrVal(c), 0)), accent: "#10B981" },
                    { label: "TVPI",  value: `${fund.tvpi}×`,  accent: "#10B981" },
                    { label: "DPI",   value: `${fund.dpi}×`,   accent: null },
                    { label: "RVPI",  value: `${fund.rvpi}×`,  accent: null },
                    { label: "IRR",   value: `${fund.irr}%`,   accent: null },
                    { label: "Active Companies", value: String(portfolio.filter(c => c.status === "active").length), accent: null },
                  ].map(({ label, value, accent }) => (
                    <div key={label} className="px-4 py-3.5 border-r border-[#1E2D3D] last:border-r-0">
                      <p className="text-[9px] text-slate-600 uppercase tracking-widest font-medium">{label}</p>
                      <p className="text-sm font-bold mt-0.5 tabular-nums" style={{ color: accent ?? "#e2e8f0" }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* ── Three charts ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[#1E2D3D]">

                  {/* ① Company allocation donut */}
                  <div className="p-5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-3">By Company</p>
                    <div className="flex items-center gap-5">
                      <svg width="160" height="160" viewBox="0 0 160 160" className="shrink-0">
                        {arcs.map((a, i) => (
                          <path
                            key={i}
                            d={a.path}
                            fill={a.color}
                            opacity={0.85}
                            className="cursor-pointer hover:opacity-100 transition-opacity"
                            onClick={() => setActiveCompanyId(a.id)}
                          >
                            <title>{a.label}: {fmt(a.value)}</title>
                          </path>
                        ))}
                        <text x="80" y="76" textAnchor="middle" className="fill-slate-200 text-xs font-bold" style={{ fontSize: 12, fontWeight: 700, fill: "#e2e8f0" }}>{fmt(donutTotal)}</text>
                        <text x="80" y="91" textAnchor="middle" style={{ fontSize: 9, fill: "#64748b" }}>total value</text>
                      </svg>
                      <div className="flex flex-col gap-1.5 min-w-0">
                        {donutItems.map(d => (
                          <button
                            key={d.id}
                            onClick={() => setActiveCompanyId(d.id)}
                            className="flex items-center gap-2 group text-left"
                          >
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                            <span className="text-[11px] text-slate-400 group-hover:text-slate-200 transition-colors truncate">{d.label}</span>
                            <span className="text-[11px] text-slate-600 tabular-nums ml-auto pl-2">{((d.value / donutTotal) * 100).toFixed(0)}%</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ② Value over time */}
                  <div className="p-5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-3">Value Over Time</p>
                    {!hasNavHistory ? (
                      <div className="flex items-center justify-center h-[102px] border border-dashed border-[#1E2D3D] rounded-lg">
                        <p className="text-[10px] text-slate-600 italic">Historical data pending</p>
                      </div>
                    ) : (
                      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
                        {yTicks.map((v, i) => (
                          <g key={i}>
                            <line x1={PAD.l} y1={yS(v)} x2={W - PAD.r} y2={yS(v)} stroke="#1E2D3D" strokeWidth="1" />
                            <text x={PAD.l - 4} y={yS(v) + 3} textAnchor="end" style={{ fontSize: 8, fill: "#475569" }}>
                              {v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(0)}M` : v > 0 ? `$${(v / 1000).toFixed(0)}K` : "$0"}
                            </text>
                          </g>
                        ))}
                        {xLabels.map((d, i) => {
                          const idx = navHistory.indexOf(d);
                          return <text key={i} x={xS(idx)} y={H - 4} textAnchor="middle" style={{ fontSize: 8, fill: "#475569" }}>{d.quarter}</text>;
                        })}
                        <path d={navFill} fill="#10B981" opacity="0.07" />
                        <path d={navLine} fill="none" stroke="#10B981" strokeWidth="2" strokeLinejoin="round" />
                        <circle cx={xS(navHistory.length - 1)} cy={yS(navHistory[navHistory.length - 1].nav)} r="3" fill="#10B981" />
                      </svg>
                    )}
                  </div>

                  {/* ③ Allocation by security type */}
                  <div className="p-5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-4">By Security Type <span className="normal-case text-slate-700">(est. value / principal)</span></p>
                    <div className="space-y-3">
                      {allocTypes.map(t => (
                        <div key={t.label}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                              <span className="text-xs text-slate-300 font-medium">{t.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs tabular-nums text-slate-400">{fmt(t.amount)}</span>
                              <span className="text-[10px] tabular-nums text-slate-600 w-8 text-right">{(t.pct * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-[#111D2E] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${(t.pct * 100).toFixed(1)}%`, background: t.color, opacity: 0.8 }} />
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-[#1E2D3D] flex items-center justify-between">
                        <span className="text-[10px] text-slate-600 uppercase tracking-wider">Total Deployed</span>
                        <span className="text-xs font-semibold text-slate-300 tabular-nums">{fmt(allocTotal)}</span>
                      </div>
                    </div>
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
                  className="w-full flex items-stretch hover:bg-[#111D2E]/60 transition-colors"
                >
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
                </button>
              );

              // ── Group transactions by company ──────────────────────────────────
              const CREDIT_INSTRUMENTS  = ["Term Loan", "Line of Credit", "Revenue Based Financing"];
              const CONVERT_INSTRUMENTS = ["SAFE", "Convertible Note", "Preferred"];
              const companiesWithCommon   = portfolio.filter(c => (c.shareTransactions ?? []).some(t => t.type === "Common"));
              const companiesWithCredit   = portfolio.filter(c => (c.debtPositions ?? []).some(d => CREDIT_INSTRUMENTS.includes(d.instrument)));
              const companiesWithConvert  = portfolio.filter(c => (c.debtPositions ?? []).some(d => CONVERT_INSTRUMENTS.includes(d.instrument)));

              return (
              <div className="space-y-3">

                {/* ══ 1. EQUITY (Common Stock) ══════════════════════════════════════ */}
                <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
                  {(() => {
                    const parseDate = (s: string) => {
                      const mo: Record<string,number> = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
                      const [m, y] = s.split(" "); return new Date(parseInt(y), mo[m]);
                    };
                    const totalCost = companiesWithCommon.reduce((s, c) => s + (c.shareTransactions ?? []).filter(t => t.type === "Common").reduce((a, t) => a + t.amount, 0), 0);
                    const estValue  = companiesWithCommon.reduce((s, c) => {
                      const txns = (c.shareTransactions ?? []).filter(t => t.type === "Common");
                      const sh = txns.reduce((a, t) => a + (t.shares ?? 0), 0);
                      const pps = c.totalShares ? effectiveImplied(c) / c.totalShares : null;
                      return s + (pps !== null ? sh * pps : 0);
                    }, 0);
                    const moic = totalCost > 0 && estValue > 0 ? estValue / totalCost : null;
                    // Annualized ROI — cost-weighted avg hold period
                    const { weightedYears, totalW } = companiesWithCommon.reduce<{ weightedYears: number; totalW: number }>((acc, c) => {
                      for (const t of (c.shareTransactions ?? []).filter(tx => tx.type === "Common")) {
                        const yrs = (Date.now() - parseDate(t.date).getTime()) / (365.25 * 86400_000);
                        acc.weightedYears += t.amount * yrs; acc.totalW += t.amount;
                      }
                      return acc;
                    }, { weightedYears: 0, totalW: 0 });
                    const avgYrs = totalW > 0 ? weightedYears / totalW : null;
                    const annRoi = moic !== null && avgYrs !== null && avgYrs > 0 ? (Math.pow(moic, 1 / avgYrs) - 1) * 100 : null;
                    return (
                      <>
                        <div className="border-b border-[#1E2D3D]">
                          <SectionHeader label="Equity" tableKey="common" accent="#10B981" stats={[
                            { label: "Cost Basis",     value: totalCost > 0 ? fmt(totalCost) : "—" },
                            { label: "Est. Value",     value: fmt(estValue), color: "#10B981" },
                            { label: "MOIC",           value: moic !== null ? `${moic.toFixed(2)}×` : "—", color: moic && moic >= 1 ? "#10B981" : undefined },
                            { label: "Ann. ROI",       value: annRoi !== null ? `${annRoi.toFixed(1)}%` : "—", color: "#10B981" },
                          ]} />
                        </div>
                        {openInstrumentTables.has("common") && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                                <tr>
                                  <TH></TH><TH wide>Company</TH><TH>Shares</TH><TH>Cost Basis</TH>
                                  <TH>Share Price</TH><TH>Est. Value</TH><TH>MOIC</TH><TH>Ann. ROI</TH><TH></TH>
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
                                  // Per-company annualized ROI
                                  const { wY, wD } = txns.reduce<{ wY: number; wD: number }>((a, t) => {
                                    const mo: Record<string,number> = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
                                    const [mn, yr] = t.date.split(" ");
                                    const yrs = (Date.now() - new Date(parseInt(yr), mo[mn]).getTime()) / (365.25 * 86400_000);
                                    a.wY += t.amount * yrs; a.wD += t.amount; return a;
                                  }, { wY: 0, wD: 0 });
                                  const cAnnRoi = cMoic !== null && wD > 0 && wY / wD > 0 ? (Math.pow(cMoic, wD / wY) - 1) * 100 : null;
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
                                              <p className="text-[10px] text-slate-600">{c.stage}</p>
                                            </div>
                                          </div>
                                        </TD>
                                        <TD className="tabular-nums text-slate-400">{sh > 0 ? sh.toLocaleString() : "—"}</TD>
                                        <TD className="text-slate-300 tabular-nums">{cost > 0 ? fmt(cost) : <span className="text-slate-600">—</span>}</TD>
                                        <TD className="tabular-nums">
                                          {(() => {
                                            const defaultPps = c.totalShares ? c.impliedValuation / c.totalShares : null;
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
                                        <TD className="text-emerald-400 tabular-nums">
                                          {cAnnRoi !== null ? `${cAnnRoi.toFixed(1)}%` : "—"}
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
                                          <td className="py-2 px-3" /><td className="py-2 px-3" /><td className="py-2 px-3" />
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
                                  <td className="py-2 px-3 text-xs text-emerald-400 tabular-nums font-semibold">{annRoi !== null ? `${annRoi.toFixed(1)}%` : "—"}</td>
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
                    const allCreditPos = companiesWithCredit.flatMap(c =>
                      (c.debtPositions ?? []).filter(d => CREDIT_INSTRUMENTS.includes(d.instrument))
                    );
                    const totalPrincipal = allCreditPos.reduce((s, d) => s + d.principal, 0);
                    const totalCurrVal   = allCreditPos.reduce((s, d) => s + d.currentValue, 0);
                    const ratedPos = allCreditPos.filter(d => d.interestRate !== undefined);
                    const wtdRate = ratedPos.length > 0
                      ? ratedPos.reduce((s, d) => s + d.principal * d.interestRate!, 0) / ratedPos.reduce((s, d) => s + d.principal, 0)
                      : null;
                    const totalMonthly = allCreditPos.reduce((s, d) =>
                      d.interestRate !== undefined ? s + monthlyPmt(d.principal, d.interestRate) : s, 0);
                    return (
                      <>
                        <div className="border-b border-[#1E2D3D]">
                          <SectionHeader label="Credit" tableKey="credit" accent="#6366F1" stats={[
                            { label: "Total Principal",   value: fmt(totalPrincipal) },
                            { label: "Current Value",     value: fmt(totalCurrVal), color: "#6366F1" },
                            { label: "Wtd Rate",          value: wtdRate !== null ? `${wtdRate.toFixed(1)}%` : "—" },
                            { label: "Monthly Payments",  value: totalMonthly > 0 ? `~${fmt(totalMonthly)}/mo` : "—" },
                          ]} />
                        </div>
                        {openInstrumentTables.has("credit") && (
                          companiesWithCredit.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                                  <tr>
                                    <TH></TH><TH wide>Company</TH><TH>Type</TH>
                                    <TH>Principal</TH><TH>Rate</TH><TH>Monthly Pmt</TH><TH>Status</TH>
                                  </tr>
                                </thead>
                                <tbody>
                                  {companiesWithCredit.map((c) => {
                                    const positions = (c.debtPositions ?? []).filter(d => CREDIT_INSTRUMENTS.includes(d.instrument));
                                    const principal = positions.reduce((s, d) => s + d.principal, 0);
                                    const ratedP = positions.filter(d => d.interestRate !== undefined);
                                    const compRate = ratedP.length > 0
                                      ? ratedP.reduce((s, d) => s + d.principal * d.interestRate!, 0) / ratedP.reduce((s, d) => s + d.principal, 0)
                                      : null;
                                    const totalMo = positions.reduce((s, d) =>
                                      d.interestRate !== undefined ? s + monthlyPmt(d.principal, d.interestRate) : s, 0);
                                    const rowKey = `credit-${c.id}`;
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
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-medium">{instrType}</span>
                                          </TD>
                                          <TD className="text-slate-300 tabular-nums font-medium">{fmt(principal)}</TD>
                                          <TD className="text-indigo-400 tabular-nums">{compRate !== null ? `${compRate.toFixed(1)}%` : <span className="text-slate-500">—</span>}</TD>
                                          <TD className="text-slate-300 tabular-nums">{totalMo > 0 ? `~${fmt(totalMo)}/mo` : "—"}</TD>
                                          <TD>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${positions[0]?.status === "Current" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}>
                                              {positions[0]?.status ?? "—"}
                                            </span>
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
                                              <span className="text-[10px] px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-400">{d.instrument}</span>
                                            </td>
                                            <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">{fmt(d.principal)}</td>
                                            <td className="py-2 px-3 text-[11px] text-indigo-400 tabular-nums">
                                              {d.interestRate !== undefined ? `${d.interestRate}%` : "—"}
                                            </td>
                                            <td className="py-2 px-3 text-[11px] text-slate-400 tabular-nums">
                                              {d.interestRate !== undefined ? `~${fmt(monthlyPmt(d.principal, d.interestRate))}/mo` : "—"}
                                            </td>
                                            <td className="py-2 px-3">
                                              <span className={`text-[10px] px-1 py-0.5 rounded ${d.status === "Current" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}>{d.status}</span>
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
                                    <td className="py-2 px-3 text-xs text-indigo-400 tabular-nums font-semibold">{wtdRate !== null ? `${wtdRate.toFixed(1)}%` : "—"}</td>
                                    <td className="py-2 px-3 text-xs text-slate-300 tabular-nums font-semibold">{totalMonthly > 0 ? `~${fmt(totalMonthly)}/mo` : "—"}</td>
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

                {/* ══ 4. MANAGED FUNDS ═════════════════════════════════════════════ */}
                <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
                  {(() => {
                    const totalLpBasis = managedFundPositions.reduce((s, p) => s + p.called, 0);
                    const totalNav     = managedFundPositions.reduce((s, p) => s + p.nav, 0);
                    const totalDistrib = managedFundPositions.reduce((s, p) => s + p.distributions, 0);
                    const wtdTvpi      = totalLpBasis > 0 ? (totalNav + totalDistrib) / totalLpBasis : null;
                    const wtdDpi       = totalLpBasis > 0 ? totalDistrib / totalLpBasis : null;
                    const { irrNum, irrDen } = managedFundPositions.reduce<{ irrNum: number; irrDen: number }>((acc, p) => {
                      acc.irrNum += p.called * p.irr; acc.irrDen += p.called; return acc;
                    }, { irrNum: 0, irrDen: 0 });
                    const wtdIrr = irrDen > 0 ? irrNum / irrDen : null;
                    return (
                      <>
                        <div className="border-b border-[#1E2D3D]">
                          <SectionHeader label="Managed Funds" tableKey="managed" accent="#EC4899" stats={[
                            { label: "LP Basis", value: totalLpBasis > 0 ? fmt(totalLpBasis) : "—" },
                            { label: "NAV",      value: totalNav > 0 ? fmt(totalNav) : "—", color: "#EC4899" },
                            { label: "DPI",      value: wtdDpi !== null ? `${wtdDpi.toFixed(2)}×` : "—" },
                            { label: "TVPI",     value: wtdTvpi !== null ? `${wtdTvpi.toFixed(2)}×` : "—", color: "#EC4899" },
                            { label: "IRR",      value: wtdIrr !== null ? `${wtdIrr.toFixed(1)}%` : "—", color: "#10B981" },
                          ]} />
                        </div>
                        {openInstrumentTables.has("managed") && (
                          managedFundPositions.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="border-b border-[#1E2D3D] bg-[#080E1A]">
                                  <tr>
                                    <TH></TH><TH wide>Fund</TH><TH>Vintage</TH>
                                    <TH>Unit Price</TH><TH>LP Basis</TH>
                                    <TH>NAV</TH><TH>DPI</TH><TH>TVPI</TH><TH>IRR</TH>
                                  </tr>
                                </thead>
                                <tbody>
                                  {managedFundPositions.map((p) => {
                                    const rowKey = `fund-${p.id}`;
                                    const isOpen = expandedRows.has(rowKey);
                                    return (
                                      <>
                                        <tr key={p.id} className="border-t border-[#111D2E] hover:bg-[#111D2E]/40 cursor-pointer" onClick={() => toggleRow(rowKey)}>
                                          <TD><ChevronDown size={12} className={`text-slate-600 transition-transform ${isOpen ? "rotate-180" : ""}`} /></TD>
                                          <TD>
                                            <div>
                                              <p className="font-semibold text-slate-200">{p.fundName}</p>
                                              <p className="text-[10px] text-slate-600">As of {p.asOf}</p>
                                            </div>
                                          </TD>
                                          <TD className="text-slate-400 tabular-nums">{p.vintage}</TD>
                                          <TD className="text-slate-400 tabular-nums">${p.unitPrice.toFixed(2)}</TD>
                                          <TD className="text-slate-300 tabular-nums font-medium">{fmt(p.called)}</TD>
                                          <TD className="text-pink-400 tabular-nums font-semibold">{fmt(p.nav)}</TD>
                                          <TD className="text-slate-300 tabular-nums">{p.dpi.toFixed(2)}×</TD>
                                          <TD className="text-pink-400 tabular-nums font-medium">{p.tvpi.toFixed(2)}×</TD>
                                          <TD className="text-emerald-400 tabular-nums">{p.irr.toFixed(1)}%</TD>
                                        </tr>
                                        {isOpen && (p.transactions ?? []).map((t, i) => (
                                          <tr key={i} className="border-t border-[#0D1421] bg-[#080E1A]">
                                            <td className="py-2 px-3 w-6" />
                                            <td className="py-2 px-3 pl-11">
                                              <p className="text-[11px] text-slate-400 font-medium">{t.type}</p>
                                              {t.notes && <p className="text-[10px] text-slate-600">{t.notes}</p>}
                                            </td>
                                            <td className="py-2 px-3 text-[11px] text-slate-500">{t.date}</td>
                                            <td />
                                            <td className="py-2 px-3 text-[11px] tabular-nums font-medium">
                                              <span className={t.type === "Distribution" ? "text-emerald-400" : "text-slate-300"}>
                                                {t.type === "Distribution" ? "+" : ""}{fmt(t.amount)}
                                              </span>
                                            </td>
                                            <td colSpan={4} />
                                          </tr>
                                        ))}
                                      </>
                                    );
                                  })}
                                  <tr className="border-t border-[#1E2D3D] bg-[#080E1A]">
                                    <td /><td className="py-2 px-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total / Wtd Avg</td>
                                    <td /><td />
                                    <td className="py-2 px-3 text-xs text-slate-300 tabular-nums font-semibold">{fmt(totalLpBasis)}</td>
                                    <td className="py-2 px-3 text-xs text-pink-400 tabular-nums font-semibold">{fmt(totalNav)}</td>
                                    <td className="py-2 px-3 text-xs text-slate-300 tabular-nums font-semibold">{wtdDpi !== null ? `${wtdDpi.toFixed(2)}×` : "—"}</td>
                                    <td className="py-2 px-3 text-xs text-pink-400 tabular-nums font-semibold">{wtdTvpi !== null ? `${wtdTvpi.toFixed(2)}×` : "—"}</td>
                                    <td className="py-2 px-3 text-xs text-emerald-400 tabular-nums font-semibold">{wtdIrr !== null ? `${wtdIrr.toFixed(1)}%` : "—"}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="px-5 py-8 text-center text-xs text-slate-600">No managed fund positions in this portfolio.</div>
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
          const parseDate = (s: string) => {
            const mo: Record<string,number> = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
            const [m, y] = s.split(" "); return new Date(parseInt(y), mo[m]);
          };
          const { wY, wD } = txns.reduce<{ wY: number; wD: number }>((a, t) => {
            const yrs = (Date.now() - parseDate(t.date).getTime()) / (365.25 * 86400_000);
            a.wY += t.amount * yrs; a.wD += t.amount; return a;
          }, { wY: 0, wD: 0 });
          const annRoiLive = moicLive !== null && wD > 0 && wY > 0 ? (Math.pow(moicLive, wD / wY) - 1) * 100 : null;
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
                      { label: "Ann. ROI", value: annRoiLive !== null ? `${annRoiLive.toFixed(1)}%` : "—", color: "#10B981" },
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
