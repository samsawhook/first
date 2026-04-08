"use client";
import { useState } from "react";
import { X, AlertTriangle, ExternalLink } from "lucide-react";
import type { IOIPayload } from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultCompany?: string;
  defaultSide?: "buy" | "sell";
  companies: string[];
}

export default function IOIModal({
  isOpen,
  onClose,
  defaultCompany = "",
  defaultSide = "buy",
  companies,
}: Props) {
  const [form, setForm] = useState<IOIPayload>({
    company: defaultCompany,
    side: defaultSide,
    amount: "",
    impliedValuation: "",
    name: "",
    email: "",
    phone: "",
    accredited: false,
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accredited) return;

    const subject = encodeURIComponent(
      `[IOI] ${form.side === "buy" ? "Buy" : "Sell"} Indication — ${form.company}`
    );
    const body = encodeURIComponent(
      `INDICATION OF INTEREST (NON-BINDING)\n` +
        `===========================================\n\n` +
        `Company: ${form.company}\n` +
        `Side: ${form.side.toUpperCase()}\n` +
        `Target Amount: $${form.amount}\n` +
        `Implied Valuation: $${form.impliedValuation || "open"}\n\n` +
        `Contact Information:\n` +
        `Name: ${form.name}\n` +
        `Email: ${form.email}\n` +
        `Phone: ${form.phone || "not provided"}\n\n` +
        `Notes: ${form.notes || "none"}\n\n` +
        `---\n` +
        `Submitted via nth Venture Investor Portal\n` +
        `This is a non-binding indication only. No transaction will occur through this platform.\n` +
        `Submitter confirms they are an accredited investor under SEC Rule 501 of Regulation D.`
    );

    window.location.href = `mailto:invest@nthventure.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  const set = (field: keyof IOIPayload, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-[#0D1421] border border-[#1E2D3D] rounded-xl shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1E2D3D]">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Indication of Interest
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Non-binding — for matching purposes only</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <ExternalLink size={20} className="text-emerald-400" />
            </div>
            <h3 className="text-slate-100 font-semibold mb-2">Your email client should open</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Your IOI has been drafted in your email client. Review and send to{" "}
              <span className="text-slate-300">invest@nthventure.com</span>. The
              nth Venture team will follow up within 2 business days.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-4 py-2 text-sm bg-[#111D2E] border border-[#1E2D3D] rounded-lg text-slate-300 hover:text-slate-100 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Regulatory disclaimer */}
            <div className="flex gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/80 leading-relaxed">
                <strong className="text-amber-300">Not a broker-dealer transaction.</strong>{" "}
                nth Venture LLC is not a registered broker-dealer. This indication is
                non-binding and strictly for counterparty discovery. Any securities
                transfer must be independently negotiated, documented, and executed in
                accordance with applicable federal and state securities laws. Consult
                qualified legal counsel before proceeding.
              </p>
            </div>

            {/* Company + Side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
                  Company
                </label>
                <select
                  required
                  value={form.company}
                  onChange={(e) => set("company", e.target.value)}
                  className="w-full bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#243447]"
                >
                  <option value="">Select…</option>
                  {companies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
                  Side
                </label>
                <div className="flex rounded-lg border border-[#1E2D3D] overflow-hidden">
                  {(["buy", "sell"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set("side", s)}
                      className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                        form.side === s
                          ? s === "buy"
                            ? "bg-emerald-600/20 text-emerald-400 border-emerald-600/40"
                            : "bg-rose-600/20 text-rose-400 border-rose-600/40"
                          : "bg-[#111D2E] text-slate-400 hover:text-slate-300"
                      }`}
                    >
                      {s === "buy" ? "Buy" : "Sell"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Amount + Valuation */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
                  Target Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm">$</span>
                  <input
                    required
                    type="text"
                    placeholder="50,000"
                    value={form.amount}
                    onChange={(e) => set("amount", e.target.value)}
                    className="w-full bg-[#111D2E] border border-[#1E2D3D] rounded-lg pl-6 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#243447]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
                  Implied Valuation (optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm">$</span>
                  <input
                    type="text"
                    placeholder="open"
                    value={form.impliedValuation}
                    onChange={(e) => set("impliedValuation", e.target.value)}
                    className="w-full bg-[#111D2E] border border-[#1E2D3D] rounded-lg pl-6 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#243447]"
                  />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-3">
              <label className="block text-xs text-slate-400 font-medium uppercase tracking-wide">
                Contact Information
              </label>
              <input
                required
                type="text"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="w-full bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#243447]"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className="w-full bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#243447]"
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className="w-full bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#243447]"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
                Notes (optional)
              </label>
              <textarea
                rows={2}
                placeholder="Any constraints, timing considerations, or questions…"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className="w-full bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#243447] resize-none"
              />
            </div>

            {/* Accredited investor checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={form.accredited}
                onChange={(e) => set("accredited", e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-500"
              />
              <span className="text-xs text-slate-400 leading-relaxed">
                I confirm that I am an{" "}
                <strong className="text-slate-300">accredited investor</strong> as
                defined by SEC Rule 501(a) of Regulation D, and that I am submitting
                this indication on my own behalf.
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={!form.accredited}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all
                bg-emerald-600 hover:bg-emerald-500 text-white
                disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Draft IOI Email →
            </button>
            <p className="text-center text-xs text-slate-600">
              Opens your email client — no data is stored by this portal
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
