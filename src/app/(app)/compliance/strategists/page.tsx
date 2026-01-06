'use client';

import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { useRouter } from 'next/navigation';

// Mock strategist data
const strategists = [
  { id: 'strategist-001', name: 'Alex Morgan', clientCount: 23, status: 'Active' },
  { id: 'strategist-002', name: 'Sarah Thompson', clientCount: 18, status: 'Active' },
  { id: 'strategist-003', name: 'Michael Chen', clientCount: 15, status: 'Active' },
  { id: 'strategist-004', name: 'Emily Rodriguez', clientCount: 21, status: 'Active' },
  { id: 'strategist-005', name: 'David Kim', clientCount: 12, status: 'Active' },
  { id: 'strategist-006', name: 'Jessica Martinez', clientCount: 19, status: 'Active' },
];

export default function ComplianceStrategistsPage() {
  useRoleRedirect('COMPLIANCE');
  const router = useRouter();

  return (
    <section className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Strategists</h1>
        <p className="mt-1 text-sm text-zinc-600">Monitor all tax strategists and their clients</p>
      </div>

      {/* Strategist List */}
      <div className="flex flex-col gap-3">
        {strategists.map(strategist => (
          <button
            key={strategist.id}
            onClick={() => router.push(`/compliance/strategists/${strategist.id}`)}
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 text-left transition-colors hover:border-emerald-500 hover:bg-emerald-50"
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-white">
                {strategist.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')}
              </div>

              {/* Info */}
              <div>
                <div className="font-semibold text-zinc-900">{strategist.name}</div>
                <div className="text-sm text-zinc-500">{strategist.clientCount} clients</div>
              </div>
            </div>

            {/* Status */}
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
              {strategist.status}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
