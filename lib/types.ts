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
