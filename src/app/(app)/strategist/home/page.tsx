'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { useAuth } from '@/contexts/auth/AuthStore';
import { listClients, type ApiClient } from '@/lib/api/strategist.api';

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

function ActivityRow({ activity }: { activity: ClientActivity }) {
  const router = useRouter();
  const initials = getInitials(activity.clientName);

  return (
    <div className="flex items-center gap-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-white">
        {initials}
      </div>
      <div className="flex flex-1 flex-col">
        <div className="font-medium text-zinc-900">{activity.description}</div>
        <span className="text-sm text-zinc-500">{formatRelativeTime(activity.date)}</span>
      </div>
      <button
        onClick={() => router.push(`/strategist/clients/${activity.clientId}`)}
        className="cursor-pointer rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600"
      >
        {activity.actionLabel}
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
      <p className="mt-4 text-sm text-zinc-500">Loading...</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="mb-1 text-lg font-semibold text-zinc-800">No recent activity</p>
      <p className="text-sm text-zinc-400">
        Client activities will appear here as you work with them
      </p>
    </div>
  );
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
        // Load clients from API
        const clientsData = await listClients();
        setClients(clientsData);

        // Generate activities from clients
        const generatedActivities: ClientActivity[] = clientsData.map(client => ({
          id: `${client.id}-created`,
          clientId: client.id,
          clientName: client.name || client.email,
          type: 'account_created',
          description: `${client.name || 'New client'} account was created`,
          actionLabel: 'View',
          date: new Date(client.createdAt),
        }));

        // Sort by date descending
        generatedActivities.sort((a, b) => b.date.getTime() - a.date.getTime());
        setActivities(generatedActivities);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Group activities by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groupedActivities = [
    {
      label: 'Today',
      activities: activities.filter(a => {
        const d = new Date(a.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      }),
    },
    {
      label: 'Yesterday',
      activities: activities.filter(a => {
        const d = new Date(a.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === yesterday.getTime();
      }),
    },
    {
      label: 'Earlier',
      activities: activities.filter(a => {
        const d = new Date(a.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() < yesterday.getTime();
      }),
    },
  ].filter(g => g.activities.length > 0);

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1">
        {/* Welcome Section */}
        <div className="shrink-0 bg-zinc-50/90 pt-8 pb-6">
          <div className="mx-auto w-full max-w-[642px]">
            <h1 className="mb-2 text-2xl font-semibold text-zinc-900">
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
            <p className="mb-6 text-zinc-500">
              {clients?.length > 0
                ? `You have ${clients.length} client${clients.length !== 1 ? 's' : ''}`
                : 'Get started by adding your first client'}
            </p>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="bg-white pb-42">
          <div className="mx-auto flex w-full max-w-[642px] flex-col py-6">
            <div className="mb-4 flex w-full items-center justify-between">
              <h2 className="font-medium text-zinc-900">Recent Activity</h2>
              {clients.length > 0 && (
                <button
                  onClick={() => router.push('/strategist/clients')}
                  className="text-sm text-emerald-600 hover:text-emerald-700"
                >
                  View all clients →
                </button>
              )}
            </div>

            {isLoading ? (
              <LoadingState />
            ) : activities.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex flex-col">
                {groupedActivities.map(group => (
                  <div key={group.label} className="mb-6">
                    <p className="mb-3 text-sm font-medium text-zinc-400">{group.label}</p>
                    <div className="flex flex-col divide-y divide-zinc-100">
                      {group.activities.slice(0, 5).map(activity => (
                        <ActivityRow key={activity.id} activity={activity} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
