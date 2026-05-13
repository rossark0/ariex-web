'use client';

import { useCountUp } from '@/hooks/use-count-up';
import { cn } from '@/lib/utils';
import { TAX_YEAR_IS_PROJECTED } from '@/lib/tax/calculator';
import type { ScenarioComputation } from '@/lib/tax/scenarios';

interface ScenarioImpactPanelProps {
  computation: ScenarioComputation;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function MetricCountUp({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'savings' | 'projected';
}) {
  const animated = useCountUp(value, 300);
  return (
    <div className="rounded-lg border border-white/8 bg-white/3 p-3">
      <p className="text-[10px] font-semibold tracking-wide text-steel-gray uppercase">{label}</p>
      <p
        className={cn(
          'mt-1 text-xl font-medium tabular-nums',
          tone === 'savings' ? 'text-emerald-300' : tone === 'projected' ? 'text-electric-blue' : 'text-soft-white'
        )}
      >
        {formatCurrency(Math.round(animated))}
      </p>
    </div>
  );
}

export function ScenarioImpactPanel({ computation }: ScenarioImpactPanelProps) {
  const { baseline, projected, totalAnnualSavings, overallConfidence, strategyImpacts, allAssumptions } =
    computation;

  const effectiveDelta = projected.effectiveRate - baseline.effectiveRate;
  const projectedRate = (projected.effectiveRate * 100).toFixed(1);
  const baselineRate = (baseline.effectiveRate * 100).toFixed(1);
  const animatedConfidence = useCountUp(Math.round(overallConfidence * 100), 300);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Headline savings */}
      <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/8 p-4">
        <p className="text-[10px] font-semibold tracking-wide text-emerald-300 uppercase">
          Estimated annual savings
        </p>
        <MetricCountUpInline value={totalAnnualSavings} />
        <p className="mt-1 text-[11px] text-steel-gray">
          {baselineRate}% → {projectedRate}% effective rate
          {effectiveDelta < 0 ? '' : ''}
        </p>
      </div>

      {/* Baseline vs projected */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCountUp label="Baseline tax" value={baseline.totalTax} />
        <MetricCountUp label="Projected tax" value={projected.totalTax} tone="projected" />
      </div>

      {/* Confidence */}
      <div className="rounded-lg border border-white/8 bg-white/3 p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[10px] font-semibold tracking-wide text-steel-gray uppercase">
            Combined confidence
          </p>
          <span className="text-sm tabular-nums text-soft-white">{Math.round(animatedConfidence)}%</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-electric-blue transition-[width] duration-200 ease-linear"
            style={{ width: `${animatedConfidence}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-steel-gray/70">
          Weighted by each strategy&apos;s individual savings contribution.
        </p>
      </div>

      {/* Per-strategy breakdown */}
      {strategyImpacts.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[10px] font-semibold tracking-wide text-steel-gray uppercase">
            Impact by strategy
          </h3>
          <ul className="flex flex-col gap-2">
            {strategyImpacts.map(item => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-white/8 bg-white/3 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-soft-white">{item.title}</p>
                  <p className="text-[10px] tracking-wide text-steel-gray uppercase">
                    {item.category} · {Math.round(item.confidence * 100)}% conf.
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 text-sm font-medium tabular-nums',
                    item.annualSavings > 0 ? 'text-emerald-300' : 'text-steel-gray'
                  )}
                >
                  {item.annualSavings > 0 ? '-' : ''}
                  {formatCurrency(Math.max(0, item.annualSavings))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Assumptions */}
      {allAssumptions.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[10px] font-semibold tracking-wide text-steel-gray uppercase">
            Assumptions in play
          </h3>
          <ul className="flex flex-col gap-1.5 rounded-lg border border-white/8 bg-white/3 p-3">
            {allAssumptions.map((a, i) => (
              <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-soft-white/85">
                <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-electric-blue" />
                {a}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-auto text-[10px] leading-relaxed text-steel-gray/60">
        Estimates use{' '}
        {TAX_YEAR_IS_PROJECTED[baseline.year] ? `projected ${baseline.year}` : `${baseline.year}`}
        {' '}federal brackets, the standard deduction, and a flat 20% Section 199A QBI deduction.
        State tax and credits are not modeled. Final advice should come from a CPA or EA.
      </p>
    </div>
  );
}

// Special headline metric: large, count-up, with currency formatting.
function MetricCountUpInline({ value }: { value: number }) {
  const animated = useCountUp(value, 300);
  return (
    <p className="mt-1 text-3xl font-medium tabular-nums text-soft-white">
      {formatCurrency(Math.max(0, Math.round(animated)))}
    </p>
  );
}
