"use client";
import { useState } from "react";
import { TrendingUp, TrendingDown, Users, ExternalLink } from "lucide-react";
import { portfolio } from "@/lib/data";
import type { PortfolioCompany } from "@/lib/types";
import IOIModal from "./IOIModal";

const fmt = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : `$${(n / 1_000).toFixed(0)}K`;

const moic = (c: PortfolioCompany) => (c.currentValue / c.invested).toFixed(2);

function CompanyCard({
  company,
  onIOI,
}: {
  company: PortfolioCompany;
  onIOI: (c: PortfolioCompany, side: "buy" | "sell") => void;
}) {
  const m = parseFloat(moic(company));
  const isRealized = company.status === "realized";

  return (
    <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden card-hover flex flex-col">
      {/* Color bar */}
      <div className="h-0.5 w-full" style={{ background: company.accentColor }} />

      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
              style={{
                background: `${company.accentColor}18`,
                color: company.accentColor,
                border: `1px solid ${company.accentColor}30`,
              }}
            >
              {company.initials}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 leading-tight">
                {company.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{company.sector}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {isRealized && (
              <span className="text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded-full">
                Realized
              </span>
            )}
            <span className="text-xs text-slate-500">{company.stage}</span>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-xs text-slate-400 leading-relaxed">{company.tagline}</p>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#111D2E] rounded-lg p-2.5">
            <p className="text-xs text-slate-600 mb-1">Invested</p>
            <p className="text-sm font-semibold text-slate-200 tabular-nums">
              {fmt(company.invested)}
            </p>
          </div>
          <div className="bg-[#111D2E] rounded-lg p-2.5">
            <p className="text-xs text-slate-600 mb-1">Current</p>
            <p className="text-sm font-semibold tabular-nums" style={{ color: company.accentColor }}>
              {fmt(company.currentValue)}
            </p>
          </div>
          <div className="bg-[#111D2E] rounded-lg p-2.5">
            <p className="text-xs text-slate-600 mb-1">MOIC</p>
            <div className="flex items-center gap-1">
              {m >= 1 ? (
                <TrendingUp size={11} className="text-emerald-400" />
              ) : (
                <TrendingDown size={11} className="text-rose-400" />
              )}
              <p
                className="text-sm font-semibold tabular-nums"
                style={{ color: m >= 1.5 ? "#10B981" : m >= 1 ? "#E2E8F0" : "#F87171" }}
              >
                {m}x
              </p>
            </div>
          </div>
        </div>

        {/* Revenue + ownership row */}
        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-[#1E2D3D] pt-3">
          <span className="flex items-center gap-1.5">
            <Users size={10} />
            {company.employees} people · {company.ownership}% owned
          </span>
          {company.revenue && (
            <span className="flex items-center gap-1">
              {company.revenueGrowth && company.revenueGrowth > 0 ? (
                <TrendingUp size={10} className="text-emerald-400" />
              ) : null}
              <span style={{ color: company.revenueGrowth && company.revenueGrowth > 50 ? "#10B981" : "#94A3B8" }}>
                {fmt(company.revenue)} ARR
                {company.revenueGrowth ? ` · +${company.revenueGrowth}% YoY` : ""}
              </span>
            </span>
          )}
        </div>

        {/* Implied valuation */}
        <p className="text-xs text-slate-500">
          Implied valuation:{" "}
          <span className="text-slate-300 tabular-nums">
            {fmt(company.impliedValuation)}
          </span>
        </p>

        {/* IOI buttons */}
        {company.secondaryAvailable && !isRealized && (
          <div className="flex gap-2 mt-auto pt-1">
            <button
              onClick={() => onIOI(company, "buy")}
              className="flex-1 py-2 text-xs font-semibold rounded-lg bg-emerald-600/15 text-emerald-400 border border-emerald-600/25 hover:bg-emerald-600/25 transition-colors"
            >
              Express Buy Interest
            </button>
            <button
              onClick={() => onIOI(company, "sell")}
              className="flex-1 py-2 text-xs font-semibold rounded-lg bg-rose-600/10 text-rose-400 border border-rose-600/20 hover:bg-rose-600/20 transition-colors"
            >
              Express Sell Interest
            </button>
          </div>
        )}
        {!company.secondaryAvailable && !isRealized && (
          <p className="text-xs text-slate-600 mt-auto pt-1 text-center">
            Secondary trading not available
          </p>
        )}
      </div>
    </div>
  );
}

export default function PortfolioGrid() {
  const [ioiCompany, setIoiCompany] = useState<string | null>(null);
  const [ioiSide, setIoiSide] = useState<"buy" | "sell">("buy");
  const companyNames = portfolio.map((c) => c.name);

  const active = portfolio.filter((c) => c.status === "active");
  const realized = portfolio.filter((c) => c.status === "realized");

  const openIOI = (c: PortfolioCompany, side: "buy" | "sell") => {
    setIoiCompany(c.name);
    setIoiSide(side);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Active */}
        <div>
          <h3 className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">
            Active Companies ({active.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {active.map((c) => (
              <CompanyCard key={c.id} company={c} onIOI={openIOI} />
            ))}
          </div>
        </div>

        {/* Realized */}
        {realized.length > 0 && (
          <div>
            <h3 className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">
              Realized ({realized.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {realized.map((c) => (
                <CompanyCard key={c.id} company={c} onIOI={openIOI} />
              ))}
            </div>
          </div>
        )}
      </div>

      <IOIModal
        isOpen={!!ioiCompany}
        onClose={() => setIoiCompany(null)}
        defaultCompany={ioiCompany ?? ""}
        defaultSide={ioiSide}
        companies={companyNames}
      />
    </>
  );
}
