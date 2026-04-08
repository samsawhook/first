import type {
  FundMetrics,
  PortfolioCompany,
  QuarterlyNav,
  DealOpportunity,
  SecondaryLot,
  Letter,
  ValuationRef,
  IncomeStatement,
  BalanceSheet,
  FinancingRound,
  NewsItem,
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
    invested: 1_850_000,
    currentValue: 3_420_000,
    ownership: 19.2,
    stage: "Growth",
    founded: 2022,
    employees: 14,
    revenue: 2_100_000,
    revenueGrowth: 61,
    status: "active",
    secondaryAvailable: true,
    impliedValuation: 17_800_000,
    totalShares: 39_460_619, // 7,023,990 Co-Owner shares ÷ 17.8%
    website: "https://falconer.com",
    linkedInUrl: "https://www.linkedin.com/company/falconerco",
    logoUrl: "https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/b33643a1-d753-4149-9091-1f3fc580be72/FALCONER+%288%29.png",
    accentColor: "#3B82F6",
    ebitda: 350_000,
    valuationRefs: [
      { label: "409A",            date: "Jan 2025", low: 5_800_000,  high: 11_200_000, color: "#64748B", note: "Most recent 409A range" },
      { label: "Last Round",      date: "Mar 2024", low: 17_800_000, high: 17_800_000, color: "#3B82F6", note: "Series Seed @ $17.8M post-money" },
      { label: "Rev Multiple",               low: 6_300_000,  high: 16_800_000, color: "#10B981", note: "3–8× on $2.1M ARR" },
      { label: "EBITDA Multiple",            low: 2_800_000,  high: 5_250_000,  color: "#F59E0B", note: "8–15× on $350K EBITDA" },
    ] satisfies ValuationRef[],
    incomeStatement: {
      period: "FY 2025",
      revenue: 2_100_000,
      costOfRevenue: 840_000,
      grossProfit: 1_260_000,
      operatingExpenses: 910_000,
      ebitda: 350_000,
      depreciation: 70_000,
      netIncome: 280_000,
    } satisfies IncomeStatement,
    balanceSheet: {
      asOf: "March 31, 2026",
      cash: 2_200_000,
      accountsReceivable: 380_000,
      totalAssets: 3_100_000,
      totalLiabilities: 420_000,
      netEquity: 2_680_000,
    } satisfies BalanceSheet,
    financingHistory: [
      { date: "Aug 2022", type: "Pre-Seed", amountRaised: 500_000, postMoneyValuation: 2_500_000, investors: ["nth Venture", "Angel Syndicate"] },
      { date: "Mar 2024", type: "Seed",     amountRaised: 1_850_000, postMoneyValuation: 9_250_000, investors: ["Co-Owner Fund, LP", "Existing Angels"], notes: "Lead by Co-Owner Fund; bridge converted" },
    ] satisfies FinancingRound[],
    news: [
      { source: "LinkedIn", date: "Mar 25, 2026", headline: "Falconer Adds Wealth Transition Advisory Practice", snippet: "Falconer announced the launch of a dedicated wealth transition team to serve founders and families navigating liquidity events in 2026.", url: "https://www.linkedin.com/company/falconerco" },
      { source: "Barron's", date: "Feb 14, 2026", headline: "Boutique RIAs Gain Share as Ultra-HNW Clients Seek Alignment", snippet: "A wave of ultra-high-net-worth clients are moving relationships to smaller, fee-only advisors — firms like Falconer that stake compensation entirely on client outcomes.", url: "https://www.barrons.com" },
      { source: "LinkedIn", date: "Dec 10, 2025", headline: "Falconer Crosses $2M ARR Milestone", snippet: "Our team hit $2M in annualized revenue this quarter. This milestone reflects both top-line growth and the deepening of relationships with our client families.", url: "https://www.linkedin.com/company/falconerco" },
    ] satisfies NewsItem[],
  },
  {
    id: "merchant-boxes",
    name: "Merchant Boxes",
    initials: "MB",
    sector: "E-Commerce / Logistics",
    tagline: "Modern packaging for modern commerce",
    description:
      "Design-led packaging sourcing and fulfillment partner for DTC brands and eCommerce operators. Turns packaging from cost center to brand asset.",
    invested: 1_200_000,
    currentValue: 2_040_000,
    ownership: 24.5,
    stage: "Pre-Series A",
    founded: 2022,
    employees: 9,
    revenue: 3_800_000,
    revenueGrowth: 34,
    status: "active",
    secondaryAvailable: true,
    impliedValuation: 8_330_000,
    totalShares: 39_820_287, // 6,530,527 Co-Owner shares ÷ 16.4%
    linkedInUrl: "https://www.linkedin.com/company/merchant-boxes",
    logoUrl: "https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/0447362a-668a-4f17-ae20-6cb7ac57df6f/MB%2BLogo_Horizontal_Color.png",
    accentColor: "#F59E0B",
    ebitda: -180_000,
    valuationRefs: [
      { label: "409A",        date: "Feb 2025", low: 2_000_000, high: 4_500_000,  color: "#64748B", note: "Most recent 409A range" },
      { label: "Last Round",  date: "Sep 2023", low: 8_330_000, high: 8_330_000,  color: "#F59E0B", note: "Seed @ $8.33M post-money" },
      { label: "Rev Multiple",               low: 3_800_000, high: 11_400_000, color: "#10B981", note: "1–3× on $3.8M ARR" },
    ] satisfies ValuationRef[],
    incomeStatement: {
      period: "FY 2025",
      revenue: 3_800_000,
      costOfRevenue: 2_850_000,
      grossProfit: 950_000,
      operatingExpenses: 1_130_000,
      ebitda: -180_000,
      depreciation: 50_000,
      netIncome: -230_000,
    } satisfies IncomeStatement,
    balanceSheet: {
      asOf: "March 31, 2026",
      cash: 1_100_000,
      accountsReceivable: 620_000,
      otherCurrentAssets: 280_000,
      totalAssets: 2_400_000,
      totalLiabilities: 980_000,
      netEquity: 1_420_000,
      monthlyBurn: 15_000,
      runwayMonths: 73,
    } satisfies BalanceSheet,
    financingHistory: [
      { date: "Jun 2022", type: "Pre-Seed", amountRaised: 350_000, postMoneyValuation: 1_750_000, investors: ["nth Venture"] },
      { date: "Sep 2023", type: "Seed",     amountRaised: 1_200_000, postMoneyValuation: 5_000_000, investors: ["Co-Owner Fund, LP"], notes: "National retail partnership announced same month" },
    ] satisfies FinancingRound[],
    news: [
      { source: "LinkedIn", date: "Mar 18, 2026", headline: "Merchant Boxes Lands National Retail Partnership", snippet: "We've signed a national fulfillment agreement that we expect to significantly expand order volume throughout 2026. Proud of the team for closing this." },
      { source: "Packaging Digest", date: "Feb 5, 2026", headline: "DTC Packaging Costs Under Pressure as Tariffs Hit Paper Imports", snippet: "Tariffs on paper and cardboard imports from key markets are squeezing DTC packaging margins, with operators like Merchant Boxes working to diversify supply chains.", url: "https://www.packagingdigest.com" },
      { source: "LinkedIn", date: "Jan 9, 2026", headline: "Merchant Boxes Launches Eco-Line Packaging for Sustainable DTC Brands", snippet: "Our new eco-certified line of packaging is designed for DTC brands that want sustainable materials without sacrificing the unboxing experience." },
    ] satisfies NewsItem[],
  },
  {
    id: "certd",
    name: "Certd",
    initials: "CE",
    sector: "EdTech / Credentialing",
    tagline: "Verified training and accreditation marketplace",
    description:
      "Marketplace connecting professionals with verified training providers. Certd issues tamper-proof, blockchain-anchored credentials accepted by employers.",
    invested: 900_000,
    currentValue: 1_530_000,
    ownership: 31.0,
    stage: "Seed",
    founded: 2022,
    employees: 7,
    revenue: 620_000,
    revenueGrowth: 88,
    status: "active",
    secondaryAvailable: false,
    impliedValuation: 4_935_000,
    totalShares: 30_423_657, // 4,350,663 Co-Owner shares ÷ 14.3%
    linkedInUrl: "https://www.linkedin.com/company/certd",
    logoUrl: "https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/84711983-f208-406e-aeb1-60e8f271e02d/Screenshot+2025-10-29+162326.png",
    accentColor: "#10B981",
    ebitda: -850_000,
    valuationRefs: [
      { label: "409A",        date: "Mar 2025", low: 1_200_000, high: 2_800_000, color: "#64748B", note: "Most recent 409A range" },
      { label: "Last Round",  date: "Nov 2023", low: 4_935_000, high: 4_935_000, color: "#10B981", note: "Seed @ $4.935M post-money" },
      { label: "Rev Multiple",               low: 2_480_000, high: 6_200_000, color: "#8B5CF6", note: "4–10× on $620K ARR" },
    ] satisfies ValuationRef[],
    incomeStatement: {
      period: "FY 2025",
      revenue: 620_000,
      costOfRevenue: 180_000,
      grossProfit: 440_000,
      operatingExpenses: 1_290_000,
      ebitda: -850_000,
      depreciation: 70_000,
      netIncome: -920_000,
    } satisfies IncomeStatement,
    balanceSheet: {
      asOf: "March 31, 2026",
      cash: 1_800_000,
      accountsReceivable: 85_000,
      totalAssets: 2_100_000,
      totalLiabilities: 380_000,
      netEquity: 1_720_000,
      monthlyBurn: 71_000,
      runwayMonths: 25,
    } satisfies BalanceSheet,
    financingHistory: [
      { date: "Mar 2022", type: "Pre-Seed", amountRaised: 300_000, postMoneyValuation: 1_500_000, investors: ["nth Venture", "Founder Grants"] },
      { date: "Nov 2023", type: "Seed",     amountRaised: 900_000, postMoneyValuation: 3_200_000, investors: ["Co-Owner Fund, LP"] },
    ] satisfies FinancingRound[],
    news: [
      { source: "nth Venture", date: "Apr 8, 2026", headline: "Certd Accreditation Partnership Announcement Coming Q2 2026", snippet: "Per Q1 2026 LP letter: Certd's accreditation partnership announcement expected in June — management has previewed the agreement with investors." },
      { source: "EdTech Review", date: "Mar 3, 2026", headline: "Digital Credentialing Market Expected to Reach $4.8B by 2028", snippet: "Demand for verified, tamper-proof digital credentials is surging as employers increasingly require proof-of-skill beyond traditional degrees.", url: "https://www.edtechreview.in" },
      { source: "LinkedIn", date: "Jan 21, 2026", headline: "Certd Pilots Blockchain Credentials with Three Workforce Boards", snippet: "We're live with pilot programs across three regional workforce development boards, validating our credential infrastructure in real hiring workflows." },
    ] satisfies NewsItem[],
  },
  {
    id: "audily",
    name: "Audily",
    initials: "AU",
    sector: "Media / Podcasting",
    tagline: "Audio production for ambitious brands",
    description:
      "Full-service podcast and audio production studio. Audily handles strategy, recording, editing, and distribution for B2B brands that want to own their category conversation.",
    invested: 600_000,
    currentValue: 1_080_000,
    ownership: 28.0,
    stage: "Seed",
    founded: 2021,
    employees: 6,
    revenue: 480_000,
    revenueGrowth: 52,
    status: "active",
    secondaryAvailable: false,
    impliedValuation: 3_857_000,
    totalShares: 52_004_140, // 16,537,717 Co-Owner shares ÷ 31.8%
    linkedInUrl: "https://www.linkedin.com/company/audily",
    logoUrl: "https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/5e0320bd-ac40-42b3-905e-8091114b3615/23.jpg",
    accentColor: "#8B5CF6",
    ebitda: -320_000,
    valuationRefs: [
      { label: "409A",        date: "Jan 2025", low: 600_000,   high: 1_800_000, color: "#64748B", note: "Most recent 409A range" },
      { label: "Last Round",  date: "Jul 2023", low: 3_857_000, high: 3_857_000, color: "#8B5CF6", note: "Seed @ $3.857M post-money" },
      { label: "Rev Multiple",               low: 960_000,   high: 2_400_000, color: "#10B981", note: "2–5× on $480K ARR" },
    ] satisfies ValuationRef[],
    incomeStatement: {
      period: "FY 2025",
      revenue: 480_000,
      costOfRevenue: 192_000,
      grossProfit: 288_000,
      operatingExpenses: 608_000,
      ebitda: -320_000,
      depreciation: 40_000,
      netIncome: -360_000,
    } satisfies IncomeStatement,
    balanceSheet: {
      asOf: "March 31, 2026",
      cash: 1_200_000,
      accountsReceivable: 95_000,
      totalAssets: 1_450_000,
      totalLiabilities: 220_000,
      netEquity: 1_230_000,
      monthlyBurn: 27_000,
      runwayMonths: 45,
    } satisfies BalanceSheet,
    financingHistory: [
      { date: "Sep 2021", type: "Pre-Seed", amountRaised: 250_000, postMoneyValuation: 1_250_000, investors: ["nth Venture"] },
      { date: "Jul 2023", type: "Seed",     amountRaised: 600_000, postMoneyValuation: 2_500_000, investors: ["Co-Owner Fund, LP"] },
    ] satisfies FinancingRound[],
    news: [
      { source: "LinkedIn", date: "Mar 31, 2026", headline: "Audily Signs Five New B2B Brand Clients in Q1", snippet: "Closed Q1 with five new brand partnerships across fintech, SaaS, and professional services — our strongest acquisition quarter to date." },
      { source: "Podcast Magazine", date: "Jan 20, 2026", headline: "B2B Podcast Production Market Grows 34% in 2025", snippet: "Corporate audio content is having a moment: B2B brands are doubling down on podcasts as owned-media channels in the post-social era.", url: "https://www.podcastmagazine.com" },
      { source: "LinkedIn", date: "Nov 12, 2025", headline: "Audily Named in 'Top 20 Audio Production Studios for Business'", snippet: "Honored to be recognized alongside studios 10× our size. Our unfair advantage is the depth of content strategy we bring alongside production." },
    ] satisfies NewsItem[],
  },
  {
    id: "sbr2th",
    name: "SBR2TH Recruiting",
    initials: "SR",
    sector: "Talent / Staffing",
    tagline: "Niche tech talent for high-growth teams",
    description:
      "Specialized recruiting firm placing senior engineers, product managers, and data professionals at venture-backed companies. Known for speed and signal-to-noise.",
    invested: 1_100_000,
    currentValue: 1_870_000,
    ownership: 22.0,
    stage: "Growth",
    founded: 2022,
    employees: 11,
    revenue: 2_900_000,
    revenueGrowth: 29,
    status: "active",
    secondaryAvailable: true,
    impliedValuation: 8_500_000,
    totalShares: 30_781_427, // 4,617,214 Co-Owner shares ÷ 15.0%
    linkedInUrl: "https://www.linkedin.com/company/sbr2th-recruiting",
    logoUrl: "https://images.squarespace-cdn.com/content/v1/64d98f1d96a44455a5eab9a8/b4520098-a769-4c69-b772-30dfb718c454/Copy%2Bof%2BUntitled%2BDesign%2B%283%29.jpg",
    accentColor: "#EC4899",
    ebitda: 480_000,
    valuationRefs: [
      { label: "409A",            date: "Feb 2025", low: 3_000_000, high: 6_000_000, color: "#64748B", note: "Most recent 409A range" },
      { label: "Last Round",      date: "Jan 2024", low: 8_500_000, high: 8_500_000, color: "#EC4899", note: "Growth @ $8.5M post-money" },
      { label: "Rev Multiple",               low: 2_320_000, high: 7_250_000, color: "#10B981", note: "0.8–2.5× on $2.9M ARR" },
      { label: "EBITDA Multiple",            low: 2_400_000, high: 4_800_000, color: "#F59E0B", note: "5–10× on $480K EBITDA" },
    ] satisfies ValuationRef[],
    incomeStatement: {
      period: "FY 2025",
      revenue: 2_900_000,
      costOfRevenue: 1_740_000,
      grossProfit: 1_160_000,
      operatingExpenses: 680_000,
      ebitda: 480_000,
      depreciation: 90_000,
      netIncome: 390_000,
    } satisfies IncomeStatement,
    balanceSheet: {
      asOf: "March 31, 2026",
      cash: 1_600_000,
      accountsReceivable: 580_000,
      totalAssets: 2_800_000,
      totalLiabilities: 620_000,
      netEquity: 2_180_000,
    } satisfies BalanceSheet,
    financingHistory: [
      { date: "Apr 2022", type: "Pre-Seed", amountRaised: 400_000, postMoneyValuation: 2_000_000, investors: ["nth Venture", "Operator Angels"] },
      { date: "Jan 2024", type: "Growth",   amountRaised: 1_100_000, postMoneyValuation: 5_500_000, investors: ["Co-Owner Fund, LP"], notes: "Growth round to fund AI & data recruiting practice expansion" },
    ] satisfies FinancingRound[],
    news: [
      { source: "LinkedIn", date: "Apr 2, 2026", headline: "SBR2TH Places Company-Record 47 Senior Engineers in Q1 2026", snippet: "47 placements across 23 venture-backed companies this quarter. Our fastest Q1 ever. The AI hiring cycle is back and we're riding it hard." },
      { source: "TechCrunch", date: "Mar 11, 2026", headline: "Tech Hiring Rebounds: Senior Engineering Demand Up 28% YoY", snippet: "After two years of contraction, the senior engineering job market has recovered sharply, with demand concentrated in AI/ML, data infrastructure, and security.", url: "https://techcrunch.com" },
      { source: "LinkedIn", date: "Feb 3, 2026", headline: "SBR2TH Launches AI & Data Recruiting Practice", snippet: "Announcing our dedicated AI and data practice — specialized search for ML engineers, data platform leads, and AI product managers at venture-backed companies." },
    ] satisfies NewsItem[],
  },
  {
    id: "hretic",
    name: "HRetic",
    initials: "HR",
    sector: "HR / People Ops",
    tagline: "Fractional HR for founder-led companies",
    description:
      "Fractional HR partner helping fast-growing companies build people systems, equity programs, and culture before they're ready for a full-time CPO.",
    invested: 800_000,
    currentValue: 1_280_000,
    ownership: 26.5,
    stage: "Seed",
    founded: 2022,
    employees: 8,
    revenue: 790_000,
    revenueGrowth: 44,
    status: "active",
    secondaryAvailable: true,
    impliedValuation: 4_830_000,
    accentColor: "#14B8A6",
  },
  {
    id: "capture-fully",
    name: "CaptureFully",
    initials: "CF",
    sector: "Visual Media / SaaS",
    tagline: "Automated visual asset capture for operators",
    description:
      "SaaS platform that automates the capture, tagging, and distribution of visual content for real estate, hospitality, and retail operators at scale.",
    invested: 650_000,
    currentValue: 910_000,
    ownership: 35.0,
    stage: "Seed",
    founded: 2023,
    employees: 5,
    revenue: 290_000,
    revenueGrowth: 110,
    status: "active",
    secondaryAvailable: false,
    impliedValuation: 2_600_000,
    accentColor: "#F97316",
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

export const navHistory: QuarterlyNav[] = [
  { quarter: "Q4 '21", nav: 1_200_000,  called: 1_500_000,  distributions: 0 },
  { quarter: "Q1 '22", nav: 2_800_000,  called: 3_000_000,  distributions: 0 },
  { quarter: "Q2 '22", nav: 4_100_000,  called: 4_500_000,  distributions: 0 },
  { quarter: "Q3 '22", nav: 5_400_000,  called: 5_800_000,  distributions: 0 },
  { quarter: "Q4 '22", nav: 6_200_000,  called: 6_500_000,  distributions: 0 },
  { quarter: "Q1 '23", nav: 6_900_000,  called: 7_000_000,  distributions: 0 },
  { quarter: "Q2 '23", nav: 7_800_000,  called: 7_500_000,  distributions: 0 },
  { quarter: "Q3 '23", nav: 8_700_000,  called: 7_800_000,  distributions: 0 },
  { quarter: "Q4 '23", nav: 9_600_000,  called: 8_000_000,  distributions: 200_000 },
  { quarter: "Q1 '24", nav: 10_200_000, called: 8_200_000,  distributions: 350_000 },
  { quarter: "Q2 '24", nav: 10_900_000, called: 8_400_000,  distributions: 350_000 },
  { quarter: "Q3 '24", nav: 11_800_000, called: 8_600_000,  distributions: 350_000 },
  { quarter: "Q4 '24", nav: 12_400_000, called: 8_600_000,  distributions: 550_000 },
  { quarter: "Q1 '25", nav: 12_700_000, called: 8_750_000,  distributions: 550_000 },
  { quarter: "Q2 '25", nav: 13_100_000, called: 8_750_000,  distributions: 550_000 },
  { quarter: "Q3 '25", nav: 13_500_000, called: 8_750_000,  distributions: 750_000 },
  { quarter: "Q4 '25", nav: 13_700_000, called: 8_750_000,  distributions: 750_000 },
  { quarter: "Q1 '26", nav: 13_920_000, called: 8_750_000,  distributions: 780_000 },
];

export const dealPipeline: DealOpportunity[] = [
  {
    id: "talentloop",
    name: "TalentLoop",
    initials: "TL",
    sector: "HR Tech / SaaS",
    tagline: "Employee equity management for the 99%",
    description:
      "SaaS platform helping SMBs design, administer, and communicate equity programs that actually motivate. Integrates with Carta, Gusto, and Rippling. 140+ customers, $42K MRR.",
    targetRaise: 2_500_000,
    minInvestment: 50_000,
    raisedToDate: 1_100_000,
    stage: "Seed",
    deadline: "May 15, 2026",
    highlights: [
      "$42K MRR, growing 12% MoM",
      "140 SMB customers, <1% churn",
      "Aligns directly with nth thesis on ownership culture",
    ],
    traction: "140 customers, $504K ARR",
    platform: "direct",
    isFeatured: true,
    accentColor: "#10B981",
  },
  {
    id: "sovereign-stack",
    name: "Sovereign Stack",
    initials: "SS",
    sector: "Fintech / Compliance",
    tagline: "Compliance-as-a-service for community lenders",
    description:
      "Automates BSA/AML, CRA, and fair lending compliance workflows for credit unions and community banks. Cuts compliance staff time by ~60%. 18 LOIs signed.",
    targetRaise: 3_000_000,
    minInvestment: 100_000,
    raisedToDate: 800_000,
    stage: "Pre-Seed",
    deadline: "June 1, 2026",
    highlights: [
      "18 signed LOIs from credit unions",
      "Regulatory tailwind from CFPB modernization",
      "Founding team: ex-OCC, ex-Plaid",
    ],
    traction: "18 LOIs, pilot launch Q2 2026",
    platform: "spv",
    isFeatured: false,
    accentColor: "#3B82F6",
  },
  {
    id: "groundwork",
    name: "Groundwork",
    initials: "GW",
    sector: "PropTech / Workforce",
    tagline: "Co-ownership model for trade contractors",
    description:
      "Franchise alternative that gives skilled trade contractors a path to business ownership through a co-op model. Currently operating in HVAC and plumbing across TX and FL.",
    targetRaise: 1_500_000,
    minInvestment: 25_000,
    raisedToDate: 975_000,
    stage: "Seed",
    deadline: "April 30, 2026",
    highlights: [
      "65% funded — closing soon",
      "3 operating markets, profitable unit economics",
      "Republic Regulation CF — open to all accredited investors",
    ],
    traction: "3 markets, 28 contractor-owners",
    platform: "republic",
    isFeatured: false,
    accentColor: "#F59E0B",
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
