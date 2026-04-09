"use client";
import { useState, useMemo } from "react";
import { ExternalLink, Linkedin, Newspaper, Play, ChevronDown, ChevronUp, Database, AlertCircle, Check, RotateCcw, Save } from "lucide-react";

// QB_EXPORT_DATE is now per-company via company.financialsAsOf (set in data.ts on each import).
import FootballField from "@/components/FootballField";
import type { PortfolioCompany, FinancingRound, NewsItem, FinancialPeriod, CompanyLetter, BalanceSheetSnapshot, CapTableClass } from "@/lib/types";

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
  const gm = company.incomeStatement
    ? pct(company.incomeStatement.grossProfit, company.incomeStatement.revenue)
    : null;

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
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                Invested
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
              {company.dataRoomUrl && (
                <>
                  <span className="text-[#1E2D3D]">·</span>
                  <a href={company.dataRoomUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors">
                    <Database size={10} /> Data Room
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-4 border-t border-[#1E2D3D]">
          {company.revenue && (
            <KpiChip label="Revenue" value={fmtM(company.revenue)} sub={company.revenueGrowth != null ? `${company.revenueGrowth > 0 ? "+" : ""}${company.revenueGrowth}% YoY` : undefined} color="#10B981" />
          )}
          {company.ebitda !== undefined && (
            <KpiChip label="EBITDA" value={fmtM(company.ebitda)} sub={company.ebitda >= 0 ? "Profitable" : "Pre-profit"} color={company.ebitda >= 0 ? "#10B981" : "#F59E0B"} />
          )}
          {gm && <KpiChip label="Gross Margin" value={gm} />}
          {company.balanceSheet?.cash && (
            <KpiChip label="Cash on Hand" value={fmtM(company.balanceSheet.cash)}
              sub={company.balanceSheet.runwayMonths ? `${company.balanceSheet.runwayMonths}mo runway` : undefined}
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

// ── Balance Sheet History Chart ───────────────────────────────────────────────

function BalanceSheetHistoryChart({ history, accentColor }: { history: BalanceSheetSnapshot[]; accentColor: string }) {
  const PAD = { top: 24, right: 12, bottom: 32, left: 60 };
  const W = 620, H = 190;
  const CW = W - PAD.left - PAD.right;
  const CH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...history.map(h => h.totalAssets)) * 1.08;
  const minVal = Math.min(0, ...history.map(h => h.totalEquity)) * 1.25;
  const range = maxVal - minVal;

  const toY = (v: number) => PAD.top + CH - ((v - minVal) / range) * CH;
  const toX = (i: number) => PAD.left + (i / (history.length - 1)) * CW;

  const path = (fn: (h: BalanceSheetSnapshot) => number) =>
    history.map((h, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(fn(h)).toFixed(1)}`).join(" ");

  const assetsPath  = path(h => h.totalAssets);
  const liabPath    = path(h => h.totalLiabilities);
  const equityPath  = path(h => h.totalEquity);

  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => minVal + (i / tickCount) * range);

  // X label indices: every 4 quarters + last
  const labelIdxs = history.reduce<number[]>((acc, _, i) => {
    if (i % 4 === 0 || i === history.length - 1) acc.push(i);
    return acc;
  }, []);

  const baseline = toY(0);

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

      {/* Cash dots */}
      {history.map((h, i) => (
        <circle key={i} cx={toX(i)} cy={toY(h.cash)} r="2.5" fill="#22D3EE" opacity={0.75} />
      ))}

      {/* Lines */}
      <path d={liabPath}   fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="5 3" strokeLinejoin="round" />
      <path d={equityPath} fill="none" stroke="#10B981" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={assetsPath} fill="none" stroke={accentColor} strokeWidth="2" strokeLinejoin="round" />

      {/* X labels */}
      {labelIdxs.map(i => (
        <text key={i} x={toX(i)} y={H - PAD.bottom + 13} textAnchor="middle" fontSize="9"
          fill="#475569" fontFamily="Poppins,sans-serif">
          {history[i].period}
        </text>
      ))}

      {/* Zero baseline label */}
      {minVal < 0 && (
        <text x={PAD.left - 6} y={baseline + 4} textAnchor="end" fontSize="8" fill="#2D3E50" fontFamily="Poppins,sans-serif">$0</text>
      )}

      {/* Legend */}
      <g transform={`translate(${PAD.left},4)`}>
        <line x1={0} y1={8} x2={18} y2={8} stroke={accentColor} strokeWidth="2" />
        <text x={22} y={12} fontSize="9" fill="#94A3B8" fontFamily="Poppins,sans-serif">Assets</text>
        <line x1={68} y1={8} x2={86} y2={8} stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="5 3" />
        <text x={90} y={12} fontSize="9" fill="#94A3B8" fontFamily="Poppins,sans-serif">Liabilities</text>
        <line x1={150} y1={8} x2={168} y2={8} stroke="#10B981" strokeWidth="1.5" />
        <text x={172} y={12} fontSize="9" fill="#94A3B8" fontFamily="Poppins,sans-serif">Equity</text>
        <circle cx={218} cy={8} r="2.5" fill="#22D3EE" opacity={0.75} />
        <text x={224} y={12} fontSize="9" fill="#94A3B8" fontFamily="Poppins,sans-serif">Cash</text>
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
            Source: Modified Cash Export · QuickBooks{company.financialsAsOf ? ` · as of ${company.financialsAsOf}` : ""}
          </p>
        </div>
      )}

      {company.balanceSheetHistory && company.balanceSheetHistory.length > 0 && (
        <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-5">
          <SectionHeader title="Capital Structure History" />
          <BalanceSheetHistoryChart history={company.balanceSheetHistory} accentColor={company.accentColor} />
          <p className="text-[10px] text-slate-600 mt-2">
            Quarterly snapshots · cash basis · Source: QuickBooks{company.financialsAsOf ? ` as of ${company.financialsAsOf}` : ""}
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

      {/* Non-GAAP / Unaudited disclaimer */}
      <div className="flex items-start gap-2.5 bg-[#080E1A] border border-[#1E2D3D] rounded-lg px-3 py-2.5">
        <AlertCircle size={11} className="text-slate-600 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-600 leading-relaxed">
          <span className="text-slate-500 font-medium">Non-GAAP / Unaudited.</span>{" "}
          Financial data is presented on a modified cash basis as exported from QuickBooks and has not been audited or reviewed by an independent accountant. These are non-GAAP measures and may differ materially from statements prepared in accordance with U.S. GAAP. Not for reliance in making investment decisions.
        </p>
      </div>
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

// ── Cap Table ─────────────────────────────────────────────────────────────────

function CapTableSection({ company }: { company: PortfolioCompany }) {
  const ct = company.capTable;
  if (!ct) return null;

  const pool        = ct.classes.find(c => c.isPool);
  const contingent  = ct.classes.find(c => c.isContingent);
  const core        = ct.classes.filter(c => !c.isPool && !c.isContingent);

  // Adjusted FD (provided or computed): core + pool + contingent
  const adjustedFD = ct.adjustedFullyDiluted
    ?? ct.classes.reduce((s, c) => s + c.shares, 0);

  // % denominator for core classes = adjustedFD (so the donut slices are proportional)
  const fdForPct = adjustedFD;

  // SVG donut — draw all classes proportionally against adjustedFD
  const cx = 80, cy = 80, R = 62, r = 44;
  let angle = -Math.PI / 2;
  const arcs = ct.classes.map(cls => {
    const sweep = (cls.shares / fdForPct) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle);
    angle += sweep;
    const x2 = cx + R * Math.cos(angle), y2 = cy + R * Math.sin(angle);
    const ix1 = cx + r * Math.cos(angle - sweep), iy1 = cy + r * Math.sin(angle - sweep);
    const ix2 = cx + r * Math.cos(angle), iy2 = cy + r * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    return { ...cls, path: `M${x1},${y1} A${R},${R},0,${large},1,${x2},${y2} L${ix2},${iy2} A${r},${r},0,${large},0,${ix1},${iy1} Z` };
  });

  const fmtN = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : n.toString();

  const authorized = ct.authorizedCommon;
  const overAuthorized = authorized ? adjustedFD > authorized : false;

  return (
    <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-5">
      <SectionHeader title="Equity Ownership Structure" />

      {/* Authorized vs FD summary bar */}
      {authorized && (
        <div className="mb-5 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Authorized Common</span>
            <span className="tabular-nums text-slate-300 font-medium">{fmtN(authorized)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Fully Diluted (adjusted)</span>
            <span className={`tabular-nums font-semibold ${overAuthorized ? "text-amber-400" : "text-emerald-400"}`}>{fmtN(adjustedFD)}</span>
          </div>
          {/* Stacked bar */}
          {overAuthorized ? (
            <div className="h-2 rounded-full bg-[#111D2E] overflow-hidden flex">
              <div className="h-full bg-slate-600/60 rounded-l-full" style={{ width: `${(authorized / adjustedFD) * 100}%` }} />
              <div className="h-full bg-red-500/50 rounded-r-full flex-1" />
            </div>
          ) : (
            <div className="h-2 rounded-full bg-[#1E2D3D] overflow-hidden">
              <div className="h-full bg-emerald-600/50 rounded-full" style={{ width: `${(adjustedFD / authorized) * 100}%` }} />
            </div>
          )}
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>Authorized: {fmtN(authorized)}</span>
            {overAuthorized ? (
              <span className="text-red-400/70">Adj. FD exceeds authorized by {fmtN(adjustedFD - authorized)}</span>
            ) : (
              <span>{fmtN(authorized - adjustedFD)} unissued authorized capacity</span>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Donut */}
        <div className="shrink-0 self-center sm:self-auto">
          <svg viewBox="0 0 160 160" className="w-36 h-36 sm:w-44 sm:h-44">
            {arcs.map((arc, i) => (
              <path
                key={i}
                d={arc.path}
                fill={arc.color}
                opacity={arc.isPool ? 0.2 : arc.isContingent ? 0.45 : 0.85}
              />
            ))}
            <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11" fontWeight="600"
              fill="#F1F5F9" fontFamily="Poppins,sans-serif">
              {fmtN(adjustedFD)}
            </text>
            <text x={cx} y={cy + 9} textAnchor="middle" fontSize="8"
              fill="#64748B" fontFamily="Poppins,sans-serif">
              adj. FD
            </text>
          </svg>
        </div>

        {/* Table */}
        <div className="flex-1 min-w-0 w-full">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-slate-600 uppercase tracking-wide border-b border-[#1E2D3D]">
                <th className="pb-2 text-left font-medium">Class</th>
                <th className="pb-2 text-right font-medium">Shares</th>
                <th className="pb-2 text-right font-medium">% Adj FD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111D2E]">
              {ct.classes.map((cls, i) => {
                const pct = ((cls.shares / adjustedFD) * 100).toFixed(1);
                const dimmed = cls.isPool || cls.isContingent;
                return (
                  <tr key={i} className={dimmed ? "opacity-50" : ""}>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ background: cls.color, opacity: dimmed ? 0.5 : 1 }} />
                        <div className="min-w-0">
                          <span className={cls.isContingent ? "text-red-400/80" : "text-slate-300"}>
                            {cls.label}
                          </span>
                          {cls.isContingent && (
                            <span className="ml-1.5 text-[9px] text-red-500/60 uppercase tracking-wide">contingent</span>
                          )}
                          {cls.note && !cls.isContingent && (
                            <span className="text-slate-600 ml-1.5 text-[10px]">· {cls.note}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-400">{fmtN(cls.shares)}</td>
                    <td className="py-2 text-right tabular-nums">
                      <span className={cls.isContingent ? "text-red-400/70" : cls.isPool ? "text-slate-600" : "text-slate-200 font-medium"}>
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-[#1E2D3D]">
                <td className="pt-2.5 text-slate-400 font-medium">Adj. Fully Diluted</td>
                <td className="pt-2.5 text-right tabular-nums text-amber-400 font-semibold">{fmtN(adjustedFD)}</td>
                <td className="pt-2.5 text-right text-slate-400">100%</td>
              </tr>
            </tbody>
          </table>
          {contingent && (
            <p className="text-[10px] text-red-400/60 mt-3 leading-relaxed">
              * Contingent options ({fmtN(contingent.shares)}) exceed authorized share count. Exercise is subject to availability of duly authorized shares.
            </p>
          )}
          <p className="text-[10px] text-slate-600 mt-2">
            Source: {ct.source ?? "Pulley"} · as of {ct.asOf}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Football Field ────────────────────────────────────────────────────────────

function ValuationSection({
  company,
  savedValuation,
  onSaveValuation,
  onResetValuation,
}: {
  company: PortfolioCompany;
  savedValuation?: number;
  onSaveValuation?: (v: number) => void;
  onResetValuation?: () => void;
}) {
  if (!company.valuationRefs?.length) return null;

  const [pendingVal, setPendingVal] = useState(savedValuation ?? company.impliedValuation);
  const isSaved = pendingVal === (savedValuation ?? company.impliedValuation);
  const hasCustom = savedValuation !== undefined && savedValuation !== company.impliedValuation;

  return (
    <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium">Football Field Valuation</h2>
        {onSaveValuation && (
          <div className="flex items-center gap-2">
            {hasCustom && (
              <button
                onClick={() => { onResetValuation?.(); setPendingVal(company.impliedValuation); }}
                className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 border border-[#1E2D3D] hover:border-slate-500 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <RotateCcw size={11} /> Reset
              </button>
            )}
            {isSaved ? (
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-500/70 px-2.5 py-1.5">
                <Check size={11} /> Saved to overview
              </span>
            ) : (
              <button
                onClick={() => onSaveValuation(pendingVal)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-white px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: company.accentColor }}
              >
                <Save size={11} /> Save to overview
              </button>
            )}
          </div>
        )}
      </div>
      <FootballField company={company} controlled={{ value: pendingVal, onChange: setPendingVal }} />
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

export default function CompanyPage({
  company,
  savedValuation,
  onSaveValuation,
  onResetValuation,
}: {
  company: PortfolioCompany;
  savedValuation?: number;
  onSaveValuation?: (v: number) => void;
  onResetValuation?: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Beta / data disclaimer */}
      <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
        <AlertCircle size={14} className="text-amber-500/70 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <span className="text-amber-400/80 font-medium">Beta</span> — This dashboard is a work in progress. Financial data is sourced from QuickBooks (Modified Cash Export{company.financialsAsOf ? ` as of ${company.financialsAsOf}` : ""}) and may not reflect final audited figures. Cap table data (ownership, shares, valuations) is for reference only —{" "}
          <a href="https://pulley.com" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">Pulley</a>{" "}
          is the authoritative source of truth for the cap table. Implied valuations are estimates and do not constitute a formal appraisal.
        </p>
      </div>
      <HeroSection company={company} />
      <FinancialsSection company={company} />
      {company.financingHistory?.length && (
        <FinancingHistorySection history={company.financingHistory} />
      )}
      <CapTableSection company={company} />
      <ValuationSection
        company={company}
        savedValuation={savedValuation}
        onSaveValuation={onSaveValuation}
        onResetValuation={onResetValuation}
      />
      {company.annualMeetingDate && <AnnualMeetingSection company={company} />}
      {company.shareholderLetters?.length && (
        <ShareholderLettersSection letters={company.shareholderLetters} />
      )}
      <NewsSection company={company} />
    </div>
  );
}
