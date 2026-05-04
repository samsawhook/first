import type { Investor } from "./types";

// ─── Investors ────────────────────────────────────────────────────────────────
//
// Holdings reflect the fund's actual registered positions as of the cap tables.
// Preferred shares are modelled as debt (they carry a yield and a conversion feature).
// Options are modelled as their own class with shares + strikePrice.
//
// Accrued value on the Audily Series A Preferred:
//   13.4% cumulative on $115,000 face, beginning 12/31/24.
//   As of April 2026 ≈ 15.3 months → ~$19,700 accrued → currentValue ~$134,700.

export const investors: Investor[] = [
  {
    id: "co-owner-fund",
    name: "Co-Owner Fund LP",
    holdings: [
      // ── Audily Inc. ─────────────────────────────────────────────────────────
      {
        class: "equity",
        entityId: "audily",
        shares: 16_537_717,   // Class A Common; 31.20% voting stock
      },
      {
        class: "debt",
        entityId: "audily",
        instrument: "Preferred",          // convertible — see audily-pref-a in debtPositions
        principal: 115_000,               // $100 face × 1,150 shares
        interestRate: 13.4,               // cumulative yield beginning 12/31/24
        currentValue: 134_700,            // principal + ~15 months accrued
        convertible: true,
        notes: "1,150 Series A Preferred shares. Converts to Class A Common 1:1,000 (1,150,000 shares if fully converted).",
      },
      {
        class: "option",
        entityId: "audily",
        shares: 15_000_000,   // Class A Common
        strikePrice: 0.01,
        notes: "Option to purchase 15,000,000 Class A Common Shares at $0.01/share.",
      },

      // ── CERTD Inc. (dba Pigeon Service) ──────────────────────────────────
      {
        class: "equity",
        entityId: "certd",
        shares: 4_350_663,    // Class A Common
      },

      // ── Falconer Inc. (dba nth Corporation) ───────────────────────────────
      {
        class: "equity",
        entityId: "falconer",
        shares: 7_023_990,    // Class A Common
      },

      // ── Merchant Boxes Inc. ───────────────────────────────────────────────
      {
        class: "equity",
        entityId: "merchant-boxes",
        shares: 6_530_527,    // Class A Common
      },

      // ── SBR2TH Recruiting Inc. ────────────────────────────────────────────
      {
        class: "equity",
        entityId: "sbr2th",
        shares: 4_617_214,    // Class A Common
      },
    ],
  },
];

// ─── Direct Shareholders ──────────────────────────────────────────────────────
// Individuals who hold common shares directly in portfolio companies, outside
// of the fund LP structure. The portal's Direct Holdings tab is only shown when
// a login credential maps to one of these profiles.

export interface DirectHolding {
  companyId: string;
  shares: number;
  costBasisPerShare: number;  // price paid per share at time of investment
  acquisitionDate: string;    // display string, e.g. "Jun 2023"
  notes?: string;
}

export interface DirectInvestor {
  id: string;
  name: string;
  holdings: DirectHolding[];
}

export const DIRECT_INVESTORS: DirectInvestor[] = [
  {
    id: "palash-jillian",
    name: "Jillian Palash",
    holdings: [
      {
        companyId: "audily",
        shares: 2_500_000,
        costBasisPerShare: 0.004,
        acquisitionDate: "Jun 2023",
        notes: "Common shares — founding investor round",
      },
      {
        companyId: "merchant-boxes",
        shares: 500_000,
        costBasisPerShare: 0.020,
        acquisitionDate: "Nov 2023",
        notes: "Common shares",
      },
    ],
  },
];

export function findDirectInvestor(id: string): DirectInvestor | undefined {
  return DIRECT_INVESTORS.find(inv => inv.id === id);
}
