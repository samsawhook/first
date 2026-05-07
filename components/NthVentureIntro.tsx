"use client";
import { useState, useEffect, useRef, RefObject } from "react";

function useInView(ref: RefObject<HTMLDivElement | null>, threshold = 0.15): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

function FadeIn({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

function SlideIn({ children, delay = 0, from = "left", className = "" }: {
  children: React.ReactNode; delay?: number; from?: "left" | "right"; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, 0.1);
  const tx = from === "left" ? "-40px" : "40px";
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : `translateX(${tx})`,
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

function useCountUp(target: number, enabled: boolean, duration = 1.2): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [enabled, target, duration]);
  return val;
}

// ── nth Venture logo (matches portal, inverted for light bg) ──────────────────
function NthLogo({ size = 44 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/1691979830329-NJ5W8U6WT1N0F60PRNXV/Nth.png"
      alt="nth Venture"
      width={size}
      height={size}
      style={{ display: "block", filter: "brightness(0)", objectFit: "contain", flexShrink: 0 }}
    />
  );
}

// ── Fund Size Scatter (JPMorgan/PitchBook Exhibit 9 — every dot) ─────────────
// [fundSize_bn, irr_multiple, quartile]  Q1=circle Q2=triangle Q3=square Q4=diamond
const SCATTER_POINTS: [number, number, number][] = [
  // ── Q1 First quartile (blue circles) ─────────────────────────────────────
  // Sky-high outliers — $100-300M funds
  [0.10,8.0,1],[0.13,7.5,1],[0.11,7.1,1],[0.15,6.7,1],[0.12,6.3,1],
  [0.18,5.9,1],[0.14,5.6,1],[0.10,5.3,1],[0.20,5.1,1],[0.16,4.9,1],
  // Upper cluster $100-500M (x=0.1–0.5), y=3–5x
  [0.10,4.6,1],[0.15,4.4,1],[0.22,4.2,1],[0.18,4.0,1],[0.28,3.8,1],[0.24,3.6,1],
  [0.12,3.4,1],[0.32,3.3,1],[0.20,3.1,1],[0.28,3.0,1],[0.35,2.9,1],[0.25,2.8,1],
  [0.40,2.7,1],[0.30,2.6,1],[0.22,2.5,1],[0.45,2.4,1],[0.38,2.3,1],
  // Lower cluster $100-500M (x=0.1–0.5), y=1.5–2.3x
  [0.12,2.2,1],[0.20,2.1,1],[0.28,2.0,1],[0.35,1.95,1],[0.45,1.90,1],
  [0.15,1.85,1],[0.25,1.80,1],[0.38,1.78,1],[0.50,1.75,1],
  // Gradual taper — $500M–$1B (x=0.5–1.0), WIDE vertical spread, NOT a cliff
  [0.55,4.5,1],[0.60,4.0,1],[0.65,3.5,1],[0.58,3.0,1],[0.70,2.8,1],
  [0.75,2.5,1],[0.62,2.2,1],[0.80,2.0,1],[0.90,1.85,1],[1.00,1.80,1],
  // $1B–$2B — cloud still tall, not pinched
  [1.05,3.8,1],[1.10,3.2,1],[1.20,2.8,1],[1.30,2.4,1],[1.40,2.1,1],
  [1.50,1.90,1],[1.60,2.5,1],[1.75,1.85,1],[2.00,1.78,1],
  // $2B–$5B — gradual narrowing
  [2.20,2.8,1],[2.50,2.3,1],[2.80,2.0,1],[3.00,1.85,1],[3.20,2.4,1],
  [3.50,1.75,1],[4.00,1.85,1],[4.50,1.68,1],[5.00,1.60,1],
  // $5B–$10B
  [5.50,1.85,1],[6.00,1.65,1],[7.00,1.55,1],[8.00,1.62,1],[9.00,1.55,1],
  // Large fund outliers $10B+
  [11.0,1.78,1],[12.0,1.82,1],[14.5,1.52,1],[17.0,1.58,1],[20.5,1.48,1],[22.0,2.05,1],

  // ── Q2 Second quartile (green triangles) ─────────────────────────────────
  // Small fund cluster
  [0.08,1.90,2],[0.12,1.85,2],[0.18,1.80,2],[0.25,1.75,2],[0.35,1.72,2],[0.45,1.68,2],[0.55,1.65,2],
  // Mid range
  [0.70,1.62,2],[1.00,1.58,2],[1.30,1.60,2],[1.80,1.56,2],[2.20,1.53,2],[3.00,1.50,2],
  [3.50,1.54,2],[4.50,1.48,2],[5.00,1.50,2],[6.00,1.46,2],[7.00,1.48,2],[8.00,1.50,2],
  // Large
  [9.50,1.45,2],[11.0,1.48,2],[12.5,1.43,2],[14.0,1.40,2],[16.0,1.75,2],[18.0,1.45,2],
  [20.0,1.52,2],[22.0,1.62,2],[24.0,1.38,2],

  // ── Q3 Third quartile (orange squares) ───────────────────────────────────
  // Small fund cluster
  [0.10,1.30,3],[0.18,1.28,3],[0.28,1.25,3],[0.40,1.22,3],[0.55,1.18,3],[0.75,1.15,3],
  // Mid range fill
  [1.00,1.20,3],[1.30,1.15,3],[1.70,1.12,3],[2.00,1.22,3],[2.50,1.18,3],[3.00,1.15,3],
  [3.50,1.20,3],[4.00,1.16,3],[4.50,1.12,3],[5.00,1.10,3],[5.50,1.14,3],[6.50,1.18,3],
  [7.00,1.12,3],[8.00,1.20,3],[8.50,1.10,3],[9.50,1.15,3],
  // Large
  [11.0,1.08,3],[12.5,1.20,3],[14.0,1.15,3],[15.5,1.18,3],[17.0,1.10,3],
  [19.0,1.15,3],[21.0,1.20,3],[22.5,1.10,3],[24.0,1.15,3],

  // ── Q4 Fourth quartile (purple diamonds) ─────────────────────────────────
  // Very small funds — deepest losses
  [0.04,0.12,4],[0.05,0.22,4],[0.06,0.35,4],[0.07,0.48,4],
  // Small fund wide spread
  [0.08,0.65,4],[0.10,0.50,4],[0.10,0.80,4],[0.12,0.38,4],[0.14,1.05,4],
  [0.15,0.28,4],[0.16,0.72,4],[0.18,0.55,4],[0.20,0.90,4],[0.20,0.32,4],
  [0.25,0.60,4],[0.28,0.42,4],[0.30,0.78,4],[0.32,0.52,4],[0.35,0.95,4],
  [0.38,0.62,4],[0.40,0.40,4],[0.42,0.85,4],[0.45,0.68,4],
  [0.50,0.35,4],[0.52,0.75,4],[0.58,1.00,4],[0.65,0.55,4],[0.70,0.82,4],
  // Mid range
  [0.80,0.70,4],[1.00,0.90,4],[1.20,0.65,4],[1.50,0.82,4],[2.00,0.75,4],
  [2.50,0.95,4],[3.00,0.88,4],[3.50,0.78,4],[4.50,0.92,4],[5.00,0.70,4],
  [5.50,0.85,4],[6.50,0.72,4],[7.50,0.88,4],[8.50,0.80,4],
  // Large
  [10.0,0.92,4],[11.5,0.82,4],[13.0,0.75,4],[15.0,0.88,4],[17.0,0.80,4],
  [19.0,0.98,4],[21.0,0.85,4],[23.0,0.88,4],[25.0,1.00,4],
];

function FundSizeScatter() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, 0.1);

  const W = 560, H = 290;
  const PAD = { left: 44, right: 16, top: 14, bottom: 38 };
  const pw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom;
  const maxX = 25, maxY = 8.5;

  const toX = (v: number) => PAD.left + (v / maxX) * pw;
  const toY = (v: number) => PAD.top + ph - (v / maxY) * ph;

  const COLORS: Record<number, string> = {
    1: "#3b82f6", 2: "#22c55e", 3: "#f97316", 4: "#7c3aed",
  };

  const renderPoint = ([x, y, q]: [number, number, number], i: number) => {
    const cx = toX(x), cy = toY(y);
    const c = COLORS[q];
    const op = visible ? (q === 1 ? 0.88 : 0.70) : 0;
    const tr = { transition: `fill-opacity ${0.35 + i * 0.005}s ease` };
    const r = 4;
    if (q === 1) return <circle key={i} cx={cx} cy={cy} r={r} fill={c} fillOpacity={op} style={tr} />;
    if (q === 2) return <polygon key={i} points={`${cx},${cy-r} ${cx-r},${cy+r} ${cx+r},${cy+r}`} fill={c} fillOpacity={op} style={tr} />;
    if (q === 3) return <rect key={i} x={cx-r+0.5} y={cy-r+0.5} width={r*2-1} height={r*2-1} fill={c} fillOpacity={op} style={tr} />;
    return <polygon key={i} points={`${cx},${cy-r} ${cx+r},${cy} ${cx},${cy+r} ${cx-r},${cy}`} fill={c} fillOpacity={op} style={tr} />;
  };

  const LEGEND = [
    { q: 1, label: "First quartile",  shape: "circle"   },
    { q: 2, label: "Second quartile", shape: "triangle"  },
    { q: 3, label: "Third quartile",  shape: "square"    },
    { q: 4, label: "Fourth quartile", shape: "diamond"   },
  ];

  return (
    <div ref={ref} style={{ marginTop: 24 }}>
      {/* Legend — matching original chart shapes */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 24px", marginBottom: 14 }}>
        {LEGEND.map(({ q, label, shape }) => {
          const c = COLORS[q];
          return (
            <div key={q} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <svg width={10} height={10} viewBox="-5 -5 10 10" overflow="visible">
                {shape === "circle"   && <circle cx={0} cy={0} r={4} fill={c} />}
                {shape === "triangle" && <polygon points="0,-4 -4,4 4,4" fill={c} />}
                {shape === "square"   && <rect x={-3.5} y={-3.5} width={7} height={7} fill={c} />}
                {shape === "diamond"  && <polygon points="0,-4 4,0 0,4 -4,0" fill={c} />}
              </svg>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#555" }}>{label}</span>
            </div>
          );
        })}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
        {/* Horizontal grid lines */}
        {[0, 2, 4, 6, 8].map(y => (
          <line key={y} x1={PAD.left} y1={toY(y)} x2={W - PAD.right} y2={toY(y)}
            stroke="#1e1e1c" strokeWidth={0.8} />
        ))}
        {/* Draw Q4, Q3, Q2 first so Q1 renders on top */}
        {SCATTER_POINTS.filter(p => p[2] === 4).map((p, i) => renderPoint(p, 1000 + i))}
        {SCATTER_POINTS.filter(p => p[2] === 3).map((p, i) => renderPoint(p, 2000 + i))}
        {SCATTER_POINTS.filter(p => p[2] === 2).map((p, i) => renderPoint(p, 3000 + i))}
        {SCATTER_POINTS.filter(p => p[2] === 1).map((p, i) => renderPoint(p, i))}
        {/* X axis ticks + labels */}
        {[0, 5, 10, 15, 20, 25].map(v => (
          <g key={v}>
            <line x1={toX(v)} y1={PAD.top + ph} x2={toX(v)} y2={PAD.top + ph + 5} stroke="#444" strokeWidth={0.6} />
            <text x={toX(v)} y={H - 8} textAnchor="middle" fill="#666" fontSize={10} fontFamily="'DM Mono', monospace">
              ${v}
            </text>
          </g>
        ))}
        {/* Y axis labels */}
        {[0, 2, 4, 6, 8].map(v => (
          <text key={v} x={PAD.left - 6} y={toY(v) + 4} textAnchor="end" fill="#666" fontSize={10} fontFamily="'DM Mono', monospace">
            {v}.0×
          </text>
        ))}
        {/* Axis titles */}
        <text x={PAD.left + pw / 2} y={H - 0} textAnchor="middle" fill="#555" fontSize={10} fontFamily="'DM Mono', monospace">
          Fund size (USD bn)
        </text>
        <text x={9} y={PAD.top + ph / 2} textAnchor="middle" fill="#555" fontSize={10} fontFamily="'DM Mono', monospace"
          transform={`rotate(-90, 9, ${PAD.top + ph / 2})`}>
          IRR (multiple)
        </text>
      </svg>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#444", marginTop: 8, lineHeight: 1.6 }}>
        Exhibit 9 — Distribution of private equity manager performance by quartile and fund size · Source: PitchBook, J.P. Morgan Asset Management, as of Sept 30, 2023 · 1,690 global PE funds, vintage 2003–2021, fund sizes $100M–$25B ·{" "}
        <a href="https://am.jpmorgan.com/content/dam/jpm-am-aem/global/en/institutional/insights/portfolio-insights/siag-gaining-perspective.pdf"
          target="_blank" rel="noopener noreferrer"
          style={{ color: "#c45a2d", textDecoration: "none" }}>
          Full report ↗
        </a>
      </p>
    </div>
  );
}


const revenueData = [
  { label: "Year 1", total: 5 },
  { label: "Year 2", total: 265 },
  { label: "Year 3", total: 1304 },
  { label: "Year 4", total: 1858 },
];

function RevenueChart() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, 0.1);
  const [hovered, setHovered] = useState<number | null>(null);
  const max = 2000;

  return (
    <div ref={ref} style={{ padding: "2rem 0" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "clamp(16px, 5vw, 64px)", height: 240, justifyContent: "center" }}>
        {revenueData.map((d, i) => {
          const hPct = d.total / max;
          const active = hovered === i;
          const delay = i * 0.09;
          return (
            <div
              key={d.label}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "default" }}
            >
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "clamp(11px, 2vw, 13px)",
                fontWeight: 500,
                color: active ? "#c45a2d" : "#888",
                transition: "color 0.2s",
              }}>
                ${d.total >= 1000 ? (d.total / 1000).toFixed(1) + "M" : d.total + "K"}
              </span>
              <div style={{
                width: "clamp(36px, 9vw, 72px)",
                height: visible ? `${hPct * 180}px` : "0px",
                background: active
                  ? "linear-gradient(180deg, #c45a2d, #8b3a1a)"
                  : "linear-gradient(180deg, #2a2a2a, #1a1a1a)",
                borderRadius: "4px 4px 0 0",
                transition: `background 0.3s, transform 0.2s, height ${0.45 + delay}s cubic-bezier(0.16,1,0.3,1)`,
                transform: active ? "scaleX(1.06)" : "scaleX(1)",
                transformOrigin: "bottom",
              }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "clamp(10px, 2vw, 12px)", color: "#666", letterSpacing: 0.5 }}>{d.label}</span>
            </div>
          );
        })}
      </div>
      <p style={{ textAlign: "center", fontSize: 12, color: "#888", marginTop: 12, fontStyle: "italic" }}>
        Aggregate portfolio revenues (000s USD) · Unaudited, non-GAAP cash basis
      </p>
    </div>
  );
}

// ── Team ──────────────────────────────────────────────────────────────────────
type TeamMember = { name: string; role: string; initials: string; color: string; bio: string; photo?: string };

// Drop files into /public/team/ using these exact names.
// The card shows the photo with a pencil-sketch filter; falls back to initials if absent.
const CO_FOUNDERS: TeamMember[] = [
  { name: "Sam Sawhook",  role: "Co-Founder & CEO",                  initials: "SS", color: "#c45a2d", photo: "/team/sam-sawhook.jpg",   bio: "Army veteran (Operation Atlantic Resolve convoy commander) and startup operator. Co-founded nth Venture in 2021 and launched six employee-owned portfolio companies. Former U.S. GAO financial auditor — the supreme audit authority in the United States — with engagements at the SEC, DoD, and Treasury. Currently pursuing a Master of Accountancy." },
  { name: "Sam Johnston", role: "Co-Founder & CMO",                  initials: "SJ", color: "#8a4a1a", photo: "/team/sam-johnston.jpg",  bio: "Forbes Business Council member with a background spanning International Economics, Applied Psychology, and Marketing (Texas McCombs, Stanford, University of Wales Trinity Saint David). Leads brand strategy, investor communications, and new business launches across the nth Venture portfolio." },
  { name: "Michael Shamoun", role: "Co-Founder & CTO",               initials: "MS", color: "#2a5a8a", photo: "/team/michael-shamoun.jpg", bio: "Electrical engineering and computer architecture background (UT Dallas B.S., UT Austin M.S.). Former software engineer at General Motors and IBM before co-founding nth Venture. Leads all technology infrastructure across the platform and portfolio companies." },
  { name: "Nathan Deily", role: "Co-Founder & Chief People Officer", initials: "ND", color: "#1a5a3a", photo: "/team/nathan-deily.jpg",  bio: "Senior talent and organizational leadership roles at Microsoft, Honeywell, Raytheon, and LivePerson before co-founding nth Venture. M.S. in Labor Relations from Michigan State, Executive MBA from ASU W.P. Carey. Host of the Breakthrough Hiring Show podcast." },
  { name: "Jillian Palash", role: "Co-Founder & Chief of Staff",     initials: "JP", color: "#5a3a6a", photo: "/team/jillian-palash.jpg", bio: "Nearly 15 years in Fortune 50 corporate communications and public relations at top-ranked agencies and in-house roles. Joined nth Venture as a founding team member and serves on the leadership team at Falconer." },
];

const PORTCO_CEOS: TeamMember[] = [
  { name: "David Markowitz", role: "CEO, Audily",                       initials: "DM", color: "#7a3a1a", photo: "/team/david-markowitz.jpg", bio: "Award-winning audio producer and podcast executive. Former Podcast Manager at Netflix. Leads Audily's roster of branded audio content, original productions, and acquisitions — including the Rococo Punch and Pop Ups Studio networks, covered by Bloomberg and The Hollywood Reporter." },
  { name: "Doug Epperly",    role: "President, Merchant Boxes",          initials: "DE", color: "#2a5a2a", photo: "/team/doug-epperly.jpg",    bio: "Over two decades in global supply chain and fulfillment. Founder of E3 Enterprises. Expanded Merchant Boxes into a custom packaging platform serving hundreds of e-commerce and retail brands." },
  { name: "John Light",      role: "President, SBR2TH",                  initials: "JL", color: "#1a3a5a", photo: "/team/john light.jpg",      bio: "20+ years in specialized technical recruiting across contingent, retained, and RPO models. Built SBR2TH's proprietary Retingent and Pipelining hiring vehicles and its AI-driven talent platform (sbr2th.ai). Focused on Data Science, ML, and senior engineering placement." },
  { name: "Grant Typrin",    role: "President, Certd & Pigeon Service",  initials: "GT", color: "#4a4a1a", photo: "/team/grant-typrin.jpg",    bio: "UT Austin McCombs graduate. Led operations at Certd, nth Venture's training certification marketplace, before expanding to oversee corporate finance and operations across multiple portfolio companies." },
];

const ADVISORS: TeamMember[] = [
  { name: "Neil Wolfson",   role: "Vice Chairman",   initials: "NW", color: "#1a5a3a", photo: "/team/neil wolfson.jpg",  bio: "Former President & CIO of Wilmington Trust Investment Management ($40B+ AUM). National Partner in Charge of KPMG's Investment Consulting Practice ($100B+ in assets)." },
  { name: "Jay Heller",     role: "Advisory Board",  initials: "JH", color: "#2a4a7a", photo: "/team/jay-heller.jpg",   bio: "Senior member of Nasdaq's Capital Markets Team. Over 25 years in financial markets. Led execution of 2,300+ IPOs including Rivian, Airbnb, Coinbase, and Lyft." },
  { name: "Sandy Leeds",    role: "Advisory Board",  initials: "SL", color: "#5a3a6a", photo: "/team/sandy leeds.jpg",  bio: "Finance faculty at University of Arizona. 23 years at UT Austin McCombs. JD from UVA, MBA from UT Austin, CFA charterholder. Co-author of Investment Analysis & Portfolio Management. Former portfolio manager ($1.6B AUM)." },
  { name: "Steven Maasch",  role: "Advisory Board",  initials: "SM", color: "#3a5a5a", photo: "/team/steven maasch.jpg", bio: "SVP Human Resources at Riverview Bank. Wharton-educated HR leader with experience scaling organizations at Avista Corporation, First Interstate BancSystem, and InfrastruX. Specialist in workforce planning, succession, and performance management." },
  { name: "Ted Ladd",       role: "Advisory Board",  initials: "TL", color: "#6a4a2a", photo: "/team/ted ladd.jpg",    bio: "Professor of Entrepreneurship at Hult International Business School. Harvard instructor. 15 teaching awards. PhD from Case, MBA from Wharton, MA from Johns Hopkins, BA triple major from Cornell. Latest startup acquired by Google for smartwatch software." },
];

const teamMembers = [...CO_FOUNDERS, ...PORTCO_CEOS, ...ADVISORS];

// Pencil-sketch SVG filter — renders once, referenced by all cards via url(#team-sketch).
// Technique: desaturate → invert → gaussian blur → color-dodge blend with original gray.
function SketchFilterDef() {
  return (
    <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden>
      <defs>
        <filter id="team-sketch" colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
          <feColorMatrix type="saturate" values="0" result="gray" />
          <feComponentTransfer in="gray" result="inverted">
            <feFuncR type="linear" slope="-1" intercept="1" />
            <feFuncG type="linear" slope="-1" intercept="1" />
            <feFuncB type="linear" slope="-1" intercept="1" />
          </feComponentTransfer>
          <feGaussianBlur stdDeviation="4.5" in="inverted" result="blurred" />
          <feBlend in="gray" in2="blurred" mode="color-dodge" result="sketch" />
          <feComponentTransfer in="sketch">
            <feFuncR type="linear" slope="1.4" intercept="-0.15" />
            <feFuncG type="linear" slope="1.4" intercept="-0.15" />
            <feFuncB type="linear" slope="1.4" intercept="-0.15" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}

function TeamCard({ member, index }: { member: TeamMember; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const showPhoto = member.photo && photoLoaded && !photoError;

  return (
    <FadeIn delay={index * 0.07}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ background: "#fafaf8", border: "1px solid #e8e6e0", borderRadius: 8, padding: "20px 22px", cursor: "pointer", transition: "all 0.25s ease" }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#c45a2d40"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#e8e6e0"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: expanded ? 14 : 0, transition: "margin 0.2s" }}>
          {/* Avatar: photo with sketch filter, or initials fallback */}
          <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, overflow: "hidden", position: "relative", background: member.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {member.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.photo}
                alt={member.name}
                onLoad={() => setPhotoLoaded(true)}
                onError={() => setPhotoError(true)}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", filter: "url(#team-sketch)", opacity: showPhoto ? 1 : 0, transition: "opacity 0.3s" }}
              />
            )}
            {!showPhoto && (
              <span style={{ color: "#fff", fontWeight: 500, fontSize: 14, fontFamily: "'DM Mono', monospace", position: "relative", zIndex: 1 }}>
                {member.initials}
              </span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 500, fontSize: 15, margin: 0, color: "#1a1a1a" }}>{member.name}</p>
            <p style={{ fontSize: 13, color: "#888", margin: 0 }}>{member.role}</p>
          </div>
          <span style={{ fontSize: 14, color: "#bbb", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
        </div>
        {expanded && (
          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "#555", margin: 0, paddingLeft: 58, borderTop: "1px solid #eee", paddingTop: 14 }}>
            {member.bio}
          </p>
        )}
      </div>
    </FadeIn>
  );
}

// ── Advantages ───────────────────────────────────────────────────────────────
const ADVANTAGES = [
  {
    num: "01",
    headline: "Employee ownership is positive-sum.",
    stat: "Equity to every operator, from day one",
    statSub: "nth Venture standard · All portfolio companies · 2021–present",
    body: "We don't theorize about employee ownership — we practice it. Every company we've built grants meaningful equity to its frontline operators from launch. Our portfolio companies absorbed two failing businesses, protected their investors, and generated $336K in earnings for four principals who own those companies. KKR's Ownership Works coalition validates the playbook at scale — $1.7B distributed to frontline workers across 90+ companies — but we've lived it from the start.",
  },
  {
    num: "02",
    headline: "We already own the platforms.",
    stat: "Built from scratch, owned inside out",
    statSub: "No deal-hunting, no cold-start risk",
    body: "Most funds raise capital and then hunt for deals. We built our portfolio companies ourselves, so we know their unit economics, talent pools, and growth constraints from the inside. Each platform is a natural landing pad for bolt-on acquisitions — adjacent services, shared overhead, customers who want more. We source deals others never see because we're already operating in the space.",
  },
  {
    num: "03",
    headline: "Small by design.",
    stat: "3–5× earnings at acquisition",
    statSub: "vs. 10–15× for PE fund targets",
    body: "Private equity has grown enormous — and so has the competition for deals. Hundreds of funds chase the same pool of $50M+ EBITDA businesses, and multiples reflect it. A company with $500K in earnings might trade at 4× in a private small-business sale; the same cash flow commands 12× or more in the PE market. By staying deliberately micro-cap, we access an arbitrage before institutional money can follow. No lavish offices, no army of analysts, no management fees to justify. Capital goes to work.",
  },
  {
    num: "04",
    headline: "Audit rigor from the nation's top authority.",
    stat: "U.S. GAO — supreme audit authority",
    statSub: "Audited SEC, DoD, U.S. Treasury",
    body: "The Government Accountability Office is the supreme audit authority in the United States — the investigative arm of Congress, independent of every agency it reviews. Our principal trained there, conducting financial audits of the SEC, the Department of Defense, and the U.S. Treasury. That background means we rebuild the books from source documents, stress-test every assumption, and look for what sellers hope you won't find.",
  },
];

function AdvantagesSection() {
  return (
    <section id="approach" style={{ background: "#0f0f0e", padding: "80px clamp(20px, 5vw, 80px)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <FadeIn>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", marginBottom: 12 }}>Why this approach works</p>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 300, letterSpacing: -1, margin: "0 0 12px", color: "#fdfcfa" }}>Structural advantages.</h2>
          <p style={{ fontSize: "clamp(14px, 2vw, 16px)", lineHeight: 1.75, color: "#555", maxWidth: 560, marginBottom: 48, fontWeight: 300 }}>
            These are structural edges built into how we operate, whom we hire, and what we buy.
          </p>
        </FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(460px, 100%), 1fr))", gap: 2 }}>
          {ADVANTAGES.map((a, i) => (
            <SlideIn key={i} delay={i * 0.07} from={i % 2 === 0 ? "left" : "right"}>
              <div style={{ padding: "clamp(20px, 4vw, 32px) clamp(20px, 4vw, 36px)", borderTop: `2px solid ${i < 2 ? "#c45a2d" : "#333"}`, background: i % 2 === 0 ? "#141412" : "#111110" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 18 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#c45a2d" }}>{a.num}</span>
                  <h3 style={{ fontSize: "clamp(17px, 2.5vw, 20px)", fontWeight: 400, color: "#fdfcfa", margin: 0, letterSpacing: -0.4, lineHeight: 1.3 }}>{a.headline}</h3>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "clamp(13px, 2vw, 16px)", fontWeight: 500, color: "#fdfcfa", margin: "0 0 3px" }}>{a.stat}</p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#555", margin: 0 }}>{a.statSub}</p>
                </div>
                <p style={{ fontSize: "clamp(13px, 1.8vw, 14px)", lineHeight: 1.75, color: "#888", margin: 0 }}>{a.body}</p>
              </div>
            </SlideIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Investment Principles ─────────────────────────────────────────────────────
const PRINCIPLES = [
  { num: "01", title: "Invest for the long-term.", body: "Compounding rewards patience. We commit capital the way an owner would — measured in decades, not quarters — and resist every pressure to trade short-term optionality for long-term value." },
  { num: "02", title: "Minimize fees.", body: "Every dollar lost to management fees is a dollar that doesn't compound for investors. We carry no management fee, no carried interest until a 6% hurdle is cleared, and no cost structure built to justify itself." },
  { num: "03", title: "Ensure proper – but not excessive – diversification.", body: "Diversification eliminates company-specific risk. But over-diversification merely mirrors an index at a higher cost. We hold enough positions to protect the portfolio without diluting conviction into meaninglessness." },
  { num: "04", title: "Straightforward businesses.", body: "We don't invest in things we don't understand. Simple models, recurring revenue, high free-cash-flow conversion. No moonshots, no black boxes, no businesses whose results depend on a single customer or contract." },
  { num: "05", title: "Passionate, effective, high-integrity managers.", body: "Strategy is cheap. Execution is everything. We back people who care deeply, operate well, and do what they say. Character is not negotiable — and it's the hardest thing to audit, so we start there." },
];

// ── Stats counter ─────────────────────────────────────────────────────────────
function StatCounter({ val, label, suffix = "", prefix = "" }: { val: number; label: string; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, 0.3);
  const count = useCountUp(val, visible);
  return (
    <div ref={ref} style={{ textAlign: "center" }}>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "clamp(20px, 4vw, 32px)", fontWeight: 500, color: "#fdfcfa", margin: "0 0 6px" }}>
        {prefix}{count}{suffix}
      </p>
      <p style={{ fontSize: "clamp(10px, 1.5vw, 12px)", color: "#888", margin: 0, lineHeight: 1.4 }}>{label}</p>
    </div>
  );
}

// ── Portfolio companies ───────────────────────────────────────────────────────
const COMPANIES = [
  { name: "Audily", desc: "Full-service podcast & audio production. Home of Rococo Punch, Pop Ups Studio, and Pinwheel.", logo: "/logos/audily.png", site: "https://audily.com" },
  { name: "SBR2TH Recruiting", desc: "Specialized recruiting for senior engineers, PMs, and data professionals at venture-backed companies.", logo: "https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/b4520098-a769-4c69-b772-30dfb718c454/Copy%2Bof%2BUntitled%2BDesign%2B%283%29.jpg", site: "https://www.sbr2th.com" },
  { name: "Falconer", desc: "Investment advisory boutique serving individuals and institutions.", logo: "https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/b33643a1-d753-4149-9091-1f3fc580be72/FALCONER+%288%29.png", site: "https://falconer.io" },
  { name: "Merchant Boxes", desc: "Custom packaging design and sourcing for e-commerce and retail brands.", logo: "/logos/merchant-boxes.png", site: "https://www.merchantboxes.com" },
  { name: "Pigeon Service", desc: "Modern same-day delivery infrastructure for local commerce.", logo: "/logos/pigeon.png", site: "https://pigeonservice.com" },
  { name: "Galileo Computing", desc: "Intelligent compute orchestration for AI/ML workloads.", logo: "/logos/galileo.webp", site: "https://galileocomputing.com" },
];

// ── Page ──────────────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: "track", label: "Track Record" },
  { id: "fund", label: "Fund" },
  { id: "approach", label: "Approach" },
  { id: "story", label: "Story" },
  { id: "team", label: "Team" },
];

export default function NthVentureIntro() {
  const [scrolled, setScrolled] = useState(false);
  const [showFloat, setShowFloat] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      setShowFloat(window.scrollY > 320);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ fontFamily: "'Newsreader', Georgia, serif", color: "#1a1a1a", background: "#fdfcfa", minHeight: "100vh" }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <SketchFilterDef />

      {/* Desktop Nav — hidden on mobile */}
      <nav
        className="hidden md:flex"
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          alignItems: "center", justifyContent: "space-between",
          height: 64,
          padding: "0 clamp(20px, 5vw, 80px)",
          background: scrolled ? "rgba(253,252,250,0.96)" : "transparent",
          backdropFilter: scrolled ? "blur(10px)" : "none",
          borderBottom: scrolled ? "1px solid #e8e6e0" : "1px solid transparent",
          transition: "background 0.35s, border-color 0.35s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", cursor: "pointer" }} onClick={() => scrollTo("mission")}>
          <NthLogo size={30} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(20px, 3vw, 36px)" }}>
          {NAV_SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              style={{
                fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 1.5,
                textTransform: "uppercase", background: "none", border: "none",
                color: "#888", cursor: "pointer", padding: 0, transition: "color 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "#1a1a1a")}
              onMouseLeave={e => (e.currentTarget.style.color = "#888")}
            >
              {s.label}
            </button>
          ))}
          <a
            href="/portal"
            style={{
              fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 1,
              background: "#1a1a1a", color: "#fdfcfa", padding: "8px 18px",
              borderRadius: 5, textDecoration: "none", transition: "background 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#c45a2d")}
            onMouseLeave={e => (e.currentTarget.style.background = "#1a1a1a")}
          >
            Explore the Co-Owner Fund
          </a>
        </div>
      </nav>

      {/* Floating Co-Owner Fund button — slides in after scroll */}
      <a
        className="flex"
        href="/portal"
        style={{
          position: "fixed", right: 0, top: "50%", zIndex: 98,
          writingMode: "vertical-rl", textOrientation: "mixed",
          fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2,
          textTransform: "uppercase",
          background: "#1a1a1a", color: "#fdfcfa",
          padding: "20px 10px", borderRadius: "6px 0 0 6px",
          textDecoration: "none",
          opacity: showFloat ? 1 : 0,
          transform: showFloat ? "translateY(-50%)" : "translateY(-50%) translateX(100%)",
          pointerEvents: showFloat ? "auto" : "none",
          transition: "opacity 0.4s, transform 0.4s cubic-bezier(0.16,1,0.3,1), background 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "#c45a2d")}
        onMouseLeave={e => (e.currentTarget.style.background = "#1a1a1a")}
      >
        Co-Owner Fund →
      </a>

      {/* Hero */}
      <section id="mission" className="pt-8 md:pt-24" style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: "clamp(40px, 6vh, 64px)", paddingLeft: "clamp(20px, 5vw, 80px)", paddingRight: "clamp(20px, 5vw, 80px)" }}>
        <SlideIn from="left">
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <NthLogo size={40} />
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", margin: 0 }}>Corpus Christi, Texas · Est. 2021</p>
          </div>
        </SlideIn>
        <FadeIn delay={0.1}>
          <h1 style={{ fontSize: "clamp(32px, 6vw, 64px)", fontWeight: 300, lineHeight: 1.12, letterSpacing: -1.5, margin: "0 0 28px", maxWidth: 800 }}>
            Set talented people free through the power of <span style={{ fontStyle: "italic", color: "#c45a2d" }}>ownership</span>.
          </h1>
        </FadeIn>
        <FadeIn delay={0.18}>
          <p style={{ fontSize: "clamp(16px, 2.5vw, 19px)", lineHeight: 1.7, color: "#555", maxWidth: 620, margin: "0 0 40px", fontWeight: 300 }}>
            nth Venture builds and invests in employee-owned companies with radically aligned incentives.
            From a $10,000 check and an idea in 2021 to nearly $2 million in portfolio revenue —
            we&apos;re proving that ownership changes everything.
          </p>
        </FadeIn>
        <FadeIn delay={0.26}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <a
              href="/portal"
              style={{ fontFamily: "'DM Mono', monospace", fontSize: "clamp(12px, 1.8vw, 13px)", background: "#1a1a1a", color: "#fdfcfa", border: "none", padding: "12px clamp(16px, 3vw, 28px)", borderRadius: 6, cursor: "pointer", letterSpacing: 0.5, transition: "all 0.2s", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#c45a2d")}
              onMouseLeave={e => (e.currentTarget.style.background = "#1a1a1a")}
            >
              Explore the Co-Owner Fund →
            </a>
            <button
              onClick={() => scrollTo("letters")}
              style={{ fontFamily: "'DM Mono', monospace", fontSize: "clamp(12px, 1.8vw, 13px)", background: "transparent", color: "#1a1a1a", border: "1px solid #d0cec8", padding: "12px clamp(16px, 3vw, 28px)", borderRadius: 6, cursor: "pointer", letterSpacing: 0.5 }}
            >
              Read annual letters
            </button>
            <a
              href="https://pulley.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#888", textDecoration: "none", borderBottom: "1px solid #d0cec8", paddingBottom: 2, whiteSpace: "nowrap" }}
            >
              Portfolio company investor? Access Pulley →
            </a>
          </div>
        </FadeIn>
      </section>

      {/* Stats Strip */}
      <section style={{ background: "#1a1a1a", padding: "48px clamp(20px, 5vw, 80px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "32px 24px" }}>
          <StatCounter val={86} label="3-yr revenue CAGR (2022–2025)" suffix="%" />
          <FadeIn delay={0.06}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "clamp(20px, 4vw, 32px)", fontWeight: 500, color: "#fdfcfa", margin: "0 0 6px" }}>$5K → $1.9M</p>
              <p style={{ fontSize: "clamp(10px, 1.5vw, 12px)", color: "#888", margin: 0, lineHeight: 1.4 }}>Since 2021</p>
            </div>
          </FadeIn>
          <FadeIn delay={0.12}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "clamp(20px, 4vw, 32px)", fontWeight: 500, color: "#fdfcfa", margin: "0 0 6px" }}>$0</p>
              <p style={{ fontSize: "clamp(10px, 1.5vw, 12px)", color: "#888", margin: 0, lineHeight: 1.4 }}>Management fees</p>
            </div>
          </FadeIn>
          <StatCounter val={20} label="Target IRR" suffix="%" />
        </div>
      </section>

      {/* Track Record */}
      <section id="track" style={{ maxWidth: 1100, margin: "0 auto", padding: "64px clamp(20px, 5vw, 80px)" }}>
        <FadeIn>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", marginBottom: 12 }}>Track record</p>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 300, letterSpacing: -1, margin: "0 0 16px" }}>Started from scratch, built to last.</h2>
          <p style={{ fontSize: "clamp(15px, 2vw, 17px)", lineHeight: 1.75, color: "#555", maxWidth: 600, marginBottom: 40, fontWeight: 300 }}>
            Our portfolio companies operate on a simple philosophy: grow as much as you can without burning other people&apos;s money.
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <RevenueChart />
        </FadeIn>

        {/* Press coverage */}
        <FadeIn delay={0.12}>
          <div style={{ marginTop: 36, marginBottom: 36, padding: "20px clamp(16px, 4vw, 28px)", background: "#1a1a1a", borderRadius: 8, display: "flex", flexWrap: "wrap", gap: "16px 32px", alignItems: "center" }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", margin: 0, flexShrink: 0 }}>As covered by</p>
            <div style={{ display: "flex", gap: "16px 40px", flexWrap: "wrap" }}>
              <div>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 500, color: "#fdfcfa", margin: "0 0 2px" }}>Bloomberg</p>
                <p style={{ fontSize: 12, color: "#888", margin: 0 }}>Podcast M&A — Rococo Punch acquisition by Audily</p>
              </div>
              <div>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 500, color: "#fdfcfa", margin: "0 0 2px" }}>The Hollywood Reporter</p>
                <p style={{ fontSize: 12, color: "#888", margin: 0 }}>Coverage of Rococo Punch and the Audily network</p>
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <h3 style={{ fontSize: "clamp(17px, 2.5vw, 20px)", fontWeight: 400, marginBottom: 20, letterSpacing: -0.5 }}>Our companies</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 12 }}>
            {COMPANIES.map((co, i) => (
              <SlideIn key={i} delay={0.04 + i * 0.04} from={i % 2 === 0 ? "left" : "right"}>
                <a
                  href={co.site}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none", display: "block", height: "100%" }}
                >
                  <div
                    style={{ background: "#fafaf8", border: "1px solid #e8e6e0", borderRadius: 8, padding: "16px 18px", height: "100%", boxSizing: "border-box", transition: "border-color 0.2s, transform 0.2s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#c45a2d60"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#e8e6e0"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                      <div style={{ width: 32, height: 32, flexShrink: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={co.logo}
                          alt={co.name}
                          style={{ width: "100%", height: "100%", objectFit: "contain", mixBlendMode: "multiply" }}
                        />
                      </div>
                      <p style={{ fontWeight: 500, fontSize: 14, margin: 0, color: "#1a1a1a" }}>{co.name}</p>
                    </div>
                    <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px", lineHeight: 1.5 }}>{co.desc}</p>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#c45a2d" }}>{co.site.replace(/^https?:\/\//, "")} ↗</span>
                  </div>
                </a>
              </SlideIn>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.25}>
          <div style={{ marginTop: 48, background: "#fafaf8", border: "1px solid #e8e6e0", borderRadius: 8, padding: "clamp(20px, 4vw, 28px) clamp(20px, 4vw, 32px)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 400, marginBottom: 16, letterSpacing: -0.3 }}>Real results</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(250px, 100%), 1fr))", gap: 20, fontSize: "clamp(13px, 1.8vw, 14px)", lineHeight: 1.65, color: "#555" }}>
              <p style={{ margin: 0 }}>A former valet earned over $85K doing work he&apos;d been doing as a passion project. He owns the company.</p>
              <p style={{ margin: 0 }}>An employee who lost everything caring for his late wife earned 2× median household income and moved his new family into a home on acreage. He owns the company.</p>
              <p style={{ margin: 0 }}>Our companies absorbed two struggling businesses, protected their investors, retained most employees, and generated $336K in earnings for four principals. They own the company.</p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* The Thesis */}
      <section style={{ background: "#0f0f0e", padding: "80px clamp(20px, 5vw, 80px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", marginBottom: 12 }}>The thesis</p>
            <h2 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 300, letterSpacing: -1.5, margin: "0 0 20px", color: "#fdfcfa", lineHeight: 1.1 }}>
              The data is not subtle.
            </h2>
            <p style={{ fontSize: "clamp(15px, 2vw, 18px)", lineHeight: 1.7, color: "#666", maxWidth: 680, marginBottom: 56, fontWeight: 300 }}>
              Exposure to private business interests is the primary driver of long-term wealth creation.
              Labor is a commodity — motivated talent is not. People have never been more productive,
              and the ones with real skin in the game are more productive still.
              The evidence has accumulated for decades and it all points in one direction.
            </p>
          </FadeIn>

          {/* Three headline stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: 2, marginBottom: 2 }}>
            {[
              {
                stat: "99 / 100",
                label: "Quarters private equity has outperformed public markets",
                note: "As far back as we have data",
                src: "Institutional Investor — Why Private Equity Wins",
              },
              {
                stat: "3×",
                label: "More assets at retirement for investors with private market exposure",
                note: "vs. public-only allocation",
                src: "Institutional Investor — Why Private Equity Wins",
              },
              {
                stat: "#1",
                label: "Growth equity ranks highest among all PE strategies — above VC, buyout, and infrastructure",
                note: "Between the risk profiles of VC and buyout",
                src: "CAIS — Introduction to Growth Equity",
              },
            ].map((item, i) => (
              <SlideIn key={i} delay={i * 0.08} from={i % 2 === 0 ? "left" : "right"}>
                <div style={{ background: "#141412", padding: "clamp(24px, 4vw, 36px)", borderTop: "2px solid #c45a2d" }}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "clamp(24px, 4vw, 44px)", fontWeight: 500, color: "#fdfcfa", margin: "0 0 12px", letterSpacing: -1, lineHeight: 1 }}>{item.stat}</p>
                  <p style={{ fontSize: "clamp(14px, 1.8vw, 15px)", color: "#ccc", margin: "0 0 10px", lineHeight: 1.5, fontWeight: 300 }}>{item.label}</p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#444", margin: 0, letterSpacing: 0.5, lineHeight: 1.6 }}>↑ {item.src}</p>
                </div>
              </SlideIn>
            ))}
          </div>

          {/* Employee ownership + fund size */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))", gap: 2, marginBottom: 48 }}>
            <SlideIn delay={0.1} from="left">
              <div style={{ background: "#111110", padding: "clamp(24px, 4vw, 36px)", borderTop: "2px solid #222" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#c45a2d", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>On employee ownership</p>
                <p style={{ fontSize: "clamp(14px, 1.8vw, 15px)", lineHeight: 1.8, color: "#888", fontWeight: 300, marginBottom: 24 }}>
                  Incentive alignment works. It has always worked. A person who owns what they build
                  behaves differently from a person who is paid to maintain it. The research — from academic
                  institutions, institutional investors, and the federal government — says the same thing.
                  Ownership changes behavior. Behavior changes results.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    ["FCLT Global", "Long-term ownership mindset drives higher capital returns"],
                    ["HRMJ", "Employee ownership correlates with sustained organizational performance"],
                    ["Ownership Works", "$1.7B+ distributed to 100,000+ frontline workers across 90+ companies"],
                    ["National Center for Employee Ownership", "30,000+ ESOPs in the U.S. — the model scales"],
                    ["UPenn / Wharton", "Broad-based equity improves firm outcomes on every major metric"],
                    ["GAO (1987)", "Congress's auditing arm validated the model before it was fashionable — the 1987 report is oft-cited but not fully digitized"],
                  ].map(([src, pt], i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ color: "#c45a2d", fontSize: 12, lineHeight: "20px", flexShrink: 0 }}>—</span>
                      <span style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#555", display: "block" }}>{src}</span>
                        {pt}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </SlideIn>
            <SlideIn delay={0.16} from="right">
              <div style={{ background: "#111110", padding: "clamp(24px, 4vw, 36px)", borderTop: "2px solid #222" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#c45a2d", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>On fund size</p>
                <p style={{ fontSize: "clamp(14px, 1.8vw, 15px)", lineHeight: 1.8, color: "#888", fontWeight: 300, marginBottom: 16 }}>
                  J.P. Morgan and PitchBook analyzed 1,690 private equity funds across two decades.
                  The finding is unambiguous: first-quartile performance is overwhelmingly
                  concentrated at small fund sizes. Above $10B, it nearly disappears.
                  We are deliberately small, and we intend to stay that way.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                  {[
                    "Small funds dominate first-quartile IRR — the pattern holds across every vintage year studied",
                    "Less capital chasing smaller deals = better entry multiples",
                    "No management fees to justify — every dollar works",
                    "Operator-led means no layers between decision and execution",
                    "A $10M fund can move fast. A $10B fund cannot.",
                  ].map((pt, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ color: "#c45a2d", fontSize: 12, lineHeight: "20px", flexShrink: 0 }}>—</span>
                      <span style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>{pt}</span>
                    </div>
                  ))}
                </div>
                <FundSizeScatter />
              </div>
            </SlideIn>
          </div>

          {/* Further reading */}
          <FadeIn delay={0.2}>
            <div style={{ borderTop: "1px solid #1e1e1c", paddingTop: 36 }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 2, color: "#444", textTransform: "uppercase", marginBottom: 24 }}>Further reading</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: "4px 32px" }}>
                {[
                  { label: "Gaining Perspective: PE Fund Size vs. Performance (Exhibit 9)", src: "J.P. Morgan Asset Management / PitchBook", href: "https://am.jpmorgan.com/content/dam/jpm-am-aem/global/en/institutional/insights/portfolio-insights/siag-gaining-perspective.pdf" },
                  { label: "Why Private Equity Wins: Reflecting on a Quarter-Century of Outperformance", src: "Institutional Investor", href: "https://www.institutionalinvestor.com" },
                  { label: "Introduction to Growth Equity", src: "CAIS", href: "https://caisgroup.com" },
                  { label: "Growth Equity Primer (whitepaper)", src: "Meketa Investment Group", href: "https://meketa.com" },
                  { label: "Long-Term Capitalism & Employee Ownership", src: "FCLT Global", href: "https://www.fcltglobal.org" },
                  { label: "Research on Employee Ownership & Performance", src: "HRMJ — Human Resource Management Journal", href: "https://onlinelibrary.wiley.com/journal/17488583" },
                  { label: "Broad-Based Ownership at Scale", src: "Ownership Works", href: "https://ownershipworks.org" },
                  { label: "Employee Ownership Facts & Research", src: "National Center for Employee Ownership", href: "https://www.nceo.org" },
                  { label: "Equity Sharing & Worker Performance", src: "UPenn / Wharton", href: "https://knowledge.wharton.upenn.edu" },
                ].map((item, i) => (
                  <a
                    key={i}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", display: "block", padding: "12px 0", borderBottom: "1px solid #191917", transition: "opacity 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                  >
                    <span style={{ fontSize: 13, color: "#aaa", display: "block", marginBottom: 3, lineHeight: 1.4 }}>{item.label}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#444", letterSpacing: 0.5 }}>{item.src} ↗</span>
                  </a>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* The Fund */}
      <section id="fund" style={{ background: "#f5f4f0", padding: "64px clamp(20px, 5vw, 80px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", marginBottom: 12 }}>The Fund</p>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 300, letterSpacing: -1, margin: "0 0 16px" }}>Co-Owner Fund LP</h2>
            <p style={{ fontSize: "clamp(15px, 2vw, 17px)", lineHeight: 1.75, color: "#555", maxWidth: 640, marginBottom: 40, fontWeight: 300 }}>
              A Texas limited partnership investing in businesses with long histories of free cash flow,
              at small-business multiples, with employee ownership and incentive alignment at the core.
              Seeded with ~$1M in equity transferred by the founder for $1.
            </p>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 24, marginBottom: 48 }}>
            <SlideIn delay={0.05} from="left">
              <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 8, padding: "clamp(16px, 3vw, 24px)" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 1, color: "#888", marginBottom: 16 }}>Investment focus</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {["Acquisitions at single-digit P/E multiples", "Strategic credit at 20%+ yields", "Portfolio company growth financing", "Occasional ground-up launches"].map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ color: "#c45a2d", fontSize: 14, lineHeight: "22px", flexShrink: 0 }}>→</span>
                      <span style={{ fontSize: 14, color: "#444", lineHeight: "22px" }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SlideIn>
            <SlideIn delay={0.1} from="right">
              <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: 8, padding: "clamp(16px, 3vw, 24px)" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 1, color: "#888", marginBottom: 16 }}>Fund structure</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    ["Vehicle", "Texas Limited Partnership"],
                    ["Max Size", "$10,000,000"],
                    ["Hurdle Rate", "6% preferred return"],
                    ["Fees", "0/50 Buffett · or 2/20 traditional"],
                    ["Liquidity", "Quarterly redemptions up to 5% of fund"],
                    ["Structure", "Evergreen — no fixed term"],
                  ].map(([k, v], i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: i < 5 ? "1px solid #f0efe8" : "none", gap: 16 }}>
                      <span style={{ fontSize: 13, color: "#888", flexShrink: 0 }}>{k}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a", textAlign: "right" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SlideIn>
          </div>

          {/* Verification links */}
          <FadeIn delay={0.15}>
            <div style={{ marginBottom: 48, display: "flex", flexWrap: "wrap", gap: "8px 24px", alignItems: "center" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2, color: "#aaa", textTransform: "uppercase", flexShrink: 0 }}>Verify</span>
              {[
                { label: "BrokerCheck  CRD# 338802", href: "https://brokercheck.finra.org/firm/summary/338802" },
                { label: "Form ADV", href: "https://reports.adviserinfo.sec.gov/reports/ADV/338802/PDF/338802.pdf" },
                { label: "SEC Filings  CIK 0002088918", href: "https://www.sec.gov/edgar/browse/?CIK=0002088918" },
                { label: "Texas Entity  32098599965", href: "https://comptroller.texas.gov/taxes/franchise/account-status/search/32098599965" },
              ].map(({ label, href }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#888", textDecoration: "none", borderBottom: "1px solid #d0cec8", paddingBottom: 1, transition: "color 0.2s", whiteSpace: "nowrap" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#c45a2d")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#888")}
                >{label} ↗</a>
              ))}
            </div>
          </FadeIn>

          {/* Investment Principles */}
          <FadeIn delay={0.1}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", marginBottom: 12 }}>Investment principles</p>
            <h3 style={{ fontSize: "clamp(20px, 3vw, 32px)", fontWeight: 300, letterSpacing: -0.8, margin: "0 0 10px" }}>Five principles.</h3>
            <p style={{ fontSize: 15, color: "#888", fontStyle: "italic", marginBottom: 32, maxWidth: 580 }}>
              As laid out in the annual letters. Derived from the examples of Berkshire Hathaway, Markel, and Dimensional Fund Advisors.
            </p>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 2 }}>
            {PRINCIPLES.map((p, i) => (
              <SlideIn key={i} delay={i * 0.06} from={i % 2 === 0 ? "left" : "right"}>
                <div style={{ background: i % 2 === 0 ? "#fff" : "#fafaf8", border: "1px solid #e8e6e0", borderTop: "2px solid #c45a2d", padding: "clamp(18px, 3vw, 24px) clamp(18px, 3vw, 28px)" }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#c45a2d", display: "block", marginBottom: 10 }}>{p.num}</span>
                  <h4 style={{ fontSize: "clamp(16px, 2.2vw, 18px)", fontWeight: 400, color: "#1a1a1a", margin: "0 0 12px", letterSpacing: -0.4, lineHeight: 1.3, fontStyle: "italic" }}>{p.title}</h4>
                  <p style={{ fontSize: "clamp(13px, 1.8vw, 14px)", lineHeight: 1.75, color: "#666", margin: 0 }}>{p.body}</p>
                </div>
              </SlideIn>
            ))}
          </div>
        </div>
      </section>

      <AdvantagesSection />

      {/* How We Got Here */}
      <section id="story" style={{ background: "#fdfcfa", padding: "64px clamp(20px, 5vw, 80px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", marginBottom: 12 }}>How we got here</p>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 300, letterSpacing: -1, margin: "0 0 20px" }}>From studio to fund.</h2>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 40 }}>
            <SlideIn delay={0.06} from="left">
              <div>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#c45a2d", marginBottom: 10, letterSpacing: 1 }}>2021 — The venture studio</p>
                <p style={{ fontSize: "clamp(14px, 2vw, 16px)", lineHeight: 1.75, color: "#555", fontWeight: 300 }}>
                  Built from a $10,000 check. We launched our first companies from scratch — granting meaningful equity
                  to every operator from day one, not just the people at the top. No fund, no management fees,
                  no outside capital. Just the thesis in practice.
                </p>
              </div>
            </SlideIn>
            <FadeIn delay={0.12}>
              <div>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#c45a2d", marginBottom: 10, letterSpacing: 1 }}>2022–2023 — Proof of concept</p>
                <p style={{ fontSize: "clamp(14px, 2vw, 16px)", lineHeight: 1.75, color: "#555", fontWeight: 300 }}>
                  Over three years we launched and scaled a portfolio of employee-owned companies —
                  growing from $5K to $1.3M in revenue while absorbing two struggling businesses and
                  protecting their investors. Every company remained employee-owned.
                  The model worked. We wrote about it honestly in annual letters that didn&apos;t
                  hide the failures alongside the wins.
                </p>
              </div>
            </FadeIn>
            <SlideIn delay={0.18} from="right">
              <div>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#c45a2d", marginBottom: 10, letterSpacing: 1 }}>2024 — Co-Owner Fund LP</p>
                <p style={{ fontSize: "clamp(14px, 2vw, 16px)", lineHeight: 1.75, color: "#555", fontWeight: 300 }}>
                  We formalized our track record into the Co-Owner Fund LP — a Texas limited partnership
                  seeded with ~$1M in equity transferred by the founder for $1. The fund brings in aligned
                  outside capital to accelerate a strategy already generating results: acquiring small businesses
                  at single-digit multiples, with employee ownership baked in from day one.
                </p>
              </div>
            </SlideIn>
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="team" style={{ background: "#f5f4f0", padding: "64px clamp(20px, 5vw, 80px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", marginBottom: 12 }}>Leadership</p>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 300, letterSpacing: -1, margin: "0 0 16px" }}>Built by operators, not administrators</h2>
            <p style={{ fontSize: "clamp(15px, 2vw, 17px)", lineHeight: 1.75, color: "#555", maxWidth: 640, marginBottom: 48, fontWeight: 300 }}>
              Five co-founders with backgrounds in audit, marketing, engineering, talent, and communications. Six portfolio company CEOs and presidents with deep domain expertise in their industries. An advisory board with institutional-grade capital markets and finance experience. All invest on the same terms as LPs.
            </p>
          </FadeIn>

          <FadeIn delay={0.05}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2, color: "#888", textTransform: "uppercase", marginBottom: 16 }}>Co-Founders</p>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 12, marginBottom: 40 }}>
            {CO_FOUNDERS.map((m, i) => <TeamCard key={i} member={m} index={i} />)}
          </div>

          <FadeIn delay={0.05}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2, color: "#888", textTransform: "uppercase", marginBottom: 16 }}>Portfolio Company Management</p>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 12, marginBottom: 40 }}>
            {PORTCO_CEOS.map((m, i) => <TeamCard key={i} member={m} index={i} />)}
          </div>

          <FadeIn delay={0.05}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2, color: "#888", textTransform: "uppercase", marginBottom: 16 }}>Advisory Board</p>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 12 }}>
            {ADVISORS.map((m, i) => <TeamCard key={i} member={m} index={i} />)}
          </div>
        </div>
      </section>

      {/* Portal Transparency */}
      <section style={{ background: "#080d15", padding: "80px clamp(20px, 5vw, 80px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", marginBottom: 12 }}>Investor portal</p>
            <h2 style={{ fontSize: "clamp(26px, 4.5vw, 48px)", fontWeight: 300, letterSpacing: -1.2, margin: "0 0 20px", color: "#fdfcfa", lineHeight: 1.1 }}>
              You know exactly where<br />your money is. Always.
            </h2>
            <p style={{ fontSize: "clamp(15px, 2vw, 17px)", lineHeight: 1.75, color: "#64748b", maxWidth: 620, marginBottom: 20, fontWeight: 300 }}>
              Most fund managers control what you see. We built something different.
              Every LP — and prospective LP — gets a real-time view of the fund:
              quarterly P&L for every portfolio company, fund-level performance attribution,
              a fee calculator that shows exactly what you&apos;d pay versus a traditional structure,
              and full documentation access. Nothing is behind a phone call.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px", marginBottom: 52 }}>
              {[
                "Quarterly P&L by company",
                "Real-time NAV & MOIC",
                "Deal pipeline visibility",
                "Allocator fee comparison",
                "Fund documents & SEC filings",
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#c45a2d", flexShrink: 0 }} />
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#64748b", letterSpacing: 0.5 }}>{f}</span>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* Three portal teasers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 10, marginBottom: 40 }}>

            {/* Panel 1 — Fund Overview */}
            <SlideIn delay={0.05} from="left">
              <div style={{ background: "#0D1421", borderRadius: 10, overflow: "hidden", border: "1px solid #1E2D3D" }}>
                <div style={{ background: "#060a10", padding: "10px 14px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid #1E2D3D" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />)}
                  </div>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#2a4a6a", marginLeft: 6 }}>Co-Owner Fund — Overview</span>
                </div>
                <div style={{ padding: "18px 18px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                    {[
                      { label: "Portfolio NAV Est.", val: "$1.2M", color: "#38BDF8" },
                      { label: "MOIC", val: "1.24×", color: "#34D399" },
                      { label: "Active Companies", val: "6", color: "#e2e8f0" },
                      { label: "3-yr Revenue CAGR", val: "86%", color: "#F59E0B" },
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{ background: "#0a1120", borderRadius: 6, padding: "10px 12px" }}>
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a4a6a", margin: "0 0 4px", letterSpacing: 1.2, textTransform: "uppercase" }}>{label}</p>
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 17, color, margin: 0, fontWeight: 500 }}>{val}</p>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a4a6a", letterSpacing: 1.2, textTransform: "uppercase", margin: "0 0 10px" }}>Portfolio Allocation</p>
                  {[
                    { name: "Audily", pct: 41, color: "#F59E0B" },
                    { name: "SBR2TH Recruiting", pct: 27, color: "#38BDF8" },
                    { name: "Falconer", pct: 19, color: "#34D399" },
                    { name: "Merchant Boxes", pct: 8, color: "#8B5CF6" },
                    { name: "Other", pct: 5, color: "#64748b" },
                  ].map((c, i) => (
                    <div key={i} style={{ marginBottom: 7 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 10, color: "#4a6278" }}>{c.name}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#2a4a6a" }}>{c.pct}%</span>
                      </div>
                      <div style={{ height: 3, background: "#1E2D3D", borderRadius: 2 }}>
                        <div style={{ height: "100%", width: `${c.pct}%`, background: c.color, borderRadius: 2, transition: "width 1s ease" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SlideIn>

            {/* Panel 2 — Company P&L */}
            <FadeIn delay={0.1}>
              <div style={{ background: "#0D1421", borderRadius: 10, overflow: "hidden", border: "1px solid #1E2D3D" }}>
                <div style={{ background: "#060a10", padding: "10px 14px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid #1E2D3D" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />)}
                  </div>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#2a4a6a", marginLeft: 6 }}>Audily — Quarterly P&amp;L</span>
                </div>
                <div style={{ padding: "18px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 5, background: "#F59E0B22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 12, height: 12, background: "#F59E0B", borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500 }}>Audily</span>
                    </div>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#2a4a6a" }}>Q4 2024</span>
                  </div>
                  {[
                    { label: "Revenue",       val: "$144,600", color: "#34D399", bold: true,  sub: "" },
                    { label: "COGS",          val: "−$94,500", color: "#94a3b8", bold: false, sub: "" },
                    { label: "Gross Profit",  val: "$50,100",  color: "#38BDF8", bold: true,  sub: "34.6%" },
                    { label: "Operating Exp", val: "−$24,600", color: "#64748b", bold: false, sub: "" },
                    { label: "Net Income",    val: "$25,500",  color: "#F59E0B", bold: true,  sub: "17.6%" },
                  ].map(({ label, val, color, bold, sub }, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "7px 0", borderBottom: "1px solid #0f1a28" }}>
                      <span style={{ fontSize: 11, color: "#4a6278" }}>{label}</span>
                      <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                        {sub && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#2a4a6a" }}>{sub}</span>}
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color, fontWeight: bold ? 600 : 400 }}>{val}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 14 }}>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a4a6a", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 8px" }}>Quarterly Revenue</p>
                    <svg viewBox="0 0 200 40" style={{ width: "100%", height: "auto" }}>
                      {[58, 88, 114, 145].map((v, i) => {
                        const max = 145;
                        const bw = 36, gap = 14, x = i * (bw + gap) + 4;
                        const h = (v / max) * 34;
                        return (
                          <g key={i}>
                            <rect x={x} y={40 - h} width={bw} height={h} fill={i === 3 ? "#F59E0B" : "#1E3A2A"} rx={2} />
                            <text x={x + bw / 2} y={38} textAnchor="middle" fill="#2a4a6a" fontSize={7} fontFamily="'DM Mono', monospace">{`Q${i + 1}`}</text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Panel 3 — Fee Calculator */}
            <SlideIn delay={0.15} from="right">
              <div style={{ background: "#0D1421", borderRadius: 10, overflow: "hidden", border: "1px solid #1E2D3D" }}>
                <div style={{ background: "#060a10", padding: "10px 14px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid #1E2D3D" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />)}
                  </div>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#2a4a6a", marginLeft: 6 }}>Allocator Fee Calculator</span>
                </div>
                <div style={{ padding: "18px 18px" }}>
                  <div style={{ background: "#0a1120", borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a4a6a", margin: "0 0 3px", letterSpacing: 1, textTransform: "uppercase" }}>Portfolio Value</p>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, color: "#e2e8f0", margin: 0 }}>$1,000,000</p>
                  </div>
                  <div style={{ background: "#0a1120", borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a4a6a", margin: "0 0 3px", letterSpacing: 1, textTransform: "uppercase" }}>Gross Annual Return</p>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, color: "#e2e8f0", margin: 0 }}>20%</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    <div style={{ background: "#0b1a10", border: "1px solid #14311e", borderRadius: 6, padding: "12px" }}>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#34D399", margin: "0 0 8px", letterSpacing: 1, textTransform: "uppercase" }}>nth Venture</p>
                      <p style={{ fontSize: 9, color: "#2a4a6a", margin: "0 0 2px" }}>Mgmt Fee</p>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#34D399", margin: "0 0 6px", fontWeight: 600 }}>$0</p>
                      <p style={{ fontSize: 9, color: "#2a4a6a", margin: "0 0 2px" }}>GP Carry (50% &gt; 6% hurdle)</p>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#94a3b8", margin: "0 0 6px" }}>$70,000</p>
                      <p style={{ fontSize: 9, color: "#2a4a6a", margin: "0 0 2px" }}>Net to LP</p>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#e2e8f0", margin: 0, fontWeight: 600 }}>$130,000</p>
                    </div>
                    <div style={{ background: "#160e04", border: "1px solid #2d1e08", borderRadius: 6, padding: "12px" }}>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#F59E0B", margin: "0 0 8px", letterSpacing: 1, textTransform: "uppercase" }}>Trad. 2/20</p>
                      <p style={{ fontSize: 9, color: "#2a4a6a", margin: "0 0 2px" }}>Mgmt Fee</p>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#F59E0B", margin: "0 0 6px" }}>$20,000</p>
                      <p style={{ fontSize: 9, color: "#2a4a6a", margin: "0 0 2px" }}>GP Carry (20% w/ catch-up)</p>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#94a3b8", margin: "0 0 6px" }}>$58,000</p>
                      <p style={{ fontSize: 9, color: "#2a4a6a", margin: "0 0 2px" }}>Net to LP</p>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#64748b", margin: 0 }}>$122,000</p>
                    </div>
                  </div>
                  <div style={{ background: "#0b1a10", border: "1px solid #14311e", borderRadius: 6, padding: "10px 12px" }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#34D399", display: "block" }}>+$8,000 at 20% gross · +$23,000 at 10% gross</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#2a4a6a", display: "block", marginTop: 3 }}>$0 charged in any year, regardless of performance</span>
                  </div>
                </div>
              </div>
            </SlideIn>
          </div>

          {/* CTA */}
          <FadeIn delay={0.2}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <a
                href="/portal"
                style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, background: "#c45a2d", color: "#fdfcfa", padding: "14px clamp(20px, 3vw, 32px)", borderRadius: 6, textDecoration: "none", letterSpacing: 0.5, transition: "background 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#a8481f")}
                onMouseLeave={e => (e.currentTarget.style.background = "#c45a2d")}
              >
                Access the investor portal →
              </a>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#2a4a6a" }}>
                NDA required for deeper company data · Prospective LPs welcome
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Annual Letters */}
      <section id="letters" style={{ background: "#1a1a1a", padding: "64px clamp(20px, 5vw, 80px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", marginBottom: 12 }}>Annual letters</p>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 300, letterSpacing: -1, margin: "0 0 16px", color: "#fdfcfa" }}>The full story, unfiltered</h2>
            <p style={{ fontSize: "clamp(15px, 2vw, 17px)", lineHeight: 1.75, color: "#999", maxWidth: 600, marginBottom: 40, fontWeight: 300 }}>
              Sam&apos;s annual letters report the unvarnished truth — the victories, the failures,
              the philosophy, and the human stories behind the numbers.
            </p>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 16 }}>
            {[
              { released: "2025", covers: "2024", title: "Third Annual Letter", quote: "Most death does not come in the form of a grand, fiery defeat. It comes from slow erosion, cynicism, and mediocrity.", highlight: "Co-Owner Fund LP announced", slug: "https://static1.squarespace.com/static/64d98f1d96a44455a5eab9a8/t/6824eccd00ce1a0fc02ad947/1747250381663/nth+Venture+Third+Annual+Letter.pdf" },
              { released: "2024", covers: "2023", title: "Second Annual Letter", quote: "I simply put my naked, stinking foot forward and say this is what I am doing.", highlight: "Written from deployment in Poland", slug: "https://static1.squarespace.com/static/64d98f1d96a44455a5eab9a8/t/65e5f6dcd0b76e6d7d861b16/1709569756594/nth+Venture+Second+Annual+Letter.pdf" },
              { released: "2023", covers: "2022", title: "First Annual Letter", quote: "Noblesse oblige — if you have the ability to act with honor and generosity, you incur the obligation to do so.", highlight: "$10K start, $500K in first-year revenue", slug: "https://static1.squarespace.com/static/64d98f1d96a44455a5eab9a8/t/64d99aef0051ed7fd7dfd27a/1691982575632/nth+Venture+2022+Annual+Letter.pdf" },
            ].map((letter, i) => (
              <SlideIn key={i} delay={i * 0.08} from={i % 2 === 0 ? "left" : "right"}>
                <a
                  href={letter.slug}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{ background: "#242420", border: "1px solid #333", borderRadius: 8, padding: "clamp(18px, 3vw, 24px) clamp(16px, 3vw, 22px)", cursor: "pointer", transition: "all 0.25s", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#c45a2d60"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#333"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#c45a2d" }}>{letter.released}</span>
                      <span style={{ fontSize: 11, color: "#555" }}>covers {letter.covers} · ↗</span>
                    </div>
                    <h4 style={{ fontSize: "clamp(15px, 2vw, 17px)", fontWeight: 400, color: "#eee", margin: "0 0 10px" }}>{letter.title}</h4>
                    <p style={{ fontSize: 13, fontStyle: "italic", color: "#888", lineHeight: 1.6, margin: "0 0 14px", flex: 1 }}>&ldquo;{letter.quote}&rdquo;</p>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#666", background: "#1a1a18", padding: "4px 10px", borderRadius: 4, alignSelf: "flex-start" }}>{letter.highlight}</span>
                  </div>
                </a>
              </SlideIn>
            ))}
          </div>
          <FadeIn delay={0.35}>
            <div style={{ marginTop: 28, display: "flex", gap: "16px 32px", flexWrap: "wrap", justifyContent: "center" }}>
              <a href="https://sawhook.substack.com" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#888", textDecoration: "none", borderBottom: "1px solid #444", paddingBottom: 2 }}>
                The Wrap — Sam&apos;s Substack →
              </a>
              <a href="https://podcasts.apple.com/us/podcast/nth-venture/id1604416768" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#888", textDecoration: "none", borderBottom: "1px solid #444", paddingBottom: 2 }}>
                nth Venture Podcast on Apple →
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* SEC & Legal */}
      <section style={{ background: "#f5f4f0", padding: "40px clamp(20px, 5vw, 80px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "12px 32px", justifyContent: "center" }}>
          {[
            ["SEC Filings: nth Venture", "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1930461"],
            ["SEC Filings: Co-Owner Fund", "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002088918"],
          ].map(([label, url], i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#888", textDecoration: "none", borderBottom: "1px solid #d0cec8", paddingBottom: 2, transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#c45a2d")}
              onMouseLeave={e => (e.currentTarget.style.color = "#888")}
            >{label} ↗</a>
          ))}
          <a href="/portal"
            style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#888", textDecoration: "none", borderBottom: "1px solid #d0cec8", paddingBottom: 2, transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#c45a2d")}
            onMouseLeave={e => (e.currentTarget.style.color = "#888")}
          >Investor Portal ↗</a>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" style={{ maxWidth: 1100, margin: "0 auto", padding: "64px clamp(20px, 5vw, 80px)" }}>
        <FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 40 }}>
            <div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", marginBottom: 12 }}>Get in touch</p>
              <h2 style={{ fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 300, letterSpacing: -1, margin: "0 0 16px" }}>Let&apos;s talk</h2>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: "#555", fontWeight: 300 }}>
                Reach out to learn more about the Co-Owner Fund or nth Venture.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, justifyContent: "center" }}>
              <div style={{ background: "#fafaf8", border: "1px solid #e8e6e0", borderRadius: 8, padding: "16px 20px" }}>
                <p style={{ fontWeight: 500, fontSize: 15, margin: "0 0 4px" }}>Sam Sawhook</p>
                <p style={{ fontSize: 13, color: "#888", margin: "0 0 2px" }}>Co-founder & CEO</p>
                <a href="mailto:sam@nthventure.com" style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#c45a2d", textDecoration: "none" }}>sam@nthventure.com</a>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#888", display: "block", marginTop: 2 }}>(361) 510-3444</span>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href="https://www.nthventure.com" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#888", textDecoration: "none", border: "1px solid #e0ded8", padding: "8px 12px", borderRadius: 6 }}>nthventure.com</a>
                <a href="https://sawhook.substack.com" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#888", textDecoration: "none", border: "1px solid #e0ded8", padding: "8px 12px", borderRadius: 6 }}>The Wrap</a>
                <a href="https://podcasts.apple.com/us/podcast/nth-venture/id1604416768" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#888", textDecoration: "none", border: "1px solid #e0ded8", padding: "8px 12px", borderRadius: 6 }}>Podcast</a>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #e8e6e0", padding: "28px clamp(20px, 5vw, 80px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <NthLogo size={28} />
            <span style={{ fontSize: 12, color: "#aaa" }}>© 2021–2026 nth Venture Inc.</span>
          </div>
          <p style={{ fontSize: 11, color: "#bbb", maxWidth: 480, textAlign: "right", lineHeight: 1.5, margin: 0 }}>
            Offerings under SEC Reg D 506(b)/(c). Not a solicitation.
            Forward-looking statements subject to risks and uncertainties.
          </p>
        </div>
      </footer>
    </div>
  );
}
