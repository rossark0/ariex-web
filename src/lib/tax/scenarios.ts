/**
 * Scenario + strategy model for the Scenario Workspace.
 *
 * A scenario is: a baseline `ScenarioInputs` snapshot of the taxpayer + a set
 * of strategy options the strategist has toggled on. Each strategy transforms
 * the inputs and returns its own assumptions/confidence; we aggregate the
 * combined effect and diff it against baseline for impact numbers.
 *
 * Persistence is localStorage (versioned, schema-stable) so the demo flow
 * works without a backend. Server-side persistence can swap in later by
 * replacing the `readStorage`/`writeStorage` calls — the public hook surface
 * is identical to `useSavedViews`.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  computeTax,
  DEFAULT_TAX_YEAR,
  type FilingStatus,
  type ScenarioInputs,
  type TaxResult,
  type TaxYear,
} from './calculator';

// ─── Per-year contribution limits (sourced from IRS Notices) ──────────────

const SOLO_401K_DEFERRAL_LIMIT: Record<TaxYear, number> = {
  2024: 23000,
  2025: 23500,
  2026: 24500,
  2027: 25500, // projected
};

const HSA_LIMIT_SELF: Record<TaxYear, number> = {
  2024: 4150,
  2025: 4300,
  2026: 4400,
  2027: 4500, // projected
};

const HSA_LIMIT_FAMILY: Record<TaxYear, number> = {
  2024: 8300,
  2025: 8550,
  2026: 8750,
  2027: 9000, // projected
};

function resolveYear(year: TaxYear | undefined): TaxYear {
  return year && SOLO_401K_DEFERRAL_LIMIT[year] ? year : DEFAULT_TAX_YEAR;
}

// ─── Strategy registry ─────────────────────────────────────────────────────

export type StrategyId =
  | 's_corp_election'
  | 'solo_401k'
  | 'section_179_vehicle'
  | 'hsa_contribution';

export interface Strategy {
  id: StrategyId;
  title: string;
  category: 'Entity' | 'Retirement' | 'Deduction' | 'Health';
  /** Short copy shown in the tree node. */
  blurb: string;
  /** Static assumptions the model uses. */
  assumptions: string[];
  /** 0–1 confidence in the impact estimate given typical caveats. */
  confidence: number;
  /** IRC / Treasury Reg / form citation the strategist can quote. */
  authority: { label: string; detail?: string };
  /** Implementation deadline a strategist must work backward from. */
  deadline: (year: TaxYear) => string;
  /** Cash that actually leaves the client's account to implement (vs tax savings). */
  cashOutlay: (inputs: ScenarioInputs) => number;
  /** IRS scrutiny / documentation requirement level. */
  auditRisk: 'low' | 'medium' | 'high';
  /** Concrete steps the strategist must execute to implement. */
  nextSteps: string[];
  /** Returns transformed inputs + a list of dynamic assumption strings. */
  apply: (inputs: ScenarioInputs) => {
    inputs: ScenarioInputs;
    dynamicAssumptions: string[];
  };
  /** Whether this strategy is applicable to the baseline (gates the UI). */
  isApplicable: (inputs: ScenarioInputs) => boolean;
  /** Human-readable explanation when isApplicable returns false. */
  ineligibleReason: (inputs: ScenarioInputs) => string | null;
}

/**
 * S-Corp election: reasonable salary + remainder distribution.
 * Net effect on SE tax: only the salary portion is subject to FICA payroll
 * taxes; the distribution portion escapes SE tax entirely.
 *
 * Simplification: we model the salary as W-2 wages and the distribution as
 * "other income" that's still taxed at ordinary rates. The W-2 salary's
 * employer-side FICA isn't separately modeled — handled inside SE tax
 * removal which over-credits slightly; flagged as an assumption.
 */
const S_CORP_REASONABLE_SALARY_RATIO = 0.4; // industry-typical baseline

const sCorpElection: Strategy = {
  id: 's_corp_election',
  title: 'S-Corp election',
  category: 'Entity',
  blurb:
    'Pay yourself a reasonable W-2 salary and take the remainder as a distribution — removing SE tax from the distribution portion.',
  assumptions: [
    'Reasonable salary set at 40% of net SE income (industry benchmark; final amount must be defensible).',
    'Distribution portion escapes SE tax; ordinary income tax still applies.',
    'Excludes the cost of running payroll and additional state-level S-Corp fees.',
  ],
  confidence: 0.78,
  authority: {
    label: 'IRC § 1361–1379 · Form 2553',
    detail: 'Reasonable-compensation standard: Rev. Rul. 59-221; Watson v. Commissioner (8th Cir. 2012).',
  },
  deadline: year =>
    `Form 2553 by March 15, ${year} (for current-year election) or within 75 days of entity formation.`,
  cashOutlay: () => 1500,
  auditRisk: 'medium',
  nextSteps: [
    'File Form 2553 with the IRS (March 15 cutoff for current year).',
    'Set up payroll (Gusto / ADP) and run the reasonable W-2 salary year-round.',
    'Document the reasonable-comp basis (industry data, role, hours) in a board memo.',
    'Confirm state-level S-Corp recognition + any state franchise/excise filings.',
  ],
  isApplicable: inputs => inputs.selfEmploymentIncome >= 60000,
  ineligibleReason: inputs =>
    inputs.selfEmploymentIncome < 60000
      ? `Needs ≥ $60k SE income — at $${inputs.selfEmploymentIncome.toLocaleString()}, payroll + state fees (~$1,500/yr) likely exceed SE tax saved.`
      : null,
  apply: inputs => {
    const salary = Math.round(inputs.selfEmploymentIncome * S_CORP_REASONABLE_SALARY_RATIO);
    const distribution = inputs.selfEmploymentIncome - salary;
    return {
      inputs: {
        ...inputs,
        wages: inputs.wages + salary,
        selfEmploymentIncome: 0,
        otherIncome: inputs.otherIncome + distribution,
      },
      dynamicAssumptions: [
        `Reasonable salary modeled at $${salary.toLocaleString()} (40% of $${inputs.selfEmploymentIncome.toLocaleString()} SE income).`,
        `Distribution portion of $${distribution.toLocaleString()} taxed as ordinary income, no SE tax.`,
      ],
    };
  },
};

/**
 * Solo 401(k) contribution — employee deferral up to the year's limit.
 * Reduces wages (W-2) or SE income (sole prop) on a pre-tax basis.
 */
const solo401k: Strategy = {
  id: 'solo_401k',
  title: 'Solo 401(k) deferral',
  category: 'Retirement',
  blurb:
    "Defer the year's max employee contribution into a Solo 401(k). Reduces this year's taxable income at your marginal rate.",
  assumptions: [
    'Models employee deferral only (employer profit-sharing contribution excluded).',
    'Year-specific limit applied (under age 50; catch-up not modeled).',
    'Contribution comes from SE income first, then W-2 wages if available.',
  ],
  confidence: 0.92,
  authority: {
    label: 'IRC § 401(k); Treas. Reg. 1.401(k)-1',
    detail: 'Annual deferral limit per IRC § 402(g); SECURE 2.0 retroactive plan adoption permitted.',
  },
  deadline: year =>
    `Adopt the plan by Dec 31, ${year}. Employee deferral elected by Dec 31. Fund by tax-filing deadline (incl. extensions).`,
  cashOutlay: inputs => {
    const year = resolveYear(inputs.year);
    const limit = SOLO_401K_DEFERRAL_LIMIT[year];
    const fromSe = Math.min(inputs.selfEmploymentIncome, limit);
    const fromWages = Math.min(inputs.wages, limit - fromSe);
    return fromSe + fromWages;
  },
  auditRisk: 'low',
  nextSteps: [
    'Adopt a Solo 401(k) plan document (Fidelity, Schwab, E*TRADE all offer free).',
    'Open the Solo 401(k) custodian account.',
    'Elect the year\'s deferral by Dec 31 (must be in writing).',
    'Fund the contribution by the tax-filing deadline (April 15 + extensions).',
  ],
  isApplicable: inputs => inputs.selfEmploymentIncome + inputs.wages >= 30000,
  ineligibleReason: inputs => {
    const total = inputs.selfEmploymentIncome + inputs.wages;
    return total < 30000
      ? `Needs ≥ $30k earned income — currently $${total.toLocaleString()} (W-2 + SE). Below this threshold the deferral is capped too low to move the tax needle.`
      : null;
  },
  apply: inputs => {
    const year = resolveYear(inputs.year);
    const limit = SOLO_401K_DEFERRAL_LIMIT[year];
    const fromSe = Math.min(inputs.selfEmploymentIncome, limit);
    const remainder = limit - fromSe;
    const fromWages = Math.min(inputs.wages, remainder);
    return {
      inputs: {
        ...inputs,
        wages: inputs.wages - fromWages,
        selfEmploymentIncome: inputs.selfEmploymentIncome - fromSe,
      },
      dynamicAssumptions: [
        `$${(fromSe + fromWages).toLocaleString()} total deferral toward the ${year} limit of $${limit.toLocaleString()} (${
          fromSe ? `$${fromSe.toLocaleString()} from SE income` : ''
        }${fromSe && fromWages ? ' + ' : ''}${
          fromWages ? `$${fromWages.toLocaleString()} from W-2 wages` : ''
        }).`,
      ],
    };
  },
};

/**
 * Section 179 vehicle deduction — accelerates depreciation for qualifying
 * business-use vehicles. We model a flat $20k expense against SE income.
 */
const section179Vehicle: Strategy = {
  id: 'section_179_vehicle',
  title: 'Section 179 vehicle',
  category: 'Deduction',
  blurb:
    'Expense up to $20,000 of a qualifying business-use vehicle in year one instead of depreciating over time.',
  assumptions: [
    'Assumes the vehicle weighs over 6,000 lbs (SUV / heavy-truck threshold).',
    'Modeled at $20,000 of bonus / 179 expense; final amount depends on cost basis and business-use %.',
    'Recapture exposure if business use drops below 50% in later years.',
  ],
  confidence: 0.6,
  authority: {
    label: 'IRC § 179; Treas. Reg. 1.179-1',
    detail:
      'SUV/heavy-truck rules: § 179(b)(5) cap (inflation-indexed annually for vehicles > 6,000 lb GVWR — verify current Rev. Proc. for the year of purchase). Recapture under § 179(d)(10) if business use drops below 50%.',
  },
  deadline: year => `Vehicle must be placed in service (titled, registered, used) by Dec 31, ${year}.`,
  cashOutlay: () => 20000,
  auditRisk: 'high',
  nextSteps: [
    'Verify vehicle GVWR > 6,000 lbs (manufacturer label on door jamb).',
    'Document > 50% business use — start a contemporaneous mileage log (date, miles, purpose).',
    'Place vehicle in service before Dec 31 (title transferred + actually used for business).',
    'Retain purchase agreement, title, and mileage log for 6 years post-recapture window.',
  ],
  isApplicable: inputs => inputs.selfEmploymentIncome >= 40000,
  ineligibleReason: inputs =>
    inputs.selfEmploymentIncome < 40000
      ? `Needs ≥ $40k SE income — at $${inputs.selfEmploymentIncome.toLocaleString()}, the $20k cash outlay rarely justifies the tax savings; recapture risk if business use drops below 50%.`
      : null,
  apply: inputs => ({
    inputs: {
      ...inputs,
      selfEmploymentIncome: Math.max(0, inputs.selfEmploymentIncome - 20000),
    },
    dynamicAssumptions: ['$20,000 expensed against SE income in current year.'],
  }),
};

/**
 * HSA contribution — pre-tax health-savings contribution.
 */
const hsaContribution: Strategy = {
  id: 'hsa_contribution',
  title: 'HSA contribution',
  category: 'Health',
  blurb:
    'Contribute pre-tax to an HSA. Triple-advantaged: deductible going in, grows tax-free, and tax-free for qualified medical expenses.',
  assumptions: [
    'Assumes you are enrolled in a qualifying high-deductible health plan (HDHP).',
    'Year-specific family limit applied for MFJ; self-only limit otherwise.',
    'Contribution reduces SE income first, then W-2 wages.',
  ],
  confidence: 0.95,
  authority: {
    label: 'IRC § 223; Treas. Reg. 1.223-1',
    detail:
      'Requires enrollment in an HDHP (deductible/OOP minimums per Rev. Proc. annually). Triple-tax advantage: deductible going in, growth tax-free, distributions tax-free for qualified medical (§ 213(d)).',
  },
  deadline: year =>
    `Contribute by April 15, ${year + 1} (the year-${year} return due date). Plan elections via cafeteria plan must be made before each pay period.`,
  cashOutlay: inputs => {
    const year = resolveYear(inputs.year);
    const limit =
      inputs.filingStatus === 'married_filing_jointly'
        ? HSA_LIMIT_FAMILY[year]
        : HSA_LIMIT_SELF[year];
    const fromSe = Math.min(inputs.selfEmploymentIncome, limit);
    const fromWages = Math.min(inputs.wages, limit - fromSe);
    return fromSe + fromWages;
  },
  auditRisk: 'low',
  nextSteps: [
    'Confirm HDHP enrollment for every month being contributed for.',
    'Open an HSA at a custodian that allows investment (Fidelity HSA is fee-free).',
    'Contribute up to the year\'s limit by April 15 of the following year.',
    'Save medical receipts indefinitely — reimburse yourself later, tax-free.',
  ],
  isApplicable: () => true,
  ineligibleReason: () => null,
  apply: inputs => {
    const year = resolveYear(inputs.year);
    const limit =
      inputs.filingStatus === 'married_filing_jointly'
        ? HSA_LIMIT_FAMILY[year]
        : HSA_LIMIT_SELF[year];
    const fromSe = Math.min(inputs.selfEmploymentIncome, limit);
    const remainder = limit - fromSe;
    const fromWages = Math.min(inputs.wages, remainder);
    return {
      inputs: {
        ...inputs,
        wages: inputs.wages - fromWages,
        selfEmploymentIncome: inputs.selfEmploymentIncome - fromSe,
      },
      dynamicAssumptions: [
        `$${(fromSe + fromWages).toLocaleString()} contributed pre-tax to HSA (${year} limit: $${limit.toLocaleString()}).`,
      ],
    };
  },
};

export const STRATEGIES: Record<StrategyId, Strategy> = {
  s_corp_election: sCorpElection,
  solo_401k: solo401k,
  section_179_vehicle: section179Vehicle,
  hsa_contribution: hsaContribution,
};

export const STRATEGY_ORDER: StrategyId[] = [
  's_corp_election',
  'solo_401k',
  'section_179_vehicle',
  'hsa_contribution',
];

// ─── Scenario model ────────────────────────────────────────────────────────

export interface Scenario {
  id: string;
  name: string;
  /** Optional reference to a client so the scenario can be revisited. */
  clientId?: string;
  inputs: ScenarioInputs;
  /** Strategies currently enabled, ordered. */
  enabledStrategies: StrategyId[];
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioComputation {
  baseline: TaxResult;
  projected: TaxResult;
  /** Per-strategy impact in dollars saved (positive = savings). */
  strategyImpacts: Array<{
    id: StrategyId;
    title: string;
    category: Strategy['category'];
    annualSavings: number;
    confidence: number;
    assumptions: string[];
    dynamicAssumptions: string[];
    /** Cash that leaves the client's account to implement this strategy. */
    cashOutlay: number;
    /** annualSavings − cashOutlay. Negative = strategy costs more than it saves in year 1. */
    netBenefit: number;
    /** IRC / Reg / form citation. */
    authority: { label: string; detail?: string };
    /** Implementation deadline text resolved for the scenario year. */
    deadline: string;
    /** IRS scrutiny / documentation rigor. */
    auditRisk: 'low' | 'medium' | 'high';
    /** Concrete implementation checklist. */
    nextSteps: string[];
  }>;
  /** Combined annual savings (baseline.totalTax - projected.totalTax). */
  totalAnnualSavings: number;
  /** Total cash the client must put up to implement all enabled strategies. */
  totalCashOutlay: number;
  /** totalAnnualSavings − totalCashOutlay. The real year-1 benefit. */
  netBenefit: number;
  /** Strategies currently enabled but not applicable (with reason). Surface as warnings. */
  ineligibleEnabled: Array<{ id: StrategyId; title: string; reason: string }>;
  /** Weighted overall confidence across enabled strategies. */
  overallConfidence: number;
  /** All assumptions concatenated for display. */
  allAssumptions: string[];
}

/**
 * Compute the cumulative effect of an ordered list of strategies on baseline
 * inputs. Order matters because each strategy's `apply` consumes the prior
 * strategy's output (e.g., an HSA contribution after the S-Corp election sees
 * the post-election income mix).
 */
export function computeScenario(scenario: Scenario): ScenarioComputation {
  const baseline = computeTax(scenario.inputs);

  let runningInputs = scenario.inputs;
  let runningResult = baseline;
  const strategyImpacts: ScenarioComputation['strategyImpacts'] = [];
  const ineligibleEnabled: ScenarioComputation['ineligibleEnabled'] = [];
  const allAssumptions: string[] = [];
  const scenarioYear =
    scenario.inputs.year && SOLO_401K_DEFERRAL_LIMIT[scenario.inputs.year]
      ? scenario.inputs.year
      : DEFAULT_TAX_YEAR;

  for (const id of scenario.enabledStrategies) {
    const strat = STRATEGIES[id];
    if (!strat) continue;
    if (!strat.isApplicable(runningInputs)) {
      const reason = strat.ineligibleReason(runningInputs);
      if (reason) {
        ineligibleEnabled.push({ id: strat.id, title: strat.title, reason });
      }
      continue;
    }

    const before = runningResult;
    const cashOutlay = strat.cashOutlay(runningInputs);
    const { inputs: nextInputs, dynamicAssumptions } = strat.apply(runningInputs);
    runningInputs = nextInputs;
    runningResult = computeTax(runningInputs);

    const annualSavings = before.totalTax - runningResult.totalTax;
    strategyImpacts.push({
      id: strat.id,
      title: strat.title,
      category: strat.category,
      annualSavings,
      confidence: strat.confidence,
      assumptions: strat.assumptions,
      dynamicAssumptions,
      cashOutlay,
      netBenefit: annualSavings - cashOutlay,
      authority: strat.authority,
      deadline: strat.deadline(scenarioYear),
      auditRisk: strat.auditRisk,
      nextSteps: strat.nextSteps,
    });
    allAssumptions.push(...dynamicAssumptions);
  }

  const projected = runningResult;
  const totalAnnualSavings = baseline.totalTax - projected.totalTax;
  const totalCashOutlay = strategyImpacts.reduce((acc, s) => acc + s.cashOutlay, 0);
  const netBenefit = totalAnnualSavings - totalCashOutlay;

  // Combined confidence: weighted by individual savings magnitude. Falls back
  // to a simple average when no strategies produce savings.
  const totalWeight = strategyImpacts.reduce(
    (acc, s) => acc + Math.max(0, s.annualSavings),
    0
  );
  let overallConfidence = 1;
  if (strategyImpacts.length > 0) {
    if (totalWeight > 0) {
      overallConfidence =
        strategyImpacts.reduce(
          (acc, s) => acc + s.confidence * Math.max(0, s.annualSavings),
          0
        ) / totalWeight;
    } else {
      overallConfidence =
        strategyImpacts.reduce((acc, s) => acc + s.confidence, 0) /
        strategyImpacts.length;
    }
  }

  return {
    baseline,
    projected,
    strategyImpacts,
    totalAnnualSavings,
    totalCashOutlay,
    netBenefit,
    ineligibleEnabled,
    overallConfidence,
    allAssumptions,
  };
}

// ─── Persistence (localStorage; cross-tab sync) ────────────────────────────

const STORAGE_KEY = 'ariex.scenarios';
const STORAGE_VERSION = 1;

interface PersistShape {
  version: number;
  scenarios: Scenario[];
}

function readStorage(): Scenario[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistShape;
    if (!parsed || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.scenarios)) {
      return [];
    }
    return parsed.scenarios;
  } catch {
    return [];
  }
}

function writeStorage(scenarios: Scenario[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistShape = { version: STORAGE_VERSION, scenarios };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota / serialization errors are non-fatal — in-memory state still works.
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `scn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaultInputs(filingStatus: FilingStatus = 'single'): ScenarioInputs {
  return {
    filingStatus,
    wages: 0,
    selfEmploymentIncome: 120000,
    otherIncome: 0,
    year: DEFAULT_TAX_YEAR,
    state: 'none',
  };
}

export function createBlankScenario(name = 'Untitled scenario'): Scenario {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name,
    inputs: defaultInputs(),
    enabledStrategies: [],
    createdAt: now,
    updatedAt: now,
  };
}

interface UseScenariosApi {
  scenarios: Scenario[];
  hydrated: boolean;
  createScenario: (name?: string) => Scenario;
  updateScenario: (id: string, patch: Partial<Omit<Scenario, 'id' | 'createdAt'>>) => void;
  deleteScenario: (id: string) => void;
  getScenario: (id: string) => Scenario | undefined;
}

export function useScenarios(): UseScenariosApi {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setScenarios(readStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setScenarios(readStorage());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const createScenario = useCallback<UseScenariosApi['createScenario']>(name => {
    const scenario = createBlankScenario(name);
    setScenarios(prev => {
      const next = [scenario, ...prev];
      writeStorage(next);
      return next;
    });
    return scenario;
  }, []);

  const updateScenario = useCallback<UseScenariosApi['updateScenario']>((id, patch) => {
    setScenarios(prev => {
      const next = prev.map(s =>
        s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s
      );
      writeStorage(next);
      return next;
    });
  }, []);

  const deleteScenario = useCallback<UseScenariosApi['deleteScenario']>(id => {
    setScenarios(prev => {
      const next = prev.filter(s => s.id !== id);
      writeStorage(next);
      return next;
    });
  }, []);

  const getScenario = useCallback<UseScenariosApi['getScenario']>(
    id => scenarios.find(s => s.id === id),
    [scenarios]
  );

  return { scenarios, hydrated, createScenario, updateScenario, deleteScenario, getScenario };
}
