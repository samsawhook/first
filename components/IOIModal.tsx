"use client";
import { useState } from "react";
import { X, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import type { IOIPayload } from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultCompany?: string;
  defaultSide?: "buy" | "sell";
  companies?: string[];
}

export default function IOIModal({
  isOpen,
  onClose,
  defaultCompany = "",
  defaultSide,
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [accredited, setAccredited] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accredited) return;
    setSending(true);
    setError(null);
    const payload: IOIPayload = {
      company: defaultCompany,
      side: defaultSide,
      name,
      email,
      phone,
      accredited,
    };
    try {
      const res = await fetch("/api/express-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Send failed");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again or email invest@nthventure.com.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#0D1421] border border-[#1E2D3D] rounded-xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-[#1E2D3D]">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Express Interest</h2>
            {defaultCompany && (
              <p className="text-xs text-slate-500 mt-0.5">
                {defaultCompany}{defaultSide ? ` · ${defaultSide.toUpperCase()}` : ""}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={22} className="text-emerald-400" />
            </div>
            <h3 className="text-slate-100 font-semibold mb-2">Received</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Your indication of interest has been sent to{" "}
              <span className="text-slate-300">invest@nthventure.com</span>.
              A confirmation has been sent to {email}. We&apos;ll follow up within 2 business days.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-4 py-2 text-sm bg-[#111D2E] border border-[#1E2D3D] rounded-lg text-slate-300 hover:text-slate-100 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="flex gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <AlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/80 leading-relaxed">
                <strong className="text-amber-300">Non-binding.</strong>{" "}
                nth Venture LLC is not a registered broker-dealer. This indication is
                for counterparty discovery only. Any transfer must be independently
                negotiated in accordance with applicable securities laws.
              </p>
            </div>

            <div className="space-y-3">
              <input
                required
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-slate-600"
              />
              <input
                required
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-slate-600"
              />
              <input
                required
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#111D2E] border border-[#1E2D3D] rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-slate-600"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={accredited}
                onChange={(e) => setAccredited(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-500"
              />
              <span className="text-xs text-slate-400 leading-relaxed">
                I confirm that I am an{" "}
                <strong className="text-slate-300">accredited investor</strong> as defined
                by SEC Rule 501(a) of Regulation D, and that I am submitting this indication
                on my own behalf.
              </span>
            </label>

            {error && <p className="text-xs text-rose-400 text-center">{error}</p>}

            <button
              type="submit"
              disabled={!accredited || sending}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sending ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : "Submit →"}
            </button>
            <p className="text-center text-xs text-slate-600">
              A confirmation will be sent to your email address
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
