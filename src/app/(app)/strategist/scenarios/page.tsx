'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Sparkle, Trash, User } from '@phosphor-icons/react';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { Reveal } from '@/components/ui/reveal';
import { computeScenario, useScenarios } from '@/lib/tax/scenarios';
import { listClients, type ApiClient } from '@/lib/api/strategist.api';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ScenarioListPage() {
  useRoleRedirect('STRATEGIST');
  const router = useRouter();
  const { scenarios, hydrated, createScenario, deleteScenario } = useScenarios();
  const [clients, setClients] = useState<ApiClient[]>([]);

  useEffect(() => {
    let cancelled = false;
    listClients()
      .then(list => {
        if (!cancelled) setClients(list);
      })
      .catch(err => {
        console.error('[ScenarioList] Failed to load clients:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const clientById = new Map(
    clients.map(c => [c.id, c.name || c.email] as const)
  );

  const handleCreate = () => {
    const scenario = createScenario('New scenario');
    router.push(`/strategist/scenarios/${scenario.id}`);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this scenario? This cannot be undone.')) return;
    deleteScenario(id);
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="shrink-0 pt-6 pb-6">
        <div className="mx-auto w-full max-w-[720px] px-6">
          <Reveal>
            <h1 className="mb-2 text-2xl font-medium tracking-tight text-soft-white">
              Tax Scenarios
            </h1>
          </Reveal>
          <Reveal delay={60}>
            <p className="text-sm text-steel-gray">
              Branch through strategy options, watch live tax impact, and capture the assumptions
              behind each plan.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <button
              onClick={handleCreate}
              className="mt-5 flex items-center gap-1.5 rounded-md bg-electric-blue px-3 py-1.5 text-sm font-medium text-soft-white transition-colors duration-150 ease-linear hover:bg-electric-blue/85"
            >
              <Plus weight="bold" className="h-3.5 w-3.5" />
              New scenario
            </button>
          </Reveal>
        </div>
      </div>

      <div className="flex-1">
        <div className="mx-auto w-full max-w-[720px] px-6 pb-12">
          {!hydrated ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-electric-blue" />
            </div>
          ) : scenarios.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/3 px-6 py-16 text-center">
              <Sparkle weight="duotone" className="h-7 w-7 text-steel-gray/70" />
              <p className="text-sm font-medium text-soft-white">No scenarios yet</p>
              <p className="max-w-xs text-xs leading-relaxed text-steel-gray/70">
                Create a scenario to compare the tax impact of strategies like S-Corp election,
                Solo 401(k), Section 179, or HSA contributions.
              </p>
            </div>
          ) : (
            <ul data-focus-group className="flex flex-col gap-2">
              {scenarios.map((scenario, index) => {
                const computation = computeScenario(scenario);
                const enabledCount = scenario.enabledStrategies.length;
                const linkedClientName = scenario.clientId
                  ? clientById.get(scenario.clientId)
                  : undefined;
                // Stagger reveals so the list reads as ARIEX is laying the
                // scenarios out one after another — caps at 12 items so a
                // long list doesn't drag past the user's attention window.
                const revealDelay = Math.min(index, 11) * 60;
                return (
                  <Reveal key={scenario.id} delay={revealDelay}>
                  <li
                    data-focus-item
                    onClick={() => router.push(`/strategist/scenarios/${scenario.id}`)}
                    className="group flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-white/8 bg-white/3 px-4 py-3 transition-colors duration-150 ease-linear hover:border-white/15 hover:bg-white/5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-soft-white">
                          {scenario.name}
                        </p>
                        {linkedClientName && (
                          <span className="flex shrink-0 items-center gap-1 rounded-full border border-electric-blue/30 bg-electric-blue/10 px-2 py-0.5 text-[10px] font-medium text-electric-blue">
                            <User weight="fill" className="h-2.5 w-2.5" />
                            {linkedClientName}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-steel-gray">
                        {enabledCount} {enabledCount === 1 ? 'strategy' : 'strategies'} enabled
                        {' · '}
                        Updated {formatDate(scenario.updatedAt)}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-[10px] font-semibold tracking-wide text-steel-gray uppercase">
                        Projected savings
                      </p>
                      <p className="text-sm font-medium tabular-nums text-emerald-300">
                        {computation.totalAnnualSavings > 0
                          ? `-${formatCurrency(computation.totalAnnualSavings)}`
                          : '—'}
                      </p>
                    </div>
                    <button
                      onClick={e => handleDelete(scenario.id, e)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-steel-gray opacity-0 transition-opacity duration-150 ease-linear group-hover:opacity-100 hover:bg-red-500/15 hover:text-red-300"
                      title="Delete scenario"
                    >
                      <Trash weight="bold" className="h-3.5 w-3.5" />
                    </button>
                  </li>
                  </Reveal>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
