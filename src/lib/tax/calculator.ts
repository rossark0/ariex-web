/**
 * Federal tax engine — drives "what-if" math inside the Scenario Workspace.
 * Numbers come from published IRS revenue procedures (2024 final, 2025 final
 * per Rev. Proc. 2024-40, 2026 projected from 2025 with the typical inflation
 * adjustment until Rev. Proc. 2025-32 final values are loaded).
 *
 * This is intentionally NOT a full IRS-grade calculator. It models:
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

export type TaxYear = 2024 | 2025 | 2026;

export const SUPPORTED_TAX_YEARS: TaxYear[] = [2024, 2025, 2026];

/** The default tax year for new scenarios — picks the current calendar year
 *  if we have data for it, otherwise falls back to the latest known year. */
export const DEFAULT_TAX_YEAR: TaxYear = (() => {
  const current = new Date().getFullYear();
  if (current >= 2026) return 2026;
  if (current === 2025) return 2025;
  return 2024;
})();

/** Some years are still projections (we have the IRS values for 2024/2025 but
 *  inflation-extrapolate 2026 until the final Rev. Proc. is loaded). */
export const TAX_YEAR_IS_PROJECTED: Record<TaxYear, boolean> = {
  2024: false,
  2025: false,
  2026: true,
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

// ─── 2024 (final, Rev. Proc. 2023-34) ──────────────────────────────────────

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

// ─── 2025 (final, Rev. Proc. 2024-40) ──────────────────────────────────────

const Y2025: YearData = {
  standardDeduction: {
    single: 15000,
    married_filing_jointly: 30000,
    married_filing_separately: 15000,
    head_of_household: 22500,
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

// ─── 2026 (projected — replace with final IRS values when published) ───────

const Y2026: YearData = {
  standardDeduction: {
    single: 15375,
    married_filing_jointly: 30750,
    married_filing_separately: 15375,
    head_of_household: 23050,
  },
  brackets: {
    single: [
      { upTo: 12225, rate: 0.1 },
      { upTo: 49700, rate: 0.12 },
      { upTo: 105950, rate: 0.22 },
      { upTo: 202250, rate: 0.24 },
      { upTo: 256800, rate: 0.32 },
      { upTo: 642000, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
    married_filing_jointly: [
      { upTo: 24450, rate: 0.1 },
      { upTo: 99400, rate: 0.12 },
      { upTo: 211900, rate: 0.22 },
      { upTo: 404500, rate: 0.24 },
      { upTo: 513600, rate: 0.32 },
      { upTo: 770400, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
    married_filing_separately: [
      { upTo: 12225, rate: 0.1 },
      { upTo: 49700, rate: 0.12 },
      { upTo: 105950, rate: 0.22 },
      { upTo: 202250, rate: 0.24 },
      { upTo: 256800, rate: 0.32 },
      { upTo: 385200, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
    head_of_household: [
      { upTo: 17425, rate: 0.1 },
      { upTo: 66475, rate: 0.12 },
      { upTo: 105950, rate: 0.22 },
      { upTo: 202250, rate: 0.24 },
      { upTo: 256750, rate: 0.32 },
      { upTo: 642000, rate: 0.35 },
      { upTo: null, rate: 0.37 },
    ],
  },
  ssWageBase: 180600,
  ssRate: 0.124,
  medicareRate: 0.029,
  seIncomeFactor: 0.9235,
};

const TAX_YEAR_DATA: Record<TaxYear, YearData> = {
  2024: Y2024,
  2025: Y2025,
  2026: Y2026,
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
}

export interface TaxResult {
  grossIncome: number;
  /** AGI minus standard deduction minus QBI deduction. */
  taxableIncome: number;
  federalIncomeTax: number;
  selfEmploymentTax: number;
  qbiDeduction: number;
  totalTax: number;
  /** Total tax / gross income, 0–1. */
  effectiveRate: number;
  marginalRate: number;
  takeHome: number;
  /** The year actually used for this computation (resolved). */
  year: TaxYear;
}

/**
 * Compute the full tax picture for a scenario. Honors the standard deduction,
 * QBI deduction, and SE tax. Half of SE tax is deductible above the line.
 */
export function computeTax(inputs: ScenarioInputs): TaxResult {
  const year: TaxYear = inputs.year && TAX_YEAR_DATA[inputs.year]
    ? inputs.year
    : DEFAULT_TAX_YEAR;
  const yearData = dataFor(year);

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
  const totalTax = federalIncomeTax + seTax;
  const effectiveRate = grossIncome > 0 ? totalTax / grossIncome : 0;
  const marginalRate = computeMarginalRate(taxableIncome, inputs.filingStatus, year);
  const takeHome = grossIncome - totalTax;

  return {
    grossIncome,
    taxableIncome,
    federalIncomeTax,
    selfEmploymentTax: seTax,
    qbiDeduction,
    totalTax,
    effectiveRate,
    marginalRate,
    takeHome,
    year,
  };
}
