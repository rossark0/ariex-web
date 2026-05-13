/**
 * Simplified federal tax engine — enough to drive credible "what-if" math
 * inside the Scenario Workspace. Numbers come from published 2024 IRS tables.
 *
 * This is intentionally NOT a full IRS-grade calculator. It models:
 *   - Federal income tax (ordinary brackets per filing status)
 *   - Standard deduction
 *   - Self-employment tax (Social Security cap + Medicare with no cap; the 0.9%
 *     additional-Medicare surtax above thresholds is excluded for clarity)
 *   - QBI deduction (Section 199A) at a simplified 20% of qualified income
 *
 * Pure functions: safe to use in React/SSR/tests without side effects.
 */

export type FilingStatus =
  | 'single'
  | 'married_filing_jointly'
  | 'married_filing_separately'
  | 'head_of_household';

// ─── 2024 IRS published values ─────────────────────────────────────────────

const STANDARD_DEDUCTION_2024: Record<FilingStatus, number> = {
  single: 14600,
  married_filing_jointly: 29200,
  married_filing_separately: 14600,
  head_of_household: 21900,
};

interface Bracket {
  /** Top of this bracket; null means "and above". */
  upTo: number | null;
  /** Marginal rate as a decimal (0.22 = 22%). */
  rate: number;
}

const FEDERAL_BRACKETS_2024: Record<FilingStatus, Bracket[]> = {
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
};

const SS_WAGE_BASE_2024 = 168600;
const SS_RATE = 0.124; // 12.4% combined; SE pays both halves
const MEDICARE_RATE = 0.029; // 2.9% combined
const SE_INCOME_FACTOR = 0.9235; // 92.35% of SE income subject to SE tax

// ─── Core math ─────────────────────────────────────────────────────────────

export function computeFederalTax(
  taxableIncome: number,
  filingStatus: FilingStatus
): number {
  if (taxableIncome <= 0) return 0;
  const brackets = FEDERAL_BRACKETS_2024[filingStatus];
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
  filingStatus: FilingStatus
): number {
  if (taxableIncome <= 0) return 0;
  const brackets = FEDERAL_BRACKETS_2024[filingStatus];
  let previousCap = 0;
  for (const bracket of brackets) {
    const cap = bracket.upTo ?? Infinity;
    if (taxableIncome <= cap) return bracket.rate;
    previousCap = cap;
  }
  // Fallback (shouldn't hit): top bracket
  return brackets[brackets.length - 1].rate;
}

export function computeSelfEmploymentTax(seNetEarnings: number): number {
  if (seNetEarnings <= 0) return 0;
  const taxable = seNetEarnings * SE_INCOME_FACTOR;
  const ssPortion = Math.min(taxable, SS_WAGE_BASE_2024) * SS_RATE;
  const medicarePortion = taxable * MEDICARE_RATE;
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
}

/**
 * Compute the full tax picture for a scenario. Honors the standard deduction,
 * QBI deduction, and SE tax. Half of SE tax is deductible above the line.
 */
export function computeTax(inputs: ScenarioInputs): TaxResult {
  const wages = Math.max(0, inputs.wages);
  const seIncome = Math.max(0, inputs.selfEmploymentIncome);
  const otherIncome = Math.max(0, inputs.otherIncome);

  const seTax = computeSelfEmploymentTax(seIncome);
  const halfSeDeductible = Math.round(seTax / 2);

  // Simplified QBI: 20% of self-employment / pass-through income.
  // Real Section 199A has phaseouts, SSTB rules, W-2 wage limits — out of
  // scope for this tool; flagged in the UI as an assumption.
  const qbiDeduction = Math.round(seIncome * 0.2);

  const grossIncome = wages + seIncome + otherIncome;
  const adjustedGrossIncome = grossIncome - halfSeDeductible;
  const taxableIncome = Math.max(
    0,
    adjustedGrossIncome - STANDARD_DEDUCTION_2024[inputs.filingStatus] - qbiDeduction
  );

  const federalIncomeTax = computeFederalTax(taxableIncome, inputs.filingStatus);
  const totalTax = federalIncomeTax + seTax;
  const effectiveRate = grossIncome > 0 ? totalTax / grossIncome : 0;
  const marginalRate = computeMarginalRate(taxableIncome, inputs.filingStatus);
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
  };
}
