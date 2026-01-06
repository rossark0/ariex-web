'use client';

import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { useRouter } from 'next/navigation';
import { getFullClientsByStrategist } from '@/lib/mocks/client-full';
import { getClientStatus } from '@/lib/client-status';
import { ArrowLeft } from '@phosphor-icons/react';

interface Props {
  params: { strategistId: string };
}

export default function ComplianceStrategistDetailPage({ params }: Props) {
  useRoleRedirect('COMPLIANCE');
  const router = useRouter();

  // Get strategist's clients
  const clients = getFullClientsByStrategist(params.strategistId);

  const strategistNames: Record<string, string> = {
    'strategist-001': 'Alex Morgan',
    'strategist-002': 'Sarah Thompson',
    'strategist-003': 'Michael Chen',
  };

  const strategistName = strategistNames[params.strategistId] || 'Strategist';

  return (
    <section className="flex flex-col gap-6 p-6">
      {/* Back Button */}
      <button
        onClick={() => router.push('/compliance/strategists')}
        className="flex w-fit items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Strategists
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{strategistName}</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {clients.length} clients · Compliance oversight
        </p>
      </div>

      {/* Clients List */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Assigned Clients</h2>
        <div className="flex flex-col gap-3">
          {clients.map(client => {
            const status = getClientStatus(client);
            const initials = client.user.name
              ?.split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase() || '??';

            return (
              <button
                key={client.user.id}
                onClick={() => router.push(`/compliance/clients/${client.user.id}`)}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 text-left transition-colors hover:border-emerald-500 hover:bg-emerald-50"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-white">
                    {initials}
                  </div>

                  {/* Info */}
                  <div>
                    <div className="font-medium text-zinc-900">{client.user.name}</div>
                    <div className="text-sm text-zinc-500">{client.user.email}</div>
                  </div>
                </div>

                {/* Status Badge */}
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${status.badgeColor} ${status.textClassName}`}
                >
                  {status.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
