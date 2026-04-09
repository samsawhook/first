"use client";
import { useState, useMemo } from "react";
import { ExternalLink, Linkedin, Newspaper, Play, ChevronDown, ChevronUp } from "lucide-react";
import FootballField from "@/components/FootballField";
import type { PortfolioCompany, FinancingRound, NewsItem, FinancialPeriod, CompanyLetter } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtM = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

const fmtMShort = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs}`;
};

const pct = (a: number, b: number) =>
  b !== 0 ? `${((a / b) * 100).toFixed(1)}%` : "—";

const colorBySign = (n: number) =>
  n > 0 ? "text-emerald-400" : n < 0 ? "text-amber-400" : "text-slate-400";

const ROUND_COLORS: Record<string, string> = {
  "Pre-Seed": "#64748B",
  Seed: "#8B5CF6",
  "Series A": "#3B82F6",
  "Series B": "#10B981",
  "Series C": "#F59E0B",
  Bridge: "#F97316",
  "Convertible Note": "#EC4899",
  Growth: "#06B6D4",
};

const SOURCE_COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4"];
const sourceColor = (s: string) => SOURCE_COLORS[s.charCodeAt(0) % SOURCE_COLORS.length];

// ── Shared ────────────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-4">{title}</h2>
  );
}

function KpiChip({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-[#111D2E] rounded-lg px-3 py-2.5">
      <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-0.5">{label}</p>
      <p className="text-sm font-semibold tabular-nums" style={color ? { color } : undefined}>{value}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: color ?? "#64748B" }}>{sub}</p>}
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection({ company }: { company: PortfolioCompany }) {
  const moic = (company.currentValue / company.invested).toFixed(2);
  const moicColor = parseFloat(moic) >= 2 ? "#10B981" : parseFloat(moic) >= 1 ? "#F59E0B" : "#EF4444";
  const gm = company.incomeStatement
    ? pct(company.incomeStatement.grossProfit, company.incomeStatement.revenue)
    : null;

  const stageBg: Record<string, string> = { Seed: "#8B5CF620", "Pre-Series A": "#3B82F620", "Series A": "#10B98120", Growth: "#06B6D420" };
  const stageColor: Record<string, string> = { Seed: "#8B5CF6", "Pre-Series A": "#3B82F6", "Series A": "#10B981", Growth: "#06B6D4" };

  return (
    <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
      <div className="h-1" style={{ background: company.accentColor }} />
      <div className="p-5">
        <div className="flex items-start gap-4 mb-5">
          {company.logoUrl ? (
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white flex items-center justify-center p-1 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl text-2xl font-bold flex items-center justify-center shrink-0"
              style={{ background: `${company.accentColor}20`, color: company.accentColor }}>
              {company.initials}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-slate-100">{company.name}</h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: stageBg[company.stage] ?? "#64748B20", color: stageColor[company.stage] ?? "#94A3B8" }}>
                {company.stage}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                company.status === "active" ? "bg-emerald-500/10 text-emerald-400"
                : company.status === "realized" ? "bg-violet-500/10 text-violet-400"
                : "bg-slate-500/10 text-slate-400"}`}>
                {company.status.charAt(0).toUpperCase() + company.status.slice(1)}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">{company.tagline}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
              <span>{company.sector}</span>
              <span className="text-[#1E2D3D]">·</span>
              <span>Est. {company.founded}</span>
              <span className="text-[#1E2D3D]">·</span>
              <span>{company.employees} employees</span>
              {company.website && (
                <>
                  <span className="text-[#1E2D3D]">·</span>
                  <a href={company.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-emerald-500 hover:text-emerald-400 transition-colors">
                    <ExternalLink size={10} />{company.website.replace(/^https?:\/\//, "")}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-4 border-t border-[#1E2D3D]">
          {company.revenue && (
            <KpiChip label="Revenue" value={fmtM(company.revenue)} sub={company.revenueGrowth ? `+${company.revenueGrowth}% YoY` : undefined} color="#10B981" />
          )}
          {company.ebitda !== undefined && (
            <KpiChip label="EBITDA" value={fmtM(company.ebitda)} sub={company.ebitda >= 0 ? "Profitable" : "Pre-profit"} color={company.ebitda >= 0 ? "#10B981" : "#F59E0B"} />
          )}
          {gm && <KpiChip label="Gross Margin" value={gm} />}
          <KpiChip label="Invested" value={fmtM(company.invested)} />
          <KpiChip label="Current Value" value={fmtM(company.currentValue)} color={company.accentColor} />
          <KpiChip label="MOIC" value={`${moic}×`} color={moicColor} />
          <KpiChip label="Ownership" value={`${company.ownership}%`} />
          {company.balanceSheet?.cash && (
            <KpiChip label="Cash on Hand" value={fmtM(company.balanceSheet.cash)}
              sub={company.balanceSheet.runwayMonths ? `${company.balanceSheet.runwayMonths}mo runway` : "Profitable"}
              color="#06B6D4" />
          )}
          {company.impliedValuation && (
            <KpiChip label="Implied Valuation" value={fmtM(company.impliedValuation)} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── P&L History Chart ─────────────────────────────────────────────────────────

const MON_TO_Q: Record<string, number> = {
  Jan: 1, Feb: 1, Mar: 1, Apr: 2, May: 2, Jun: 2,
  Jul: 3, Aug: 3, Sep: 3, Oct: 4, Nov: 4, Dec: 4,
};

function PLHistoryChart({ history, accentColor }: { history: FinancialPeriod[]; accentColor: string }) {
  const PAD = { top: 24, right: 12, bottom: 36, left: 56 };
  const W = 620, H = 200;
  const CW = W - PAD.left - PAD.right;
  const CH = H - PAD.top - PAD.bottom;

  // Aggregate monthly → quarterly when there are many monthly periods
  const displayHistory = useMemo(() => {
    const isMonthly = history.some(p => p.periodType === "monthly");
    if (!isMonthly || history.length <= 12) return history;
    const qMap = new Map<string, FinancialPeriod>();
    for (const p of history) {
      const [mon, yr] = p.period.split(" ");
      const q = MON_TO_Q[mon] ?? 1;
      const key = `Q${q}'${yr?.slice(2) ?? ""}`;
      if (!qMap.has(key)) {
        qMap.set(key, { period: key, periodType: "quarterly", revenue: 0, costOfRevenue: 0, grossProfit: 0, operatingExpenses: 0, ebitda: 0, netIncome: 0 });
      }
      const qp = qMap.get(key)!;
      qp.revenue += p.revenue;
      qp.grossProfit += p.grossProfit;
      qp.operatingExpenses += p.operatingExpenses;
      qp.ebitda += p.ebitda;
      qp.netIncome += p.netIncome;
    }
    return Array.from(qMap.values());
  }, [history]);

  const revenues = displayHistory.map((p) => p.revenue);
  const ebitdas = displayHistory.map((p) => p.ebitda);
  const maxVal = Math.max(...revenues) * 1.12;
  const minVal = Math.min(0, ...ebitdas) * 1.2;
  const range = maxVal - minVal;

  const toY = (v: number) => PAD.top + CH - ((v - minVal) / range) * CH;
  const baseline = toY(0);

  const n = displayHistory.length;
  const groupW = CW / n;
  const barW = groupW * 0.28;
  const gap = groupW * 0.06;

  // Y-axis ticks
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => minVal + (i / tickCount) * range);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 320 }}>
      {/* Grid + Y ticks */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={toY(t)} x2={W - PAD.right} y2={toY(t)}
            stroke={t === 0 ? "#2D3E50" : "#111D2E"} strokeWidth={t === 0 ? 1.5 : 1} />
          <text x={PAD.left - 6} y={toY(t) + 4} textAnchor="end" fontSize="9" fill="#475569" fontFamily="Poppins,sans-serif">
            {fmtMShort(t)}
          </text>
        </g>
      ))}

      {/* Bars per period */}
      {displayHistory.map((period, i) => {
        const gx = PAD.left + i * groupW;
        const rx = gx + groupW * 0.08;
        const ex = rx + barW + gap;

        // Revenue bar (always positive, above baseline)
        const ry = toY(period.revenue);
        const rh = Math.max(baseline - ry, 1);

        // EBITDA bar
        const ey = period.ebitda >= 0 ? toY(period.ebitda) : baseline;
        const eh = Math.max(Math.abs(toY(period.ebitda) - baseline), 1);
        const ebitdaColor = period.ebitda >= 0 ? "#10B981" : "#F59E0B";

        return (
          <g key={period.period}>
            {/* Revenue bar */}
            <rect x={rx} y={ry} width={barW} height={rh} fill={accentColor} opacity={0.7} rx={2} />
            {/* EBITDA bar */}
            <rect x={ex} y={ey} width={barW} height={eh} fill={ebitdaColor} opacity={0.8} rx={2} />
            {/* X label */}
            <text x={gx + groupW / 2} y={H - PAD.bottom + 14} textAnchor="middle" fontSize="9"
              fill="#475569" fontFamily="Poppins,sans-serif">
              {period.period}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <g>
        <rect x={PAD.left} y={4} width={10} height={10} rx={2} fill={accentColor} opacity={0.7} />
        <text x={PAD.left + 13} y={13} fontSize="9" fill="#94A3B8" fontFamily="Poppins,sans-serif">Revenue</text>
        <rect x={PAD.left + 68} y={4} width={10} height={10} rx={2} fill="#10B981" opacity={0.8} />
        <rect x={PAD.left + 68} y={4} width={10} height={10} rx={2} fill="#F59E0B" opacity={0.0} />
        <text x={PAD.left + 81} y={13} fontSize="9" fill="#94A3B8" fontFamily="Poppins,sans-serif">EBITDA</text>
        <text x={W - PAD.right} y={13} textAnchor="end" fontSize="8" fill="#334155" fontFamily="Poppins,sans-serif">
          Emerald = profitable · Amber = pre-profit
        </text>
      </g>
    </svg>
  );
}

// ── Financials ────────────────────────────────────────────────────────────────

function FinancialsSection({ company }: { company: PortfolioCompany }) {
  const is = company.incomeStatement;
  const bs = company.balanceSheet;
  const hist = company.financialHistory;
  if (!is && !bs && !hist) return null;

  const rows = is ? [
    { label: "Revenue",             value: is.revenue,              cls: "text-slate-300",         margin: null },
    { label: "Cost of Revenue",     value: -is.costOfRevenue,       cls: "text-slate-400",         margin: null },
    { label: "Gross Profit",        value: is.grossProfit,          cls: "text-slate-200 font-medium", margin: pct(is.grossProfit, is.revenue) },
    { label: "Operating Expenses",  value: -is.operatingExpenses,   cls: "text-slate-400",         margin: null },
    { label: "EBITDA",              value: is.ebitda,               cls: `font-semibold ${colorBySign(is.ebitda)}`, margin: pct(is.ebitda, is.revenue) },
    { label: "Depreciation & Amort.", value: -is.depreciation,     cls: "text-slate-500",         margin: null },
    { label: "Net Income",          value: is.netIncome,            cls: `font-semibold ${colorBySign(is.netIncome)}`, margin: pct(is.netIncome, is.revenue) },
  ] : [];

  return (
    <div className="space-y-4">
      {/* P&L history chart */}
      {hist && hist.length > 0 && (
        <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-5">
          <SectionHeader title="Revenue & EBITDA History" />
          <PLHistoryChart history={hist} accentColor={company.accentColor} />
          <p className="text-[10px] text-slate-600 mt-2">
            QuickBooks import ready — map Total Income → revenue, COGS → costOfRevenue, Net Operating Income → ebitda per period.
          </p>
        </div>
      )}

      {/* Income Statement + Balance Sheet */}
      {(is || bs) && (
        <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-5">
          <SectionHeader title="Financials" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {is && (
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">
                  Income Statement · {is.period}
                </p>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-[#111D2E]">
                    {rows.map((row) => (
                      <tr key={row.label}>
                        <td className="py-2 pr-4">
                          <span className={row.cls.includes("font") || row.cls.includes("emerald") || row.cls.includes("amber") ? "text-slate-500" : row.cls}>
                            {row.label}
                          </span>
                        </td>
                        <td className={`py-2 text-right tabular-nums ${row.cls}`}>
                          {fmtM(row.value)}
                          {row.margin && (
                            <span className="ml-2 text-[10px] text-slate-600">({row.margin})</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {bs && (
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">
                  Balance Sheet · {bs.asOf}
                </p>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-[#111D2E]">
                    {[
                      { label: "Cash & Equivalents", value: bs.cash, cyan: true },
                      { label: "Accounts Receivable", value: bs.accountsReceivable, cyan: false },
                      ...(bs.otherCurrentAssets ? [{ label: "Other Current Assets", value: bs.otherCurrentAssets, cyan: false }] : []),
                      { label: "Total Assets", value: bs.totalAssets, cyan: false, bold: true },
                    ].map((row) => (
                      <tr key={row.label}>
                        <td className="py-2 pr-4 text-slate-500">{row.label}</td>
                        <td className={`py-2 text-right tabular-nums ${row.bold ? "text-slate-200 font-medium" : "text-slate-300"}`}>
                          {row.cyan ? <span className="text-cyan-400">{fmtM(row.value)}</span> : fmtM(row.value)}
                        </td>
                      </tr>
                    ))}
                    <tr><td colSpan={2} className="py-1"><div className="border-t border-[#1E2D3D]" /></td></tr>
                    <tr>
                      <td className="py-2 pr-4 text-slate-500">Total Liabilities</td>
                      <td className="py-2 text-right tabular-nums text-slate-300">{fmtM(bs.totalLiabilities)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-slate-500">Net Equity</td>
                      <td className="py-2 text-right tabular-nums text-slate-200 font-medium">{fmtM(bs.netEquity)}</td>
                    </tr>
                    {(bs.monthlyBurn || bs.runwayMonths) && (
                      <>
                        <tr><td colSpan={2} className="py-1"><div className="border-t border-[#1E2D3D]" /></td></tr>
                        {bs.monthlyBurn && (
                          <tr>
                            <td className="py-2 pr-4 text-slate-500">Monthly Burn</td>
                            <td className="py-2 text-right tabular-nums text-amber-400">{fmtM(bs.monthlyBurn)}/mo</td>
                          </tr>
                        )}
                        {bs.runwayMonths && (
                          <tr>
                            <td className="py-2 pr-4 text-slate-500">Runway</td>
                            <td className="py-2 text-right tabular-nums text-cyan-400">{bs.runwayMonths} months</td>
                          </tr>
                        )}
                      </>
                    )}
                    {!bs.monthlyBurn && (
                      <tr>
                        <td className="py-2 pr-4 text-slate-500">Cash Flow</td>
                        <td className="py-2 text-right text-emerald-400 font-medium">Positive</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Financing History ─────────────────────────────────────────────────────────

function FinancingHistorySection({ history }: { history: FinancingRound[] }) {
  return (
    <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-5">
      <SectionHeader title="Financing History" />
      <div className="relative pl-6">
        <div className="absolute left-2 top-1.5 bottom-1.5 w-px bg-[#1E2D3D]" />
        <div className="space-y-6">
          {history.map((round, i) => {
            const dotColor = ROUND_COLORS[round.type] ?? "#64748B";
            return (
              <div key={i} className="relative flex items-start">
                <div className="absolute -left-[17px] top-1 w-3 h-3 rounded-full border-2 shrink-0"
                  style={{ backgroundColor: dotColor, borderColor: "#0D1421" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs text-slate-500">{round.date}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${dotColor}20`, color: dotColor }}>{round.type}</span>
                    <span className="text-sm font-semibold text-slate-100 tabular-nums">{fmtM(round.amountRaised)} raised</span>
                    {round.postMoneyValuation && (
                      <span className="text-xs text-slate-500">@ {fmtM(round.postMoneyValuation)} post</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {round.investors.map((inv) => (
                      <span key={inv} className="text-[10px] bg-[#111D2E] text-slate-400 px-2 py-0.5 rounded-full">{inv}</span>
                    ))}
                  </div>
                  {round.notes && <p className="text-xs text-slate-600 italic">{round.notes}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Football Field ────────────────────────────────────────────────────────────

function ValuationSection({ company }: { company: PortfolioCompany }) {
  if (!company.valuationRefs?.length) return null;
  return (
    <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-5">
      <SectionHeader title="Football Field Valuation" />
      <FootballField company={company} />
    </div>
  );
}

// ── Shareholder Letters ───────────────────────────────────────────────────────

function ShareholderLettersSection({ letters }: { letters: CompanyLetter[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-5">
      <SectionHeader title="Shareholder Letters" />
      <div className="space-y-3">
        {letters.map((letter) => {
          const isOpen = openId === letter.id;
          return (
            <div key={letter.id} className="border border-[#1E2D3D] rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenId(isOpen ? null : letter.id)}
                className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-[#111D2E] transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">{letter.period}</span>
                    <span className="text-[10px] text-slate-600">·</span>
                    <span className="text-[10px] text-slate-500">{letter.date}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-100">{letter.title}</p>
                  {!isOpen && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{letter.excerpt}</p>}
                </div>
                {isOpen ? <ChevronUp size={15} className="text-slate-500 shrink-0 mt-0.5" /> : <ChevronDown size={15} className="text-slate-500 shrink-0 mt-0.5" />}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 border-t border-[#1E2D3D]">
                  <p className="text-xs text-slate-500 pt-3 mb-3">From: {letter.author}</p>
                  <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {letter.body.split("\n").map((line, i) => {
                      if (line.startsWith("**") && line.endsWith("**")) {
                        return <p key={i} className="font-semibold text-slate-100 mt-4 mb-1">{line.slice(2, -2)}</p>;
                      }
                      return line.trim() === "" ? <div key={i} className="h-2" /> : <p key={i} className="text-slate-400 text-xs leading-relaxed">{line}</p>;
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Annual Meeting ────────────────────────────────────────────────────────────

function AnnualMeetingSection({ company }: { company: PortfolioCompany }) {
  if (!company.annualMeetingDate && !company.annualMeetingUrl) return null;

  return (
    <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-5">
      <SectionHeader title="Annual Meeting" />
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        {/* Thumbnail / play button */}
        <div className="w-full sm:w-48 h-28 bg-[#111D2E] border border-[#1E2D3D] rounded-xl flex items-center justify-center shrink-0 relative overflow-hidden group cursor-pointer"
          onClick={() => company.annualMeetingUrl && window.open(company.annualMeetingUrl, "_blank")}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-slate-800 border border-[#1E2D3D] flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
              <Play size={18} className="text-slate-400 group-hover:text-emerald-400 transition-colors ml-0.5" fill="currentColor" />
            </div>
          </div>
          <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-slate-600">Annual Meeting Recording</p>
        </div>
        {/* Details */}
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-100 mb-1">{company.name} Annual Meeting</p>
          {company.annualMeetingDate && (
            <p className="text-xs text-slate-500 mb-3">{company.annualMeetingDate}</p>
          )}
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Recording of the shareholder annual meeting, including management presentation, financials review, and Q&A session. Confidential — for shareholders only.
          </p>
          <div className="flex gap-2">
            {company.annualMeetingUrl ? (
              <a href={company.annualMeetingUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors">
                <Play size={11} fill="currentColor" /> Watch Recording
              </a>
            ) : (
              <span className="text-xs text-slate-600 italic">Recording access — contact nth Venture</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── News ──────────────────────────────────────────────────────────────────────

function NewsSection({ company }: { company: PortfolioCompany }) {
  const items = company.news ?? [];
  const gNewsUrl = `https://news.google.com/search?q=${encodeURIComponent(company.name)}`;

  return (
    <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <SectionHeader title="Recent News & Updates" />
        <div className="flex gap-2 -mt-4">
          {company.linkedInUrl && (
            <a href={company.linkedInUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-[#111D2E] border border-[#1E2D3D] px-3 py-1.5 rounded-lg transition-colors">
              <Linkedin size={12} /> LinkedIn
            </a>
          )}
          <a href={gNewsUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-[#111D2E] border border-[#1E2D3D] px-3 py-1.5 rounded-lg transition-colors">
            <Newspaper size={12} /> Google News
          </a>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-600 italic">No recent news items.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, i) => <NewsCard key={i} item={item} />)}
        </div>
      )}
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const color = sourceColor(item.source);
  const initials = item.source.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const inner = (
    <div className="bg-[#111D2E] border border-[#1E2D3D] rounded-xl p-4 flex flex-col gap-2 h-full hover:border-slate-600 transition-colors">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center shrink-0"
          style={{ background: `${color}20`, color }}>{initials}</div>
        <span className="text-xs text-slate-500">{item.source}</span>
        <span className="text-xs text-slate-600 ml-auto">{item.date}</span>
      </div>
      <p className="text-sm font-semibold text-slate-100 leading-snug">{item.headline}</p>
      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{item.snippet}</p>
    </div>
  );
  return item.url ? (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex">{inner}</a>
  ) : (
    <div className="flex">{inner}</div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CompanyPage({ company }: { company: PortfolioCompany }) {
  return (
    <div className="space-y-5">
      <HeroSection company={company} />
      <FinancialsSection company={company} />
      {company.financingHistory?.length && (
        <FinancingHistorySection history={company.financingHistory} />
      )}
      <ValuationSection company={company} />
      {company.annualMeetingDate && <AnnualMeetingSection company={company} />}
      {company.shareholderLetters?.length && (
        <ShareholderLettersSection letters={company.shareholderLetters} />
      )}
      <NewsSection company={company} />
    </div>
  );
}
