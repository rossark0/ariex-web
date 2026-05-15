'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { useAuth } from '@/contexts/auth/AuthStore';
import { listClients, listAgreements, type ApiAgreement, type ApiClient } from '@/lib/api/strategist.api';
import { useCountUp } from '@/hooks/use-count-up';
import { Reveal } from '@/components/ui/reveal';
import { ArrowRight, Warning } from '@phosphor-icons/react';
import { useAiPageContext } from '@/contexts/ai/hooks/use-ai-page-context';
import { useClientRankings } from '@/hooks/use-client-rankings';

// ============================================================================
// TYPES
// ============================================================================

interface ClientActivity {
  id: string;
  clientId: string;
  clientName: string;
  type: string;
  /** Short reason label shown as a badge, e.g. "Unsigned · 58d". */
  signal: string;
  /** One-sentence AI reasoning, shown as a tooltip on the signal badge. */
  reasoning: string;
  actionLabel: string;
  date: Date;
  /** Computed priority score — higher means more urgent. */
  priority: number;
  /** Whether this client should pulse with a risk flag. */
  atRisk: boolean;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getInitials(name: string | null): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    if (diffHours === 0) {
      return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
    }
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================================
// COMPONENTS
// ============================================================================

function PriorityRow({ activity, index }: { activity: ClientActivity; index: number }) {
  const router = useRouter();
  const [focused, setFocused] = useState(false);
  const initials = getInitials(activity.clientName);

  return (
    <Reveal delay={index * 60}>
      <div
        data-focus-item
        data-focused={focused || undefined}
        onMouseEnter={() => setFocused(true)}
        onMouseLeave={() => setFocused(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="group flex items-center gap-4 rounded-lg px-3 py-3 duration-150 ease-linear transition-colors hover:bg-white/4"
      >
        <div className="relative  flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-soft-white">
          {initials}
          {activity.atRisk && (
            <span
              className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-electric-blue animate-risk-pulse"
              aria-label="Needs attention"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium text-soft-white">
              {activity.clientName}
            </span>
            {activity.atRisk && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-electric-blue/30 bg-electric-blue/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-electric-blue uppercase">
                <Warning weight="fill" className="h-3 w-3" />
                Needs attention
              </span>
            )}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            {activity.signal && (
              <span
                title={activity.reasoning || undefined}
                className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                  activity.atRisk
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'bg-white/8 text-steel-gray'
                }`}
              >
                {activity.signal}
              </span>
            )}
            <span className="truncate text-xs text-steel-gray">
              {formatRelativeTime(activity.date)}
            </span>
          </div>
        </div>
        <button
          onClick={() => router.push(`/strategist/clients/${activity.clientId}`)}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-soft-white duration-150 ease-linear transition-colors hover:border-electric-blue/40 hover:bg-electric-blue/10 hover:text-electric-blue"
        >
          {activity.actionLabel}
          <ArrowRight weight="bold" className="h-3 w-3" />
        </button>
      </div>
    </Reveal>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-electric-blue border-t-transparent" />
      <p className="mt-4 text-sm text-steel-gray">Loading…</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="mb-1 text-lg font-semibold text-soft-white">No recent activity</p>
      <p className="text-sm text-steel-gray">
        Client activities will appear here as you work with them
      </p>
    </div>
  );
}

// ============================================================================
// PRIORITY HEURISTICS
// ============================================================================
//
// Priority + risk for strategist home reuses computeClientPriority from
// lib/client-priority.ts — same engine that drives the matrix view and the
// urgent-alerts badge. Single source of truth ensures the orderings are
// consistent everywhere a strategist looks.

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StrategistDashboardPage() {
  useRoleRedirect('STRATEGIST');
  const router = useRouter();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [agreements, setAgreements] = useState<ApiAgreement[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [clientsData, agreementsData] = await Promise.all([
          listClients(),
          listAgreements(),
        ]);
        setClients(clientsData);
        setAgreements(agreementsData || []);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Live rankings — AI-driven when /api/ai/prioritize-clients is available,
  // falls back to the deterministic engine if the API is unavailable.
  const { rankings, byClientId, source: rankingsSource, isLoading: rankingsLoading } =
    useClientRankings(clients, agreements);

  // Build the activity rows the UI renders, joined to rankings by clientId.
  const prioritized = useMemo<ClientActivity[]>(() => {
    if (clients.length === 0) return [];
    const clientById = new Map(clients.map(c => [c.id, c]));
    const ordered: ClientActivity[] = [];
    for (const ranking of rankings) {
      const client = clientById.get(ranking.clientId);
      if (!client) continue;
      const clientName = client.name || client.email;
      ordered.push({
        id: `${client.id}-priority`,
        clientId: client.id,
        clientName,
        type: 'account_created',
        signal: ranking.signal,
        reasoning: ranking.reasoning,
        actionLabel: ranking.atRisk ? 'See' : 'View',
        date: new Date(client.createdAt),
        priority: ranking.score,
        atRisk: ranking.atRisk,
      });
    }
    return ordered;
  }, [clients, rankings]);

  const animatedClientCount = useCountUp(clients.length, 300);

  const displayClientCount = Math.round(animatedClientCount);
  const atRiskCount = useMemo(() => prioritized.filter(a => a.atRisk).length, [prioritized]);
  const animatedAtRisk = useCountUp(atRiskCount, 300);
  const displayAtRisk = Math.round(animatedAtRisk);

  // byClientId is reserved for a future per-row "why this rank?" tooltip
  // that surfaces ranking.reasoning. The other two are consumed in JSX.
  void byClientId;

  // Push cross-client context to the AI rail so it can surface systemic insights
  // (e.g., "3 clients stalled at agreement signature").
  useAiPageContext({
    pageTitle: 'Strategist Dashboard',
    userRole: 'STRATEGIST',
    extra: {
      totalClients: clients.length,
      atRiskCount,
      clientSummary: clients.slice(0, 25).map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        status: c.status,
        createdAt: c.createdAt,
      })),
      topPriorities: prioritized.slice(0, 5).map(p => ({
        clientId: p.clientId,
        clientName: p.clientName,
        priority: p.priority,
        atRisk: p.atRisk,
        signal: p.signal,
        reasoning: p.reasoning,
      })),
    },
  });

  return (
    <div className="flex min-h-full flex-col bg-deep-navy">
      <div className="flex-1">
        {/* Welcome Section */}
        <div className="shrink-0 pt-6 pb-8">
          <div className="mx-auto w-full max-w-[720px] px-6">
            <Reveal>
              <h1 className="mb-2 text-3xl font-medium text-soft-white tracking-tight">
                Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
              </h1>
            </Reveal>
            <Reveal delay={80}>
              <p className="mb-8 text-steel-gray">
                {clients.length > 0
                  ? `You have ${displayClientCount} client${displayClientCount !== 1 ? 's' : ''}`
                  : 'Get started by adding your first client'}
              </p>
            </Reveal>

            {/* Stat strip */}
            {clients.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <Reveal delay={120}>
                  <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                    <p className="text-xs font-medium tracking-wide text-steel-gray uppercase">
                      Clients
                    </p>
                    <p className="mt-1 text-3xl font-medium text-soft-white tabular-nums">
                      {displayClientCount}
                    </p>
                  </div>
                </Reveal>
                <Reveal delay={180}>
                  <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                    <p className="text-xs font-medium tracking-wide text-steel-gray uppercase">
                      Need attention
                    </p>
                    <p
                      className={
                        'mt-1 text-3xl font-medium tabular-nums ' +
                        (displayAtRisk > 0 ? 'text-electric-blue' : 'text-soft-white')
                      }
                    >
                      {displayAtRisk}
                    </p>
                  </div>
                </Reveal>
              </div>
            )}
          </div>
        </div>

        {/* Priority Section */}
        <div className="pb-42">
          <div className="mx-auto flex w-full max-w-[720px] flex-col px-6 py-6">
            <div className="mb-4 flex w-full items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-medium text-soft-white">Priorities</h2>
                  {rankingsSource === 'ai' ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-electric-blue/30 bg-electric-blue/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-electric-blue uppercase"
                      title="Ranked by ARIEX from your live client and agreement data"
                    >
                      AI-ranked
                    </span>
                  ) : rankingsLoading ? (
                    <span
                      className="text-[10px] font-medium tracking-wide text-steel-gray/70 uppercase"
                      title="AI is analyzing — interim ranking from deterministic rules shown"
                    >
                      Analyzing…
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-steel-gray">
                  Sorted by urgency. Hover to focus, others dim
                </p>
              </div>
              {clients.length > 0 && (
                <button
                  onClick={() => router.push('/strategist/clients')}
                  className="flex items-center gap-1 text-sm text-electric-blue duration-150 ease-linear transition-colors hover:opacity-80"
                >
                  View all clients
                  <ArrowRight weight="bold" className="h-3 w-3" />
                </button>
              )}
            </div>

            {isLoading ? (
              <LoadingState />
            ) : prioritized.length === 0 ? (
              <EmptyState />
            ) : (
              <div data-focus-group className="flex flex-col">
                {prioritized.slice(0, 8).map((activity, idx) => (
                  <PriorityRow key={activity.id} activity={activity} index={idx} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
