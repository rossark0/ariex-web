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
    <div className="rounded-xl bg-surface p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-steel-gray">{label}</p>
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

const RISK_TONE: Record<'low' | 'medium' | 'high', { dot: string; label: string }> = {
  low: { dot: 'bg-emerald-400', label: 'text-emerald-300' },
  medium: { dot: 'bg-amber-400', label: 'text-amber-300' },
  high: { dot: 'bg-red-400', label: 'text-red-300' },
};

export function ScenarioImpactPanel({ computation }: ScenarioImpactPanelProps) {
  const {
    baseline,
    projected,
    totalAnnualSavings,
    totalCashOutlay,
    ineligibleEnabled,
    overallConfidence,
    strategyImpacts,
    allAssumptions,
  } = computation;

  const effectiveDelta = projected.effectiveRate - baseline.effectiveRate;
  const projectedRate = (projected.effectiveRate * 100).toFixed(1);
  const baselineRate = (baseline.effectiveRate * 100).toFixed(1);
  const animatedConfidence = useCountUp(Math.round(overallConfidence * 100), 300);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Headline savings */}
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-300">
          Estimated annual savings
        </p>
        <MetricCountUpInline value={totalAnnualSavings} />
        <p className="mt-1.5 text-xs text-steel-gray">
          {baselineRate}% → {projectedRate}% effective rate
          {effectiveDelta < 0 ? '' : ''}
        </p>
        {totalCashOutlay > 0 && (
          <p className="mt-3 border-t border-white/6 pt-3 text-[11px] text-steel-gray">
            Cash deployed:{' '}
            <span className="font-medium tabular-nums text-soft-white">
              {formatCurrency(totalCashOutlay)}
            </span>{' '}
            <span className="text-steel-gray/70">
              (contributions, fees & purchases needed to implement)
            </span>
          </p>
        )}
      </div>

      {/* Ineligible warnings — strategies toggled on but not applicable */}
      {ineligibleEnabled.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-amber-300">
            Won&apos;t apply at current inputs
          </h3>
          <ul className="flex flex-col gap-2">
            {ineligibleEnabled.map(x => (
              <li
                key={x.id}
                className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-4"
              >
                <p className="text-sm font-medium text-amber-200">{x.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-soft-white/80">{x.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Baseline vs projected */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCountUp label="Baseline tax" value={baseline.totalTax} />
        <MetricCountUp label="Projected tax" value={projected.totalTax} tone="projected" />
      </div>

      {/* Tax composition breakdown (baseline → projected) */}
      <div className="rounded-xl bg-surface p-4">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-steel-gray">
          Tax composition
        </p>
        <CompositionRow label="Federal income" before={baseline.federalIncomeTax} after={projected.federalIncomeTax} />
        <CompositionRow label="Self-employment" before={baseline.selfEmploymentTax} after={projected.selfEmploymentTax} />
        {(baseline.stateTax > 0 || projected.stateTax > 0) && (
          <CompositionRow label="State income" before={baseline.stateTax} after={projected.stateTax} />
        )}
        {(baseline.niit > 0 || projected.niit > 0) && (
          <CompositionRow label="NIIT (3.8%)" before={baseline.niit} after={projected.niit} />
        )}
        {(baseline.additionalMedicare > 0 || projected.additionalMedicare > 0) && (
          <CompositionRow label="Addl. Medicare (0.9%)" before={baseline.additionalMedicare} after={projected.additionalMedicare} />
        )}
      </div>

      {/* Confidence */}
      <div className="rounded-xl bg-surface p-4">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wide text-steel-gray">
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

      {/* Per-strategy breakdown — strategist-grade detail */}
      {strategyImpacts.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-steel-gray">
            Impact by strategy
          </h3>
          <ul className="flex flex-col gap-2">
            {strategyImpacts.map(item => {
              const risk = RISK_TONE[item.auditRisk];
              return (
                <li key={item.id} className="rounded-xl bg-surface p-4">
                  {/* Title + savings */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-soft-white">{item.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-wide text-steel-gray">
                        <span>{item.category}</span>
                        <span className="text-steel-gray/40">·</span>
                        <span>{Math.round(item.confidence * 100)}% conf</span>
                        <span className="text-steel-gray/40">·</span>
                        <span className={cn('flex items-center gap-1', risk.label)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', risk.dot)} aria-hidden />
                          {item.auditRisk} risk
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 text-base font-semibold tabular-nums',
                        item.annualSavings > 0 ? 'text-emerald-300' : 'text-steel-gray'
                      )}
                    >
                      {item.annualSavings > 0 ? '−' : ''}
                      {formatCurrency(Math.max(0, item.annualSavings))}
                    </span>
                  </div>

                  {/* Cash deployed */}
                  {item.cashOutlay > 0 && (
                    <div className="mt-3 flex items-baseline justify-between text-[11px]">
                      <span className="text-steel-gray">Cash deployed</span>
                      <span className="tabular-nums text-soft-white">
                        {formatCurrency(item.cashOutlay)}
                      </span>
                    </div>
                  )}

                  {/* Authority + Deadline */}
                  <div className="mt-3 border-t border-white/6 pt-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-steel-gray/80">
                      Authority
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-soft-white/90">
                      {item.authority.label}
                    </p>
                    {item.authority.detail && (
                      <p className="mt-1 text-[11px] leading-relaxed text-steel-gray/80">
                        {item.authority.detail}
                      </p>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-steel-gray/80">
                      Deadline
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-electric-blue/90">
                      {item.deadline}
                    </p>
                  </div>

                  {/* Next steps */}
                  {item.nextSteps.length > 0 && (
                    <div className="mt-3 border-t border-white/6 pt-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-steel-gray/80">
                        Next steps
                      </p>
                      <ol className="mt-1.5 flex flex-col gap-1.5">
                        {item.nextSteps.map((step, i) => (
                          <li
                            key={i}
                            className="flex gap-2 text-[11px] leading-relaxed text-soft-white/85"
                          >
                            <span className="shrink-0 tabular-nums text-steel-gray/70">
                              {i + 1}.
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Assumptions */}
      {allAssumptions.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-steel-gray">
            Assumptions in play
          </h3>
          <ul className="flex flex-col gap-1.5 rounded-xl bg-surface p-4">
            {allAssumptions.map((a, i) => (
              <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-soft-white/85">
                <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-electric-blue" />
                {a}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-auto pt-1 text-[11px] leading-relaxed text-steel-gray/55">
        Estimates use{' '}
        {TAX_YEAR_IS_PROJECTED[baseline.year] ? `projected ${baseline.year}` : `${baseline.year}`}
        {' '}federal brackets, standard deduction, flat 20% §199A QBI, SE tax, NIIT (3.8%), and
        Additional Medicare (0.9%).
        {baseline.state !== 'none' && (
          <> State tax for {baseline.state} approximated at top marginal rate × AGI; per-state
          deductions, credits, and city add-ons are not modeled.</>
        )}
        {baseline.state === 'none' && <> State tax is not modeled (state set to none).</>}
        {' '}Final advice should come from a CPA or EA.
      </p>
    </div>
  );
}

// Special headline metric: large, count-up, with currency formatting.
function MetricCountUpInline({ value }: { value: number }) {
  const animated = useCountUp(value, 300);
  return (
    <p className="mt-2 text-[2rem] font-semibold leading-none tracking-tight tabular-nums text-soft-white">
      {formatCurrency(Math.max(0, Math.round(animated)))}
    </p>
  );
}

// Row in the composition breakdown — shows baseline → projected with delta.
function CompositionRow({
  label,
  before,
  after,
}: {
  label: string;
  before: number;
  after: number;
}) {
  const delta = before - after;
  const animatedAfter = useCountUp(after, 300);
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5 text-xs">
      <span className="text-steel-gray">{label}</span>
      <span className="flex items-baseline gap-2 tabular-nums">
        <span className="text-steel-gray/60 line-through">{formatCurrency(before)}</span>
        <span className="text-soft-white">{formatCurrency(Math.round(animatedAfter))}</span>
        {delta !== 0 && (
          <span className={cn('text-[11px]', delta > 0 ? 'text-emerald-300' : 'text-amber-300')}>
            {delta > 0 ? '−' : '+'}
            {formatCurrency(Math.abs(delta))}
          </span>
        )}
      </span>
    </div>
  );
}
