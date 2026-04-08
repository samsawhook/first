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
    votingOwnership: 22.1,
    shareTransactions: [
      { date: "Aug 2022", type: "Common",    shares: 5_000_000, pricePerShare: 0.10,  amount: 500_000  },
      { date: "Mar 2024", type: "Preferred", shares: 3_500_000, pricePerShare: 0.386, amount: 1_350_000,
        preferredType: "Non-Participating", liquidationMultiple: 1.0, conversionRatio: 1.0, dividendRate: 8 },
    ] satisfies ShareTransaction[],
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
    financialHistory: [
      { period: "FY 2024", periodType: "annual", revenue: 1_300_000, costOfRevenue: 520_000, grossProfit: 780_000, operatingExpenses: 660_000, ebitda: 120_000, depreciation: 40_000, netIncome: 90_000, cash: 1_100_000, accountsReceivable: 210_000 },
      { period: "Q1 2025", periodType: "quarterly", startDate: "2025-01-01", endDate: "2025-03-31", revenue: 420_000, costOfRevenue: 168_000, grossProfit: 252_000, operatingExpenses: 202_000, ebitda: 50_000, depreciation: 15_000, netIncome: 35_000 },
      { period: "Q2 2025", periodType: "quarterly", startDate: "2025-04-01", endDate: "2025-06-30", revenue: 480_000, costOfRevenue: 192_000, grossProfit: 288_000, operatingExpenses: 218_000, ebitda: 70_000, depreciation: 16_000, netIncome: 52_000 },
      { period: "Q3 2025", periodType: "quarterly", startDate: "2025-07-01", endDate: "2025-09-30", revenue: 540_000, costOfRevenue: 216_000, grossProfit: 324_000, operatingExpenses: 234_000, ebitda: 90_000, depreciation: 18_000, netIncome: 68_000 },
      { period: "Q4 2025", periodType: "quarterly", startDate: "2025-10-01", endDate: "2025-12-31", revenue: 660_000, costOfRevenue: 264_000, grossProfit: 396_000, operatingExpenses: 256_000, ebitda: 140_000, depreciation: 21_000, netIncome: 105_000 },
    ] satisfies FinancialPeriod[],
    annualMeetingDate: "March 12, 2026",
    annualMeetingUrl: "https://www.loom.com",
    shareholderLetters: [
      {
        id: "falconer-q4-2025",
        date: "January 20, 2026",
        period: "Q4 2025",
        title: "Q4 2025 Shareholder Update — Momentum Into 2026",
        author: "Falconer Management",
        excerpt: "Q4 was our strongest quarter to date. We crossed $2M in annualized revenue and are entering 2026 with a full pipeline and a focused team.",
        body: `Dear Shareholders,

Q4 2025 was Falconer's strongest quarter since founding. Revenue came in at $660K for the quarter — a 22% increase over Q3 — bringing full-year 2025 revenue to $2.1M and EBITDA to $350K.

**What Drove Q4**

Two client relationships that had been in diligence since Q2 finally closed in October and November. Both are multigenerational family offices — exactly the clients we built Falconer to serve. These are long-duration, high-trust relationships that compound over time.

We also made progress on the team. We added our third advisor in December, which positions us to take on an additional $8–10M in advisory relationships in 2026 without straining capacity.

**Looking Ahead**

We expect Q1 2026 to be softer seasonally — it always is in wealth advisory — but the pipeline entering the year is the deepest we've seen. We're tracking four prospective mandates that would individually represent 15–20% revenue lifts if they close.

The wealth transition advisory practice we're launching in Q1 is a direct response to market demand. Founders are sitting on meaningful illiquid equity and need sophisticated guidance on how to think about it. We're uniquely positioned here.

Thank you for your continued support.

— Falconer Management`,
      },
    ] satisfies CompanyLetter[],
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
    votingOwnership: 27.8,
    shareTransactions: [
      { date: "Jun 2022", type: "Common",    shares: 4_000_000, pricePerShare: 0.075, amount: 300_000  },
      { date: "Sep 2023", type: "Preferred", shares: 3_000_000, pricePerShare: 0.30,  amount: 900_000,
        preferredType: "Participating w/ Cap", liquidationMultiple: 1.0, conversionRatio: 1.0 },
    ] satisfies ShareTransaction[],
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
    financialHistory: [
      { period: "FY 2024", periodType: "annual", revenue: 2_800_000, costOfRevenue: 2_100_000, grossProfit: 700_000, operatingExpenses: 980_000, ebitda: -280_000, depreciation: 60_000, netIncome: -340_000, cash: 800_000, accountsReceivable: 480_000 },
      { period: "Q1 2025", periodType: "quarterly", startDate: "2025-01-01", endDate: "2025-03-31", revenue: 820_000, costOfRevenue: 615_000, grossProfit: 205_000, operatingExpenses: 265_000, ebitda: -60_000, depreciation: 12_000, netIncome: -75_000 },
      { period: "Q2 2025", periodType: "quarterly", startDate: "2025-04-01", endDate: "2025-06-30", revenue: 900_000, costOfRevenue: 675_000, grossProfit: 225_000, operatingExpenses: 275_000, ebitda: -50_000, depreciation: 13_000, netIncome: -62_000 },
      { period: "Q3 2025", periodType: "quarterly", startDate: "2025-07-01", endDate: "2025-09-30", revenue: 1_000_000, costOfRevenue: 750_000, grossProfit: 250_000, operatingExpenses: 290_000, ebitda: -40_000, depreciation: 13_000, netIncome: -52_000 },
      { period: "Q4 2025", periodType: "quarterly", startDate: "2025-10-01", endDate: "2025-12-31", revenue: 1_080_000, costOfRevenue: 810_000, grossProfit: 270_000, operatingExpenses: 300_000, ebitda: -30_000, depreciation: 12_000, netIncome: -41_000 },
    ] satisfies FinancialPeriod[],
    annualMeetingDate: "March 19, 2026",
    annualMeetingUrl: "https://www.loom.com",
    shareholderLetters: [
      {
        id: "mb-q4-2025",
        date: "January 28, 2026",
        period: "Q4 2025",
        title: "Q4 2025 Shareholder Update — National Partnership & Path to Profitability",
        author: "Merchant Boxes Management",
        excerpt: "Q4 was defined by the national retail partnership we announced in March. The deal took eight months to negotiate and changes our trajectory materially.",
        body: `Dear Shareholders,

Q4 2025 revenue came in at $1.08M — our best quarter ever and a 23% sequential increase. Full-year 2025 revenue was $3.8M, up 36% from $2.8M in 2024. EBITDA loss for the year narrowed to -$180K from -$280K in 2024, which represents meaningful progress.

**The Retail Partnership**

In late Q4 we finalized a national fulfillment agreement with a major retail operator (we'll announce the name when the partnership goes live in Q2 2026). This is a multi-year, volume-committed arrangement. Based on projected initial order volumes, it represents approximately 30–40% revenue upside from our current run rate.

**Path to Profitability**

We expect to reach EBITDA breakeven in Q3 2026. The math is straightforward: the retail partnership drives meaningful volume without proportional cost increases, because our supply chain infrastructure is already built. Gross margin should expand 3–5 points as we scale.

**Headcount**

We are at 9 full-time employees. We do not plan to add headcount in H1 2026. Every hire we make is an owner — that discipline keeps the team tight and the incentives aligned.

Thank you for your patience and continued confidence.

— Merchant Boxes Management`,
      },
    ] satisfies CompanyLetter[],
  },
  {
    id: "certd",
    name: "Pigeon Service",
    initials: "PS",
    sector: "Logistics / Operations",
    tagline: "Modern same-day delivery infrastructure for local commerce",
    description:
      "Pigeon Service (fka CERTD) builds last-mile delivery infrastructure for local businesses, enabling same-day and scheduled delivery without the complexity of managing a fleet.",
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
    totalShares: 30_423_657,
    website: "https://pigeonservice.com",
    logoUrl: "https://logo.clearbit.com/pigeonservice.com",
    accentColor: "#10B981",
    ebitda: -850_000,
    votingOwnership: 35.2,
    shareTransactions: [
      { date: "Mar 2022", type: "Common",    shares: 3_500_000, pricePerShare: 0.057, amount: 200_000 },
      { date: "Nov 2023", type: "Preferred", shares: 2_800_000, pricePerShare: 0.25,  amount: 700_000,
        preferredType: "Non-Participating", liquidationMultiple: 1.5, conversionRatio: 1.0 },
    ] satisfies ShareTransaction[],
    debtPositions: [
      { id: "certd-cn-1", date: "Jun 2022", instrument: "Convertible Note", principal: 150_000,
        interestRate: 8, maturityDate: "Jun 2024", valuationCap: 4_000_000,
        status: "Extended", currentValue: 181_200,
        notes: "Maturity extended to Jun 2026 pending Series A. Interest accruing at 8%." },
    ] satisfies DebtPosition[],
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
    financialHistory: [
      { period: "FY 2024", periodType: "annual", revenue: 340_000, costOfRevenue: 100_000, grossProfit: 240_000, operatingExpenses: 1_160_000, ebitda: -920_000, depreciation: 70_000, netIncome: -990_000, cash: 2_200_000, accountsReceivable: 42_000 },
      { period: "Q1 2025", periodType: "quarterly", startDate: "2025-01-01", endDate: "2025-03-31", revenue: 120_000, costOfRevenue: 35_000, grossProfit: 85_000, operatingExpenses: 325_000, ebitda: -240_000, depreciation: 18_000, netIncome: -258_000 },
      { period: "Q2 2025", periodType: "quarterly", startDate: "2025-04-01", endDate: "2025-06-30", revenue: 140_000, costOfRevenue: 41_000, grossProfit: 99_000, operatingExpenses: 319_000, ebitda: -220_000, depreciation: 17_000, netIncome: -237_000 },
      { period: "Q3 2025", periodType: "quarterly", startDate: "2025-07-01", endDate: "2025-09-30", revenue: 160_000, costOfRevenue: 46_000, grossProfit: 114_000, operatingExpenses: 314_000, ebitda: -200_000, depreciation: 17_000, netIncome: -216_000 },
      { period: "Q4 2025", periodType: "quarterly", startDate: "2025-10-01", endDate: "2025-12-31", revenue: 200_000, costOfRevenue: 58_000, grossProfit: 142_000, operatingExpenses: 332_000, ebitda: -190_000, depreciation: 18_000, netIncome: -209_000 },
    ] satisfies FinancialPeriod[],
    annualMeetingDate: "March 26, 2026",
    annualMeetingUrl: "https://www.loom.com",
    shareholderLetters: [
      {
        id: "certd-q4-2025",
        date: "February 3, 2026",
        period: "Q4 2025",
        title: "Q4 2025 Shareholder Update — Accreditation Partnership Progress",
        author: "Certd Management",
        excerpt: "Q4 revenue grew 25% quarter over quarter and we are in final stages of an accreditation partnership that will significantly accelerate our go-to-market.",
        body: `Dear Shareholders,

Q4 2025 revenue was $200K, our best quarter to date and a 25% sequential increase from Q3. Full-year 2025 revenue of $620K represents 82% growth over 2024. Our EBITDA burn is narrowing — Q4 EBITDA was -$190K versus -$240K in Q1. We are burning less to grow more.

**Accreditation Partnership**

We are in final stages of executing an accreditation partnership with a national trade association. This is the key unlock for our marketplace model: association-endorsed credentials carry significantly higher employer acceptance rates than self-issued ones. We expect to announce this publicly in Q2 2026.

When this is live, our go-to-market changes materially. We can now approach association members (thousands of credentialing providers) with an endorsed credential product. This is our primary growth driver for 2026 and 2027.

**Workforce Board Pilots**

We completed our first three workforce board pilots in Q4. Results were strong: 94% of credentials issued in the pilots have been accepted by at least one employer. We expect to convert two of the three pilots to paying contracts in Q1 2026.

**Runway**

With $1.8M in cash as of March 31, we have approximately 25 months of runway at current burn. We do not plan to raise until the accreditation partnership is live and we can demonstrate accelerating adoption.

Thank you for your patience — this is a complex market to move in, and we are moving carefully and deliberately.

— Certd Management`,
      },
    ] satisfies CompanyLetter[],
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
    votingOwnership: 32.4,
    shareTransactions: [
      { date: "Sep 2021", type: "Common",    shares: 4_000_000, pricePerShare: 0.05,  amount: 200_000 },
      { date: "Jul 2023", type: "Preferred", shares: 2_000_000, pricePerShare: 0.20,  amount: 400_000,
        preferredType: "Non-Participating", liquidationMultiple: 1.0, conversionRatio: 1.0 },
    ] satisfies ShareTransaction[],
    debtPositions: [
      { id: "audily-safe-1", date: "Oct 2022", instrument: "SAFE", principal: 100_000,
        valuationCap: 3_000_000, discountRate: 20,
        status: "Accruing", currentValue: 100_000,
        notes: "Post-money SAFE, 20% discount to next round, $3M valuation cap." },
    ] satisfies DebtPosition[],
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
    financialHistory: [
      { period: "FY 2024", periodType: "annual", revenue: 315_000, costOfRevenue: 126_000, grossProfit: 189_000, operatingExpenses: 589_000, ebitda: -400_000, depreciation: 40_000, netIncome: -440_000, cash: 1_400_000, accountsReceivable: 58_000 },
      { period: "Q1 2025", periodType: "quarterly", startDate: "2025-01-01", endDate: "2025-03-31", revenue: 90_000, costOfRevenue: 36_000, grossProfit: 54_000, operatingExpenses: 149_000, ebitda: -95_000, depreciation: 10_000, netIncome: -105_000 },
      { period: "Q2 2025", periodType: "quarterly", startDate: "2025-04-01", endDate: "2025-06-30", revenue: 105_000, costOfRevenue: 42_000, grossProfit: 63_000, operatingExpenses: 148_000, ebitda: -85_000, depreciation: 10_000, netIncome: -94_000 },
      { period: "Q3 2025", periodType: "quarterly", startDate: "2025-07-01", endDate: "2025-09-30", revenue: 120_000, costOfRevenue: 48_000, grossProfit: 72_000, operatingExpenses: 147_000, ebitda: -75_000, depreciation: 10_000, netIncome: -83_000 },
      { period: "Q4 2025", periodType: "quarterly", startDate: "2025-10-01", endDate: "2025-12-31", revenue: 165_000, costOfRevenue: 66_000, grossProfit: 99_000, operatingExpenses: 164_000, ebitda: -65_000, depreciation: 10_000, netIncome: -73_000 },
    ] satisfies FinancialPeriod[],
    annualMeetingDate: "March 5, 2026",
    annualMeetingUrl: "https://www.loom.com",
    shareholderLetters: [
      {
        id: "audily-q4-2025",
        date: "January 15, 2026",
        period: "Q4 2025",
        title: "Q4 2025 Shareholder Update — Strongest Quarter, Clearest Signal",
        author: "Audily Management",
        excerpt: "Q4 revenue of $165K was our best quarter ever, driven by five new brand client wins. We closed 2025 with $480K in revenue, up 52% from 2024.",
        body: `Dear Shareholders,

Q4 2025 revenue was $165K — our strongest quarter since founding. Full-year 2025 revenue was $480K, up 52% from $315K in 2024. EBITDA loss for the year was -$320K, a meaningful improvement from -$400K in 2024.

**What's Working**

Our conversion motion is clicking. We shortened the sales cycle by productizing our offering — brands now choose from three tiers (Launch, Scale, Enterprise) rather than negotiating custom scopes. Average deal size increased 40% while sales cycle dropped from 8 weeks to 5.

**Client Profile**

We now serve 19 active B2B brand clients across fintech, SaaS, professional services, and healthcare. Average contract value is approximately $25K/year. Our churn in 2025 was zero — every client that signed with us in 2024 renewed.

**2026 Priorities**

1. Reach $800K ARR by end of 2026 (vs. $480K in 2025)
2. Hire one senior producer to relieve capacity constraints
3. Pilot a self-serve content repurposing add-on that would increase per-client ARPU without adding headcount

**A Note on Ownership**

All six Audily employees hold meaningful equity. When I tell you our churn is zero, I think part of the reason is that our team shows up differently for clients because they're owners. That's not accidental — it's the point.

— Audily Management`,
      },
    ] satisfies CompanyLetter[],
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
    votingOwnership: 25.6,
    shareTransactions: [
      { date: "Apr 2022", type: "Common",    shares: 3_000_000, pricePerShare: 0.133, amount: 400_000 },
      { date: "Jan 2024", type: "Preferred", shares: 2_333_333, pricePerShare: 0.30,  amount: 700_000,
        preferredType: "Participating", liquidationMultiple: 1.0, conversionRatio: 1.0, dividendRate: 6 },
    ] satisfies ShareTransaction[],
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
    financialHistory: [
      { period: "FY 2024", periodType: "annual", revenue: 2_250_000, costOfRevenue: 1_350_000, grossProfit: 900_000, operatingExpenses: 600_000, ebitda: 300_000, depreciation: 55_000, netIncome: 245_000, cash: 1_100_000, accountsReceivable: 430_000 },
      { period: "Q1 2025", periodType: "quarterly", startDate: "2025-01-01", endDate: "2025-03-31", revenue: 600_000, costOfRevenue: 360_000, grossProfit: 240_000, operatingExpenses: 160_000, ebitda: 80_000, depreciation: 20_000, netIncome: 65_000 },
      { period: "Q2 2025", periodType: "quarterly", startDate: "2025-04-01", endDate: "2025-06-30", revenue: 700_000, costOfRevenue: 420_000, grossProfit: 280_000, operatingExpenses: 170_000, ebitda: 110_000, depreciation: 22_000, netIncome: 90_000 },
      { period: "Q3 2025", periodType: "quarterly", startDate: "2025-07-01", endDate: "2025-09-30", revenue: 760_000, costOfRevenue: 456_000, grossProfit: 304_000, operatingExpenses: 174_000, ebitda: 130_000, depreciation: 23_000, netIncome: 106_000 },
      { period: "Q4 2025", periodType: "quarterly", startDate: "2025-10-01", endDate: "2025-12-31", revenue: 840_000, costOfRevenue: 504_000, grossProfit: 336_000, operatingExpenses: 176_000, ebitda: 160_000, depreciation: 25_000, netIncome: 130_000 },
    ] satisfies FinancialPeriod[],
    annualMeetingDate: "February 25, 2026",
    annualMeetingUrl: "https://www.loom.com",
    shareholderLetters: [
      {
        id: "sbr2th-q4-2025",
        date: "January 22, 2026",
        period: "Q4 2025",
        title: "Q4 2025 Shareholder Update — Record Quarter, Profitable Growth",
        author: "SBR2TH Management",
        excerpt: "Q4 2025 was our best quarter ever. $840K in revenue, $160K EBITDA, and 11 full-time employees — all owners. The AI hiring cycle is real and we are positioned for it.",
        body: `Dear Shareholders,

Q4 2025 revenue was $840K — a company record and a 10.5% sequential increase from Q3. Full-year 2025 revenue was $2.9M, up 29% from $2.25M in 2024. EBITDA for the year was $480K, up 60% from $300K in 2024. We are a profitable growth company.

**AI & Data Practice**

We soft-launched our AI & Data recruiting practice in November. In Q4 alone we placed 6 ML engineers and 2 data platform leads. The pipeline for this practice is the strongest we've seen at this stage of any specialty. We expect AI & Data to represent 25–30% of revenue in 2026.

**Team & Ownership**

We are at 11 full-time employees. All 11 hold meaningful equity stakes. We added two recruiters in Q4 — both chose to take lower base salaries in exchange for larger equity grants. That's the SBR2TH model working exactly as designed.

**Headcount Plan for 2026**

We plan to add 3–4 recruiters in 2026 as we scale the AI & Data practice. Each hire will be an owner. We are targeting $4.2M in revenue for 2026 and EBITDA margins above 18%.

**Q1 2026 Early Read**

January placements are already tracking ahead of Q1 2025. The AI hiring rebound is accelerating. We are bullish.

Thank you for your continued support and alignment.

— SBR2TH Management`,
      },
    ] satisfies CompanyLetter[],
  },
  {
    id: "galileo",
    name: "Galileo Computing",
    initials: "GC",
    sector: "Developer Tools / Cloud",
    tagline: "Intelligent compute orchestration for AI workloads",
    description:
      "Galileo Computing (fka PRreact) provides infrastructure orchestration for AI/ML teams — dynamically routing workloads across GPU clusters to minimize cost and latency. Trusted by ML teams at Series A–C companies.",
    invested: 750_000,
    currentValue: 1_350_000,
    ownership: 18.5,
    stage: "Seed",
    founded: 2023,
    employees: 9,
    revenue: 540_000,
    revenueGrowth: 120,
    status: "active",
    secondaryAvailable: false,
    impliedValuation: 7_300_000,
    totalShares: 28_000_000,
    website: "https://galileocomputing.com",
    logoUrl: "https://logo.clearbit.com/galileocomputing.com",
    accentColor: "#6366F1",
    ebitda: -620_000,
    votingOwnership: 21.2,
    shareTransactions: [
      { date: "Feb 2024", type: "Common",    shares: 4_200_000, pricePerShare: 0.071, amount: 300_000 },
      { date: "Oct 2024", type: "Preferred", shares: 2_800_000, pricePerShare: 0.161, amount: 450_000,
        preferredType: "Non-Participating", liquidationMultiple: 1.0, conversionRatio: 1.0 },
    ] satisfies ShareTransaction[],
    valuationRefs: [
      { label: "Last Round",  date: "Oct 2024", low: 7_300_000, high: 7_300_000, color: "#6366F1", note: "Seed @ $7.3M post-money" },
      { label: "Rev Multiple",               low: 2_700_000, high: 8_100_000, color: "#10B981", note: "5–15× on $540K ARR" },
    ] satisfies ValuationRef[],
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

export const managedFundPositions: ManagedFundPosition[] = [
  {
    id: "co-owner-fund",
    fundName: "Co-Owner Fund, LP",
    vintage: 2021,
    unitPrice: 1.00,
    unitsCommitted: 500_000,
    unitsCalled:    295_000,
    commitment:     500_000,
    called:         295_000,
    uncalled:       205_000,
    nav:            442_500,   // called × RVPI (1.50)
    distributions:   26_500,   // called × DPI  (0.09)
    dpi:  0.09,
    rvpi: 1.50,
    tvpi: 1.59,
    irr:  26.4,
    asOf: "March 31, 2026",
    transactions: [
      { date: "Jan 2022", type: "Capital Call", units: 87_500, amount: 87_500,
        notes: "Fund inception — initial portfolio deployment" },
      { date: "Aug 2022", type: "Capital Call", units: 87_500, amount: 87_500,
        notes: "Certd, Audily, Merchant Boxes investments" },
      { date: "Mar 2023", type: "Capital Call", units: 60_000, amount: 60_000,
        notes: "SBR2TH growth round" },
      { date: "Nov 2023", type: "Capital Call", units: 60_000, amount: 60_000,
        notes: "Falconer Series Seed" },
      { date: "Sep 2025", type: "Distribution", amount: 26_500,
        notes: "Partial realization — hep global GmbH exit proceeds" },
    ] satisfies ManagedFundTransaction[],
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
