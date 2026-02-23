'use client';

import { useEffect, useMemo } from 'react';
import { AiFloatingChatbot } from '@/components/ai/ai-floating-chatbot';
import { useRouter } from 'next/navigation';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { useComplianceStrategists } from '@/contexts/compliance/hooks/use-compliance-strategists';
import { SpinnerGap, Users, FileText, ShieldCheck, Clock } from '@phosphor-icons/react';
import { useAiPageContext } from '@/contexts/ai/hooks/use-ai-page-context';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color = 'zinc',
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: 'zinc' | 'emerald' | 'amber' | 'teal';
}) {
  const colorMap = {
    zinc: 'bg-zinc-100 text-zinc-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    teal: 'bg-teal-100 text-teal-600',
  };

  return (
    <div className="rounded-xl border border-zinc-100 bg-white p-5">
      <div className="mb-3 flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${colorMap[color]}`}
        >
          <Icon className="h-5 w-5" weight="duotone" />
        </div>
        <span className="text-sm font-medium text-zinc-500">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-zinc-900">{value}</p>
      {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
    </div>
  );
}

// ============================================================================
// STRATEGIST ROW COMPONENT
// ============================================================================

function StrategistRow({
  name,
  email,
  clientCount,
  id,
}: {
  name: string;
  email: string;
  clientCount: number;
  id: string;
}) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/compliance/strategists/${id}`)}
      className="flex cursor-pointer items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-zinc-50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-white">
        {getInitials(name)}
      </div>
      <div className="flex flex-1 flex-col">
        <span className="font-medium text-zinc-900">{name}</span>
        <span className="text-sm text-zinc-500">{email}</span>
      </div>
      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
        {clientCount} client{clientCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function ComplianceHomePage() {
  useRoleRedirect('COMPLIANCE');
  const router = useRouter();

  const { strategists, isLoading, error, refresh } = useComplianceStrategists();

  // AI context
  useAiPageContext({
    userRole: 'COMPLIANCE',
    extra: {
      totalStrategists: strategists.length,
      totalClients: strategists.reduce((sum, s) => sum + s.clientCount, 0),
    },
  });

  // Compute summary stats from real data
  const stats = useMemo(() => {
    const totalStrategists = strategists.length;
    const totalClients = strategists.reduce((sum, s) => sum + s.clientCount, 0);
    return { totalStrategists, totalClients };
  }, [strategists]);

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1">
        {/* Header */}
        <div className="shrink-0 bg-zinc-50/90 pt-8 pb-6">
          <div className="mx-auto w-full max-w-[642px]">
            <h2 className="mb-2 text-xl font-medium tracking-tight">Compliance Overview</h2>
            <p className="mb-6 text-sm text-zinc-500">
              Monitor strategists, clients, and review strategies across the platform.
            </p>

            {/* Stats Grid */}
            {isLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-zinc-400">
                <SpinnerGap className="h-4 w-4 animate-spin" />
                Loading overview…
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
                <button onClick={refresh} className="ml-2 underline">
                  Retry
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={Users}
                  label="Strategists"
                  value={stats.totalStrategists}
                  subtitle="In your scope"
                  color="zinc"
                />
                <StatCard
                  icon={FileText}
                  label="Total Clients"
                  value={stats.totalClients}
                  subtitle="Across all strategists"
                  color="emerald"
                />
              </div>
            )}
          </div>
        </div>

        {/* Strategists List */}
        <div className="bg-white pb-42">
          <div className="mx-auto flex w-full max-w-[642px] flex-col py-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-medium text-zinc-900">Your Strategists</h3>
              <button
                onClick={() => router.push('/compliance/strategists')}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                View all
              </button>
            </div>

            {isLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex animate-pulse items-center gap-4 py-3">
                    <div className="h-10 w-10 rounded-full bg-zinc-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded bg-zinc-200" />
                      <div className="h-3 w-48 rounded bg-zinc-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : strategists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShieldCheck className="mb-3 h-10 w-10 text-zinc-300" weight="duotone" />
                <p className="mb-1 text-lg font-semibold text-zinc-800">No strategists yet</p>
                <p className="text-sm text-zinc-400">
                  Strategists will appear here once they invite you as their compliance reviewer.
                </p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-zinc-100">
                {strategists.map(s => (
                  <StrategistRow
                    key={s.id}
                    id={s.id}
                    name={s.name}
                    email={s.email}
                    clientCount={s.clientCount}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AiFloatingChatbot />
    </div>
  );
}
