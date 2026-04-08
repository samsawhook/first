"use client";
import { useState } from "react";
import { FileText, Zap, CheckCircle2, ExternalLink, Star, Lock } from "lucide-react";
import { privateDealPipeline } from "@/lib/data";
import { portfolio } from "@/lib/data";
import type { PrivateDeal } from "@/lib/types";
import IOIModal from "./IOIModal";

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${(n / 1_000).toFixed(0)}K`;

const DEAL_TYPE_LABELS: Record<PrivateDeal["dealType"], string> = {
  acquisition: "Acquisition",
  buyout: "Principal Buyout",
  energy: "Energy Infrastructure",
  equity_option: "Equity Option",
};

// ── Interest modal (NDA or IOI) ───────────────────────────────────────────────

function NDAModal({ deal, onClose }: { deal: PrivateDeal; onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[NDA Request] ${deal.name}`);
    const body = encodeURIComponent(
      `NDA REQUEST\n===========\n\nDeal: ${deal.name}\nName: ${name}\nEmail: ${email}\n\nPlease send NDA and offering details.\n\n---\nSubmitted via nth Venture Investor Portal`
    );
    window.location.href = `mailto:invest@nthventure.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0D1421] border border-[#1E2D3D] rounded-xl shadow-2xl p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-lg leading-none">✕</button>
        {submitted ? (
          <div className="text-center py-4">
            <CheckCircle2 size={36} className="text-emerald-400 mx-auto mb-3" />
            <h3 className="text-slate-100 font-semibold mb-2">Email client opened</h3>
            <p className="text-sm text-slate-400">Review and send to <span className="text-slate-200">invest@nthventure.com</span>. The nth Venture team will send the NDA within one business day.</p>
            <button onClick={onClose} className="mt-5 px-4 py-2 text-sm bg-[#111D2E] border border-[#1E2D3D] rounded-lg text-slate-300 hover:text-slate-100 transition-colors">Close</button>
          </div>
        ) : (
          <>
            <h2 className="text-base font-semibold text-slate-100 mb-1">Request Deal Details & NDA</h2>
            <p className="text-xs text-slate-500 mb-5">
              Full identifying information, financials, and offering documents are provided under NDA. We typically respond within one business day.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input required type="text" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-slate-600" />
              <input required type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-slate-600" />
              <p className="text-[10px] text-slate-600 leading-relaxed pt-1">
                By requesting details you confirm you are an accredited investor and agree to keep all information received under NDA confidential.
              </p>
              <button type="submit"
                className="w-full py-2.5 text-sm font-semibold bg-[#111D2E] border border-[#1E2D3D] hover:border-slate-500 text-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2">
                <FileText size={13} /> Draft NDA Request Email →
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ── Deal card ─────────────────────────────────────────────────────────────────

function DealCard({
  deal,
  onNDA,
  onIOI,
  onCompanyClick,
}: {
  deal: PrivateDeal;
  onNDA: () => void;
  onIOI: () => void;
  onCompanyClick?: (id: string) => void;
}) {
  const linkedPortco = deal.linkedPortcoId
    ? portfolio.find((c) => c.id === deal.linkedPortcoId)
    : null;

  const hasEquityUpside =
    deal.yieldScenarios.length === 1 && deal.yieldScenarios[0].annualizedReturn === 0;

  return (
    <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
      {/* Accent bar */}
      <div className="h-1" style={{ background: deal.accentColor }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-4 mb-4">
          {/* Logo / initials */}
          {linkedPortco?.logoUrl ? (
            <button
              onClick={() => linkedPortco && onCompanyClick?.(linkedPortco.id)}
              className="w-12 h-12 rounded-xl overflow-hidden bg-white flex items-center justify-center p-1 shrink-0 hover:opacity-80 transition-opacity"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={linkedPortco.logoUrl} alt={linkedPortco.name} className="w-full h-full object-contain" />
            </button>
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: `${deal.accentColor}18`, color: deal.accentColor, border: `1px solid ${deal.accentColor}30` }}>
              {deal.initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
                style={{ background: `${deal.accentColor}15`, color: deal.accentColor }}>
                {DEAL_TYPE_LABELS[deal.dealType]}
              </span>
              {deal.isFeatured && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  <Star size={8} /> nth Pick
                </span>
              )}
              {deal.requiresNDA && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-slate-500/10 text-slate-500 border border-slate-500/20 px-2 py-0.5 rounded-full">
                  <Lock size={8} /> NDA Required
                </span>
              )}
              {deal.yearsInBusiness && (
                <span className="text-[10px] text-slate-600">{deal.yearsInBusiness} yrs in business</span>
              )}
            </div>
            <h3 className="text-base font-semibold text-slate-100 leading-snug">{deal.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{deal.sector}</p>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-sm text-slate-400 leading-relaxed mb-4 italic">&ldquo;{deal.tagline}&rdquo;</p>

        {/* Description */}
        <p className="text-sm text-slate-400 leading-relaxed mb-4">{deal.description}</p>

        {/* Highlights */}
        <ul className="space-y-1.5 mb-5">
          {deal.highlights.map((h) => (
            <li key={h} className="flex items-start gap-2 text-xs text-slate-400">
              <span className="mt-0.5 shrink-0 text-[8px]" style={{ color: deal.accentColor }}>◆</span>
              {h}
            </li>
          ))}
        </ul>

        {/* Metrics strip */}
        <div className="flex flex-wrap gap-3 mb-5 pt-4 border-t border-[#1E2D3D]">
          {deal.revenue && (
            <div className="bg-[#111D2E] rounded-lg px-3 py-2 min-w-[90px]">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Revenue</p>
              <p className="text-sm font-semibold text-slate-200 tabular-nums">{fmt(deal.revenue)}</p>
            </div>
          )}
          {deal.cashFlow !== undefined && (
            <div className="bg-[#111D2E] rounded-lg px-3 py-2 min-w-[90px]">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">{deal.cashFlowLabel ?? "Cash Flow"}</p>
              <p className="text-sm font-semibold text-emerald-400 tabular-nums">{fmt(deal.cashFlow)}</p>
            </div>
          )}
          {deal.assets && (
            <div className="bg-[#111D2E] rounded-lg px-3 py-2 min-w-[90px]">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Hard Assets</p>
              <p className="text-sm font-semibold text-slate-200 tabular-nums">{fmt(deal.assets)}+</p>
            </div>
          )}
          {deal.askingPrice && (
            <div className="bg-[#111D2E] rounded-lg px-3 py-2 min-w-[90px]">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">
                {deal.dealType === "energy" ? "Total CAPEX" : deal.dealType === "equity_option" ? "Option Price" : "Asking Price"}
              </p>
              <p className="text-sm font-semibold tabular-nums" style={{ color: deal.accentColor }}>{fmt(deal.askingPrice)}</p>
            </div>
          )}
          {deal.minimumInvestment && (
            <div className="bg-[#111D2E] rounded-lg px-3 py-2 min-w-[90px]">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Min Investment</p>
              <p className="text-sm font-semibold text-slate-200 tabular-nums">{fmt(deal.minimumInvestment)}</p>
            </div>
          )}
        </div>

        {/* Yield scenarios */}
        <div className="mb-5">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mb-3">
            {hasEquityUpside ? "Return Profile" : "Yield Targets"}
          </p>
          <div className="flex flex-wrap gap-3">
            {deal.yieldScenarios.map((scenario) => (
              <div key={scenario.label} className="bg-[#111D2E] border border-[#1E2D3D] rounded-xl px-4 py-3 flex-1 min-w-[140px]">
                {hasEquityUpside ? (
                  <p className="text-lg font-bold" style={{ color: deal.accentColor }}>Equity Upside</p>
                ) : (
                  <p className="text-2xl font-bold tabular-nums" style={{ color: deal.accentColor }}>
                    {scenario.annualizedReturn}%
                    <span className="text-sm font-normal text-slate-500 ml-1">target</span>
                  </p>
                )}
                <p className="text-xs font-semibold text-slate-300 mt-0.5">{scenario.label}</p>
                {scenario.notes && (
                  <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">{scenario.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Assets note */}
        {deal.assetsNote && (
          <p className="text-[10px] text-slate-600 italic mb-4 leading-relaxed">{deal.assetsNote}</p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-[#1E2D3D]">
          {deal.requiresNDA && (
            <button onClick={onNDA}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-[#111D2E] border border-[#1E2D3D] hover:border-slate-500 text-slate-300 hover:text-slate-100 rounded-lg transition-colors">
              <FileText size={12} /> Request Details + NDA
            </button>
          )}
          <button onClick={onIOI}
            className="flex items-center gap-1.5 flex-1 justify-center px-4 py-2.5 text-xs font-semibold rounded-lg transition-colors"
            style={{ background: `${deal.accentColor}18`, color: deal.accentColor, border: `1px solid ${deal.accentColor}30` }}
            onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${deal.accentColor}28`; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${deal.accentColor}18`; }}
          >
            <Zap size={12} /> Express Interest →
          </button>
          {linkedPortco && onCompanyClick && (
            <button onClick={() => onCompanyClick(linkedPortco.id)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-slate-400 hover:text-slate-200 bg-[#111D2E] border border-[#1E2D3D] hover:border-slate-600 rounded-lg transition-colors">
              <ExternalLink size={11} /> View Company
            </button>
          )}
        </div>

        {deal.deadline && (
          <p className="text-[10px] text-slate-600 mt-2 text-center">{deal.deadline} · For accredited investors</p>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DealPipeline({ onCompanyClick }: { onCompanyClick?: (id: string) => void }) {
  const [ndaDeal, setNdaDeal] = useState<PrivateDeal | null>(null);
  const [ioiDeal, setIoiDeal] = useState<string | null>(null);
  const dealNames = privateDealPipeline.map((d) => d.name);

  return (
    <>
      <div className="space-y-6">
        {/* From The Wrap banner */}
        <div className="flex items-start justify-between gap-4 p-4 bg-orange-500/5 border border-orange-500/15 rounded-xl">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-orange-400 shrink-0" aria-hidden="true">
                <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/>
              </svg>
              <span className="text-xs font-semibold text-orange-400 uppercase tracking-wide">From The Wrap</span>
              <span className="text-xs text-slate-600">· Special Edition, April 2, 2026</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              These opportunities were shared publicly via Sam&apos;s newsletter. Non-identifying information is shown here;{" "}
              <span className="text-slate-300">full details require a signed NDA</span> due to owner sensitivity around customer and employee awareness. First come, first served — historically raises fill in days.
            </p>
          </div>
          <a href="https://sawhook.substack.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 shrink-0 text-xs font-medium text-orange-400 hover:text-orange-300 border border-orange-500/20 px-3 py-1.5 rounded-lg transition-colors">
            <ExternalLink size={11} /> Read Newsletter
          </a>
        </div>

        {/* Deal cards — 2-col on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {privateDealPipeline.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onNDA={() => setNdaDeal(deal)}
              onIOI={() => setIoiDeal(deal.name)}
              onCompanyClick={onCompanyClick}
            />
          ))}
        </div>

        {/* Co-Owner Fund CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-[#0D1421] border border-[#1E2D3D] rounded-xl">
          <div>
            <p className="text-sm font-semibold text-slate-100 mb-1">Chef&apos;s Choice — Co-Owner Fund, LP</p>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
              Prefer a managed allocation across the full deal set? LP spots in Co-Owner Fund are available. The fund provides diversified exposure to the nth portfolio managed by the team.
            </p>
          </div>
          <button onClick={() => setIoiDeal("Co-Owner Fund, LP")}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors">
            <Zap size={13} /> Express LP Interest
          </button>
        </div>

        {/* Legal disclaimer */}
        <div className="p-4 bg-[#0D1421] border border-[#1E2D3D] rounded-xl text-[10px] text-slate-600 leading-relaxed space-y-2">
          <p className="font-semibold text-slate-500">Important Disclosures</p>
          <p>
            This communication is provided in good faith for general and preliminary informational purposes only and does not constitute an offer to sell or a solicitation of an offer to buy any securities. Any such offer will be made only pursuant to formal offering documents, including a private placement memorandum (&ldquo;PPM&rdquo;), subscription agreement, and related materials, which should be reviewed carefully prior to making any investment decision. Such securities will generally be offered in reliance on exemptions from registration under the Securities Act of 1933, including Rule 506(b) or Rule 506(c) of Regulation D.
          </p>
          <p>
            Investments described herein are speculative, involve a high degree of risk, and are illiquid. There can be no assurance that any investment objectives will be achieved or that investors will receive any return of their capital. Past performance is not indicative of future results. Forward-looking statements, including projected returns or yield targets, are based on assumptions that may not materialize and are subject to significant business, market, and economic risks.
          </p>
          <p>
            This communication is not intended as legal, tax, or investment advice. Prospective investors should conduct their own independent due diligence and consult with their legal, tax, and financial advisors prior to making any investment decision. nth Venture LLC is not a registered broker-dealer or investment adviser.
          </p>
        </div>
      </div>

      {/* Modals */}
      {ndaDeal && <NDAModal deal={ndaDeal} onClose={() => setNdaDeal(null)} />}
      <IOIModal
        isOpen={!!ioiDeal}
        onClose={() => setIoiDeal(null)}
        defaultCompany={ioiDeal ?? ""}
        defaultSide="buy"
        companies={dealNames}
      />
    </>
  );
}
