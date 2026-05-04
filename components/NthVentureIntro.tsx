"use client";
import { useState, useEffect, useRef, RefObject } from "react";

const SECTIONS = ["mission", "story", "track", "fund", "team", "letters", "contact"] as const;

function useInView(ref: RefObject<HTMLDivElement | null>): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.15 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
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
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

// ── Asset allocation chart ────────────────────────────────────────────────────
// Federal Reserve Survey of Consumer Finances · Visual Capitalist
const ALLOC_TIERS = [
  { tier: "$10K",  bars: [{ label: "Liquid", pct: 0.40, color: "#d0d0d0" }, { label: "Residence", pct: 0.35, color: "#a8a8a8" }, { label: "Vehicles", pct: 0.06, color: "#888" }, { label: "Retirement", pct: 0.13, color: "#666" }, { label: "Other", pct: 0.06, color: "#c0c0c0" }] },
  { tier: "$100K", bars: [{ label: "Liquid", pct: 0.26, color: "#d0d0d0" }, { label: "Residence", pct: 0.36, color: "#a8a8a8" }, { label: "Vehicles", pct: 0.05, color: "#888" }, { label: "Retirement", pct: 0.18, color: "#666" }, { label: "Stocks", pct: 0.07, color: "#999" }, { label: "Other", pct: 0.08, color: "#c0c0c0" }] },
  { tier: "$1M",   bars: [{ label: "Liquid", pct: 0.13, color: "#d0d0d0" }, { label: "Residence", pct: 0.22, color: "#a8a8a8" }, { label: "Retirement", pct: 0.14, color: "#666" }, { label: "Stocks", pct: 0.18, color: "#999" }, { label: "Real Estate", pct: 0.08, color: "#555" }, { label: "Business", pct: 0.18, color: "#2b5c8a" }, { label: "Other", pct: 0.07, color: "#c0c0c0" }] },
  { tier: "$10M",  bars: [{ label: "Liquid", pct: 0.07, color: "#d0d0d0" }, { label: "Residence", pct: 0.10, color: "#a8a8a8" }, { label: "Stocks", pct: 0.14, color: "#999" }, { label: "Fixed Income", pct: 0.06, color: "#777" }, { label: "Real Estate", pct: 0.14, color: "#555" }, { label: "Business", pct: 0.42, color: "#2b5c8a" }, { label: "Other", pct: 0.07, color: "#c0c0c0" }] },
  { tier: "$100M", bars: [{ label: "Liquid", pct: 0.04, color: "#d0d0d0" }, { label: "Stocks", pct: 0.08, color: "#999" }, { label: "Fixed Income", pct: 0.05, color: "#777" }, { label: "Real Estate", pct: 0.12, color: "#555" }, { label: "Business", pct: 0.57, color: "#2b5c8a" }, { label: "Other", pct: 0.14, color: "#c0c0c0" }] },
  { tier: "$1B",   bars: [{ label: "Liquid", pct: 0.03, color: "#d0d0d0" }, { label: "Real Estate", pct: 0.09, color: "#555" }, { label: "Business", pct: 0.79, color: "#2b5c8a" }, { label: "Other", pct: 0.09, color: "#c0c0c0" }] },
];

function AssetAllocationChart() {
  const [hoveredTier, setHoveredTier] = useState<number | null>(null);
  return (
    <div>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 1, color: "#888", marginBottom: 16 }}>How asset allocation shifts with net worth</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {ALLOC_TIERS.map((row, ri) => (
          <div
            key={ri}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
            onMouseEnter={() => setHoveredTier(ri)}
            onMouseLeave={() => setHoveredTier(null)}
          >
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#888", width: 44, textAlign: "right", flexShrink: 0 }}>{row.tier}</span>
            <div style={{ flex: 1, height: 28, display: "flex", borderRadius: 4, overflow: "hidden", opacity: hoveredTier !== null && hoveredTier !== ri ? 0.5 : 1, transition: "opacity 0.2s" }}>
              {row.bars.map((b, bi) => (
                <div
                  key={bi}
                  title={`${b.label}: ${(b.pct * 100).toFixed(1)}%`}
                  style={{ width: `${b.pct * 100}%`, background: b.color, transition: "width 0.3s" }}
                />
              ))}
            </div>
            {hoveredTier === ri && (
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#2b5c8a", width: 80, flexShrink: 0 }}>
                {Math.round((row.bars.find(b => b.label === "Business")?.pct ?? 0) * 100)}% business
              </span>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 14 }}>
        {[
          { label: "Liquid / Cash", color: "#d0d0d0" },
          { label: "Residence", color: "#a8a8a8" },
          { label: "Retirement / Stocks", color: "#888" },
          { label: "Real Estate", color: "#555" },
          { label: "Business Interests", color: "#2b5c8a" },
        ].map((l, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#888" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: "inline-block" }} />
            {l.label}
          </span>
        ))}
      </div>
      <p style={{ fontSize: 11, color: "#aaa", marginTop: 8, fontStyle: "italic" }}>
        Federal Reserve Survey of Consumer Finances · Visual Capitalist
      </p>
    </div>
  );
}

// ── Revenue chart ─────────────────────────────────────────────────────────────
const revenueData = [
  { year: "2021", total: 5 },
  { year: "2022", total: 264 },
  { year: "2023", total: 1306 },
  { year: "2024", total: 1887 },
];

function RevenueChart() {
  const max = 2000;
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div style={{ padding: "2rem 0" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "clamp(12px, 3vw, 32px)", height: 220, justifyContent: "center" }}>
        {revenueData.map((d, i) => {
          const h = (d.total / max) * 200;
          const active = hovered === i;
          return (
            <div
              key={d.year}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "default" }}
            >
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500, color: active ? "#c45a2d" : "#8a8a8a", transition: "color 0.2s" }}>
                ${d.total >= 1000 ? (d.total / 1000).toFixed(1) + "M" : d.total + "K"}
              </span>
              <div style={{ width: "clamp(36px, 8vw, 56px)", height: h, background: active ? "linear-gradient(180deg, #c45a2d, #8b3a1a)" : "linear-gradient(180deg, #2a2a2a, #1a1a1a)", borderRadius: "4px 4px 0 0", transition: "all 0.3s ease", transform: active ? "scaleY(1.03)" : "scaleY(1)", transformOrigin: "bottom" }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#666", letterSpacing: 1 }}>{d.year}</span>
            </div>
          );
        })}
      </div>
      <p style={{ textAlign: "center", fontSize: 12, color: "#888", marginTop: 12, fontStyle: "italic" }}>
        Aggregate alumni revenues (000s USD) · Unaudited, non-GAAP cash basis
      </p>
    </div>
  );
}

// ── Team ──────────────────────────────────────────────────────────────────────
const teamMembers = [
  { name: "Sam Sawhook", role: "Co-Founder & CEO", initials: "SS", color: "#c45a2d", bio: "29-year-old startup operator. Co-founded nth Venture in 2021, launched several employee-owned companies. Former GAO financial auditor (SEC, DoD, Treasury). Army veteran, Operation Atlantic Resolve convoy commander. Currently pursuing Master of Accountancy." },
  { name: "Neil Wolfson", role: "Vice Chairman", initials: "NW", color: "#1a5a3a", bio: "Former President & CIO of Wilmington Trust Investment Management ($40B+ AUM). National Partner in Charge of KPMG's Investment Consulting Practice ($100B+ in assets)." },
  { name: "Jay Heller", role: "Advisory Board", initials: "JH", color: "#2a4a7a", bio: "Senior member of Nasdaq's Capital Markets Team. Over 25 years in financial markets. Led execution of 2,300+ IPOs including Rivian, Airbnb, Coinbase, and Lyft." },
  { name: "Sandy Leeds", role: "Advisory Board", initials: "SL", color: "#5a3a6a", bio: "Finance faculty at University of Arizona. 23 years at UT Austin McCombs. JD from UVA, MBA from UT Austin, CFA charterholder. Co-author of Investment Analysis & Portfolio Management. Former portfolio manager ($1.6B AUM)." },
  { name: "Steven Maasch", role: "Advisory Board", initials: "SM", color: "#3a5a5a", bio: "SVP Human Resources at Riverview Bank. Wharton-educated HR leader with experience scaling organizations at Avista Corporation, First Interstate BancSystem, and InfrastruX. Specialist in workforce planning, succession, and performance management." },
  { name: "Ted Ladd", role: "Advisory Board", initials: "TL", color: "#6a4a2a", bio: "Professor of Entrepreneurship at Hult International Business School. Harvard instructor. 15 teaching awards. PhD from Case, MBA from Wharton, MA from Johns Hopkins, BA triple major from Cornell. Latest startup acquired by Google for smartwatch software." },
];

function TeamCard({ member, index }: { member: typeof teamMembers[0]; index: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <FadeIn delay={index * 0.08}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ background: "#fafaf8", border: "1px solid #e8e6e0", borderRadius: 8, padding: "20px 22px", cursor: "pointer", transition: "all 0.25s ease", position: "relative", overflow: "hidden" }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#c45a2d40"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#e8e6e0"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: expanded ? 14 : 0, transition: "margin 0.2s" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: member.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 500, fontSize: 14, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
            {member.initials}
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

// ── Logo ─────────────────────────────────────────────────────────────────────
function NthLogo({ size = 44, invert = false }: { size?: number; invert?: boolean }) {
  const fg = invert ? "#fdfcfa" : "#1a1a1a";
  const bg = invert ? "#1a1a1a" : "#fdfcfa";
  return (
    <svg viewBox="0 0 108 108" width={size} height={size} style={{ display: "block", flexShrink: 0 }}>
      <rect x="2.5" y="2.5" width="103" height="103" fill={bg} stroke={fg} strokeWidth="4" rx="1" />
      <text x="13" y="82" fontFamily="'Newsreader', Georgia, serif" fontSize="68" fontWeight="300" fill={fg} letterSpacing="-2">n</text>
      <text x="68" y="42" fontFamily="'Newsreader', Georgia, serif" fontSize="26" fontWeight="400" fill={fg}>th</text>
    </svg>
  );
}

// ── Advantages ───────────────────────────────────────────────────────────────
const ADVANTAGES = [
  {
    num: "01",
    headline: "Ownership is positive-sum.",
    stat: "Equity to every operator, from day one",
    statSub: "nth Venture standard · All portfolio companies · 2021–present",
    body: "We don't theorize about employee ownership — we practice it. Every company we've built grants meaningful equity to its frontline operators from launch. A former valet now runs an audio production company he owns. An employee who lost everything rebuilt his life and moved his family onto acreage — because he owns the company. Our portfolio companies absorbed two failing businesses, protected their investors, and generated $336K in earnings for four principals who own those companies. KKR's Ownership Works coalition validates the playbook at scale — $1.7B distributed to frontline workers across 90+ companies — but we've lived it from the start.",
  },
  {
    num: "02",
    headline: "We already own the platforms.",
    stat: "Built from scratch, owned inside out",
    statSub: "No deal-hunting, no cold-start risk",
    body: "Most funds raise capital and then hunt for deals. We built our portfolio companies ourselves, which means we understand their unit economics, talent pools, and growth constraints from the inside. Each platform is a natural magnet for bolt-on acquisitions — adjacent services, shared overhead, and customers who want more than we currently offer. We source deals others never see because we are already operating in the space.",
  },
  {
    num: "03",
    headline: "Small by design.",
    stat: "3–5× earnings at acquisition",
    statSub: "vs. 10–15× for PE fund targets",
    body: "Private equity funds have grown enormous — and so have their competition. Hundreds of funds are chasing the same pool of $50M+ EBITDA businesses, and multiples reflect the crowding. A company generating $500K in earnings might trade at 4× in a private small-business sale — the same cash flow commands 12× or more in the PE market for larger businesses. By staying deliberately micro-cap, we access the arbitrage before institutional money can follow. Our overhead is minimal by design: no lavish offices, no army of analysts, no management fees to justify. Capital goes to work.",
  },
  {
    num: "04",
    headline: "Audit rigor from the nation's top authority.",
    stat: "U.S. GAO — supreme audit authority",
    statSub: "Audited SEC, DoD, U.S. Treasury",
    body: "The Government Accountability Office is the supreme audit authority in the United States — the investigative arm of Congress, independent of every agency it reviews. Our principal trained there, conducting financial audits of the SEC, the Department of Defense, and the U.S. Treasury. That discipline means we don't skim offering documents or rely on management projections. We reconstruct cash flows, stress-test assumptions, and look for what sellers hope you won't find. Every investment is audited before it is made.",
  },
];

function AdvantagesSection() {
  return (
    <section style={{ background: "#0f0f0e", padding: "80px clamp(24px, 5vw, 80px)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <FadeIn>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", marginBottom: 12 }}>Structural advantages</p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, letterSpacing: -1, margin: "0 0 12px", color: "#fdfcfa" }}>Why this approach works.</h2>
          <p style={{ fontSize: 17, lineHeight: 1.75, color: "#666", maxWidth: 580, marginBottom: 56, fontWeight: 300 }}>
            These are not talking points. They are structural edges — built into how we operate, whom we hire, and what we buy.
          </p>
        </FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: 2 }}>
          {ADVANTAGES.map((a, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div style={{ padding: "32px 36px", borderTop: `2px solid ${i < 2 ? "#c45a2d" : "#333"}`, background: i % 2 === 0 ? "#141412" : "#111110" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 18 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#c45a2d" }}>{a.num}</span>
                  <h3 style={{ fontSize: 20, fontWeight: 400, color: "#fdfcfa", margin: 0, letterSpacing: -0.4, lineHeight: 1.3 }}>{a.headline}</h3>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 500, color: "#fdfcfa", margin: "0 0 3px" }}>{a.stat}</p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#555", margin: 0 }}>{a.statSub}</p>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.75, color: "#888", margin: 0 }}>{a.body}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Investment Principles ─────────────────────────────────────────────────────
const PRINCIPLES = [
  {
    num: "01",
    title: "Invest for the long-term.",
    body: "Compounding rewards patience and punishes impatience. We commit capital the way an owner would — measured in decades, not quarters — and resist every pressure to trade short-term optionality for long-term value.",
  },
  {
    num: "02",
    title: "Minimize fees.",
    body: "Every dollar lost to management fees and administrative overhead is a dollar that doesn't compound for investors. We carry no management fee, no carried interest until a 6% hurdle is cleared, and no cost structure built to justify itself.",
  },
  {
    num: "03",
    title: "Proper — but not excessive — diversification.",
    body: "Diversification eliminates company-specific risk. But over-diversification merely mirrors an index at a higher cost. We hold enough positions to protect the portfolio without diluting conviction into meaninglessness.",
  },
  {
    num: "04",
    title: "Straightforward businesses.",
    body: "We don't invest in things we don't understand. Simple models, recurring revenue, high free-cash-flow conversion. No moonshots, no black boxes, no businesses whose profits depend on a single customer or contract.",
  },
  {
    num: "05",
    title: "Passionate, effective, high-integrity managers.",
    body: "Strategy is cheap. Execution is everything. We back people who care deeply, operate well, and do what they say. Character is not negotiable — and it is the hardest thing to audit, so we start there.",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NthVentureIntro() {
  const [activeSection, setActiveSection] = useState<typeof SECTIONS[number]>("mission");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTIONS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActiveSection(id); },
        { threshold: 0.35 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ fontFamily: "'Newsreader', Georgia, serif", color: "#1a1a1a", background: "#fdfcfa", minHeight: "100vh" }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Navigation */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: scrolled ? "rgba(253,252,250,0.92)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", borderBottom: scrolled ? "1px solid #e8e6e0" : "1px solid transparent", transition: "all 0.35s ease", padding: "0 clamp(24px, 5vw, 80px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ cursor: "pointer" }} onClick={() => scrollTo("mission")}>
            <NthLogo size={38} />
          </div>
          <div style={{ display: "flex", gap: "clamp(10px, 2vw, 24px)", alignItems: "center" }}>
            {([["Mission", "mission"], ["Story", "story"], ["Track Record", "track"], ["Fund", "fund"], ["Team", "team"], ["Letters", "letters"], ["Contact", "contact"]] as [string, typeof SECTIONS[number]][]).map(([label, id]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                style={{ background: "none", border: "none", fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 0.5, color: "#888", cursor: "pointer", padding: "4px 0", borderBottom: activeSection === id ? "1.5px solid #c45a2d" : "1.5px solid transparent", transition: "all 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#1a1a1a")}
                onMouseLeave={e => (e.currentTarget.style.color = "#888")}
              >
                {label}
              </button>
            ))}
            <a
              href="/portal"
              style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 0.5, color: "#fdfcfa", background: "#1a1a1a", border: "none", padding: "6px 14px", borderRadius: 5, cursor: "pointer", textDecoration: "none", transition: "background 0.2s", whiteSpace: "nowrap" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#c45a2d")}
              onMouseLeave={e => (e.currentTarget.style.background = "#1a1a1a")}
            >
              Explore the Co-Owner Fund →
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section id="mission" style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(60px, 10vh, 120px) clamp(24px, 5vw, 80px) 80px" }}>
        <FadeIn>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", marginBottom: 20 }}>Corpus Christi, Texas · Est. 2021</p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 300, lineHeight: 1.12, letterSpacing: -1.5, margin: "0 0 28px", maxWidth: 800 }}>
            Set talented people free through the power of <span style={{ fontStyle: "italic", color: "#c45a2d" }}>ownership</span>.
          </h1>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p style={{ fontSize: 19, lineHeight: 1.7, color: "#555", maxWidth: 640, margin: "0 0 40px", fontWeight: 300 }}>
            nth Venture builds and invests in employee-owned companies with radically aligned incentives.
            From a $10,000 check and an idea in 2021 to nearly $2 million in portfolio revenue —
            we&apos;re proving that ownership changes everything.
          </p>
        </FadeIn>
        <FadeIn delay={0.3}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <a
              href="/portal"
              style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, background: "#1a1a1a", color: "#fdfcfa", border: "none", padding: "12px 28px", borderRadius: 6, cursor: "pointer", letterSpacing: 0.5, transition: "all 0.2s", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#c45a2d")}
              onMouseLeave={e => (e.currentTarget.style.background = "#1a1a1a")}
            >
              Explore the Co-Owner Fund →
            </a>
            <button
              onClick={() => scrollTo("letters")}
              style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, background: "transparent", color: "#1a1a1a", border: "1px solid #d0cec8", padding: "12px 28px", borderRadius: 6, cursor: "pointer", letterSpacing: 0.5 }}
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
      <section style={{ background: "#1a1a1a", padding: "48px clamp(24px, 5vw, 80px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 32 }}>
          {[
            ["$5K → $1.9M", "Revenue growth"],
            ["100%", "Employee-owned"],
            ["60+", "Team members"],
            ["$0", "Investor losses to date"],
            ["0%", "Management fee"],
            ["44%", "YoY revenue growth ('24)"],
          ].map(([val, label], i) => (
            <FadeIn key={i} delay={i * 0.06}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 500, color: "#fdfcfa", margin: "0 0 6px" }}>{val}</p>
                <p style={{ fontSize: 12, color: "#888", margin: 0, lineHeight: 1.4, whiteSpace: "nowrap" }}>{label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Evolution: From Studio to Fund */}
      <section id="story" style={{ background: "#f5f4f0", padding: "80px clamp(24px, 5vw, 80px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", marginBottom: 12 }}>From studio to fund</p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, letterSpacing: -1, margin: "0 0 20px" }}>How nth Venture got here.</h2>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 48 }}>
            <FadeIn delay={0.08}>
              <div>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#c45a2d", marginBottom: 10, letterSpacing: 1 }}>2021 — The venture studio</p>
                <p style={{ fontSize: 16, lineHeight: 1.75, color: "#555", fontWeight: 300, marginBottom: 0 }}>
                  nth Venture started with a single thesis: talented people accomplish more when they own what they build.
                  We launched our first companies from scratch — a $10,000 check and the belief that founder economics
                  should extend to every employee, not just the people at the top. No outside capital. No performance
                  fees. Just operators who owned meaningful stakes in the companies they ran.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.16}>
              <div>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#c45a2d", marginBottom: 10, letterSpacing: 1 }}>2022–2023 — Proof of concept</p>
                <p style={{ fontSize: 16, lineHeight: 1.75, color: "#555", fontWeight: 300, marginBottom: 0 }}>
                  Over three years we launched and scaled a portfolio of employee-owned companies —
                  growing from $5K to $1.3M in revenue while absorbing two struggling businesses and
                  protecting their investors. Every company remained employee-owned. Not a single investor
                  lost money. The model worked. We wrote about it — honestly — in annual letters that didn&apos;t
                  hide the failures alongside the wins.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.24}>
              <div>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#c45a2d", marginBottom: 10, letterSpacing: 1 }}>2024 — Co-Owner Fund LP</p>
                <p style={{ fontSize: 16, lineHeight: 1.75, color: "#555", fontWeight: 300, marginBottom: 0 }}>
                  We formalized our track record into the Co-Owner Fund LP — a Texas limited partnership
                  seeded with ~$1M in equity transferred by the founder for $1. The fund brings in aligned
                  outside capital to accelerate a strategy already generating results: acquiring small businesses
                  at single-digit multiples, with employee ownership baked in from day one, and a principal whose
                  audit training comes from the supreme audit authority in the United States.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Track Record */}
      <section id="track" style={{ maxWidth: 1100, margin: "0 auto", padding: "80px clamp(24px, 5vw, 80px)" }}>
        <FadeIn>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", marginBottom: 12 }}>Track record</p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, letterSpacing: -1, margin: "0 0 20px" }}>From $10K to $1.9M in revenue</h2>
          <p style={{ fontSize: 17, lineHeight: 1.75, color: "#555", maxWidth: 640, marginBottom: 48, fontWeight: 300 }}>
            Our portfolio companies follow a &quot;grow as much as you can without burning other people&apos;s money&quot; strategy.
            The result: consistent growth at breakeven with zero investor losses.
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <RevenueChart />
        </FadeIn>

        <FadeIn delay={0.15}>
          <h3 style={{ fontSize: 20, fontWeight: 400, marginBottom: 24, letterSpacing: -0.5, marginTop: 48 }}>Our companies</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {[
              {
                name: "Audily Inc.",
                desc: "Podcast & audio production · Rococo Punch network",
                rev: "$1.15M",
                yoy: "+24%",
                press: [
                  { outlet: "Bloomberg", label: "Podcast M&A" },
                  { outlet: "Hollywood Reporter", label: "Rococo Punch" },
                ],
              },
              { name: "SBR2TH Recruiting", desc: "Niche tech talent sourcing", rev: "$498K", yoy: "+155%", press: [] },
              { name: "Falconer Inc.", desc: "Investment advisory boutique", rev: "$104K", yoy: "+12%", press: [] },
              { name: "Merchant Boxes", desc: "Packaging design & sourcing", rev: "$103K", yoy: "+14%", press: [] },
              { name: "Sentius Development", desc: "Data & ML consulting", rev: "$29K", yoy: "New", press: [] },
            ].map((co, i) => (
              <FadeIn key={i} delay={0.1 + i * 0.05}>
                <div style={{ background: "#fafaf8", border: "1px solid #e8e6e0", borderRadius: 8, padding: "18px 20px" }}>
                  <p style={{ fontWeight: 500, fontSize: 14, margin: "0 0 4px", color: "#1a1a1a" }}>{co.name}</p>
                  <p style={{ fontSize: 12, color: "#888", margin: "0 0 12px" }}>{co.desc}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 500 }}>{co.rev}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: co.yoy === "New" ? "#c45a2d" : "#2a7a3a" }}>{co.yoy}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "#aaa", margin: "6px 0 8px", fontStyle: "italic" }}>2024 revenue</p>
                  {co.press.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {co.press.map((p, pi) => (
                        <span key={pi} style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#888", background: "#f0efe8", padding: "2px 8px", borderRadius: 3, border: "1px solid #e0ddd5" }}>
                          {p.outlet} · {p.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.25}>
          <div style={{ marginTop: 56, background: "#fafaf8", border: "1px solid #e8e6e0", borderRadius: 8, padding: "28px 32px" }}>
            <h3 style={{ fontSize: 18, fontWeight: 400, marginBottom: 16, letterSpacing: -0.3 }}>Real results, real people</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20, fontSize: 14, lineHeight: 1.65, color: "#555" }}>
              <p style={{ margin: 0 }}>A former valet earned over $85K doing work he&apos;d been doing as a passion project. He owns the company.</p>
              <p style={{ margin: 0 }}>An employee who lost everything caring for his late wife earned 2× median household income and moved his new family into a home on acreage. He owns the company.</p>
              <p style={{ margin: 0 }}>Our companies absorbed two struggling businesses, protected their investors, retained most employees, and generated $336K in earnings for four principals. They own the company.</p>
            </div>
          </div>
        </FadeIn>
      </section>

      <AdvantagesSection />

      {/* The Fund */}
      <section id="fund" style={{ maxWidth: 1100, margin: "0 auto", padding: "80px clamp(24px, 5vw, 80px)" }}>
        <FadeIn>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", marginBottom: 12 }}>The Fund</p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, letterSpacing: -1, margin: "0 0 20px" }}>Co-Owner Fund LP</h2>
          <p style={{ fontSize: 17, lineHeight: 1.75, color: "#555", maxWidth: 640, marginBottom: 48, fontWeight: 300 }}>
            A Texas limited partnership investing in businesses with long histories of free cash flow,
            at small business multiples, with an employee-ownership and incentive alignment focus.
            Seeded with ~$1M in equity transferred by the founder for $1.
          </p>
        </FadeIn>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32, marginBottom: 56 }}>
          <FadeIn delay={0.05}>
            <div style={{ background: "#fafaf8", border: "1px solid #e8e6e0", borderRadius: 8, padding: 24 }}>
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
          </FadeIn>
          <FadeIn delay={0.1}>
            <div style={{ background: "#fafaf8", border: "1px solid #e8e6e0", borderRadius: 8, padding: 24 }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 1, color: "#888", marginBottom: 16 }}>Fund structure</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  ["Vehicle", "Texas Limited Partnership"],
                  ["Max Size", "$10,000,000"],
                  ["Hurdle Rate", "6% preferred return"],
                  ["Carry", "50% above hurdle"],
                  ["Mgmt Fee", "None"],
                  ["Structure", "Evergreen — no fixed term"],
                ].map(([k, v], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: i < 5 ? "1px solid #f0efe8" : "none" }}>
                    <span style={{ fontSize: 13, color: "#888" }}>{k}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a", textAlign: "right" }}>{v}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: "#aaa", marginTop: 12, lineHeight: 1.55 }}>
                LPs may elect traditional 2/20 terms in lieu of the no-fee structure.
              </p>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.15}>
          <div style={{ background: "#fafaf8", border: "1px solid #e8e6e0", borderRadius: 8, padding: 24 }}>
            <AssetAllocationChart />
          </div>
        </FadeIn>
      </section>

      {/* Investment Principles */}
      <section style={{ background: "#f5f4f0", padding: "80px clamp(24px, 5vw, 80px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", marginBottom: 12 }}>Investment principles</p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, letterSpacing: -1, margin: "0 0 12px" }}>Five principles.</h2>
            <p style={{ fontSize: 15, color: "#888", fontStyle: "italic", marginBottom: 48, maxWidth: 600 }}>
              As laid out in the annual letters. Derived from decades of academic work and the examples of Berkshire Hathaway, Markel, and Dimensional Fund Advisors.
            </p>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 2 }}>
            {PRINCIPLES.map((p, i) => (
              <FadeIn key={i} delay={i * 0.07}>
                <div style={{ background: i % 2 === 0 ? "#fff" : "#fafaf8", border: "1px solid #e8e6e0", borderTop: "2px solid #c45a2d", padding: "28px 30px" }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#c45a2d", display: "block", marginBottom: 12 }}>{p.num}</span>
                  <h3 style={{ fontSize: 19, fontWeight: 400, color: "#1a1a1a", margin: "0 0 14px", letterSpacing: -0.4, lineHeight: 1.3, fontStyle: "italic" }}>{p.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.75, color: "#666", margin: 0 }}>{p.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="team" style={{ maxWidth: 1100, margin: "0 auto", padding: "80px clamp(24px, 5vw, 80px)" }}>
        <FadeIn>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", marginBottom: 12 }}>Leadership</p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, letterSpacing: -1, margin: "0 0 20px" }}>Built by operators, not administrators</h2>
          <p style={{ fontSize: 17, lineHeight: 1.75, color: "#555", maxWidth: 640, marginBottom: 48, fontWeight: 300 }}>
            Our leadership team combines deep financial expertise, institutional investment management,
            and startup operational experience. Staff and advisors invest on the same terms as LPs.
          </p>
        </FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          {teamMembers.map((m, i) => <TeamCard key={i} member={m} index={i} />)}
        </div>
      </section>

      {/* Annual Letters */}
      <section id="letters" style={{ background: "#1a1a1a", padding: "80px clamp(24px, 5vw, 80px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", marginBottom: 12 }}>Annual letters</p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, letterSpacing: -1, margin: "0 0 20px", color: "#fdfcfa" }}>The full story, unfiltered</h2>
            <p style={{ fontSize: 17, lineHeight: 1.75, color: "#999", maxWidth: 640, marginBottom: 48, fontWeight: 300 }}>
              Read Sam&apos;s annual letters for the unvarnished truth — the victories, the failures,
              the philosophy, and the human stories behind the numbers.
            </p>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {[
              { released: "2025", covers: "2024", title: "Third Annual Letter", quote: "Most death does not come in the form of a grand, fiery defeat. It comes from slow erosion, cynicism, and mediocrity.", highlight: "Co-Owner Fund LP announced", slug: "Third-Annual-Letter" },
              { released: "2024", covers: "2023", title: "Second Annual Letter", quote: "I simply put my naked, stinking foot forward and say this is what I am doing.", highlight: "Written from deployment in Poland", slug: "Second-Annual-Letter" },
              { released: "2023", covers: "2022", title: "First Annual Letter", quote: "Noblesse oblige — if you have the ability to act with honor and generosity, you incur the obligation to do so.", highlight: "$10K start, $500K in first-year revenue", slug: "2022-Annual-Letter" },
            ].map((letter, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <a
                  href={`https://www.nthventure.com/s/nth-Venture-${letter.slug}.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{ background: "#242420", border: "1px solid #333", borderRadius: 8, padding: "24px 22px", cursor: "pointer", transition: "all 0.25s", height: "100%", display: "flex", flexDirection: "column" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#c45a2d60"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#333"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#c45a2d" }}>{letter.released}</span>
                      <span style={{ fontSize: 11, color: "#555" }}>covers {letter.covers} · ↗</span>
                    </div>
                    <h4 style={{ fontSize: 17, fontWeight: 400, color: "#eee", margin: "0 0 12px" }}>{letter.title}</h4>
                    <p style={{ fontSize: 13, fontStyle: "italic", color: "#888", lineHeight: 1.6, margin: "0 0 16px", flex: 1 }}>&ldquo;{letter.quote}&rdquo;</p>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#666", background: "#1a1a18", padding: "4px 10px", borderRadius: 4, alignSelf: "flex-start" }}>{letter.highlight}</span>
                  </div>
                </a>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={0.35}>
            <div style={{ marginTop: 32, display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
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
      <section style={{ background: "#f5f4f0", padding: "48px clamp(24px, 5vw, 80px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 32, justifyContent: "center" }}>
          {[
            ["SEC Filings: nth Venture", "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1930461"],
            ["SEC Filings: Co-Owner Fund", "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002088918"],
          ].map(([label, url], i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#888", textDecoration: "none", borderBottom: "1px solid #d0cec8", paddingBottom: 2, transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#c45a2d")}
              onMouseLeave={e => (e.currentTarget.style.color = "#888")}
            >
              {label} ↗
            </a>
          ))}
          <a
            href="/portal"
            style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#888", textDecoration: "none", borderBottom: "1px solid #d0cec8", paddingBottom: 2, transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#c45a2d")}
            onMouseLeave={e => (e.currentTarget.style.color = "#888")}
          >
            Investor Portal ↗
          </a>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" style={{ maxWidth: 1100, margin: "0 auto", padding: "80px clamp(24px, 5vw, 80px)" }}>
        <FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 48 }}>
            <div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#c45a2d", textTransform: "uppercase", marginBottom: 12 }}>Get in touch</p>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, letterSpacing: -1, margin: "0 0 20px" }}>Let&apos;s talk</h2>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: "#555", fontWeight: 300, marginBottom: 32 }}>
                We enjoy forging long and profitable partnerships.
                Reach out to learn more about the Co-Owner Fund or nth Venture.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, justifyContent: "center" }}>
              <div style={{ background: "#fafaf8", border: "1px solid #e8e6e0", borderRadius: 8, padding: "18px 22px" }}>
                <p style={{ fontWeight: 500, fontSize: 15, margin: "0 0 4px" }}>Sam Sawhook</p>
                <p style={{ fontSize: 13, color: "#888", margin: "0 0 2px" }}>Co-founder & CEO</p>
                <a href="mailto:sam@nthventure.com" style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#c45a2d", textDecoration: "none" }}>sam@nthventure.com</a>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#888", display: "block", marginTop: 2 }}>(361) 510-3444</span>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a href="https://www.nthventure.com" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#888", textDecoration: "none", border: "1px solid #e0ded8", padding: "8px 14px", borderRadius: 6 }}>nthventure.com</a>
                <a href="https://sawhook.substack.com" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#888", textDecoration: "none", border: "1px solid #e0ded8", padding: "8px 14px", borderRadius: 6 }}>The Wrap</a>
                <a href="https://podcasts.apple.com/us/podcast/nth-venture/id1604416768" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#888", textDecoration: "none", border: "1px solid #e0ded8", padding: "8px 14px", borderRadius: 6 }}>Podcast</a>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #e8e6e0", padding: "32px clamp(24px, 5vw, 80px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <NthLogo size={32} />
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
