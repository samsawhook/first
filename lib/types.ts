export interface PortfolioCompany {
  id: string;
  name: string;
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
  website?: string;
  logoUrl?: string;
  accentColor: string;
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
}

export type IOIPayload = {
  company: string;
  side: "buy" | "sell";
  amount: string;
  impliedValuation: string;
  name: string;
  email: string;
  phone: string;
  accredited: boolean;
  notes: string;
};

// ─── Investor Holdings ────────────────────────────────────────────────────────
//
// All investors share a single type. Holdings are a list of positions, each of
// which can be one of three classes:
//
//   equity      – direct shares in a portfolio company
//   lp_units    – LP interest in Co-Owner Fund, LP (the fund is just another entity)
//   debt        – any credit instrument (convertible note, SAFE, term loan, etc.)
//                 in either a portfolio company or the fund
//
// This means "Co-Owner Fund, LP" is not special — it's simply the entityId
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
}

export type Holding = EquityHolding | LPHolding | DebtHolding;

export interface Investor {
  id: string;
  name: string;
  holdings: Holding[];
}
