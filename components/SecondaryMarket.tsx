"use client";
import { useState } from "react";
import { AlertTriangle, ArrowUpRight, ArrowDownRight, Info } from "lucide-react";
import { secondaryLots, portfolio } from "@/lib/data";
import IOIModal from "./IOIModal";

const fmt = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : `$${(n / 1_000).toFixed(0)}K`;

const fmtPrice = (n: number) => `$${n.toFixed(2)}`;

// ── Static example listings (illustrative only — not real postings) ───────────

const EXAMPLE_LISTINGS = [
  {
    id: "example-ask",
    label: "EXAMPLE — ASK",
    companyName: "Falconer",
    side: "ask" as const,
    description: "Junior employee seeking partial liquidity on their equity grant",
    units: 12_500,
    impliedPricePerUnit: 1.80,
    impliedValuation: 16_740_000,
    sellerNote: "Early employee with 4-yr cliff. Selling ~15% of vested position for personal liquidity. Pre-cleared with legal.",
    posted: "Example listing",
  },
  {
    id: "example-bid",
    label: "EXAMPLE — BID",
    companyName: "SBR2TH Recruiting",
    side: "bid" as const,
    description: "Prospective buyer seeking secondary exposure",
    units: 20_000,
    impliedPricePerUnit: 1.65,
    impliedValuation: 7_590_000,
    sellerNote: "Accredited investor seeking up to $33K face value. Flexible on timing. Will sign ROFR waiver.",
    posted: "Example listing",
  },
];

export default function SecondaryMarket() {
  const [activeIOI, setActiveIOI] = useState<{
    company: string;
    side: "buy" | "sell";
  } | null>(null);

  const companyNames = portfolio.map((c) => c.name);
  const bids = secondaryLots.filter((l) => l.side === "bid");
  const asks = secondaryLots.filter((l) => l.side === "ask");

  const LotRow = ({
    lot,
    isExample = false,
  }: {
    lot: typeof secondaryLots[0] | typeof EXAMPLE_LISTINGS[0];
    isExample?: boolean;
  }) => {
    const isBid = lot.side === "bid";
    return (
      <tr className={`border-b border-[#111D2E] transition-colors ${isExample ? "opacity-60" : "hover:bg-[#111D2E]/60"}`}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {isExample && (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded">
                Example
              </span>
            )}
            <span className={`font-medium ${isExample ? "text-slate-400" : "text-slate-200"}`}>{lot.companyName}</span>
          </div>
          {"description" in lot && lot.description && (
            <p className="text-[10px] text-slate-600 mt-0.5">{lot.description}</p>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-xs ${
            isBid ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
          }`}>
            {isBid ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
            {isBid ? "BID" : "ASK"}
          </span>
        </td>
        <td className="px-4 py-3 text-slate-300 tabular-nums text-xs">{lot.units.toLocaleString()}</td>
        <td className="px-4 py-3 text-slate-300 tabular-nums text-xs">{fmtPrice(lot.impliedPricePerUnit)}</td>
        <td className="px-4 py-3 text-slate-300 tabular-nums text-xs">{fmt(lot.impliedValuation)}</td>
        <td className="px-4 py-3 text-slate-500 text-xs">{lot.posted}</td>
        <td className="px-4 py-3">
          {!isExample && (
            <button
              onClick={() => setActiveIOI({ company: lot.companyName, side: isBid ? "sell" : "buy" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isBid
                  ? "bg-emerald-600/15 text-emerald-400 border border-emerald-600/25 hover:bg-emerald-600/25"
                  : "bg-rose-600/10 text-rose-400 border border-rose-600/20 hover:bg-rose-600/20"
              }`}
            >
              {isBid ? "Submit Ask →" : "Submit Bid →"}
            </button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Primary regulatory warning */}
        <div className="flex gap-3 p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl">
          <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-300/80 leading-relaxed space-y-2">
            <p>
              <strong className="text-rose-300">Important — Read Before Proceeding.</strong>{" "}
              nth Venture LLC is <strong className="text-rose-300">not</strong> a registered broker-dealer,
              alternative trading system, or national securities exchange and does not facilitate, match, or
              intermediate any securities transactions. Listings on this board are strictly non-binding
              indications of interest posted by accredited investors for informational and counterparty-discovery
              purposes only.
            </p>
            <p>
              All transfers of private company securities are subject to: (i) the applicable company&apos;s
              right-of-first-refusal, co-sale, and transfer restriction provisions; (ii) board or company
              consent requirements; (iii) applicable federal and state securities laws, including but not
              limited to resale restrictions under Section 4(a)(1) of the Securities Act of 1933 and SEC
              Rule 144; and (iv) any lock-up or holding-period requirements. Buyers and sellers must
              independently negotiate, document, and execute any transfer and are solely responsible for
              compliance. <strong className="text-rose-300">Consult qualified legal and tax counsel before proceeding.</strong>
            </p>
            <p className="text-rose-300/60">
              Past performance of portfolio companies is not indicative of future results. Private securities
              are illiquid and speculative. You may lose all or a substantial portion of any amount invested.
              This platform does not provide any representation regarding the accuracy of any posted
              indication. No transfer fee, commission, or compensation of any kind is paid to or received
              by nth Venture in connection with any transaction.
            </p>
          </div>
        </div>

        {/* Example listings explanation */}
        <div className="flex gap-3 p-4 bg-[#0D1421] border border-[#1E2D3D] rounded-xl">
          <Info size={15} className="text-slate-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-400 leading-relaxed">
            <p className="font-medium text-slate-300 mb-1">How this board works</p>
            <p>
              Co-owners and portfolio company employees may post non-binding indications to buy or sell their equity.
              The two listings marked <span className="font-semibold text-slate-300">Example</span> below illustrate
              what a typical posting looks like — one from a portfolio company employee seeking liquidity on a small
              portion of their vested shares, and one from an accredited investor looking to acquire secondary exposure.
              These are illustrative only and do not represent real transactions.
            </p>
          </div>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Open Asks</p>
            <p className="text-2xl font-bold text-rose-400">{asks.length}</p>
            <p className="text-xs text-slate-500 mt-1">
              {fmt(asks.reduce((a, l) => a + l.units * l.impliedPricePerUnit, 0))} total face value
            </p>
          </div>
          <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Open Bids</p>
            <p className="text-2xl font-bold text-emerald-400">{bids.length}</p>
            <p className="text-xs text-slate-500 mt-1">
              {fmt(bids.reduce((a, l) => a + l.units * l.impliedPricePerUnit, 0))} total face value
            </p>
          </div>
        </div>

        {/* Listings table */}
        <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1E2D3D]">
            <h3 className="text-sm font-semibold text-slate-100">Indications of Interest</h3>
            <p className="text-xs text-slate-500 mt-0.5">All figures are indicative and non-binding.</p>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1E2D3D]">
                  {["Company", "Side", "Units", "Impl. Price/Unit", "Impl. Valuation", "Posted", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-slate-500 font-medium uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Real listings */}
                {secondaryLots.map((lot) => <LotRow key={lot.id} lot={lot} />)}
                {/* Example listings — visually dimmed */}
                {EXAMPLE_LISTINGS.map((lot) => <LotRow key={lot.id} lot={lot} isExample />)}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-[#111D2E]">
            {[...secondaryLots.map(l => ({ ...l, isExample: false })), ...EXAMPLE_LISTINGS.map(l => ({ ...l, isExample: true }))].map((lot) => {
              const isBid = lot.side === "bid";
              return (
                <div key={lot.id} className={`p-4 space-y-2 ${lot.isExample ? "opacity-60" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {lot.isExample && (
                        <span className="text-[9px] font-bold uppercase bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded">Example</span>
                      )}
                      <span className="font-medium text-sm text-slate-200">{lot.companyName}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isBid ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                      {isBid ? "BID" : "ASK"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><p className="text-slate-500">Units</p><p className="text-slate-300 tabular-nums">{lot.units.toLocaleString()}</p></div>
                    <div><p className="text-slate-500">Price/Unit</p><p className="text-slate-300 tabular-nums">{fmtPrice(lot.impliedPricePerUnit)}</p></div>
                    <div><p className="text-slate-500">Impl. Val.</p><p className="text-slate-300 tabular-nums">{fmt(lot.impliedValuation)}</p></div>
                  </div>
                  {lot.sellerNote && <p className="text-xs text-slate-500 italic">{lot.sellerNote}</p>}
                  {!lot.isExample && (
                    <button
                      onClick={() => setActiveIOI({ company: lot.companyName, side: isBid ? "sell" : "buy" })}
                      className={`w-full py-2 rounded-lg text-xs font-semibold ${isBid ? "bg-emerald-600/15 text-emerald-400 border border-emerald-600/25" : "bg-rose-600/10 text-rose-400 border border-rose-600/20"}`}
                    >
                      {isBid ? "Submit Ask →" : "Submit Bid →"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Post your own IOI */}
        <div className="border border-dashed border-[#1E2D3D] rounded-xl p-5 text-center">
          <p className="text-sm text-slate-400 mb-1">Have a position to sell, or looking to acquire secondary exposure?</p>
          <p className="text-xs text-slate-600 mb-4">All postings require accredited investor status and are subject to company ROFR and transfer restrictions.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setActiveIOI({ company: "", side: "buy" })}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600/15 text-emerald-400 border border-emerald-600/25 hover:bg-emerald-600/25 transition-colors"
            >
              Post a Bid
            </button>
            <button
              onClick={() => setActiveIOI({ company: "", side: "sell" })}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-rose-600/10 text-rose-400 border border-rose-600/20 hover:bg-rose-600/20 transition-colors"
            >
              Post an Ask
            </button>
          </div>
        </div>
      </div>

      <IOIModal
        isOpen={!!activeIOI}
        onClose={() => setActiveIOI(null)}
        defaultCompany={activeIOI?.company ?? ""}
        defaultSide={activeIOI?.side ?? "buy"}
        companies={companyNames}
      />
    </>
  );
}
