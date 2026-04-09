import type {
  FundMetrics,
  PortfolioCompany,
  QuarterlyNav,
  DealOpportunity,
  PrivateDeal,
  SecondaryLot,
  Letter,
  ValuationRef,
  IncomeStatement,
  BalanceSheet,
  FinancingRound,
  FinancialPeriod,
  NewsItem,
  CompanyLetter,
  ShareTransaction,
  DebtPosition,
  ManagedFundPosition,
  ManagedFundTransaction,
} from "./types";

export const fund: FundMetrics = {
  name: "nth Venture Fund I",
  vintage: 2021,
  targetSize: 15_000_000,
  calledCapital: 8_750_000,
  nav: 13_920_000,
  tvpi: 1.59,
  dpi: 0.09,
  rvpi: 1.50,
  irr: 26.4,
  totalInvestments: 8,
  realized: 1,
  unrealized: 7,
  asOf: "March 31, 2026",
};

export const portfolio: PortfolioCompany[] = [
  {
    id: "falconer",
    name: "Falconer",
    initials: "FA",
    sector: "Financial Services",
    tagline: "Full-journey investment advisory boutique",
    description:
      "Boutique investment advisory firm helping founders and families navigate liquidity events, estate planning, and capital allocation with radical alignment.",
    invested: 702_399,
    currentValue: 561_919,   // 7,023,990 shares × est. $0.08/share
    ownership: 17.8,         // 7,023,990 ÷ 39,460,619
    stage: "Growth",
    founded: 2022,
    employees: 0,
    status: "active",
    secondaryAvailable: false,
    impliedValuation: 3_156_849,  // est. $0.08/share × 39,460,619 total shares
    totalShares: 39_460_619,
    website: "https://falconer.com",
    linkedInUrl: "https://www.linkedin.com/company/falconerco",
    logoUrl: "https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/b33643a1-d753-4149-9091-1f3fc580be72/FALCONER+%288%29.png",
    accentColor: "#3B82F6",
    shareTransactions: [
      { date: "Aug 2022", type: "Common", shares: 7_023_990, pricePerShare: 0.10, amount: 702_399, certificateNumber: "CS-01" },
    ] satisfies ShareTransaction[],
  },
  {
    id: "merchant-boxes",
    name: "Merchant Boxes",
    initials: "MB",
    sector: "E-Commerce / Logistics",
    tagline: "Modern packaging for modern commerce",
    description:
      "Design-led packaging sourcing and fulfillment partner for DTC brands and eCommerce operators. Turns packaging from cost center to brand asset.",
    invested: 489_790,
    currentValue: 326_526,   // 6,530,527 shares × est. $0.05/share
    ownership: 16.4,         // 6,530,527 ÷ 39,820,287
    stage: "Pre-Series A",
    founded: 2022,
    employees: 0,
    status: "active",
    secondaryAvailable: false,
    impliedValuation: 1_991_014,  // est. $0.05/share × 39,820,287 total shares
    totalShares: 39_820_287,
    linkedInUrl: "https://www.linkedin.com/company/merchant-boxes",
    logoUrl: "https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/0447362a-668a-4f17-ae20-6cb7ac57df6f/MB%2BLogo_Horizontal_Color.png",
    accentColor: "#F59E0B",
    shareTransactions: [
      { date: "Jun 2022", type: "Common", shares: 6_530_527, pricePerShare: 0.075, amount: 489_790, certificateNumber: "CS-02" },
    ] satisfies ShareTransaction[],
  },
  {
    id: "certd",
    name: "Pigeon Service",
    initials: "PS",
    sector: "Logistics / Operations",
    tagline: "Modern same-day delivery infrastructure for local commerce",
    description:
      "Pigeon Service (fka CERTD) builds last-mile delivery infrastructure for local businesses, enabling same-day and scheduled delivery without the complexity of managing a fleet.",
    invested: 247_988,
    currentValue: 174_027,   // 4,350,663 shares × est. $0.04/share
    ownership: 14.3,         // 4,350,663 ÷ 30,423,657
    stage: "Seed",
    founded: 2022,
    employees: 0,
    status: "active",
    secondaryAvailable: false,
    impliedValuation: 1_216_946,  // est. $0.04/share × 30,423,657 total shares
    totalShares: 30_423_657,
    website: "https://pigeonservice.com",
    logoUrl: "https://logo.clearbit.com/pigeonservice.com",
    accentColor: "#10B981",
    shareTransactions: [
      { date: "Mar 2022", type: "Common", shares: 4_350_663, pricePerShare: 0.057, amount: 247_988, certificateNumber: "CS-03" },
    ] satisfies ShareTransaction[],
  },
  {
    id: "audily",
    name: "Audily",
    initials: "AU",
    sector: "Media / Podcasting",
    tagline: "Audio production for ambitious brands",
    description:
      "Full-service podcast and audio production studio. Audily handles strategy, recording, editing, and distribution for B2B brands that want to own their category conversation.",
    invested: 966_886,    // CS-04 $826,886 + Series A Pref $115,000 + note $25,000
    currentValue: 496_132,   // 16,537,717 shares × est. $0.03/share
    ownership: 31.8,         // 16,537,717 ÷ 52,004,140
    stage: "Seed",
    founded: 2021,
    employees: 0,
    status: "active",
    secondaryAvailable: false,
    impliedValuation: 1_560_124,  // est. $0.03/share × 52,004,140 total shares
    totalShares: 52_004_140,
    linkedInUrl: "https://www.linkedin.com/company/audily",
    logoUrl: "https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/5e0320bd-ac40-42b3-905e-8091114b3615/23.jpg",
    accentColor: "#8B5CF6",
    votingOwnership: 31.20,
    shareTransactions: [
      { date: "Sep 2021", type: "Common", shares: 16_537_717, pricePerShare: 0.05, amount: 826_886, certificateNumber: "CS-04" },
    ] satisfies ShareTransaction[],
    debtPositions: [
      { id: "audily-pref-a", date: "Dec 2024", instrument: "Preferred", principal: 115_000,
        interestRate: 13.4,
        status: "Accruing", currentValue: 134_700,
        notes: "1,150 Series A Preferred shares at $100 face. 13.4% cumulative yield beginning 12/31/24. Converts to Class A Common at 1:1,000 per preferred share (1,150,000 common shares if fully converted)." },
      { id: "audily-note-1", date: "UNK", instrument: "Term Loan", principal: 25_000,
        interestRate: 20,
        status: "Current", currentValue: 25_000,
        notes: "1-year amortizing note at 20% annual rate. Monthly payment ~$2,309. 12 equal monthly installments." },
    ] satisfies DebtPosition[],
  },
  {
    id: "sbr2th",
    name: "SBR2TH Recruiting",
    initials: "SR",
    sector: "Talent / Staffing",
    tagline: "Niche tech talent for high-growth teams",
    description:
      "Specialized recruiting firm placing senior engineers, product managers, and data professionals at venture-backed companies. Known for speed and signal-to-noise.",
    invested: 394_377,    // CS-05 $369,377 + note $25,000
    currentValue: 277_033,   // 4,617,214 shares × est. $0.06/share
    ownership: 15.0,         // 4,617,214 ÷ 30,781,427
    stage: "Growth",
    founded: 2022,
    employees: 0,
    status: "active",
    secondaryAvailable: false,
    impliedValuation: 1_846_886,  // est. $0.06/share × 30,781,427 total shares
    totalShares: 30_781_427,
    linkedInUrl: "https://www.linkedin.com/company/sbr2th-recruiting",
    logoUrl: "https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/b4520098-a769-4c69-b772-30dfb718c454/Copy%2Bof%2BUntitled%2BDesign%2B%283%29.jpg",
    accentColor: "#EC4899",
    shareTransactions: [
      { date: "Apr 2022", type: "Common", shares: 4_617_214, pricePerShare: 0.08, amount: 369_377, certificateNumber: "CS-05" },
    ] satisfies ShareTransaction[],
    debtPositions: [
      { id: "sbr2th-note-1", date: "UNK", instrument: "Term Loan", principal: 25_000,
        interestRate: 20,
        status: "Current", currentValue: 25_000,
        notes: "1-year amortizing note at 20% annual rate. Monthly payment ~$2,309. 12 equal monthly installments." },
    ] satisfies DebtPosition[],
  },
  {
    id: "galileo",
    name: "Galileo Computing",
    initials: "GC",
    sector: "Developer Tools / Cloud",
    tagline: "Intelligent compute orchestration for AI workloads",
    description:
      "Galileo Computing (fka PRreact) provides infrastructure orchestration for AI/ML teams — dynamically routing workloads across GPU clusters to minimize cost and latency. Trusted by ML teams at Series A–C companies.",
    invested: 0,
    currentValue: 0,
    ownership: 0,
    stage: "Seed",
    founded: 2023,
    employees: 0,
    status: "active",
    secondaryAvailable: false,
    impliedValuation: 1_400_000,  // est. $0.05/share × 28,000,000 total shares (TBD)
    totalShares: 28_000_000,
    website: "https://galileocomputing.com",
    logoUrl: "https://logo.clearbit.com/galileocomputing.com",
    accentColor: "#6366F1",
    shareTransactions: [
      // Share count not yet confirmed in fund cap table records
    ] satisfies ShareTransaction[],
  },
  {
    id: "hep-global",
    name: "hep global GmbH",
    initials: "HG",
    sector: "Health Education",
    tagline: "International health literacy platform",
    description:
      "Digital health education platform delivering accredited continuing medical education (CME) across 14 countries in 9 languages. First realized investment.",
    invested: 400_000,
    currentValue: 780_000,
    ownership: 12.0,
    stage: "Growth",
    founded: 2019,
    employees: 22,
    revenue: 4_200_000,
    revenueGrowth: 18,
    status: "realized",
    secondaryAvailable: false,
    impliedValuation: 6_500_000,
    accentColor: "#6366F1",
  },
];

// NAV history — no verified data yet; populate from fund records
export const navHistory: QuarterlyNav[] = [
];

export const dealPipeline: DealOpportunity[] = []; // legacy — use privateDealPipeline

export const privateDealPipeline: PrivateDeal[] = [
  {
    id: "facility-services",
    name: "Texas Facility Services Co.",
    initials: "FS",
    sector: "Facility Services / Commercial",
    dealType: "acquisition",
    tagline: "15-year-old, recession-resistant kitchen duct cleaning business with a blue-chip anchor client",
    description:
      "A Texas facility services company providing legally required commercial kitchen exhaust cleaning. No sales team, no sales calls — the business has grown on repeat contracts and referrals for 15 years. Anchor client is one of Texas' most recognized restaurant chains. $500K+ in hard assets including a 4,800 sqft commercial building near downtown.",
    highlights: [
      "Legally required quarterly service — demand is non-discretionary",
      "Anchor client: Texas' most-loved burger chain (undisclosed per NDA)",
      "Zero sales team — zero sales calls since mullets were cool",
      "15 years in business with established, sticky client base",
      "$500K+ in hard assets including 4,800 sqft building (assessed $314K)",
      "Asking $1.1M = 4.4× cash flow; real estate optionally carved out",
    ],
    revenue: 1_100_000,
    cashFlow: 250_000,
    cashFlowLabel: "Cash Flow",
    assets: 500_000,
    assetsNote: "Includes 4,800 sqft commercial building near downtown, tax-assessed at $314K. Can be purchased separately at $400K with leaseback.",
    askingPrice: 1_100_000,
    minimumInvestment: 50_000,
    yearsInBusiness: 15,
    yieldScenarios: [
      { label: "Vanilla", annualizedReturn: 20, notes: "$1M deal = 4× cash flow" },
      { label: "With Sale-Leaseback", annualizedReturn: 27, notes: "RE bought at $400K, leased back at 10% cap = 2.85× CF multiple" },
    ],
    requiresNDA: true,
    deadline: "First come, first served",
    isFeatured: true,
    accentColor: "#10B981",
  },
  {
    id: "texas-brewery",
    name: "Texas Craft Brewery",
    initials: "TB",
    sector: "Food & Beverage / Hospitality",
    dealType: "buyout",
    tagline: "Buy out one principal of a profitable 6-year-old Texas brewery at near 1× SDE",
    description:
      "A six-year-old Texas craft brewery with $2.6M in revenue and $337K in seller's discretionary earnings. The deal: buy out one of two 50/50 principals for $320K — $200K at close, $60K/year for two years (approximately equal to expected distributions). A bank loan originally at $1M now carries a $435K balance retiring in three years, after which cash flow improves dramatically.",
    highlights: [
      "$2.6M revenue, $337K SDE — operating profitably",
      "Acquire 50% stake for $320K ($200K at close + $60K/yr × 2 yrs)",
      "Seller financing structure mirrors expected distributions — low cash drag",
      "Bank loan ($435K remaining) retires in 3 years — cash flow jumps",
      "6 years in business with established brand, distribution, and loyal base",
    ],
    revenue: 2_600_000,
    cashFlow: 337_000,
    cashFlowLabel: "SDE",
    askingPrice: 320_000,
    minimumInvestment: 50_000,
    yearsInBusiness: 6,
    yieldScenarios: [
      { label: "After 2 Years", annualizedReturn: 30 },
      { label: "After 3+ Years", annualizedReturn: 66, notes: "Bank debt retires in 3 yrs — cash flow improves dramatically" },
    ],
    requiresNDA: true,
    deadline: "First come, first served",
    accentColor: "#F59E0B",
  },
  {
    id: "galileo-gas",
    name: "Galileo Computing — Flared Gas",
    initials: "GC",
    sector: "Energy Infrastructure / Compute",
    dealType: "energy",
    tagline: "Turn stranded Texas natural gas into electricity for mobile compute — no bitcoin price risk",
    description:
      "Three execution-ready projects in Texas to electrify 450 mcf of stranded natural gas that would otherwise be flared and wasted. Buy gas at $1/mcf ($0.01/kwh), install nat gas generators, and sell power to mobile hosting operators at $0.05/kwh — a 5× revenue-to-cost ratio. Customers deliver the compute containers; nth takes no bitcoin price risk or miner depreciation risk.",
    highlights: [
      "450 mcf of stranded TX gas across three execution-ready projects",
      "Buy at $0.01/kwh → sell at $0.05/kwh to mobile compute operators",
      "No BTC price risk, no miner depreciation — customers own the hardware",
      "Environmental benefit: gas otherwise flared and wasted",
      "Total CAPEX $630K for all three ($225K with equipment financing)",
      "Smallest single project: $175K CAPEX ($63K with equipment financing)",
    ],
    askingPrice: 630_000,
    minimumInvestment: 63_000,
    yieldScenarios: [
      { label: "Vanilla (all-equity)", annualizedReturn: 45 },
      { label: "With Equipment Financing", annualizedReturn: 75, notes: "CAPEX drops to $225K total or $63K for smallest project" },
    ],
    requiresNDA: true,
    deadline: "First come, first served",
    isFeatured: true,
    accentColor: "#06B6D4",
  },
  {
    id: "audily-option",
    name: "Audily — Option to Buy Additional Shares",
    initials: "AU",
    sector: "Media / Podcasting",
    dealType: "equity_option",
    tagline: "Co-Owner Fund option: 15M Audily shares (~11%) at 1.32× revenue vs. 2.2× M&A comps",
    description:
      "Co-Owner Fund holds an option to purchase 15 million additional Audily shares — approximately 11% of the company — for $150,000. Entry is at 1.32× trailing revenue. Comparable M&A transactions in the B2B audio production market are pricing at 2.2× revenue, implying a meaningful discount on entry. Audily grew revenue 52% in 2025 with zero client churn.",
    highlights: [
      "15M shares (~11% stake) for $150K — fund option, available to co-investors",
      "Entry at 1.32× revenue vs. 2.2× M&A comps — meaningful discount",
      "$480K ARR, +52% YoY, zero client churn in 2025",
      "19 active B2B brand clients across fintech, SaaS, healthcare",
      "All 6 employees are equity owners — aligned incentive structure",
    ],
    askingPrice: 150_000,
    minimumInvestment: 25_000,
    yieldScenarios: [
      { label: "Equity Upside", annualizedReturn: 0, notes: "Returns tied to Audily exit; entering at material discount to M&A comps" },
    ],
    requiresNDA: false,
    deadline: "First come, first served",
    linkedPortcoId: "audily",
    accentColor: "#8B5CF6",
  },
];

export const secondaryLots: SecondaryLot[] = [
  {
    id: "sl-1",
    companyId: "falconer",
    companyName: "Falconer",
    side: "ask",
    units: 50_000,
    impliedPricePerUnit: 1.85,
    impliedValuation: 17_200_000,
    sellerNote: "Early LP seeking partial liquidity. Clean transfer, no co-sale rights.",
    posted: "March 28, 2026",
  },
  {
    id: "sl-2",
    companyId: "sbr2th",
    companyName: "SBR2TH Recruiting",
    side: "bid",
    units: 30_000,
    impliedPricePerUnit: 1.70,
    impliedValuation: 7_800_000,
    sellerNote: "Buyer seeking up to $51K face value. Flexible on timing.",
    posted: "April 1, 2026",
  },
  {
    id: "sl-3",
    companyId: "merchant-boxes",
    companyName: "Merchant Boxes",
    side: "ask",
    units: 75_000,
    impliedPricePerUnit: 0.98,
    impliedValuation: 8_100_000,
    sellerNote: "Estate planning transfer. Pre-approved by company counsel.",
    posted: "April 3, 2026",
  },
  {
    id: "sl-4",
    companyId: "hretic",
    companyName: "HRetic",
    side: "ask",
    units: 40_000,
    impliedPricePerUnit: 0.72,
    impliedValuation: 4_500_000,
    sellerNote: "LP rebalancing. Will consider offers above $0.68/unit.",
    posted: "April 5, 2026",
  },
];

// Co-Owner Fund holds no LP interests in external managed funds as of the current period
export const managedFundPositions: ManagedFundPosition[] = [];

export const letters: Letter[] = [
  {
    id: "q1-2026",
    title: "Q1 2026 Letter to Limited Partners",
    date: "April 8, 2026",
    period: "Q1 2026",
    type: "quarterly",
    author: "Sam Sawhook, CEO",
    excerpt:
      "The first quarter of 2026 marked a turning point for the portfolio — not in drama, but in depth. Companies are no longer just surviving; they're compounding.",
    body: `Dear Limited Partners,

The first quarter of 2026 marked a turning point for the portfolio — not in drama, but in depth. Companies are no longer just surviving; they're compounding.

**Fund Performance**

NAV reached $13.9M as of March 31, representing a 1.59x TVPI on $8.75M of called capital. IRR stands at 26.4%. These numbers feel right for where we are in the fund's life — early enough that most value is still ahead, late enough that the pattern is clear.

Falconer crossed $2M in annualized revenue and is on a path to a Series A later this year. If that round prices at our expected range, it would alone return 40% of called capital. We don't count on it, but we're watching it closely.

**The Thesis Holding**

When we started nth Venture in 2021, we made a bet that felt obvious to us but wasn't obvious to the market: people work harder, care more, and stay longer when they own what they're building. Four years in, we've seen it in every single portfolio company. The companies where employees hold equity — real equity, not token amounts — outperform the ones that don't.

This isn't an accident. It's a design principle.

**Groundwork and the Pipeline**

We introduced Groundwork to the portfolio this quarter as an observer. It embodies everything we look for: a radical ownership model, a clear unit economic story, and a market that is gigantic and underserved. Their Republic raise closes April 30. We will follow with a direct allocation in Q2.

**Looking Ahead**

Q2 will bring two major milestones: Certd's accreditation partnership announcement (we'll share details in June) and TalentLoop's close. We expect TalentLoop to be oversubscribed by late May.

Thank you for your continued trust. We don't take it lightly.

Onward,

Sam Sawhook
CEO, nth Venture`,
  },
  {
    id: "q4-2025",
    title: "Q4 2025 Letter to Limited Partners",
    date: "January 15, 2026",
    period: "Q4 2025",
    type: "quarterly",
    author: "Sam Sawhook, CEO",
    excerpt:
      "2025 was the year the portfolio grew up. Revenue became real. Teams stabilized. And one exit reminded us why we do this: ownership changes outcomes.",
    body: `Dear Limited Partners,

2025 was the year the portfolio grew up. Revenue became real. Teams stabilized. And one exit reminded us why we do this: ownership changes outcomes.

**hep global — First Realized Return**

In November, we completed the partial sale of our stake in hep global GmbH to a European strategic. We received $780K against a $400K investment — a 1.95x in under 36 months. The management team at hep global held meaningful equity throughout, and the outcome for them was life-changing. That's the point.

**NAV and Metrics**

We closed Q4 2025 at $13.7M NAV, up from $12.4M at year-end 2024. TVPI of 1.57x. IRR of 24.9%. Distributions of $780K cumulative. We're pleased with the trajectory and remain focused on building durably rather than optimizing for headline numbers.

**Portfolio Highlights**

SBR2TH crossed $2.5M in placed revenue for the year — a record. Merchant Boxes secured a national retail partnership that we expect to nearly double their revenue in 2026. CaptureFully landed its first enterprise contract ($180K ACV) and will need a bridge round by mid-year.

**Fund Operations**

We made our final capital call in Q3 2025. The fund is fully deployed. Any new investments will be co-investments offered separately to LPs or via a continuation vehicle as warranted.

As always, the door is open. Call or email anytime.

Sam Sawhook
CEO, nth Venture`,
  },
  {
    id: "annual-2024",
    title: "2024 Annual Letter to Limited Partners",
    date: "February 10, 2025",
    period: "Full Year 2024",
    type: "annual",
    author: "Sam Sawhook, CEO",
    excerpt:
      "Three years into building nth Venture, we've learned that the venture studio model is not a shortcut. It's a longer road with a different destination.",
    body: `Dear Limited Partners,

Three years into building nth Venture, we've learned that the venture studio model is not a shortcut. It's a longer road with a different destination.

Traditional venture funds pick winners from a field of candidates. We grow winners from scratch. The difference is enormous — in timeline, in effort, in risk profile, and ultimately in the depth of the relationship between the studio and the companies we build.

**2024 in Numbers**

We ended 2024 at $12.4M NAV on $8.6M called capital. TVPI: 1.44x. IRR: 22.1%. Seven portfolio companies active, one (hep global) in partial exit process. The numbers are good. Not great. We're building toward great.

**What's Working**

The companies where we've maintained the highest operational involvement — Falconer, SBR2TH, Merchant Boxes — are also our best performers. This isn't surprising, but it confirms the model: we're not passive capital. We're co-builders. The studio earns its equity.

Employee ownership is compounding inside the portfolio. Falconer now has 14 full-time employees, 12 of whom hold equity. SBR2TH has an 11-person team, all with meaningful stakes. When we talk to their people, you can feel the difference. They speak in first person plural about the company's goals. They're not employees. They're owners.

**What We're Building Toward**

2025 and 2026 are the years we expect to prove the model. Two to three portfolio companies should reach the scale needed for institutional follow-on rounds or strategic exits. If that happens, the DPI number — currently the fund's weakest metric — will close fast.

We remain grateful for your patience, your trust, and your alignment with a thesis that takes time to prove.

Sam Sawhook
CEO, nth Venture`,
  },
];
