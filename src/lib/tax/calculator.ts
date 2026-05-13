/**
 * Federal tax engine — drives "what-if" math inside the Scenario Workspace.
 *
 * Numbers come from the authoritative US sources:
 *   2024 — IRS Rev. Proc. 2023-34
 *   2025 — IRS Rev. Proc. 2024-40 + OBBBA §70102 (signed July 2025) which
 *          retroactively raised the standard-deduction floor for TY2025
 *   2026 — IRS Rev. Proc. 2025-32 (released Oct 2025)
 *          SS wage base from SSA cbb.html (Oct 2025)
 *   2027 — PROJECTED (IRS will release Rev. Proc. for TY2027 around Oct 2026).
 *          Values here are inflation-extrapolated from 2026 (~2.5%) and the
 *          UI clearly flags them as projected.
 *
 * What this engine models:
 *   - Federal income tax (ordinary brackets per filing status)
 *   - Standard deduction
 *   - Self-employment tax (Social Security cap + Medicare; the additional
 *     0.9% Medicare surtax above thresholds is excluded for clarity)
 *   - QBI deduction (Section 199A) at a simplified 20% of qualified income
 *
 * Pure functions; safe to use in React / SSR / tests without side effects.
 */

export type FilingStatus =
  | 'single'
  | 'married_filing_jointly'
  | 'married_filing_separately'
  | 'head_of_household';

export type TaxYear = 2024 | 2025 | 2026 | 2027;

export const SUPPORTED_TAX_YEARS: TaxYear[] = [2024, 2025, 2026, 2027];

/** The default tax year for new scenarios — picks the current calendar year
 *  if we have data for it, otherwise falls back to the latest known year. */
export const DEFAULT_TAX_YEAR: TaxYear = (() => {
  const current = new Date().getFullYear();
  if (current >= 2027) return 2027;
  if (current === 2026) return 2026;
  if (current === 2025) return 2025;
  return 2024;
})();

/** Years for which the IRS has published final figures vs years we're
 *  extrapolating until the corresponding Rev. Proc. is released. */
export const TAX_YEAR_IS_PROJECTED: Record<TaxYear, boolean> = {
  2024: false,
  2025: false,
  2026: false,
  2027: true,
};

interface Bracket {
  /** Top of this bracket; null means "and above". */
  upTo: number | null;
  /** Marginal rate as a decimal (0.22 = 22%). */
  rate: number;
}

interface YearData {
  standardDeduction: Record<FilingStatus, number>;
  brackets: Record<FilingStatus, Bracket[]>;
  ssWageBase: number;
  ssRate: number;
  medicareRate: number;
  seIncomeFactor: number;
}

// ─── 2024 — Rev. Proc. 2023-34 (final) ─────────────────────────────────────

const Y2024: YearData = {
  standardDeduction: {
    single: 14600,
    married_filing_jointly: 29200,
    married_filing_separately: 14600,
    head_of_household: 21900,
  },
  brackets: {
    single: [
      { upTo: 11600, rate: 0.1 },
      { upTo: 47150, rate: 0.12 },
      { upTo: 100525, rate: 0.22 },
      { upTo: 191950, rate: 0.24 },
      { upTo: 243725, rate: 0.32 },
      { upTo: 609350, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
    married_filing_jointly: [
      { upTo: 23200, rate: 0.1 },
      { upTo: 94300, rate: 0.12 },
      { upTo: 201050, rate: 0.22 },
      { upTo: 383900, rate: 0.24 },
      { upTo: 487450, rate: 0.32 },
      { upTo: 731200, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
    married_filing_separately: [
      { upTo: 11600, rate: 0.1 },
      { upTo: 47150, rate: 0.12 },
      { upTo: 100525, rate: 0.22 },
      { upTo: 191950, rate: 0.24 },
      { upTo: 243725, rate: 0.32 },
      { upTo: 365600, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
    head_of_household: [
      { upTo: 16550, rate: 0.1 },
      { upTo: 63100, rate: 0.12 },
      { upTo: 100500, rate: 0.22 },
      { upTo: 191950, rate: 0.24 },
      { upTo: 243700, rate: 0.32 },
      { upTo: 609350, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
  },
  ssWageBase: 168600,
  ssRate: 0.124,
  medicareRate: 0.029,
  seIncomeFactor: 0.9235,
};

// ─── 2025 — Rev. Proc. 2024-40 + OBBBA §70102 retroactive boost ────────────
// Standard deduction floors set by the One Big Beautiful Bill Act (signed
// July 2025) apply retroactively to TY2025: §63(c)(7) as amended makes the
// 2017 TCJA increases permanent AND raises the base amounts. Bracket
// thresholds were unchanged by OBBBA.

const Y2025: YearData = {
  standardDeduction: {
    single: 15750,
    married_filing_jointly: 31500,
    married_filing_separately: 15750,
    head_of_household: 23625,
  },
  brackets: {
    single: [
      { upTo: 11925, rate: 0.1 },
      { upTo: 48475, rate: 0.12 },
      { upTo: 103350, rate: 0.22 },
      { upTo: 197300, rate: 0.24 },
      { upTo: 250525, rate: 0.32 },
      { upTo: 626350, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
    married_filing_jointly: [
      { upTo: 23850, rate: 0.1 },
      { upTo: 96950, rate: 0.12 },
      { upTo: 206700, rate: 0.22 },
      { upTo: 394600, rate: 0.24 },
      { upTo: 501050, rate: 0.32 },
      { upTo: 751600, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
    married_filing_separately: [
      { upTo: 11925, rate: 0.1 },
      { upTo: 48475, rate: 0.12 },
      { upTo: 103350, rate: 0.22 },
      { upTo: 197300, rate: 0.24 },
      { upTo: 250525, rate: 0.32 },
      { upTo: 375800, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
    head_of_household: [
      { upTo: 17000, rate: 0.1 },
      { upTo: 64850, rate: 0.12 },
      { upTo: 103350, rate: 0.22 },
      { upTo: 197300, rate: 0.24 },
      { upTo: 250500, rate: 0.32 },
      { upTo: 626350, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
  },
  ssWageBase: 176100,
  ssRate: 0.124,
  medicareRate: 0.029,
  seIncomeFactor: 0.9235,
};

// ─── 2026 — Rev. Proc. 2025-32 (final) ─────────────────────────────────────
// Source: https://www.irs.gov/pub/irs-drop/rp-25-32.pdf
// SS wage base: https://www.ssa.gov/oact/cola/cbb.html ($184,500)

const Y2026: YearData = {
  standardDeduction: {
    single: 16100,
    married_filing_jointly: 32200,
    married_filing_separately: 16100,
    head_of_household: 24150,
  },
  brackets: {
    single: [
      { upTo: 12400, rate: 0.1 },
      { upTo: 50400, rate: 0.12 },
      { upTo: 105700, rate: 0.22 },
      { upTo: 201775, rate: 0.24 },
      { upTo: 256225, rate: 0.32 },
      { upTo: 640600, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
    married_filing_jointly: [
      { upTo: 24800, rate: 0.1 },
      { upTo: 100800, rate: 0.12 },
      { upTo: 211400, rate: 0.22 },
      { upTo: 403550, rate: 0.24 },
      { upTo: 512450, rate: 0.32 },
      { upTo: 768700, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
    married_filing_separately: [
      { upTo: 12400, rate: 0.1 },
      { upTo: 50400, rate: 0.12 },
      { upTo: 105700, rate: 0.22 },
      { upTo: 201775, rate: 0.24 },
      { upTo: 256225, rate: 0.32 },
      { upTo: 384350, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
    head_of_household: [
      { upTo: 17700, rate: 0.1 },
      { upTo: 67450, rate: 0.12 },
      { upTo: 105700, rate: 0.22 },
      { upTo: 201750, rate: 0.24 },
      { upTo: 256200, rate: 0.32 },
      { upTo: 640600, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
  },
  ssWageBase: 184500,
  ssRate: 0.124,
  medicareRate: 0.029,
  seIncomeFactor: 0.9235,
};

// ─── 2027 — PROJECTED (IRS publishes around Oct 2026) ──────────────────────
// Inflation-extrapolated from 2026 at ~2.5%. Replace with final values from
// Rev. Proc. 2026-XX when published. The UI shows an amber projection notice
// whenever this year is selected.

const Y2027: YearData = {
  standardDeduction: {
    single: 16500,
    married_filing_jointly: 33000,
    married_filing_separately: 16500,
    head_of_household: 24750,
  },
  brackets: {
    single: [
      { upTo: 12710, rate: 0.1 },
      { upTo: 51660, rate: 0.12 },
      { upTo: 108343, rate: 0.22 },
      { upTo: 206819, rate: 0.24 },
      { upTo: 262631, rate: 0.32 },
      { upTo: 656615, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
    married_filing_jointly: [
      { upTo: 25420, rate: 0.1 },
      { upTo: 103320, rate: 0.12 },
      { upTo: 216685, rate: 0.22 },
      { upTo: 413639, rate: 0.24 },
      { upTo: 525261, rate: 0.32 },
      { upTo: 787918, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
    married_filing_separately: [
      { upTo: 12710, rate: 0.1 },
      { upTo: 51660, rate: 0.12 },
      { upTo: 108343, rate: 0.22 },
      { upTo: 206819, rate: 0.24 },
      { upTo: 262631, rate: 0.32 },
      { upTo: 393959, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
    head_of_household: [
      { upTo: 18143, rate: 0.1 },
      { upTo: 69136, rate: 0.12 },
      { upTo: 108343, rate: 0.22 },
      { upTo: 206794, rate: 0.24 },
      { upTo: 262605, rate: 0.32 },
      { upTo: 656615, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
  },
  ssWageBase: 189100,
  ssRate: 0.124,
  medicareRate: 0.029,
  seIncomeFactor: 0.9235,
};

const TAX_YEAR_DATA: Record<TaxYear, YearData> = {
  2024: Y2024,
  2025: Y2025,
  2026: Y2026,
  2027: Y2027,
};

// ─── State income tax (top marginal rate approximation) ────────────────────
// Reasonable simplification for the strategist tooling: most ARIEX target
// clients are high-income, so the top marginal state rate is the right
// number to use against AGI. Brackets are not modeled per state.
//
// Rates reflect statutes in effect as of early 2026; verify per-state for
// edge cases (esp. NY/CA mental-health surtaxes, MA millionaire tax, etc.).

export type UsState =
  | 'none' | 'AL' | 'AK' | 'AZ' | 'AR' | 'CA' | 'CO' | 'CT' | 'DE' | 'DC' | 'FL'
  | 'GA' | 'HI' | 'ID' | 'IL' | 'IN' | 'IA' | 'KS' | 'KY' | 'LA' | 'ME' | 'MD'
  | 'MA' | 'MI' | 'MN' | 'MS' | 'MO' | 'MT' | 'NE' | 'NV' | 'NH' | 'NJ' | 'NM'
  | 'NY' | 'NC' | 'ND' | 'OH' | 'OK' | 'OR' | 'PA' | 'RI' | 'SC' | 'SD' | 'TN'
  | 'TX' | 'UT' | 'VT' | 'VA' | 'WA' | 'WV' | 'WI' | 'WY';

export interface StateInfo {
  name: string;
  /** Top marginal individual income tax rate, decimal (e.g. 0.133 = 13.3%). */
  topMarginalRate: number;
  /** True for states with no state income tax (full pass-through). */
  noTax?: boolean;
  /** Optional note shown next to the state in the UI. */
  note?: string;
}

export const STATE_TAX: Record<UsState, StateInfo> = {
  none: { name: 'No state selected', topMarginalRate: 0, noTax: true },
  AL: { name: 'Alabama',       topMarginalRate: 0.05 },
  AK: { name: 'Alaska',        topMarginalRate: 0,    noTax: true },
  AZ: { name: 'Arizona',       topMarginalRate: 0.025, note: 'Flat rate' },
  AR: { name: 'Arkansas',      topMarginalRate: 0.039 },
  CA: { name: 'California',    topMarginalRate: 0.133, note: 'Top 13.3% (incl. 1% mental-health surtax above $1M)' },
  CO: { name: 'Colorado',      topMarginalRate: 0.044, note: 'Flat rate' },
  CT: { name: 'Connecticut',   topMarginalRate: 0.0699 },
  DE: { name: 'Delaware',      topMarginalRate: 0.066 },
  DC: { name: 'District of Columbia', topMarginalRate: 0.1075 },
  FL: { name: 'Florida',       topMarginalRate: 0, noTax: true },
  GA: { name: 'Georgia',       topMarginalRate: 0.0539, note: 'Flat rate (2024+)' },
  HI: { name: 'Hawaii',        topMarginalRate: 0.11 },
  ID: { name: 'Idaho',         topMarginalRate: 0.058, note: 'Flat rate' },
  IL: { name: 'Illinois',      topMarginalRate: 0.0495, note: 'Flat rate' },
  IN: { name: 'Indiana',       topMarginalRate: 0.0305, note: 'Flat rate' },
  IA: { name: 'Iowa',          topMarginalRate: 0.038, note: '3.8% flat rate (2025+)' },
  KS: { name: 'Kansas',        topMarginalRate: 0.057 },
  KY: { name: 'Kentucky',      topMarginalRate: 0.04, note: 'Flat rate' },
  LA: { name: 'Louisiana',     topMarginalRate: 0.0425 },
  ME: { name: 'Maine',         topMarginalRate: 0.0715 },
  MD: { name: 'Maryland',      topMarginalRate: 0.0575 },
  MA: { name: 'Massachusetts', topMarginalRate: 0.09, note: '5% + 4% surtax above $1M' },
  MI: { name: 'Michigan',      topMarginalRate: 0.0425, note: 'Flat rate' },
  MN: { name: 'Minnesota',     topMarginalRate: 0.0985 },
  MS: { name: 'Mississippi',   topMarginalRate: 0.044, note: 'Flat rate' },
  MO: { name: 'Missouri',      topMarginalRate: 0.048 },
  MT: { name: 'Montana',       topMarginalRate: 0.059 },
  NE: { name: 'Nebraska',      topMarginalRate: 0.052 },
  NV: { name: 'Nevada',        topMarginalRate: 0, noTax: true },
  NH: { name: 'New Hampshire', topMarginalRate: 0, noTax: true, note: 'No wage tax; interest/dividends taxed separately' },
  NJ: { name: 'New Jersey',    topMarginalRate: 0.1075 },
  NM: { name: 'New Mexico',    topMarginalRate: 0.059 },
  NY: { name: 'New York',      topMarginalRate: 0.109, note: 'Top 10.9% — does not include NYC/Yonkers add-ons' },
  NC: { name: 'North Carolina',topMarginalRate: 0.0425, note: 'Flat rate' },
  ND: { name: 'North Dakota',  topMarginalRate: 0.025 },
  OH: { name: 'Ohio',          topMarginalRate: 0.035 },
  OK: { name: 'Oklahoma',      topMarginalRate: 0.0475 },
  OR: { name: 'Oregon',        topMarginalRate: 0.099 },
  PA: { name: 'Pennsylvania',  topMarginalRate: 0.0307, note: 'Flat rate' },
  RI: { name: 'Rhode Island',  topMarginalRate: 0.0599 },
  SC: { name: 'South Carolina',topMarginalRate: 0.062 },
  SD: { name: 'South Dakota',  topMarginalRate: 0, noTax: true },
  TN: { name: 'Tennessee',     topMarginalRate: 0, noTax: true },
  TX: { name: 'Texas',         topMarginalRate: 0, noTax: true },
  UT: { name: 'Utah',          topMarginalRate: 0.0455, note: 'Flat rate' },
  VT: { name: 'Vermont',       topMarginalRate: 0.0875 },
  VA: { name: 'Virginia',      topMarginalRate: 0.0575 },
  WA: { name: 'Washington',    topMarginalRate: 0, noTax: true, note: 'No wage tax; 7% LTCG tax above $250k' },
  WV: { name: 'West Virginia', topMarginalRate: 0.048 },
  WI: { name: 'Wisconsin',     topMarginalRate: 0.0765 },
  WY: { name: 'Wyoming',       topMarginalRate: 0, noTax: true },
};

export const US_STATES: UsState[] = Object.keys(STATE_TAX) as UsState[];

// ─── Surtax thresholds (NIIT + Additional Medicare) ────────────────────────
// Statutory, NOT inflation-adjusted (locked in by IRC §1411 and §3101(b)(2)).

const NIIT_RATE = 0.038;
const ADDL_MEDICARE_RATE = 0.009;

const SURTAX_THRESHOLDS: Record<FilingStatus, number> = {
  single: 200000,
  married_filing_jointly: 250000,
  married_filing_separately: 125000,
  head_of_household: 200000,
};

/** Resolve a year to its constants. Falls back to the default year if the
 *  requested year isn't in the table (e.g., a stale persisted scenario). */
function dataFor(year: TaxYear | undefined): YearData {
  if (year && TAX_YEAR_DATA[year]) return TAX_YEAR_DATA[year];
  return TAX_YEAR_DATA[DEFAULT_TAX_YEAR];
}

// ─── Core math ─────────────────────────────────────────────────────────────

export function computeFederalTax(
  taxableIncome: number,
  filingStatus: FilingStatus,
  year: TaxYear = DEFAULT_TAX_YEAR
): number {
  if (taxableIncome <= 0) return 0;
  const brackets = dataFor(year).brackets[filingStatus];
  let tax = 0;
  let previousCap = 0;
  for (const bracket of brackets) {
    const cap = bracket.upTo ?? Infinity;
    const slab = Math.max(0, Math.min(taxableIncome, cap) - previousCap);
    tax += slab * bracket.rate;
    if (taxableIncome <= cap) break;
    previousCap = cap;
  }
  return Math.round(tax);
}

export function computeMarginalRate(
  taxableIncome: number,
  filingStatus: FilingStatus,
  year: TaxYear = DEFAULT_TAX_YEAR
): number {
  if (taxableIncome <= 0) return 0;
  const brackets = dataFor(year).brackets[filingStatus];
  for (const bracket of brackets) {
    const cap = bracket.upTo ?? Infinity;
    if (taxableIncome <= cap) return bracket.rate;
  }
  return brackets[brackets.length - 1].rate;
}

export function computeSelfEmploymentTax(
  seNetEarnings: number,
  year: TaxYear = DEFAULT_TAX_YEAR
): number {
  if (seNetEarnings <= 0) return 0;
  const d = dataFor(year);
  const taxable = seNetEarnings * d.seIncomeFactor;
  const ssPortion = Math.min(taxable, d.ssWageBase) * d.ssRate;
  const medicarePortion = taxable * d.medicareRate;
  return Math.round(ssPortion + medicarePortion);
}

// ─── High-level scenario inputs / outputs ──────────────────────────────────

export interface ScenarioInputs {
  filingStatus: FilingStatus;
  /** W-2 wages received as an employee. */
  wages: number;
  /** Net self-employment / pass-through business income BEFORE adjustments. */
  selfEmploymentIncome: number;
  /** Other ordinary income (interest, ordinary dividends, etc.). */
  otherIncome: number;
  /** Tax year for which to run the math. Falls back to DEFAULT_TAX_YEAR. */
  year?: TaxYear;
  /** US state for state income tax. Falls back to 'none'. */
  state?: UsState;
}

export interface TaxResult {
  grossIncome: number;
  /** AGI minus standard deduction minus QBI deduction. */
  taxableIncome: number;
  federalIncomeTax: number;
  selfEmploymentTax: number;
  qbiDeduction: number;
  /** State income tax (top-marginal-rate approximation). */
  stateTax: number;
  /** Net Investment Income Tax (3.8%) — surtax on investment income above threshold. */
  niit: number;
  /** Additional Medicare 0.9% surtax on wages + SE income above threshold. */
  additionalMedicare: number;
  /** Sum of federal + SE + state + NIIT + addl Medicare. */
  totalTax: number;
  /** Total tax / gross income, 0–1. */
  effectiveRate: number;
  marginalRate: number;
  takeHome: number;
  /** The year actually used for this computation (resolved). */
  year: TaxYear;
  /** The state used (may be 'none'). */
  state: UsState;
}

/**
 * Compute the full tax picture for a scenario. Honors the standard deduction,
 * QBI deduction, SE tax, state income tax (top-marginal approximation),
 * NIIT, and the Additional Medicare 0.9% surtax. Half of SE tax is
 * deductible above the line.
 */
export function computeTax(inputs: ScenarioInputs): TaxResult {
  const year: TaxYear =
    inputs.year && TAX_YEAR_DATA[inputs.year] ? inputs.year : DEFAULT_TAX_YEAR;
  const yearData = dataFor(year);
  const state: UsState = inputs.state && STATE_TAX[inputs.state] ? inputs.state : 'none';
  const stateInfo = STATE_TAX[state];

  const wages = Math.max(0, inputs.wages);
  const seIncome = Math.max(0, inputs.selfEmploymentIncome);
  const otherIncome = Math.max(0, inputs.otherIncome);

  const seTax = computeSelfEmploymentTax(seIncome, year);
  const halfSeDeductible = Math.round(seTax / 2);

  // Simplified QBI: 20% of self-employment / pass-through income.
  // Real Section 199A has phaseouts, SSTB rules, W-2 wage limits — out of
  // scope for this tool; flagged in the UI as an assumption.
  const qbiDeduction = Math.round(seIncome * 0.2);

  const grossIncome = wages + seIncome + otherIncome;
  const adjustedGrossIncome = grossIncome - halfSeDeductible;
  const taxableIncome = Math.max(
    0,
    adjustedGrossIncome - yearData.standardDeduction[inputs.filingStatus] - qbiDeduction
  );

  const federalIncomeTax = computeFederalTax(taxableIncome, inputs.filingStatus, year);

  // State income tax: approximate at top marginal rate × AGI. Most states use
  // AGI-derived measures and the strategist's target client is in the top
  // bracket anyway. Documented in the UI as an approximation.
  const stateTax = stateInfo.noTax
    ? 0
    : Math.round(Math.max(0, adjustedGrossIncome) * stateInfo.topMarginalRate);

  // NIIT 3.8% — applies to lesser of net investment income (we proxy via
  // otherIncome) or MAGI over the threshold. Statutory thresholds.
  const surtaxThreshold = SURTAX_THRESHOLDS[inputs.filingStatus];
  const magiOverThreshold = Math.max(0, adjustedGrossIncome - surtaxThreshold);
  const investmentIncome = Math.max(0, otherIncome);
  const niit = Math.round(Math.min(investmentIncome, magiOverThreshold) * NIIT_RATE);

  // Additional Medicare 0.9% on wages + SE earnings above threshold.
  const earnedIncome = wages + seIncome * yearData.seIncomeFactor;
  const earnedOverThreshold = Math.max(0, earnedIncome - surtaxThreshold);
  const additionalMedicare = Math.round(earnedOverThreshold * ADDL_MEDICARE_RATE);

  const totalTax =
    federalIncomeTax + seTax + stateTax + niit + additionalMedicare;
  const effectiveRate = grossIncome > 0 ? totalTax / grossIncome : 0;
  const marginalRate = computeMarginalRate(taxableIncome, inputs.filingStatus, year);
  const takeHome = grossIncome - totalTax;

  return {
    grossIncome,
    taxableIncome,
    federalIncomeTax,
    selfEmploymentTax: seTax,
    qbiDeduction,
    stateTax,
    niit,
    additionalMedicare,
    totalTax,
    effectiveRate,
    marginalRate,
    takeHome,
    year,
    state,
  };
}
