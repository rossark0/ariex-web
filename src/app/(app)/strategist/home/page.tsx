'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { useAuth } from '@/contexts/auth/AuthStore';
import { listClients, type ApiClient } from '@/lib/api/strategist.api';
import { useCountUp } from '@/hooks/use-count-up';
import { Reveal } from '@/components/ui/reveal';
import { ArrowRight, Warning } from '@phosphor-icons/react';

// ============================================================================
// TYPES
// ============================================================================

interface ClientActivity {
  id: string;
  clientId: string;
  clientName: string;
  type: string;
  description: string;
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
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-soft-white">
          {initials}
          {activity.atRisk && (
            <span
              className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-electric-blue animate-risk-pulse"
              aria-label="Needs attention"
            />
          )}
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-2 font-medium text-soft-white">
            {activity.description}
            {activity.atRisk && (
              <span className="inline-flex items-center gap-1 rounded-full border border-electric-blue/30 bg-electric-blue/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-electric-blue uppercase">
                <Warning weight="fill" className="h-3 w-3" />
                Needs attention
              </span>
            )}
          </div>
          <span className="text-sm text-steel-gray">{formatRelativeTime(activity.date)}</span>
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

/**
 * Compute priority for an activity. Higher = more urgent. Currently a heuristic
 * based on account age — newer accounts and accounts that have been sitting for
 * 3–14 days without follow-up score higher. Replace with real signals (unsigned
 * agreements, overdue payments, missing documents) when available from the API.
 */
function computePriority(client: ApiClient): { score: number; atRisk: boolean } {
  const ageMs = Date.now() - new Date(client.createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const hasProfile = !!client.clientProfile?.onboardingComplete;

  let score = 0;
  // Brand-new clients get a small boost (welcome flow).
  if (ageDays < 1) score += 50;
  // 3–14 day window without onboarding complete is the risk band.
  if (!hasProfile && ageDays >= 3 && ageDays <= 14) score += 100;
  // Older accounts decay.
  score -= Math.max(0, ageDays - 14) * 2;

  const atRisk = !hasProfile && ageDays >= 3;
  return { score, atRisk };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StrategistDashboardPage() {
  useRoleRedirect('STRATEGIST');
  const router = useRouter();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [clients, setClients] = useState<ApiClient[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const clientsData = await listClients();
        setClients(clientsData);

        const generatedActivities: ClientActivity[] = clientsData.map(client => {
          const { score, atRisk } = computePriority(client);
          return {
            id: `${client.id}-created`,
            clientId: client.id,
            clientName: client.name || client.email,
            type: 'account_created',
            description: atRisk
              ? `${client.name || 'New client'} hasn't completed onboarding`
              : `${client.name || 'New client'} account was created`,
            actionLabel: atRisk ? 'Follow up' : 'View',
            date: new Date(client.createdAt),
            priority: score,
            atRisk,
          };
        });

        setActivities(generatedActivities);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Live priority re-sort — higher score first, then most recent.
  const prioritized = useMemo(
    () =>
      [...activities].sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return b.date.getTime() - a.date.getTime();
      }),
    [activities]
  );

  const animatedClientCount = useCountUp(clients.length, 300);

  const displayClientCount = Math.round(animatedClientCount);
  const atRiskCount = useMemo(() => prioritized.filter(a => a.atRisk).length, [prioritized]);
  const animatedAtRisk = useCountUp(atRiskCount, 300);
  const displayAtRisk = Math.round(animatedAtRisk);

  return (
    <div className="flex min-h-full flex-col bg-deep-navy">
      <div className="flex-1">
        {/* Welcome Section */}
        <div className="shrink-0 pt-12 pb-8">
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
                <h2 className="font-medium text-soft-white">Priorities</h2>
                <p className="text-xs text-steel-gray">
                  Sorted by urgency — hover to focus, others dim
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
