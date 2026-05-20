'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_TAX_YEAR,
  STATE_TAX,
  SUPPORTED_TAX_YEARS,
  TAX_YEAR_IS_PROJECTED,
  US_STATES,
  type FilingStatus,
  type ScenarioInputs,
  type TaxYear,
  type UsState,
} from '@/lib/tax/calculator';

interface ScenarioInputsEditorProps {
  inputs: ScenarioInputs;
  onChange: (next: ScenarioInputs) => void;
}

const FILING_STATUS_OPTIONS: { value: FilingStatus; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'married_filing_jointly', label: 'MFJ' },
  { value: 'married_filing_separately', label: 'MFS' },
  { value: 'head_of_household', label: 'HoH' },
];

/**
 * Inline baseline editor. Debounces parent updates so the downstream
 * tax-calc + tree don't recompute on every keystroke.
 */
const DEBOUNCE_MS = 200;

export function ScenarioInputsEditor({ inputs, onChange }: ScenarioInputsEditorProps) {
  const resolvedYear: TaxYear = inputs.year ?? DEFAULT_TAX_YEAR;
  const [draft, setDraft] = useState({
    filingStatus: inputs.filingStatus,
    year: resolvedYear,
    state: (inputs.state ?? 'none') as UsState,
    wages: String(inputs.wages || ''),
    selfEmploymentIncome: String(inputs.selfEmploymentIncome || ''),
    otherIncome: String(inputs.otherIncome || ''),
  });

  // Sync when an external change comes in (e.g., loading a scenario).
  useEffect(() => {
    setDraft({
      filingStatus: inputs.filingStatus,
      year: inputs.year ?? DEFAULT_TAX_YEAR,
      state: (inputs.state ?? 'none') as UsState,
      wages: String(inputs.wages || ''),
      selfEmploymentIncome: String(inputs.selfEmploymentIncome || ''),
      otherIncome: String(inputs.otherIncome || ''),
    });
  }, [inputs]);

  // Debounce numeric commits to the parent.
  useEffect(() => {
    const handle = setTimeout(() => {
      const parsed: ScenarioInputs = {
        filingStatus: draft.filingStatus,
        year: draft.year,
        state: draft.state,
        wages: parseFloat(draft.wages.replace(/[,$]/g, '')) || 0,
        selfEmploymentIncome:
          parseFloat(draft.selfEmploymentIncome.replace(/[,$]/g, '')) || 0,
        otherIncome: parseFloat(draft.otherIncome.replace(/[,$]/g, '')) || 0,
      };
      if (
        parsed.filingStatus !== inputs.filingStatus ||
        parsed.year !== (inputs.year ?? DEFAULT_TAX_YEAR) ||
        parsed.state !== (inputs.state ?? 'none') ||
        parsed.wages !== inputs.wages ||
        parsed.selfEmploymentIncome !== inputs.selfEmploymentIncome ||
        parsed.otherIncome !== inputs.otherIncome
      ) {
        onChange(parsed);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const setField = <K extends keyof typeof draft>(field: K, value: (typeof draft)[K]) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const projected = TAX_YEAR_IS_PROJECTED[draft.year];
  // Guard against stale / AI-supplied state values that aren't in the map
  // (e.g., a full name like "California" instead of "CA").
  const stateInfo = STATE_TAX[draft.state] ?? STATE_TAX.none;
  const stateIsValid = !!STATE_TAX[draft.state];

  return (
    <section className="rounded-xl bg-surface p-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <div>
          <label className="mb-1.5 flex min-h-[28px] items-start text-[11px] font-medium uppercase leading-tight tracking-wide text-steel-gray">
            Tax year
          </label>
          <select
            value={draft.year}
            onChange={e => setField('year', Number(e.target.value) as TaxYear)}
            className="h-9 w-full rounded-lg border border-white/10 bg-deep-navy px-3 text-sm text-soft-white focus:border-electric-blue focus:outline-none"
          >
            {SUPPORTED_TAX_YEARS.map(y => (
              <option key={y} value={y}>
                {y}
                {TAX_YEAR_IS_PROJECTED[y] ? ' (proj.)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 flex min-h-[28px] items-start text-[11px] font-medium uppercase leading-tight tracking-wide text-steel-gray">
            Filing status
          </label>
          <select
            value={draft.filingStatus}
            onChange={e => setField('filingStatus', e.target.value as FilingStatus)}
            className="h-9 w-full rounded-lg border border-white/10 bg-deep-navy px-3 text-sm text-soft-white focus:border-electric-blue focus:outline-none"
          >
            {FILING_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 flex min-h-[28px] items-start text-[11px] font-medium uppercase leading-tight tracking-wide text-steel-gray">
            State
          </label>
          <select
            value={stateIsValid ? draft.state : 'none'}
            onChange={e => setField('state', e.target.value as UsState)}
            className="h-9 w-full rounded-lg border border-white/10 bg-deep-navy px-3 text-sm text-soft-white focus:border-electric-blue focus:outline-none"
          >
            {US_STATES.map(s => {
              const info = STATE_TAX[s];
              const label =
                s === 'none'
                  ? '— None —'
                  : `${s} · ${info.noTax ? 'no tax' : `${(info.topMarginalRate * 100).toFixed(2)}%`}`;
              return (
                <option key={s} value={s}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        <Field
          label="W-2 wages"
          value={draft.wages}
          onChange={v => setField('wages', v)}
          placeholder="0"
        />
        <Field
          label="SE income"
          value={draft.selfEmploymentIncome}
          onChange={v => setField('selfEmploymentIncome', v)}
          placeholder="120,000"
        />
        <Field
          label="Other income"
          value={draft.otherIncome}
          onChange={v => setField('otherIncome', v)}
          placeholder="0"
        />
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        {projected && (
          <p className="text-[11px] leading-relaxed text-amber-300/85">
            Using projected {draft.year} brackets (inflation-extrapolated from
            {' '}{draft.year - 1}). Replace with final IRS values when Rev. Proc.
            {' '}{draft.year - 1}-XX is loaded.
          </p>
        )}
        {stateIsValid && draft.state !== 'none' && stateInfo.note && (
          <p className="text-[11px] leading-relaxed text-steel-gray/80">
            {stateInfo.name}: {stateInfo.note}
          </p>
        )}
        {stateIsValid && draft.state !== 'none' && (
          <p className="text-[11px] leading-relaxed text-steel-gray/60">
            State tax estimated at top marginal rate × AGI. Doesn&apos;t model
            per-state deductions, credits, or city add-ons.
          </p>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 flex min-h-[28px] items-start text-[11px] font-medium uppercase leading-tight tracking-wide text-steel-gray">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-steel-gray">$</span>
        <input
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 w-full rounded-lg border border-white/10 bg-deep-navy px-3 pl-7 text-sm tabular-nums text-soft-white placeholder:text-steel-gray/60 focus:border-electric-blue focus:outline-none"
        />
      </div>
    </div>
  );
}
