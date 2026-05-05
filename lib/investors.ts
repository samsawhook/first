import type { Investor } from "./types";
import { fund, LP_TOTAL_UNITS } from "./data";

// Neil's $100k LP basis (= 100k units at $1 par) marked up to current NAV/unit
// using the actual bottom-up fund NAV. Computed at module load — no fake data.
const NEIL_LP_INTEREST_BASIS = 100_000;
const NEIL_LP_INTEREST_VALUE = Math.round(
  (fund.nav / LP_TOTAL_UNITS) * NEIL_LP_INTEREST_BASIS
);

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
  rolled?:    boolean;          // debt: principal rolled into a new note (not repaid as cash)
  rolledInFromPrior?: number;   // debt: portion of this note's principal that was rolled in from prior notes (incl. capitalized interest); subtracted from "new principal invested" totals
  interestDividend?: number;    // interest or dividends earned (cash paid out)
  estimatedValue: number;
  annualizedReturnPct?: number;
  notes?: string;               // optional explanatory text rendered under the row
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
      { category: "Purchased Equity", issueDate: "2022-08-28", securityType: "Class A Common",        company: "Galileo Computing Inc.",        companyId: "galileo",  shares: 2_500_000, perShareBasis: 0.005, costBasis: 12_500.00, estimatedValue: 0,           annualizedReturnPct: -100.0 },
      { category: "Purchased Equity", issueDate: "2022-10-28", securityType: "Class A Common",        company: "Galileo Computing Inc.",        companyId: "galileo",  shares: 250_000,   perShareBasis: 0.01,  costBasis: 2_500.00,  estimatedValue: 0,           annualizedReturnPct: -100.0 },
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
      { category: "Short-term Notes",  issueDate: "2025-11-03", securityType: "Short-term Note", company: "Audily Inc.", companyId: "audily", principal: 25_000, repaid: 0, rolled: true, interestDividend: 2_187.50, costBasis: 25_000, estimatedValue: 0, annualizedReturnPct: 29.3 },
      { category: "Short-term Notes",  issueDate: "2026-02-03", securityType: "Short-term Note", company: "Audily Inc.", companyId: "audily", principal: 50_000, repaid: 25_000, interestDividend: 1_353.60, costBasis: 50_000, estimatedValue: 25_000, annualizedReturnPct: 34.1 },
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
  {
    id:            "neil-wolfson",
    name:          "Neil Wolfson",
    investorSince: "September 30, 2024",
    statementDate: "May 5, 2026",
    positions: [
      // Earned Class A Common across the 5 portfolio companies.
      { category: "Earned Equity", issueDate: "2024-09-30", securityType: "Class A Common", company: "Pigeon Service Inc.",   companyId: "certd",          shares: 1_838_246, costBasis: 0, estimatedValue: 18_382.46 },
      { category: "Earned Equity", issueDate: "2024-09-30", securityType: "Class A Common", company: "Falconer Inc.",         companyId: "falconer",       shares: 2_706_173, costBasis: 0, estimatedValue: 12_177.78 },
      { category: "Earned Equity", issueDate: "2024-09-30", securityType: "Class A Common", company: "SBR2TH Recruiting Inc.",companyId: "sbr2th",         shares: 1_855_904, costBasis: 0, estimatedValue: 19_858.17 },
      { category: "Earned Equity", issueDate: "2024-09-30", securityType: "Class A Common", company: "Merchant Boxes Inc.",   companyId: "merchant-boxes", shares: 2_745_343, costBasis: 0, estimatedValue: 78_242.28 },
      { category: "Earned Equity", issueDate: "2024-09-30", securityType: "Class A Common", company: "Audily Inc.",           companyId: "audily",         shares: 2_749_945, costBasis: 0, estimatedValue: 22_274.55 },
      // nth Venture RSUs (excluded from value totals).
      { category: "Earned Equity", issueDate: "2024-01-01", securityType: "RSU",            company: "nth Venture Inc.",                                  shares: 2_000_000, costBasis: 0, estimatedValue: 0 },
      // Audily RSUs (excluded from value totals).
      { category: "Earned Equity", issueDate: "2024-09-30", securityType: "RSU",            company: "Audily Inc.",          companyId: "audily",         shares:   500_000, costBasis: 0, estimatedValue: 0 },
      // nth Venture Series A Preferred (purchased) — 2M shares from Feb 2, 2023.
      { category: "Purchased Equity", issueDate: "2023-02-02", securityType: "Series A Preferred", company: "nth Venture Inc.",                            shares: 2_000_000, perShareBasis: 0.10, costBasis: 200_000.00, estimatedValue: 200_000.00 },
      // Audily SAFE → Series A: $50k → 625 preferreds at $80/share, converted Sept 6, 2024.
      { category: "Purchased Equity", issueDate: "2024-03-25", securityType: "SAFE → Series A", company: "Audily Inc.",        companyId: "audily",         shares: 625,       perShareBasis: 80.00, costBasis:  50_000.00, estimatedValue: 62_500.00, interestDividend: 5_583.36 },
      // Audily short-term notes — older notes that rolled forward into the 10/8/25 $100k note.
      // 2/3/25 $30k: $14,385.81 cash repaid + $15,614.19 principal rolled forward into 10/8/25.
      { category: "Short-term Notes",  issueDate: "2025-02-03", securityType: "Short-term Note", company: "Audily Inc.", companyId: "audily", principal: 30_000, repaid: 14_385.81, rolled: true, interestDividend: 2_338.83, costBasis: 30_000, estimatedValue: 0, annualizedReturnPct: 16.5,
        notes: "Partially repaid in cash; remaining $15,614.19 principal rolled into the 10/8/25 $100k note." },
      // 9/2/25 $30k: full principal rolled forward into 10/8/25.
      { category: "Short-term Notes",  issueDate: "2025-09-02", securityType: "Short-term Note", company: "Audily Inc.", companyId: "audily", principal: 30_000, repaid: 0, rolled: true, interestDividend: 0, costBasis: 30_000, estimatedValue: 0, annualizedReturnPct: 16.5,
        notes: "Entire $30,000 principal rolled into the 10/8/25 $100k note." },
      // Audily $100k note from 10/8/25.
      // Composition: $46,559.19 rolled in from prior notes ($45,614.19 outstanding principal +
      // $945.00 capitalized accrued interest from the 2/3 and 9/2 loans) + $53,440.81 new cash
      // gross-up. Balance $95,639.35 outstanding, 16.5% APR. Cash interest paid 11/7 + 12/4
      // + 12/9 = $1,375.00 + $533.82 + $811.41 = $2,720.23 (per QuickBooks).
      { category: "Short-term Notes",  issueDate: "2025-10-08", securityType: "Short-term Note", company: "Audily Inc.", companyId: "audily", principal: 100_000, repaid: 4_360.65, rolledInFromPrior: 46_559.19, interestDividend: 2_720.23, costBasis: 100_000, estimatedValue: 95_639.35, annualizedReturnPct: 16.5,
        notes: "Consolidates 2/3/25 + 9/2/25 notes: $45,614.19 rolled principal + $945.00 capitalized interest = $46,559.19, plus $53,440.81 new cash gross-up. $2,720.23 cash interest paid in Nov–Dec 2025." },
      // LP interest (new asset class). $100k LP basis marked-up to current NAV/unit
      // using actual bottom-up fund NAV (see top of file for computation).
      { category: "LP Interests", issueDate: "2024-01-01", securityType: "LP Interest", company: "Co-Owner Fund LP", companyId: "co-owner-fund", costBasis: NEIL_LP_INTEREST_BASIS, estimatedValue: NEIL_LP_INTEREST_VALUE },
    ],
  },
];

export function findDirectInvestor(id: string): DirectInvestor | undefined {
  return DIRECT_INVESTORS.find(inv => inv.id === id);
}
