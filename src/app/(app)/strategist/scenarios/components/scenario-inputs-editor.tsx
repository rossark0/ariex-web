'use client';

import { useEffect, useState } from 'react';
import type { FilingStatus, ScenarioInputs } from '@/lib/tax/calculator';

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
  const [draft, setDraft] = useState({
    filingStatus: inputs.filingStatus,
    wages: String(inputs.wages || ''),
    selfEmploymentIncome: String(inputs.selfEmploymentIncome || ''),
    otherIncome: String(inputs.otherIncome || ''),
  });

  // Sync when an external change comes in (e.g., loading a scenario).
  useEffect(() => {
    setDraft({
      filingStatus: inputs.filingStatus,
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
        wages: parseFloat(draft.wages.replace(/[,$]/g, '')) || 0,
        selfEmploymentIncome:
          parseFloat(draft.selfEmploymentIncome.replace(/[,$]/g, '')) || 0,
        otherIncome: parseFloat(draft.otherIncome.replace(/[,$]/g, '')) || 0,
      };
      if (
        parsed.filingStatus !== inputs.filingStatus ||
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

  return (
    <section className="grid grid-cols-2 gap-3 rounded-lg border border-white/8 bg-deep-navy p-4 lg:grid-cols-4">
      <div>
        <label className="mb-1 block text-[10px] font-semibold tracking-wide text-steel-gray uppercase">
          Filing status
        </label>
        <select
          value={draft.filingStatus}
          onChange={e => setField('filingStatus', e.target.value as FilingStatus)}
          className="w-full rounded-md border border-white/10 bg-deep-navy px-2.5 py-1.5 text-sm text-soft-white focus:border-electric-blue focus:outline-none"
        >
          {FILING_STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <Field
        label="W-2 wages"
        value={draft.wages}
        onChange={v => setField('wages', v)}
        placeholder="0"
      />
      <Field
        label="SE / Pass-through"
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
      <label className="mb-1 block text-[10px] font-semibold tracking-wide text-steel-gray uppercase">
        {label}
      </label>
      <div className="relative">
        <span className="absolute top-1.5 left-2 text-sm text-steel-gray/70">$</span>
        <input
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-white/10 bg-deep-navy px-2.5 py-1.5 pl-5 text-sm tabular-nums text-soft-white placeholder:text-steel-gray/60 focus:border-electric-blue focus:outline-none"
        />
      </div>
    </div>
  );
}
