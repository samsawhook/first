"use client";
import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Client-side access gate. NOTE: this is access friction, not real security —
// the hash list is shipped to the browser and a determined user with devtools
// can inspect or bypass. Use it to keep the casual public out, and pair with a
// real backend auth check before exposing anything genuinely sensitive.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY          = "nth_access_granted_v1";
const STORAGE_KEY_INVESTOR = "nth_investor_id_v1";

// Hashes are SHA-256(SALT + normalized_value). Inputs are normalized before
// hashing: invite codes are trimmed + uppercased, phone numbers are stripped to 10 digits.
// Generate new hashes with:
//   printf %s "<SALT><value>" | sha256sum
const SALT = "nth-venture-access-v1";

const VALID_INVITE_HASHES = new Set<string>([
  "8eda968171f7f37dfc8723fbd347aef7d1d611bb48033434d69dcfbe59941af9", // PREVIEW2026
  "d41008601899815c6c2f30044c51d7fa72ebf2d898860919acf8ffc789fde2b4", // WOLFSON
  "d71546d6e8c7f4016001ef3ba4ec7e75485b66ec9ee6744e7d1221a79d43f9a8", // WOLFSONUPDATED
  "68330324e4dd87abd15adb09e58d4cc3484302525018b7e6da9d9795285cd962", // SAWHOOK
  "4a0ea7d2ee8f422c284905d2d64354294a802db341339f8584f9bc2fda01e03d", // ALLOCATOR
  "c66bd2086749a885a6044f8cf0a297bb1b5126d0920d55d9509414a91ebd7803", // PALASH
]);

// Maps credential hash → direct investor profile ID.
// Any hash not in this map gets general fund access with no Direct Holdings tab.
const HASH_TO_INVESTOR_ID: Record<string, string> = {
  "c66bd2086749a885a6044f8cf0a297bb1b5126d0920d55d9509414a91ebd7803": "palash-jillian", // PALASH
  "d71546d6e8c7f4016001ef3ba4ec7e75485b66ec9ee6744e7d1221a79d43f9a8": "neil-wolfson",   // WOLFSONUPDATED
};
const VALID_PHONE_HASHES = new Set<string>([
  "5928b212a16ee6d43f47c8d0dbe270153c27803a4ed46a3ce01130c4c1d49cbe", // 972-415-6178
  "fc0bdc4e276992e1491547f9e55ef54540d8697342b4cc7c780d89601be0f14d", // 978-210-2328
  "1ebf501c2ef97c6de3ff3a9bad80c934e8852b5a44cd32c68bc9bac20f9f83e6", // 307-413-3333
  "d8cdadc1e0c27f54915e155360f7597edc2a7de194c61dfcabfbbe9fbb34a448", // 801-557-3964
  "adefd84ef34682308cdc82924de9329c937d188690f7429fb705e944d66fa75c", // 501-351-7288
  "11cb270a5523d1bf445b358097f45d4ae0b148bc2f4f1081bf6df97b6301d44d", // 646-251-5989
  "c21f246a63c600f537896d9bdb7d9e56031efd4cbb1ce456f8000c4d9d118d7d", // 732-996-7419
  "529d6628b8f5339dd3e1476882bc791e25bf672e86dbe50a3416e6fe7b60fd08", // 860-212-4690
  "7d578ee0f421a772d2d0b4bf693924308dfce470f7d46761b78427f0a9d07680", // 203-451-6484
  "dc1a72437118eda8359c389c2090345a2518a04953b63f72d52edd88f152752a", // 361-765-2351
  "688ac107f0a8b3c56cc691383be256adeb592d2869f87017da8276f1ccf810d3", // 224-703-1199
  "a0a1271e64c07c04cf562043d2fcec1b79ce31fa4993b4ae1db0a3ab5ec17492", // 847-754-9247
  "a1860114db9ab53a7b0c84b25a25e7dcb3b9e5a5872b228c1c1f1fcb00ac3781", // 201-248-4610
  "a47bb85a817d2022a9f863d70b2df9f26cec69f2ebd749184b24791a7b098fe3", // 917-703-0114
  "a0d69ea9ecacd84c286eac92bf10a2e3cb25611168c3325f2a2f0ddf3837cd3f", // 980-216-9496
  "64c7354ad42d773c60212f53b92d954adfe956f9992f1c62b5a7856a5e308da4", // 361-765-5858
  "ab7cb8ddbcb2742d0555cf2a6f497e7f745f3eb892b009416b850d9cdb854105", // 781-962-1810
  "9638bb994ef800352b847d1b914ff55a6e1a97c9e4409ca39210516e416c414f", // 704-614-8324
  "8095b5dfaf3f72b27f5f374015728d969bcd85f28fa1b7dbb62d2c8eace23ed7", // 512-538-5576
  "3afc13ebd918e1e45a8ae5288d29e1b174b70a0e84617a78904973bf74e4e345", // 650-526-8132
  "d30496eb3475f714af16fc715fcf52e802dae11f1aceeb426a3dbbbe5db3c6f2", // 253-797-1917
  "2b60689b4372a6f857b3ba57599832f7ca2f671354b8574dfeac086fc4aadfe8", // 602-910-0008
  "acd79eb4ad1dec68798d7dfda3773c9efa9cefb9f6d6bea7f80d070e2bfca011", // 385-272-3841
  "90c7dd0f0003fb7cb6c8422132c9a44f9b1aaa335c97a4b179ecee554ce15d50", // 617-309-7090
  "a342efb2f8a15a0ba183577e2dcdc7bb188ea912450c0f5ec44bf31e21f93534", // 860-402-8931
  "4eb8ce2e05b64707359e7657c821de38a620cd50dea0ee43971f874eaf694be8", // 858-361-6364
  "0e4e254fe55e60ab78c15dde15af0daf0f03fac0411837cfe4f915f0d030bcfe", // 310-908-6446
  "7e21645e180eab4db1b00d6c75f4f82878f2e7f047da143ed831ff2809a733a0", // 859-967-8065
  "d6530d873b6533cb61d01b1eb070453c2cc138607af341ed4613db1033f22287", // 917-364-2935
  "f9a598846dcb8017b490e199405111312ae1619df3b1bbfda337773dccbe9072", // 917-617-9101
]);

async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeInvite(s: string): string  { return s.trim().toUpperCase(); }
function normalizePhone(s: string): string   { return s.replace(/\D/g, ""); }

function formatPhoneDisplay(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length <= 3) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function AccessGate({ children, onGranted }: { children: React.ReactNode; onGranted?: (investorId: string | null) => void }) {
  const [granted, setGranted] = useState<boolean | null>(null);
  const [view, setView] = useState<"auth" | "request">("auth");
  const [mode, setMode] = useState<"invite" | "phone">("invite");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Request-access form state
  const [reqName, setReqName] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqContext, setReqContext] = useState("");
  const [reqStatus, setReqStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [reqError, setReqError] = useState<string | null>(null);

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
      const normalized = mode === "invite" ? normalizeInvite(value) : normalizePhone(value);
      if (!normalized || (mode === "phone" && normalized.length !== 10)) {
        setError(mode === "invite" ? "Enter an invite code" : "Enter a 10-digit phone number");
        return;
      }
      const hash = await sha256Hex(SALT + normalized);
      const list = mode === "invite" ? VALID_INVITE_HASHES : VALID_PHONE_HASHES;
      if (list.has(hash)) {
        localStorage.setItem(STORAGE_KEY, "true");
        const investorId = HASH_TO_INVESTOR_ID[hash] ?? null;
        if (investorId) localStorage.setItem(STORAGE_KEY_INVESTOR, investorId);
        else localStorage.removeItem(STORAGE_KEY_INVESTOR);
        onGranted?.(investorId);
        setGranted(true);
      } else {
        setError(mode === "invite" ? "Invite code not recognized" : "Phone number not on the authorized list");
      }
    } finally {
      setChecking(false);
    }
  }

  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setReqError(null);
    if (!reqName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reqEmail.trim())) {
      setReqError("Please enter your name and a valid email.");
      return;
    }
    setReqStatus("sending");
    try {
      const res = await fetch("/api/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: reqName.trim(),
          email: reqEmail.trim(),
          context: reqContext.trim(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Submission failed");
      }
      setReqStatus("sent");
    } catch (err) {
      setReqStatus("error");
      setReqError(err instanceof Error ? err.message : "Submission failed");
    }
  }

  const phoneDisplay = mode === "phone" ? formatPhoneDisplay(normalizePhone(value)) : value;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950 px-4 py-6 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">nth Venture Inc.</p>
          <h1 className="text-xl font-semibold text-slate-100">
            {view === "auth" ? "Restricted Access" : "Request Access"}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {view === "auth"
              ? "Authorized investors only. Enter your invite code or phone number to continue."
              : "Tell us who you are and we'll review your request."}
          </p>
        </div>

        {view === "auth" ? (
          <>
            {/* Mode switch */}
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg border border-slate-800 bg-slate-950/40 p-1">
              {(["invite", "phone"] as const).map(m => (
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
                  {m === "invite" ? "Invite Code" : "Phone"}
                </button>
              ))}
            </div>

            {/* Auth form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                  {mode === "invite" ? "Invite code" : "Phone number"}
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
                    type="tel"
                    inputMode="numeric"
                    autoComplete="off"
                    autoFocus
                    value={phoneDisplay}
                    onChange={e => setValue(e.target.value)}
                    placeholder="(XXX) XXX-XXXX"
                    maxLength={14}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 tabular-nums placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
                  />
                )}
                {mode === "phone" && (
                  <p className="mt-1.5 text-[10px] text-slate-600 leading-relaxed">
                    Your phone number is checked against an authorized list locally in your browser
                    and is never transmitted or stored.
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

            <div className="mt-5 pt-5 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-500">
                Don't have access?{" "}
                <button
                  type="button"
                  onClick={() => setView("request")}
                  className="text-amber-400 hover:text-amber-300 font-medium underline-offset-2 hover:underline"
                >
                  Request access
                </button>
              </p>
            </div>
          </>
        ) : reqStatus === "sent" ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-4">
              <p className="text-sm font-semibold text-emerald-300 mb-1">Request received</p>
              <p className="text-xs text-emerald-200/80 leading-relaxed">
                We sent a confirmation to{" "}
                <span className="font-mono">{reqEmail}</span>. The team typically responds within
                one business day. If approved, you'll receive an invite code by email.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setView("auth");
                setReqStatus("idle");
                setReqName(""); setReqEmail(""); setReqContext("");
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Full name</label>
              <input
                type="text"
                autoComplete="name"
                autoFocus
                value={reqName}
                onChange={e => setReqName(e.target.value)}
                placeholder="Jane Doe"
                maxLength={200}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Email</label>
              <input
                type="email"
                autoComplete="email"
                value={reqEmail}
                onChange={e => setReqEmail(e.target.value)}
                placeholder="jane@example.com"
                maxLength={200}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                Context <span className="normal-case font-normal text-slate-600">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={reqContext}
                onChange={e => setReqContext(e.target.value)}
                placeholder="How you know nth Venture, who referred you, accreditation status, etc."
                maxLength={2000}
                className="mt-1 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {reqError && (
              <p className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
                {reqError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setView("auth"); setReqError(null); }}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={reqStatus === "sending"}
                className="flex-[2] rounded-lg px-4 py-2.5 text-sm font-semibold transition-all
                  disabled:opacity-30 disabled:cursor-not-allowed
                  bg-amber-500 hover:bg-amber-400 text-slate-950"
              >
                {reqStatus === "sending" ? "Sending…" : "Submit request"}
              </button>
            </div>
          </form>
        )}

        <p className="mt-5 text-center text-[10px] text-slate-600 leading-relaxed">
          Unauthorized access is prohibited. All access attempts may be logged.
          For assistance, contact your nth Venture relationship manager.
        </p>
      </div>
    </div>
  );
}
