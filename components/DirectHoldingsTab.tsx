"use client";
import { useMemo } from "react";
import type { DirectInvestor } from "@/lib/investors";

interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  accentColor: string;
  sector: string;
  customPricePerShare?: number;
  totalShares?: number;
  impliedValuation: number;
}

interface Props {
  investor: DirectInvestor;
  portfolio: Company[];
}

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000   ? `$${(n / 1_000).toFixed(1)}K`
  :                `$${Math.round(n).toLocaleString()}`;

const fmtShares = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(0)}K`
  :                n.toLocaleString();

const fmtPct = (n: number, decimals = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(decimals)}%`;

export default function DirectHoldingsTab({ investor, portfolio }: Props) {
  type EnrichedHolding = {
    companyId: string; shares: number; costBasisPerShare: number;
    acquisitionDate: string; notes?: string;
    company: Company; pps: number; currentValue: number;
    costBasis: number; unrealizedGain: number; unrealizedPct: number;
    ownershipPct: number | null;
  };

  const enriched = useMemo<EnrichedHolding[]>(() => {
    return investor.holdings.flatMap(h => {
      const company = portfolio.find(c => c.id === h.companyId);
      if (!company) return [];
      const pps = company.customPricePerShare ?? (company.impliedValuation / (company.totalShares ?? 1));
      const currentValue = h.shares * pps;
      const costBasis = h.shares * h.costBasisPerShare;
      const unrealizedGain = currentValue - costBasis;
      const unrealizedPct = (unrealizedGain / costBasis) * 100;
      const ownershipPct = company.totalShares ? (h.shares / company.totalShares) * 100 : null;
      return [{ ...h, company, pps, currentValue, costBasis, unrealizedGain, unrealizedPct, ownershipPct }];
    });
  }, [investor, portfolio]);

  const totalCost    = enriched.reduce((s, h) => s + h.costBasis, 0);
  const totalCurrent = enriched.reduce((s, h) => s + h.currentValue, 0);
  const totalGain    = totalCurrent - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  const moic         = totalCost > 0 ? totalCurrent / totalCost : 0;

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="rounded-xl border border-[#1E2D3D] bg-[#0D1421] px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-1">Direct Holdings</p>
            <h2 className="text-xl font-semibold text-white">{investor.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Common shares held directly in portfolio companies</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-3 py-2 self-start">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Direct shareholder
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total invested", value: fmt(totalCost), sub: "cost basis" },
            { label: "Current value", value: fmt(totalCurrent), sub: "at implied price" },
            {
              label: "Unrealized gain",
              value: fmt(Math.abs(totalGain)),
              sub: fmtPct(totalGainPct),
              gainColor: totalGain >= 0 ? "text-emerald-400" : "text-red-400",
              prefix: totalGain >= 0 ? "+" : "−",
            },
            { label: "MOIC", value: `${moic.toFixed(2)}×`, sub: "money-on-invested-capital" },
          ].map((s, i) => (
            <div key={i} className="bg-[#111D2E] rounded-lg px-4 py-3 border border-[#1E2D3D]">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{s.label}</p>
              <p className={`text-lg font-semibold tabular-nums ${s.gainColor ?? "text-white"}`}>
                {s.prefix ?? ""}{s.value}
              </p>
              <p className={`text-[10px] mt-0.5 ${s.gainColor ?? "text-slate-500"}`}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Per-company holdings ── */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 px-1">Positions</p>
        {enriched.map((h, i) => {
          const gain = h.unrealizedGain;
          const gainColor = gain >= 0 ? "text-emerald-400" : "text-red-400";
          const gainBg    = gain >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20";
          return (
            <div key={i} className="rounded-xl border border-[#1E2D3D] bg-[#0D1421] overflow-hidden">
              {/* Company header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1E2D3D]">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
                  style={{ background: h.company.accentColor }}
                >
                  {h.company.logoUrl ? (
                    <img src={h.company.logoUrl} alt={h.company.name} className="w-full h-full object-cover" />
                  ) : (
                    h.company.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white leading-tight">{h.company.name}</p>
                  <p className="text-[10px] text-slate-500">{h.company.sector}</p>
                </div>
                <div className={`rounded-md border px-2.5 py-1 text-xs font-semibold tabular-nums ${gainBg} ${gainColor}`}>
                  {gain >= 0 ? "+" : "−"}{fmt(Math.abs(gain))} ({fmtPct(Math.abs(h.unrealizedPct), 1)})
                </div>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-[#1E2D3D]">
                {[
                  { label: "Shares owned", value: fmtShares(h.shares) },
                  { label: "Cost basis / sh", value: `$${h.costBasisPerShare.toFixed(4)}` },
                  { label: "Current price / sh", value: `$${h.pps.toFixed(4)}` },
                  { label: "Total cost", value: fmt(h.costBasis) },
                  { label: "Current value", value: fmt(h.currentValue), highlight: true },
                  { label: "Ownership", value: h.ownershipPct != null ? `${h.ownershipPct.toFixed(3)}%` : "—" },
                ].map((m, j) => (
                  <div key={j} className="px-4 py-3.5 border-b border-[#1E2D3D] sm:border-b-0 last:border-b-0">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{m.label}</p>
                    <p className={`text-sm font-semibold tabular-nums ${m.highlight ? "text-amber-400" : "text-white"}`}>
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-2.5 bg-[#090F1A] border-t border-[#1E2D3D]">
                <span className="text-[10px] text-slate-600">Acquired {h.acquisitionDate}</span>
                {h.notes && <span className="text-[10px] text-slate-600">{h.notes}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Disclosures ── */}
      <div className="rounded-lg border border-[#1E2D3D] bg-[#090F1A] px-5 py-4">
        <p className="text-[10px] text-slate-600 leading-relaxed">
          Values shown are based on implied prices derived from the most recent cap table. They are
          illustrative only and do not represent a guarantee of value or liquidity. Common shares held
          directly are subject to transfer restrictions as set out in the company&apos;s shareholders&apos;
          agreement. For questions, contact your nth Venture relationship manager.
          <span className="block mt-1 text-slate-700">All figures as of {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} · Mock data — pending confirmation</span>
        </p>
      </div>
    </div>
  );
}
