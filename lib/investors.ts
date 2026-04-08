import type { Investor } from "./types";

// ─── Investors ────────────────────────────────────────────────────────────────
//
// Holdings can be any mix of:
//   equity    – direct shares in a portfolio company  (value = shares × impliedValuation/totalShares)
//   lp_units  – LP interest in Co-Owner Fund, LP      (value = lpPct/100 × fund.nav)
//   debt      – credit instrument in a portco or fund (value = currentValue as marked)
//
// Share counts sourced from Pulley cap table export (secondary transfers from founders).

export const investors: Investor[] = [
  {
    id: "neil-wolfson",
    name: "Neil Wolfson",
    holdings: [
      { class: "equity", entityId: "audily",         shares: 2_749_945 },
      { class: "equity", entityId: "falconer",       shares: 2_706_173 },
      { class: "equity", entityId: "certd",          shares: 1_838_246 },
      { class: "equity", entityId: "merchant-boxes", shares: 2_745_343 },
      { class: "equity", entityId: "sbr2th",         shares: 1_855_904 },
    ],
  },
  {
    id: "nathaniel-deily",
    name: "Nathaniel Deily",
    holdings: [
      { class: "equity", entityId: "audily",         shares: 4_812_403 },
      { class: "equity", entityId: "falconer",       shares: 4_735_803 },
      { class: "equity", entityId: "certd",          shares: 3_216_930 },
      { class: "equity", entityId: "merchant-boxes", shares: 4_804_351 },
      { class: "equity", entityId: "sbr2th",         shares: 3_247_832 },
    ],
  },
  {
    id: "sanford-leeds",
    name: "Sanford Leeds",
    holdings: [
      { class: "equity", entityId: "audily",         shares: 1_409_347 },
      { class: "equity", entityId: "falconer",       shares: 1_386_914 },
      { class: "equity", entityId: "certd",          shares: 942_101 },
      { class: "equity", entityId: "merchant-boxes", shares: 1_406_988 },
      { class: "equity", entityId: "sbr2th",         shares: 951_151 },
    ],
  },
  {
    id: "garry-bledsoe",
    name: "Garry Bledsoe",
    holdings: [
      { class: "equity", entityId: "audily",         shares: 166_667 },
      { class: "equity", entityId: "falconer",       shares: 444_445 },
      { class: "equity", entityId: "certd",          shares: 444_445 },
      { class: "equity", entityId: "merchant-boxes", shares: 222_222 },
      { class: "equity", entityId: "sbr2th",         shares: 333_334 },
    ],
  },
  {
    id: "jay-heller",
    name: "Jay Heller",
    holdings: [
      { class: "equity", entityId: "audily",         shares: 1_374_972 },
      { class: "equity", entityId: "falconer",       shares: 1_353_087 },
      { class: "equity", entityId: "certd",          shares: 919_123 },
      { class: "equity", entityId: "merchant-boxes", shares: 1_372_672 },
      { class: "equity", entityId: "sbr2th",         shares: 927_952 },
    ],
  },
  {
    id: "edward-ladd",
    name: "Edward Ladd",
    holdings: [
      { class: "equity", entityId: "audily",         shares: 1_374_972 },
      { class: "equity", entityId: "falconer",       shares: 1_353_087 },
      { class: "equity", entityId: "certd",          shares: 919_123 },
      { class: "equity", entityId: "merchant-boxes", shares: 1_372_672 },
      { class: "equity", entityId: "sbr2th",         shares: 927_952 },
    ],
  },
  {
    id: "steven-maasch",
    name: "Steven Maasch",
    holdings: [
      { class: "equity", entityId: "audily",         shares: 1_374_972 },
      { class: "equity", entityId: "falconer",       shares: 1_353_087 },
      { class: "equity", entityId: "certd",          shares: 919_123 },
      { class: "equity", entityId: "merchant-boxes", shares: 1_372_672 },
      { class: "equity", entityId: "sbr2th",         shares: 927_952 },
    ],
  },

  // ── LP example ──────────────────────────────────────────────────────────────
  // Fund LP interests — value = lpPct/100 × fund.nav
  // lpPct and units to be confirmed from fund records
  {
    id: "lp-example",
    name: "LP Investor (Example)",
    holdings: [
      {
        class: "lp_units",
        entityId: "co-owner-fund",
        lpPct: 10,            // 10% of Co-Owner Fund, LP
        units: 100_000,
      },
    ],
  },

  // ── Debt example ────────────────────────────────────────────────────────────
  // Convertible note in a portco; debt in the fund; etc.
  // currentValue = principal + accrued interest as of reporting date
  {
    id: "debt-example",
    name: "Debt Holder (Example)",
    holdings: [
      {
        class: "debt",
        entityId: "falconer",
        instrument: "Convertible Note",
        principal: 250_000,
        interestRate: 6,
        maturityDate: "2027-06-01",
        currentValue: 265_000,
        convertible: true,
        conversionCap: 12_000_000,
      },
      {
        class: "debt",
        entityId: "co-owner-fund",
        instrument: "Term Loan",
        principal: 500_000,
        interestRate: 9,
        maturityDate: "2026-12-31",
        currentValue: 518_750,
        convertible: false,
      },
    ],
  },
];
