"use client";
import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Client-side access gate. NOTE: this is access friction, not real security —
// the hash list is shipped to the browser and a determined user with devtools
// can inspect or bypass. Use it to keep the casual public out, and pair with a
// real backend auth check before exposing anything genuinely sensitive.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "nth_access_granted_v1";

// Hashes are SHA-256(SALT + normalized_value). Inputs are normalized before
// hashing: invite codes are trimmed + uppercased, SSNs are stripped to digits.
// Generate new hashes with:
//   printf %s "<SALT><value>" | sha256sum
const SALT = "nth-venture-access-v1";

// Replace placeholders with real authorized values. Sample placeholder pair:
//   invite code "PREVIEW2026" and SSN "111-22-3333" both unlock.
const VALID_INVITE_HASHES = new Set<string>([
  "8eda968171f7f37dfc8723fbd347aef7d1d611bb48033434d69dcfbe59941af9", // PREVIEW2026
]);
const VALID_SSN_HASHES = new Set<string>([
  "52e0cda6fbc91a3eb834878b7c7591751e2bda49b0a117c31966fd692817de64", // 111-22-3333
]);

async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeInvite(s: string): string { return s.trim().toUpperCase(); }
function normalizeSsn(s: string): string    { return s.replace(/\D/g, ""); }

function formatSsnDisplay(digits: string): string {
  const d = digits.slice(0, 9);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

export default function AccessGate({ children }: { children: React.ReactNode }) {
  const [granted, setGranted] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"invite" | "ssn">("invite");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setGranted(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  // Reset input/error when switching modes.
  useEffect(() => { setValue(""); setError(null); }, [mode]);

  if (granted === null) return null;          // avoid hydration flash
  if (granted)         return <>{children}</>;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setChecking(true);
    try {
      const normalized = mode === "invite" ? normalizeInvite(value) : normalizeSsn(value);
      if (!normalized || (mode === "ssn" && normalized.length !== 9)) {
        setError(mode === "invite" ? "Enter an invite code" : "Enter a 9-digit SSN");
        return;
      }
      const hash = await sha256Hex(SALT + normalized);
      const list = mode === "invite" ? VALID_INVITE_HASHES : VALID_SSN_HASHES;
      if (list.has(hash)) {
        localStorage.setItem(STORAGE_KEY, "true");
        setGranted(true);
      } else {
        setError(mode === "invite" ? "Invite code not recognized" : "SSN not on the authorized list");
      }
    } finally {
      setChecking(false);
    }
  }

  const ssnDisplay = mode === "ssn" ? formatSsnDisplay(normalizeSsn(value)) : value;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">nth Venture Inc.</p>
          <h1 className="text-xl font-semibold text-slate-100">Restricted Access</h1>
          <p className="mt-2 text-sm text-slate-400">
            Authorized investors only. Enter your invite code or SSN to continue.
          </p>
        </div>

        {/* Mode switch */}
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg border border-slate-800 bg-slate-950/40 p-1">
          {(["invite", "ssn"] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md py-2 text-xs font-semibold transition-colors ${
                mode === m
                  ? "bg-amber-500 text-slate-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {m === "invite" ? "Invite Code" : "SSN"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
              {mode === "invite" ? "Invite code" : "Social security number"}
            </label>
            {mode === "invite" ? (
              <input
                type="text"
                autoComplete="off"
                autoFocus
                spellCheck={false}
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="ABCD-EFGH-1234"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 tracking-wider placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
              />
            ) : (
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                value={ssnDisplay}
                onChange={e => setValue(e.target.value)}
                placeholder="XXX-XX-XXXX"
                maxLength={11}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 tabular-nums placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
              />
            )}
            {mode === "ssn" && (
              <p className="mt-1.5 text-[10px] text-slate-600 leading-relaxed">
                Your SSN is checked against an authorized list locally in your browser
                and is never transmitted or stored. Compared as a salted SHA-256 hash.
              </p>
            )}
          </div>

          {error && (
            <p className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={checking || !value.trim()}
            className="w-full rounded-lg px-4 py-3 text-sm font-semibold transition-all
              disabled:opacity-30 disabled:cursor-not-allowed
              bg-amber-500 hover:bg-amber-400 text-slate-950
              disabled:bg-slate-700 disabled:text-slate-400"
          >
            {checking ? "Verifying…" : "Continue"}
          </button>
        </form>

        <p className="mt-5 text-center text-[10px] text-slate-600 leading-relaxed">
          Unauthorized access is prohibited. All access attempts may be logged.
          For assistance, contact your nth Venture relationship manager.
        </p>
      </div>
    </div>
  );
}
