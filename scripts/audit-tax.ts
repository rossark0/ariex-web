/* eslint-disable no-console */
/**
 * Tax engine audit — exercises computeTax with IRS-published / hand-derivable
 * cases and reports any divergence. Run:
 *
 *   npx tsx scripts/audit-tax.ts
 *
 * Purpose: catch silent bugs (wrong brackets, sign errors, missing deductions)
 * before they ship to a strategist who'd stake their PTIN on the output.
 */

import { computeTax, type ScenarioInputs } from '../src/lib/tax/calculator';

interface Case {
  name: string;
  inputs: ScenarioInputs;
  expect: {
    grossIncome: number;
    /** Tolerance bands so we don't fail on $1 rounding noise. */
    federalIncomeTaxApprox: [min: number, max: number];
    selfEmploymentTaxApprox: [min: number, max: number];
    totalTaxApprox: [min: number, max: number];
  };
  /** Free-text reasoning for the expected band — what IRS publication or arithmetic produces it. */
  reasoning: string;
}

const CASES: Case[] = [
  {
    name: 'Low income, mostly SE — standard deduction wipes out federal tax',
    inputs: {
      filingStatus: 'single',
      wages: 2000,
      selfEmploymentIncome: 12000,
      otherIncome: 3000,
      year: 2026,
      state: 'none',
    },
    expect: {
      grossIncome: 17000,
      // After half-SE (~$848) → AGI $16,152. Std ded 2026 single $15,750.
      // QBI deduction = 20% × $12k SE = $2,400. Taxable = max(0, 16152 - 15750 - 2400) = $0.
      federalIncomeTaxApprox: [0, 0],
      // SE tax = 0.9235 × 12000 × 0.153 ≈ $1,696
      selfEmploymentTaxApprox: [1690, 1705],
      totalTaxApprox: [1690, 1705],
    },
    reasoning:
      'Income $17k, standard deduction $15,750, QBI -$2,400 zeros out federal. Only SE tax remains.',
  },
  {
    name: 'Pure W-2 single $50k 2026 — vanilla wage earner',
    inputs: {
      filingStatus: 'single',
      wages: 50000,
      selfEmploymentIncome: 0,
      otherIncome: 0,
      year: 2026,
      state: 'none',
    },
    expect: {
      grossIncome: 50000,
      // Taxable = 50000 - 15750 = 34250
      // 2026 single brackets (projected from 2025 with inflation):
      //   10% on first ~$12k = ~$1,200
      //   12% on next ~$22.25k = ~$2,670
      //   Total ≈ $3,870
      federalIncomeTaxApprox: [3500, 4300],
      selfEmploymentTaxApprox: [0, 0],
      totalTaxApprox: [3500, 4300],
    },
    reasoning:
      '$50k single, std ded $15,750 → taxable $34,250 → 10%/12% brackets ~$3.8-4k federal.',
  },
  {
    name: 'High earner self-employed, $300k SE, single, 2026',
    inputs: {
      filingStatus: 'single',
      wages: 0,
      selfEmploymentIncome: 300000,
      otherIncome: 0,
      year: 2026,
      state: 'none',
    },
    expect: {
      grossIncome: 300000,
      // SE tax: 0.9235 × 300k × 15.3% capped on SS base ~$176k; calc'd ≈ $26-29k
      selfEmploymentTaxApprox: [22000, 32000],
      // After half-SE deduction (~$13k), AGI ~$287k. QBI 20% × $300k = $60k.
      // Std ded $15,750. Taxable ~$211k. Federal ~$42-48k.
      federalIncomeTaxApprox: [38000, 52000],
      // Plus addl Medicare 0.9% on earned > $200k threshold for single.
      totalTaxApprox: [62000, 85000],
    },
    reasoning:
      'High SE income → significant SE tax + federal income tax. NIIT 0 (no investment income). Add\'l Medicare on earned > $200k.',
  },
  {
    name: 'MFJ $200k W-2, no SE, 2026 — typical professional couple',
    inputs: {
      filingStatus: 'married_filing_jointly',
      wages: 200000,
      selfEmploymentIncome: 0,
      otherIncome: 0,
      year: 2026,
      state: 'none',
    },
    expect: {
      grossIncome: 200000,
      // MFJ std ded 2026 = $31,500. Taxable = $168,500.
      // 2026 MFJ brackets — taxable goes through 10/12/22/24. Tax ~$26-30k.
      federalIncomeTaxApprox: [24000, 32000],
      selfEmploymentTaxApprox: [0, 0],
      totalTaxApprox: [24000, 32000],
    },
    reasoning:
      'MFJ $200k W-2, std ded $31,500 → taxable $168,500. Brackets land around $27k federal.',
  },
];

let passed = 0;
let failed = 0;
const failures: string[] = [];

for (const c of CASES) {
  const r = computeTax(c.inputs);
  const issues: string[] = [];

  if (r.grossIncome !== c.expect.grossIncome) {
    issues.push(
      `  grossIncome: expected ${c.expect.grossIncome}, got ${r.grossIncome}`
    );
  }
  const [fedMin, fedMax] = c.expect.federalIncomeTaxApprox;
  if (r.federalIncomeTax < fedMin || r.federalIncomeTax > fedMax) {
    issues.push(
      `  federalIncomeTax: expected [${fedMin}, ${fedMax}], got ${r.federalIncomeTax}`
    );
  }
  const [seMin, seMax] = c.expect.selfEmploymentTaxApprox;
  if (r.selfEmploymentTax < seMin || r.selfEmploymentTax > seMax) {
    issues.push(
      `  selfEmploymentTax: expected [${seMin}, ${seMax}], got ${r.selfEmploymentTax}`
    );
  }
  const [totMin, totMax] = c.expect.totalTaxApprox;
  if (r.totalTax < totMin || r.totalTax > totMax) {
    issues.push(`  totalTax: expected [${totMin}, ${totMax}], got ${r.totalTax}`);
  }

  if (issues.length === 0) {
    passed++;
    console.log(`✓ ${c.name}`);
    console.log(
      `    grossIncome=${r.grossIncome}  federal=${r.federalIncomeTax}  SE=${r.selfEmploymentTax}  state=${r.stateTax}  niit=${r.niit}  addlMed=${r.additionalMedicare}  TOTAL=${r.totalTax}  effRate=${(r.effectiveRate * 100).toFixed(1)}%`
    );
  } else {
    failed++;
    console.log(`✗ ${c.name}`);
    console.log(`    ${c.reasoning}`);
    console.log(
      `    grossIncome=${r.grossIncome}  federal=${r.federalIncomeTax}  SE=${r.selfEmploymentTax}  state=${r.stateTax}  niit=${r.niit}  addlMed=${r.additionalMedicare}  TOTAL=${r.totalTax}  effRate=${(r.effectiveRate * 100).toFixed(1)}%`
    );
    for (const issue of issues) console.log(issue);
    failures.push(c.name);
  }
  console.log('');
}

console.log('━'.repeat(60));
console.log(`PASS: ${passed} / ${CASES.length}`);
if (failed > 0) {
  console.log(`FAIL: ${failed}`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
