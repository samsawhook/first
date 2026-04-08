"use client";
import { useState } from "react";
import { AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { secondaryLots, portfolio } from "@/lib/data";
import IOIModal from "./IOIModal";

const fmt = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : `$${(n / 1_000).toFixed(0)}K`;

const fmtPrice = (n: number) => `$${n.toFixed(2)}`;

export default function SecondaryMarket() {
  const [activeIOI, setActiveIOI] = useState<{
    company: string;
    side: "buy" | "sell";
  } | null>(null);

  const companyNames = portfolio.map((c) => c.name);
  const bids = secondaryLots.filter((l) => l.side === "bid");
  const asks = secondaryLots.filter((l) => l.side === "ask");

  return (
    <>
      <div className="space-y-6">
        {/* Regulatory banner */}
        <div className="flex gap-3 p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-300/70 leading-relaxed space-y-1">
            <p>
              <strong className="text-amber-300">Important regulatory notice.</strong>{" "}
              nth Venture LLC is not a registered broker-dealer, alternative trading system, or securities exchange.
              This board is a non-intermediated forum for accredited investors to post non-binding indications of interest.
              No transactions will be facilitated, matched, or executed through this platform.
            </p>
            <p>
              All secondary transfers of private securities are subject to the company&apos;s ROFR, co-sale rights, transfer
              restrictions, and applicable securities laws. Buyers and sellers must independently negotiate, document, and
              execute any transfer. Consult qualified legal and tax counsel before proceeding.
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
            <h3 className="text-sm font-semibold text-slate-100">Active Indications</h3>
            <p className="text-xs text-slate-500 mt-0.5">All figures are indicative. Not binding.</p>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1E2D3D]">
                  {["Company", "Side", "Units", "Impl. Price/Unit", "Impl. Valuation", "Posted", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-slate-500 font-medium uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {secondaryLots.map((lot) => {
                  const isBid = lot.side === "bid";
                  return (
                    <tr
                      key={lot.id}
                      className="border-b border-[#111D2E] hover:bg-[#111D2E]/60 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-200">{lot.companyName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${
                            isBid
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {isBid ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                          {isBid ? "BID" : "ASK"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 tabular-nums">
                        {lot.units.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-300 tabular-nums">
                        {fmtPrice(lot.impliedPricePerUnit)}
                      </td>
                      <td className="px-4 py-3 text-slate-300 tabular-nums">
                        {fmt(lot.impliedValuation)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{lot.posted}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            setActiveIOI({
                              company: lot.companyName,
                              side: isBid ? "sell" : "buy",
                            })
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isBid
                              ? "bg-emerald-600/15 text-emerald-400 border border-emerald-600/25 hover:bg-emerald-600/25"
                              : "bg-rose-600/10 text-rose-400 border border-rose-600/20 hover:bg-rose-600/20"
                          }`}
                        >
                          {isBid ? "Submit Ask →" : "Submit Bid →"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-[#111D2E]">
            {secondaryLots.map((lot) => {
              const isBid = lot.side === "bid";
              return (
                <div key={lot.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-slate-200">{lot.companyName}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        isBid
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {isBid ? "BID" : "ASK"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500">Units</p>
                      <p className="text-slate-300 tabular-nums">{lot.units.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Price/Unit</p>
                      <p className="text-slate-300 tabular-nums">{fmtPrice(lot.impliedPricePerUnit)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Impl. Val.</p>
                      <p className="text-slate-300 tabular-nums">{fmt(lot.impliedValuation)}</p>
                    </div>
                  </div>
                  {lot.sellerNote && (
                    <p className="text-xs text-slate-500 italic">{lot.sellerNote}</p>
                  )}
                  <button
                    onClick={() =>
                      setActiveIOI({ company: lot.companyName, side: isBid ? "sell" : "buy" })
                    }
                    className={`w-full py-2 rounded-lg text-xs font-semibold ${
                      isBid
                        ? "bg-emerald-600/15 text-emerald-400 border border-emerald-600/25"
                        : "bg-rose-600/10 text-rose-400 border border-rose-600/20"
                    }`}
                  >
                    {isBid ? "Submit Ask →" : "Submit Bid →"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Post your own IOI */}
        <div className="border border-dashed border-[#1E2D3D] rounded-xl p-5 text-center">
          <p className="text-sm text-slate-400 mb-3">
            Have a position to sell, or looking to acquire secondary exposure?
          </p>
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
