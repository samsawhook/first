export interface ValuationRef {
  label: string;       // e.g. "409A", "Last Round", "Rev Multiple 3–8×"
  date?: string;       // e.g. "Jan 2025"
  low: number;         // lower bound of range ($); set equal to high for point transactions
  high: number;        // upper bound of range ($)
  color?: string;      // hex accent for the bar
  note?: string;       // e.g. "3–8× on $2.1M ARR"
  isEnterpriseValue?: boolean; // if true, low/high are EV; bridge deduction applied to reach equity value
}

export interface IncomeStatement {
  period: string;                // e.g. "FY 2025"
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingExpenses: number;
  ebitda: number;
  depreciation: number;
  netIncome: number;
}

export interface BalanceSheet {
  asOf: string;                  // e.g. "March 31, 2026"
  cash: number;
  accountsReceivable: number;
  otherCurrentAssets?: number;
  totalAssets: number;
  totalLiabilities: number;
  netEquity: number;
  monthlyBurn?: number;          // positive = cash outflow per month; omit if profitable
  runwayMonths?: number;
  preferredLiquidation?: number; // total preferred liquidation preference ($); used in EV→equity bridge
}

export interface FinancingRound {
  date: string;
  type: "Pre-Seed" | "Seed" | "Series A" | "Series B" | "Series C" | "Bridge" | "Convertible Note" | "Growth";
  amountRaised: number;
  postMoneyValuation?: number;
  investors: string[];
  notes?: string;
}

export interface NewsItem {
  source: string;                // e.g. "LinkedIn", "TechCrunch"
  date: string;
  headline: string;
  snippet: string;
  url?: string;
}

// QuickBooks-compatible period snapshot — import by mapping QB P&L export columns
export interface FinancialPeriod {
  period: string;                // "Q1 2025", "FY 2024"
  periodType: "quarterly" | "annual" | "monthly";
  startDate?: string;            // ISO date; populated on QB import
  endDate?: string;
  // Income Statement
  revenue: number;               // Total Income / Gross Revenue
  costOfRevenue: number;         // COGS
  grossProfit: number;
  operatingExpenses: number;     // SG&A + R&D + other opex (excl COGS)
  ebitda: number;                // = grossProfit - operatingExpenses
  depreciation?: number;
  netIncome: number;
  // Cash flow (from QB Cash Flow Statement)
  cashFromOperations?: number;
  // Balance sheet snapshot (end of period — from QB Balance Sheet)
  cash?: number;
  accountsReceivable?: number;
  totalAssets?: number;
  totalLiabilities?: number;
}

export interface CompanyLetter {
  id: string;
  date: string;
  period: string;
  title: string;
  author: string;
  excerpt: string;
  body: string;
}

export interface ShareTransaction {
  date: string;                          // e.g. "Aug 2022"
  type: "Common" | "Preferred" | "RSU" | "Option";
  shares?: number;
  pricePerShare?: number;
  amount: number;                        // cash deployed ($)
  certificateNumber?: string;            // e.g. "CS-12", "PS-04"
  notes?: string;
  // Preferred-specific
  preferredType?: "Participating" | "Non-Participating" | "Participating w/ Cap";
  liquidationMultiple?: number;          // e.g. 1.0 = 1× liq pref
  conversionRatio?: number;             // preferred → common per share (default 1.0)
  dividendRate?: number;                // cumulative annual dividend %
}

export interface DebtPosition {
  id: string;
  date: string;
  instrument: "Convertible Note" | "SAFE" | "Term Loan" | "Line of Credit" | "Revenue Based Financing" | "Preferred";
  principal: number;
  interestRate?: number;                // annual %; undefined for SAFEs or variable
  termMonths?: number;                  // loan term in months; undefined = 12 (standard)
  maturityDate?: string;               // "Jun 2026"; undefined for open-ended SAFEs
  valuationCap?: number;               // conversion cap ($)
  discountRate?: number;               // SAFE discount %
  status: "Current" | "Accruing" | "Converted" | "Repaid" | "Extended";
  currentValue: number;                // principal + accrued; face value for SAFE
  notes?: string;
}

export interface OptionPosition {
  id: string;
  date?: string;                       // grant date, e.g. "Jan 2024"
  instrument: "Option" | "Warrant";
  shares: number;                      // number of shares exercisable
  strikePrice: number;                 // exercise price per share ($)
  expirationDate?: string;             // e.g. "Dec 2030"; omit if perpetual / no expiration
  costBasis?: number;                  // total amount paid for this option/warrant position ($)
  currentValue?: number;               // est. fair value of the position
  defaultVariancePct?: number;         // default volatility/variance % for time-value estimate (e.g. 100 = 100%)
  notes?: string;
}

export interface BalanceSheetSnapshot {
  period: string;                  // e.g. "Q4 2021"
  cash: number;                    // total bank accounts
  totalCurrentAssets: number;
  totalAssets: number;
  totalCurrentLiabilities: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface CapTableClass {
  label: string;
  shares: number;
  color: string;
  note?: string;
  isPool?: boolean;        // unissued / available pool
  isContingent?: boolean;  // options exceeding authorized; contingent on future authorization
}

export interface CapTableSummary {
  asOf: string;
  source?: string;            // e.g. "Pulley"
  authorizedCommon?: number;  // total authorized common shares
  adjustedFullyDiluted?: number; // FD including contingent instruments
  classes: CapTableClass[];
}

export interface ManagedFundTransaction {
  date: string;
  type: "Capital Call" | "Distribution" | "Commitment";
  units?: number;
  amount: number;
  notes?: string;
}

export interface ManagedFundPosition {
  id: string;
  fundName: string;
  vintage: number;
  unitPrice: number;           // $1.00 for Co-Owner Fund
  unitsCommitted: number;
  unitsCalled: number;
  commitment: number;          // total $ commitment
  called: number;              // $ called to date
  uncalled: number;            // $ remaining commitment
  nav: number;                 // current NAV of LP stake
  distributions: number;       // total distributions received
  dpi: number;
  rvpi: number;
  tvpi: number;
  irr: number;
  asOf: string;
  transactions?: ManagedFundTransaction[];
}

export interface PortfolioCompany {
  id: string;
  name: string;
  legalName?: string;
  initials: string;
  sector: string;
  tagline: string;
  description: string;
  invested: number;
  currentValue: number;
  ownership: number;
  stage: "Seed" | "Pre-Series A" | "Series A" | "Growth";
  founded: number;
  employees: number;
  revenue?: number;
  revenueGrowth?: number;
  status: "active" | "realized" | "written-off";
  secondaryAvailable: boolean;
  impliedValuation: number;
  totalShares?: number; // fully-diluted share count; enables per-share price calc
  financialsAsOf?: string;   // date QB export was pulled, e.g. "4/8/26"; set per company on import
  website?: string;
  linkedInUrl?: string;
  logoUrl?: string;
  dataRoomUrl?: string;
  contact?: string;           // primary contact email for the company
  accentColor: string;
  valuationRefs?: ValuationRef[];
  ebitda?: number;               // trailing EBITDA ($); negative = loss
  votingOwnership?: number;      // voting % (may be less than ownership due to non-voting RSUs)
  customPricePerShare?: number;           // fund's default per-share estimate; drives "Fund Est." football field bar
  shareTransactions?: ShareTransaction[]; // per-tranche purchase history ordered oldest → newest
  debtPositions?: DebtPosition[];        // outstanding debt / convertible instruments held by the fund
  optionPositions?: OptionPosition[];    // options and warrants held by the fund
  incomeStatement?: IncomeStatement;
  balanceSheet?: BalanceSheet;
  balanceSheetHistory?: BalanceSheetSnapshot[];
  financingHistory?: FinancingRound[];
  financialHistory?: FinancialPeriod[];   // ordered oldest → newest; QB import target
  news?: NewsItem[];
  shareholderLetters?: CompanyLetter[];
  annualMeetingDate?: string;
  annualMeetingUrl?: string;
  capTable?: CapTableSummary;
}

export interface FundMetrics {
  name: string;
  vintage: number;
  targetSize: number;
  calledCapital: number;
  nav: number;
  tvpi: number;
  dpi: number;
  rvpi: number;
  irr: number;
  totalInvestments: number;
  realized: number;
  unrealized: number;
  asOf: string;
}

export interface QuarterlyNav {
  quarter: string;
  nav: number;
  called: number;
  distributions: number;
}

export interface DealOpportunity {
  id: string;
  name: string;
  initials: string;
  sector: string;
  tagline: string;
  description: string;
  targetRaise: number;
  minInvestment: number;
  raisedToDate: number;
  stage: string;
  deadline: string;
  highlights: string[];
  traction: string;
  platform: "republic" | "direct" | "spv";
  isFeatured?: boolean;
  accentColor: string;
}

export interface YieldScenario {
  label: string;
  annualizedReturn: number;  // e.g. 20 = 20%; 0 = equity upside (no fixed yield)
  notes?: string;
}

export interface PrivateDeal {
  id: string;
  name: string;                // Non-identifying per newsletter policy
  initials: string;
  sector: string;
  dealType: "acquisition" | "buyout" | "energy" | "equity_option";
  tagline: string;
  description: string;
  highlights: string[];
  revenue?: number;
  cashFlow?: number;           // SDE, EBITDA, or annual cash flow
  cashFlowLabel?: string;      // "SDE", "Cash Flow", "EBITDA"
  assets?: number;
  assetsNote?: string;
  askingPrice?: number;        // total deal price or CAPEX
  minimumInvestment?: number;
  yearsInBusiness?: number;
  yieldScenarios: YieldScenario[];
  requiresNDA: boolean;
  deadline?: string;
  isFeatured?: boolean;
  linkedPortcoId?: string;     // links to a PortfolioCompany id
  accentColor: string;
}

export interface SecondaryLot {
  id: string;
  companyId: string;
  companyName: string;
  side: "bid" | "ask";
  units: number;
  impliedPricePerUnit: number;
  impliedValuation: number;
  sellerNote?: string;
  posted: string;
}

export interface Letter {
  id: string;
  title: string;
  date: string;
  period: string;
  excerpt: string;
  body: string;
  author: string;
  type: "quarterly" | "annual" | "special";
  pdfUrl?: string;
}

export type IOIPayload = {
  company: string;
  side?: "buy" | "sell";  // context only (pre-filled for secondary market)
  name: string;
  email: string;
  phone: string;
  accredited: boolean;
};

// ─── Investor Holdings ────────────────────────────────────────────────────────
//
// All investors share a single type. Holdings are a list of positions, each of
// which can be one of three classes:
//
//   equity      – direct shares in a portfolio company
//   lp_units    – LP interest in Co-Owner Fund LP (the fund is just another entity)
//   debt        – any credit instrument (convertible note, SAFE, term loan, etc.)
//                 in either a portfolio company or the fund
//
// This means "Co-Owner Fund LP" is not special — it's simply the entityId
// "co-owner-fund" that may appear in lp_units or debt holdings, the same way
// a portco id appears in equity or debt holdings.

export interface EquityHolding {
  class: "equity";
  entityId: string;         // portfolio company id
  shares: number;
}

export interface LPHolding {
  class: "lp_units";
  entityId: "co-owner-fund";
  lpPct: number;            // percentage of the fund (e.g. 12.5 means 12.5%)
  units?: number;           // face unit count if tracked separately
}

export interface DebtHolding {
  class: "debt";
  entityId: string;         // portfolio company id OR "co-owner-fund"
  instrument: string;       // e.g. "Convertible Note", "SAFE", "Term Loan", "Line of Credit"
  principal: number;        // original principal / face value
  interestRate?: number;    // annual %, e.g. 8 means 8%
  maturityDate?: string;    // ISO date string
  currentValue: number;     // principal + accrued interest, or marked fair value
  convertible?: boolean;    // true if instrument converts to equity
  conversionCap?: number;   // valuation cap for conversion
  notes?: string;           // free-text e.g. conversion terms
}

export interface OptionHolding {
  class: "option";
  entityId: string;         // portfolio company id
  shares: number;           // number of shares optionable
  strikePrice: number;      // exercise price per share ($)
  notes?: string;
}

export type Holding = EquityHolding | LPHolding | DebtHolding | OptionHolding;

export interface Investor {
  id: string;
  name: string;
  holdings: Holding[];
}

export interface CashPosition {
  id: string;
  name: string;             // e.g. "Mercury Operating", "US T-Bills"
  institution: string;      // e.g. "Mercury", "Fidelity"
  type: "Checking" | "Savings" | "Money Market" | "T-Bills" | "Other";
  balance: number;          // current balance ($)
  yieldPct?: number;        // annual yield %, if interest-bearing
  asOf?: string;            // e.g. "Apr 2026"
  notes?: string;
}
