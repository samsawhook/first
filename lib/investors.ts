import type { Investor } from "./types";

// ─── Investors ────────────────────────────────────────────────────────────────
export const investors: Investor[] = [
  {
    id: "co-owner-fund",
    name: "Co-Owner Fund LP",
    holdings: [
      { class: "equity", entityId: "audily",         shares: 16_537_717 },
      { class: "debt",   entityId: "audily",         instrument: "Preferred", principal: 115_000, interestRate: 13.4, currentValue: 134_700, convertible: true, notes: "1,150 Series A Preferred shares. Converts to Class A Common 1:1,000." },
      { class: "option", entityId: "audily",         shares: 15_000_000, strikePrice: 0.01, notes: "Option to purchase 15,000,000 Class A Common Shares at $0.01/share." },
      { class: "equity", entityId: "certd",          shares: 4_350_663 },
      { class: "equity", entityId: "falconer",       shares: 7_023_990 },
      { class: "equity", entityId: "merchant-boxes", shares: 6_530_527 },
      { class: "equity", entityId: "sbr2th",         shares: 4_617_214 },
    ],
  },
];

// ─── Direct Shareholders ──────────────────────────────────────────────────────
// Individuals holding positions directly in portfolio companies, outside LP.
// The portal "My Holdings" tab is visible only when a credential maps to one
// of these profiles.

export interface DirectPosition {
  category:   string;           // section label: "Purchased Equity" | "Short-term Notes" | "Earned Equity"
  issueDate:  string;           // YYYY-MM-DD
  securityType: string;         // "Class A Common", "Series A Preferred", "Short-term Note", …
  company:    string;           // display name
  companyId?: string;           // portfolio company ID (for logo / accent color)
  shares?:    number;
  perShareBasis?: number;
  costBasis:  number;           // 0 for earned / RSU
  principal?: number;           // debt: face amount
  repaid?:    number;           // debt: principal already returned to investor
  interestDividend?: number;    // interest or dividends earned
  estimatedValue: number;
  annualizedReturnPct?: number;
}

export interface DirectInvestor {
  id:            string;
  name:          string;
  investorSince: string;
  statementDate: string;
  positions:     DirectPosition[];
}

export const DIRECT_INVESTORS: DirectInvestor[] = [
  {
    id:            "palash-jillian",
    name:          "Jillian Palash",
    investorSince: "January 25, 2022",
    statementDate: "June 2, 2025",
    positions: [
      // ── Audily Purchased Equity ──────────────────────────────────────────
      { category: "Purchased Equity", issueDate: "2022-12-16", securityType: "Class A Common",        company: "Audily Inc.",         companyId: "audily",   shares: 72_850,  perShareBasis: 0.04,  costBasis: 2_914.00,   estimatedValue: 7_285.00,   annualizedReturnPct: 60.9 },
      { category: "Purchased Equity", issueDate: "2024-03-25", securityType: "SAFE → Series A",       company: "Audily Inc.",         companyId: "audily",   shares: 1_250,   perShareBasis: 80.00, costBasis: 100_000.00, estimatedValue: 125_000.00, interestDividend: 11_166.72, annualizedReturnPct: 30.4 },
      { category: "Purchased Equity", issueDate: "2024-09-06", securityType: "Series A Preferred",    company: "Audily Inc.",         companyId: "audily",   shares: 2_000,   perShareBasis: 100.00,costBasis: 200_000.00, estimatedValue: 200_000.00, interestDividend: 17_866.72, annualizedReturnPct: 12.1 },
      // ── nth Venture Equity ───────────────────────────────────────────────
      { category: "Purchased Equity", issueDate: "2022-02-16", securityType: "SAFE → Series A",       company: "nth Venture Inc.",    companyId: "nth-venture", shares: 200_000, perShareBasis: 10.00, costBasis: 20_000.00,  estimatedValue: 20_000.00,  annualizedReturnPct: 0.0 },
      { category: "Purchased Equity", issueDate: "2023-06-01", securityType: "Convertible Notes",     company: "nth Venture Inc.",    companyId: "nth-venture",                    costBasis: 150_000.00, estimatedValue: 150_000.00, interestDividend: 33_000.00, annualizedReturnPct: 11.0 },
      // ── Cohort 2 Commissioning ───────────────────────────────────────────
      { category: "Purchased Equity", issueDate: "2022-08-28", securityType: "Class A Common",        company: "SBR2TH Recruiting Inc.", companyId: "sbr2th", shares: 2_500_000, perShareBasis: 0.005, costBasis: 12_500.00, estimatedValue: 75_000.00,   annualizedReturnPct: 181.2 },
      { category: "Purchased Equity", issueDate: "2022-10-28", securityType: "Class A Common",        company: "SBR2TH Recruiting Inc.", companyId: "sbr2th", shares: 250_000,   perShareBasis: 0.01,  costBasis: 2_500.00,  estimatedValue: 7_500.00,    annualizedReturnPct: 76.9 },
      { category: "Purchased Equity", issueDate: "2022-08-28", securityType: "Class A Common",        company: "Pigeon Service Inc.", companyId: "certd",    shares: 2_500_000, perShareBasis: 0.005, costBasis: 12_500.00, estimatedValue: 0,           annualizedReturnPct: -100.0 },
      { category: "Purchased Equity", issueDate: "2022-10-28", securityType: "Class A Common",        company: "Pigeon Service Inc.", companyId: "certd",    shares: 250_000,   perShareBasis: 0.01,  costBasis: 2_500.00,  estimatedValue: 0,           annualizedReturnPct: -100.0 },
      { category: "Purchased Equity", issueDate: "2022-08-28", securityType: "Class A Common",        company: "Sentius Development Inc.", companyId: "sentius", shares: 2_500_000, perShareBasis: 0.005, costBasis: 12_500.00, estimatedValue: 25_000.00, annualizedReturnPct: 36.2 },
      { category: "Purchased Equity", issueDate: "2022-10-28", securityType: "Class A Common",        company: "Sentius Development Inc.", companyId: "sentius", shares: 250_000,   perShareBasis: 0.01,  costBasis: 2_500.00,  estimatedValue: 2_500.00,  annualizedReturnPct: 0.0 },
      { category: "Purchased Equity", issueDate: "2022-08-28", securityType: "Class A Common",        company: "Galileo Computing Inc.",        companyId: "prreact",  shares: 2_500_000, perShareBasis: 0.005, costBasis: 12_500.00, estimatedValue: 0,           annualizedReturnPct: -100.0 },
      { category: "Purchased Equity", issueDate: "2022-10-28", securityType: "Class A Common",        company: "Galileo Computing Inc.",        companyId: "prreact",  shares: 250_000,   perShareBasis: 0.01,  costBasis: 2_500.00,  estimatedValue: 0,           annualizedReturnPct: -100.0 },
      // ── Short-term Notes — Audily ────────────────────────────────────────
      // ── Short-term Notes — Audily ────────────────────────────────────────
      { category: "Short-term Notes",  issueDate: "2023-12-08", securityType: "Short-term Note", company: "Audily Inc.", companyId: "audily", principal: 10_000, repaid: 10_000, interestDividend: 977.78,   costBasis: 10_000, estimatedValue: 0, annualizedReturnPct: 56.7 },
      { category: "Short-term Notes",  issueDate: "2023-12-11", securityType: "Short-term Note", company: "Audily Inc.", companyId: "audily", principal: 10_000, repaid: 10_000, interestDividend: 977.78,   costBasis: 10_000, estimatedValue: 0, annualizedReturnPct: 59.5 },
      { category: "Short-term Notes",  issueDate: "2023-12-18", securityType: "Short-term Note", company: "Audily Inc.", companyId: "audily", principal: 10_000, repaid: 10_000, interestDividend: 977.78,   costBasis: 10_000, estimatedValue: 0, annualizedReturnPct: 67.3 },
      { category: "Short-term Notes",  issueDate: "2024-08-01", securityType: "Short-term Note", company: "Audily Inc.", companyId: "audily", principal: 30_000, repaid: 30_000, interestDividend: 396.00,   costBasis: 30_000, estimatedValue: 0, annualizedReturnPct: 17.8 },
      { category: "Short-term Notes",  issueDate: "2024-08-09", securityType: "Short-term Note", company: "Audily Inc.", companyId: "audily", principal: 170_000, repaid: 170_000, interestDividend: 2_244.00, costBasis: 170_000, estimatedValue: 0, annualizedReturnPct: 25.4 },
      { category: "Short-term Notes",  issueDate: "2025-01-03", securityType: "Short-term Note", company: "Audily Inc.", companyId: "audily", principal: 25_000, repaid: 25_000, interestDividend: 1_599.84, costBasis: 25_000, estimatedValue: 0, annualizedReturnPct: 47.7 },
      { category: "Short-term Notes",  issueDate: "2025-02-03", securityType: "Short-term Note", company: "Audily Inc.", companyId: "audily", principal: 10_000, repaid: 10_000, interestDividend: 170.15,   costBasis: 10_000, estimatedValue: 0, annualizedReturnPct: 621.1 },
      { category: "Short-term Notes",  issueDate: "2025-02-03", securityType: "Short-term Note", company: "Audily Inc.", companyId: "audily", principal: 57_000, repaid: 57_000, interestDividend: 29.85,    costBasis: 57_000, estimatedValue: 0, annualizedReturnPct: 19.1 },
      { category: "Short-term Notes",  issueDate: "2025-04-03", securityType: "Short-term Note", company: "Audily Inc.", companyId: "audily", principal: 30_000, repaid: 30_000, interestDividend: 1_142.86, costBasis: 30_000, estimatedValue: 0, annualizedReturnPct: 126.4 },
      // ── Short-term Notes — nth Venture ───────────────────────────────────
      { category: "Short-term Notes",  issueDate: "2023-02-01", securityType: "Short-term Note", company: "nth Venture Inc.", companyId: "nth-venture", principal: 10_000, repaid: 10_000, interestDividend: 484.81, costBasis: 10_000, estimatedValue: 0, annualizedReturnPct: 10.0 },
      // ── Earned Equity ────────────────────────────────────────────────────
      { category: "Earned Equity", issueDate: "2022-01-25", securityType: "RSU",           company: "nth Venture Inc.",    companyId: "nth-venture", shares: 275_000,   costBasis: 0, estimatedValue: 1_375.00 },
      { category: "Earned Equity", issueDate: "2022-07-01", securityType: "RSU",           company: "nth Venture Inc.",    companyId: "nth-venture", shares: 275_000,   costBasis: 0, estimatedValue: 1_375.00 },
      { category: "Earned Equity", issueDate: "2023-09-29", securityType: "Class A Common", company: "Audily Inc.",         companyId: "audily",      shares: 4_606_158, costBasis: 0, estimatedValue: 460_615.80 },
      { category: "Earned Equity", issueDate: "2023-09-29", securityType: "Class A Common", company: "SBR2TH Recruiting Inc.", companyId: "sbr2th",   shares: 3_108_640, costBasis: 0, estimatedValue: 93_259.20 },
      { category: "Earned Equity", issueDate: "2023-09-29", securityType: "Class A Common", company: "Pigeon Service Inc.", companyId: "certd",       shares: 3_079_061, costBasis: 0, estimatedValue: 0 },
      { category: "Earned Equity", issueDate: "2023-09-29", securityType: "Class A Common", company: "Merchant Boxes Inc.", companyId: "merchant-boxes", shares: 4_593_450, costBasis: 0, estimatedValue: 137_803.50 },
      { category: "Earned Equity", issueDate: "2023-09-29", securityType: "Class A Common", company: "Falconer Inc.",       companyId: "falconer",    shares: 4_532_840, costBasis: 0, estimatedValue: 135_985.20 },
      { category: "Earned Equity", issueDate: "2024-05-29", securityType: "RSU",           company: "Falconer Inc.",       companyId: "falconer",    shares: 1_000_000, costBasis: 0, estimatedValue: 30_000.00 },
    ],
  },
];

export function findDirectInvestor(id: string): DirectInvestor | undefined {
  return DIRECT_INVESTORS.find(inv => inv.id === id);
}
