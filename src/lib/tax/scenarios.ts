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
  /** Returns transformed inputs + a list of dynamic assumption strings. */
  apply: (inputs: ScenarioInputs) => {
    inputs: ScenarioInputs;
    dynamicAssumptions: string[];
  };
  /** Whether this strategy is applicable to the baseline (gates the UI). */
  isApplicable: (inputs: ScenarioInputs) => boolean;
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
  isApplicable: inputs => inputs.selfEmploymentIncome >= 60000,
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
  isApplicable: inputs => inputs.selfEmploymentIncome + inputs.wages >= 30000,
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
  isApplicable: inputs => inputs.selfEmploymentIncome >= 40000,
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
  isApplicable: () => true,
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
  }>;
  /** Combined annual savings (baseline.totalTax - projected.totalTax). */
  totalAnnualSavings: number;
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
  const allAssumptions: string[] = [];

  for (const id of scenario.enabledStrategies) {
    const strat = STRATEGIES[id];
    if (!strat) continue;
    if (!strat.isApplicable(runningInputs)) continue;

    const before = runningResult;
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
    });
    allAssumptions.push(...dynamicAssumptions);
  }

  const projected = runningResult;
  const totalAnnualSavings = baseline.totalTax - projected.totalTax;

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
