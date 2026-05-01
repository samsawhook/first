"use client";
import { useState, useEffect } from "react";

const STORAGE_KEY = "nth_nda_accepted_v1";

export default function NDAGate({ children }: { children: React.ReactNode }) {
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setAccepted(stored === "true");
  }, []);

  if (accepted === null) return null; // avoid flash before hydration

  if (accepted) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">nth Venture Inc.</p>
          <h1 className="text-xl font-semibold text-slate-100">Confidentiality Agreement</h1>
        </div>

        {/* Body */}
        <div className="mb-6 space-y-3 text-sm text-slate-400 leading-relaxed">
          <p>
            The information contained in this portal, including but not limited to financial statements,
            portfolio company data, investment terms, and business information relating to portfolio
            companies, is strictly confidential and proprietary.
          </p>
          <p>
            By entering, you agree to hold all information in strict confidence, to use it solely for
            the purpose of evaluating a potential investment in Co-Owner Fund LP, and not to disclose
            any information to third parties without the prior written consent of nth Venture Inc.
          </p>
          <p>
            This agreement is governed by applicable law and any breach may cause irreparable harm
            for which monetary damages would be an inadequate remedy.
          </p>
        </div>

        {/* Checkbox */}
        <label className="flex items-start gap-3 mb-6 cursor-pointer group">
          <div className="relative mt-0.5 flex-shrink-0">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
            />
            <div className="w-5 h-5 rounded border border-slate-600 bg-slate-800 peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-colors flex items-center justify-center">
              {checked && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-slate-300 leading-snug">
            I have read and agree to the confidentiality obligations above. I understand that the
            information I am about to access is confidential and proprietary.
          </span>
        </label>

        {/* Button */}
        <button
          disabled={!checked}
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, "true");
            setAccepted(true);
          }}
          className="w-full rounded-lg px-4 py-3 text-sm font-semibold transition-all
            disabled:opacity-30 disabled:cursor-not-allowed
            bg-amber-500 hover:bg-amber-400 text-slate-950
            disabled:bg-slate-700 disabled:text-slate-400"
        >
          Enter Portal
        </button>

        <p className="mt-4 text-center text-xs text-slate-600">
          For authorized co-investors and prospective limited partners only.
        </p>
      </div>
    </div>
  );
}
