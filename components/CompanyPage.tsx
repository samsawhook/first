"use client";
import { ExternalLink, Linkedin, Newspaper } from "lucide-react";
import FootballField from "@/components/FootballField";
import type { PortfolioCompany, FinancingRound, NewsItem } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtM = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
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

const SOURCE_COLORS = [
  "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4",
];
const sourceColor = (source: string) =>
  SOURCE_COLORS[source.charCodeAt(0) % SOURCE_COLORS.length];

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-4">
      {title}
    </h2>
  );
}

function KpiChip({
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
    <div className="bg-[#111D2E] rounded-lg px-3 py-2.5">
      <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-0.5">
        {label}
      </p>
      <p
        className="text-sm font-semibold tabular-nums"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
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

  const stageBg: Record<string, string> = {
    Seed: "#8B5CF620",
    "Pre-Series A": "#3B82F620",
    "Series A": "#10B98120",
    Growth: "#06B6D420",
  };
  const stageColor: Record<string, string> = {
    Seed: "#8B5CF6",
    "Pre-Series A": "#3B82F6",
    "Series A": "#10B981",
    Growth: "#06B6D4",
  };

  return (
    <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
      {/* Accent bar */}
      <div className="h-1" style={{ background: company.accentColor }} />
      <div className="p-5">
        {/* Logo + name row */}
        <div className="flex items-start gap-4 mb-5">
          {company.logoUrl ? (
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white flex items-center justify-center p-1 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={company.logoUrl}
                alt={company.name}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div
              className="w-16 h-16 rounded-xl text-2xl font-bold flex items-center justify-center shrink-0"
              style={{
                background: `${company.accentColor}20`,
                color: company.accentColor,
              }}
            >
              {company.initials}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-slate-100">{company.name}</h1>
              {/* Stage badge */}
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: stageBg[company.stage] ?? "#64748B20",
                  color: stageColor[company.stage] ?? "#94A3B8",
                }}
              >
                {company.stage}
              </span>
              {/* Status badge */}
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  company.status === "active"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : company.status === "realized"
                    ? "bg-violet-500/10 text-violet-400"
                    : "bg-slate-500/10 text-slate-400"
                }`}
              >
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
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-emerald-500 hover:text-emerald-400 transition-colors"
                  >
                    <ExternalLink size={10} />
                    {company.website.replace(/^https?:\/\//, "")}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-4 border-t border-[#1E2D3D]">
          {company.revenue && (
            <KpiChip
              label="Revenue"
              value={fmtM(company.revenue)}
              sub={company.revenueGrowth ? `+${company.revenueGrowth}% YoY` : undefined}
              color="#10B981"
            />
          )}
          {company.ebitda !== undefined && (
            <KpiChip
              label="EBITDA"
              value={fmtM(company.ebitda)}
              sub={company.ebitda >= 0 ? "Profitable" : "Pre-profit"}
              color={company.ebitda >= 0 ? "#10B981" : "#F59E0B"}
            />
          )}
          {gm && (
            <KpiChip label="Gross Margin" value={gm} />
          )}
          <KpiChip label="Invested" value={fmtM(company.invested)} />
          <KpiChip
            label="Current Value"
            value={fmtM(company.currentValue)}
            color={company.accentColor}
          />
          <KpiChip
            label="Fund MOIC"
            value={`${moic}×`}
            color={moicColor}
          />
          <KpiChip
            label="nth Ownership"
            value={`${company.ownership}%`}
          />
          {company.balanceSheet?.cash && (
            <KpiChip
              label="Cash on Hand"
              value={fmtM(company.balanceSheet.cash)}
              sub={
                company.balanceSheet.runwayMonths
                  ? `${company.balanceSheet.runwayMonths}mo runway`
                  : "Profitable"
              }
              color="#06B6D4"
            />
          )}
          {company.impliedValuation && (
            <KpiChip
              label="Implied Valuation"
              value={fmtM(company.impliedValuation)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Financials ────────────────────────────────────────────────────────────────

function FinancialsSection({ company }: { company: PortfolioCompany }) {
  const is = company.incomeStatement;
  const bs = company.balanceSheet;
  if (!is && !bs) return null;

  return (
    <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-5">
      <SectionHeader title="Financials" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Statement */}
        {is && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">
              Income Statement · {is.period}
            </p>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-[#111D2E]">
                {[
                  {
                    label: "Revenue",
                    value: is.revenue,
                    cls: "text-slate-300",
                    margin: null,
                  },
                  {
                    label: "Cost of Revenue",
                    value: -is.costOfRevenue,
                    cls: "text-slate-400",
                    margin: null,
                  },
                  {
                    label: "Gross Profit",
                    value: is.grossProfit,
                    cls: "text-slate-200 font-medium",
                    margin: pct(is.grossProfit, is.revenue),
                  },
                  {
                    label: "Operating Expenses",
                    value: -is.operatingExpenses,
                    cls: "text-slate-400",
                    margin: null,
                  },
                  {
                    label: "EBITDA",
                    value: is.ebitda,
                    cls: `font-semibold ${colorBySign(is.ebitda)}`,
                    margin: pct(is.ebitda, is.revenue),
                  },
                  {
                    label: "Depreciation & Amort.",
                    value: -is.depreciation,
                    cls: "text-slate-500",
                    margin: null,
                  },
                  {
                    label: "Net Income",
                    value: is.netIncome,
                    cls: `font-semibold ${colorBySign(is.netIncome)}`,
                    margin: pct(is.netIncome, is.revenue),
                  },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className={`py-2 pr-4 ${row.cls} text-slate-500`}
                      style={{ fontWeight: "inherit" }}>
                      <span className={row.cls.includes("font") ? row.cls : "text-slate-500"}>
                        {row.label}
                      </span>
                    </td>
                    <td className={`py-2 text-right tabular-nums ${row.cls}`}>
                      {fmtM(row.value)}
                      {row.margin && (
                        <span className="ml-2 text-[10px] text-slate-600">
                          ({row.margin})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Balance Sheet */}
        {bs && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">
              Balance Sheet · {bs.asOf}
            </p>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-[#111D2E]">
                {[
                  { label: "Cash & Equivalents", value: bs.cash, highlight: true },
                  { label: "Accounts Receivable", value: bs.accountsReceivable, highlight: false },
                  ...(bs.otherCurrentAssets
                    ? [{ label: "Other Current Assets", value: bs.otherCurrentAssets, highlight: false }]
                    : []),
                  { label: "Total Assets", value: bs.totalAssets, highlight: false, bold: true },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="py-2 pr-4 text-slate-500">{row.label}</td>
                    <td
                      className={`py-2 text-right tabular-nums ${
                        row.bold ? "text-slate-200 font-medium" : "text-slate-300"
                      }`}
                    >
                      {row.highlight ? (
                        <span className="text-cyan-400">{fmtM(row.value)}</span>
                      ) : (
                        fmtM(row.value)
                      )}
                    </td>
                  </tr>
                ))}
                {/* Divider row */}
                <tr>
                  <td colSpan={2} className="py-1">
                    <div className="border-t border-[#1E2D3D]" />
                  </td>
                </tr>
                {[
                  { label: "Total Liabilities", value: bs.totalLiabilities, sign: -1 },
                  { label: "Net Equity", value: bs.netEquity, sign: 1, bold: true },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="py-2 pr-4 text-slate-500">{row.label}</td>
                    <td
                      className={`py-2 text-right tabular-nums ${
                        row.bold ? "text-slate-200 font-medium" : "text-slate-300"
                      }`}
                    >
                      {fmtM(row.value)}
                    </td>
                  </tr>
                ))}
                {/* Burn / Runway */}
                {(bs.monthlyBurn || bs.runwayMonths) && (
                  <>
                    <tr>
                      <td colSpan={2} className="py-1">
                        <div className="border-t border-[#1E2D3D]" />
                      </td>
                    </tr>
                    {bs.monthlyBurn && (
                      <tr>
                        <td className="py-2 pr-4 text-slate-500">Monthly Burn</td>
                        <td className="py-2 text-right tabular-nums text-amber-400">
                          {fmtM(bs.monthlyBurn)}/mo
                        </td>
                      </tr>
                    )}
                    {bs.runwayMonths && (
                      <tr>
                        <td className="py-2 pr-4 text-slate-500">Runway</td>
                        <td className="py-2 text-right tabular-nums text-cyan-400">
                          {bs.runwayMonths} months
                        </td>
                      </tr>
                    )}
                  </>
                )}
                {!bs.monthlyBurn && (
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Cash Flow</td>
                    <td className="py-2 text-right text-emerald-400 font-medium">
                      Positive (Profitable)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Financing History ─────────────────────────────────────────────────────────

function FinancingHistorySection({
  history,
}: {
  history: FinancingRound[];
}) {
  return (
    <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-5">
      <SectionHeader title="Financing History" />
      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-2 top-1.5 bottom-1.5 w-px bg-[#1E2D3D]" />

        <div className="space-y-6">
          {history.map((round, i) => {
            const dotColor = ROUND_COLORS[round.type] ?? "#64748B";
            return (
              <div key={i} className="relative flex items-start gap-4">
                {/* Dot */}
                <div
                  className="absolute -left-[17px] top-1 w-3 h-3 rounded-full border-2 shrink-0"
                  style={{
                    backgroundColor: dotColor,
                    borderColor: "#0D1421",
                  }}
                />
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs text-slate-500">{round.date}</span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${dotColor}20`, color: dotColor }}
                    >
                      {round.type}
                    </span>
                    <span className="text-sm font-semibold text-slate-100 tabular-nums">
                      {fmtM(round.amountRaised)} raised
                    </span>
                    {round.postMoneyValuation && (
                      <span className="text-xs text-slate-500">
                        @ {fmtM(round.postMoneyValuation)} post-money
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {round.investors.map((inv) => (
                      <span
                        key={inv}
                        className="text-[10px] bg-[#111D2E] text-slate-400 px-2 py-0.5 rounded-full"
                      >
                        {inv}
                      </span>
                    ))}
                  </div>
                  {round.notes && (
                    <p className="text-xs text-slate-600 italic">{round.notes}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Football Field wrapper ────────────────────────────────────────────────────

function ValuationSection({ company }: { company: PortfolioCompany }) {
  if (!company.valuationRefs?.length) return null;
  return (
    <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-5">
      <SectionHeader title="Football Field Valuation" />
      <FootballField company={company} />
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
            <a
              href={company.linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-[#111D2E] border border-[#1E2D3D] px-3 py-1.5 rounded-lg transition-colors"
            >
              <Linkedin size={12} />
              LinkedIn
            </a>
          )}
          <a
            href={gNewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-[#111D2E] border border-[#1E2D3D] px-3 py-1.5 rounded-lg transition-colors"
          >
            <Newspaper size={12} />
            Google News
          </a>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-600 italic">No recent news items.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <NewsCard key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const color = sourceColor(item.source);
  const initials = item.source
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const inner = (
    <div className="bg-[#111D2E] border border-[#1E2D3D] rounded-xl p-4 flex flex-col gap-2 h-full hover:border-slate-600 transition-colors">
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center shrink-0"
          style={{ background: `${color}20`, color }}
        >
          {initials}
        </div>
        <span className="text-xs text-slate-500">{item.source}</span>
        <span className="text-xs text-slate-600 ml-auto">{item.date}</span>
      </div>
      <p className="text-sm font-semibold text-slate-100 leading-snug">{item.headline}</p>
      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{item.snippet}</p>
    </div>
  );

  return item.url ? (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex">
      {inner}
    </a>
  ) : (
    <div className="flex">{inner}</div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function CompanyPage({ company }: { company: PortfolioCompany }) {
  return (
    <div className="space-y-5">
      <HeroSection company={company} />
      <FinancialsSection company={company} />
      {company.financingHistory && company.financingHistory.length > 0 && (
        <FinancingHistorySection history={company.financingHistory} />
      )}
      <ValuationSection company={company} />
      <NewsSection company={company} />
    </div>
  );
}
