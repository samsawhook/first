"use client";
import { useState } from "react";
import { Clock, Star, ExternalLink, TrendingUp } from "lucide-react";
import { dealPipeline } from "@/lib/data";
import IOIModal from "./IOIModal";
import { portfolio } from "@/lib/data";

const fmt = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : `$${(n / 1_000).toFixed(0)}K`;

const platformLabel: Record<string, string> = {
  republic: "Republic CF",
  direct: "Direct",
  spv: "SPV",
};
const platformColor: Record<string, string> = {
  republic: "#EF4444",
  direct: "#10B981",
  spv: "#6366F1",
};

export default function DealPipeline() {
  const [ioiDeal, setIoiDeal] = useState<string | null>(null);
  const companyNames = [...portfolio.map((c) => c.name), ...dealPipeline.map((d) => d.name)];

  return (
    <>
      <div className="space-y-6">
        {/* Notice */}
        <div className="p-3 bg-[#0D1421] border border-[#1E2D3D] rounded-xl text-xs text-slate-500 leading-relaxed">
          <strong className="text-slate-400">Investment opportunities shown here are for informational purposes only.</strong>{" "}
          These are not solicitations. Investments in early-stage companies carry significant risk including loss of principal.
          Minimum investment and eligibility requirements vary by offering. Confirm accredited investor status before investing.
        </div>

        {dealPipeline.map((deal) => {
          const fundedPct = Math.round((deal.raisedToDate / deal.targetRaise) * 100);

          return (
            <div
              key={deal.id}
              className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden card-hover"
            >
              {/* Top accent */}
              <div className="h-0.5 w-full" style={{ background: deal.accentColor }} />

              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Logo */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                    style={{
                      background: `${deal.accentColor}18`,
                      color: deal.accentColor,
                      border: `1px solid ${deal.accentColor}30`,
                    }}
                  >
                    {deal.initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-slate-100">
                        {deal.name}
                      </h3>
                      {deal.isFeatured && (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          <Star size={9} />
                          nth Watch List
                        </span>
                      )}
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: `${platformColor[deal.platform]}15`,
                          color: platformColor[deal.platform],
                          border: `1px solid ${platformColor[deal.platform]}30`,
                        }}
                      >
                        {platformLabel[deal.platform]}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">{deal.tagline}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{deal.sector} · {deal.stage}</p>
                  </div>

                  {/* Deadline */}
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 justify-end">
                      <Clock size={11} />
                      <span>Closes {deal.deadline}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Min: {fmt(deal.minInvestment)}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-slate-400 mt-4 leading-relaxed">{deal.description}</p>

                {/* Highlights */}
                <ul className="mt-4 space-y-1.5">
                  {deal.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-xs text-slate-400">
                      <TrendingUp
                        size={11}
                        className="shrink-0 mt-0.5"
                        style={{ color: deal.accentColor }}
                      />
                      {h}
                    </li>
                  ))}
                </ul>

                {/* Funding progress */}
                <div className="mt-5">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-slate-500">
                      Raised: <span className="text-slate-300 tabular-nums">{fmt(deal.raisedToDate)}</span>
                    </span>
                    <span className="text-xs text-slate-500">
                      Target: <span className="text-slate-300 tabular-nums">{fmt(deal.targetRaise)}</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#111D2E] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(fundedPct, 100)}%`,
                        background: deal.accentColor,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{fundedPct}% funded</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => setIoiDeal(deal.name)}
                    className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors"
                    style={{
                      background: `${deal.accentColor}18`,
                      color: deal.accentColor,
                      border: `1px solid ${deal.accentColor}30`,
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = `${deal.accentColor}28`;
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = `${deal.accentColor}18`;
                    }}
                  >
                    Express Interest
                  </button>
                  {deal.platform === "republic" && (
                    <a
                      href="https://republic.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 bg-[#111D2E] border border-[#1E2D3D] rounded-lg hover:text-slate-300 transition-colors"
                    >
                      <ExternalLink size={13} />
                      View on Republic
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <IOIModal
        isOpen={!!ioiDeal}
        onClose={() => setIoiDeal(null)}
        defaultCompany={ioiDeal ?? ""}
        defaultSide="buy"
        companies={companyNames}
      />
    </>
  );
}
