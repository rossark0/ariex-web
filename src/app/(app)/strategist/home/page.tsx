'use client';

import { Button } from '@/components/ui/button';
import { getFullClientsByStrategist, FullClientMock } from '@/lib/mocks/client-full';
import { getClientStatus } from '@/lib/client-status';
import { Envelope } from '@phosphor-icons/react/dist/ssr';
import { useRouter } from 'next/navigation';
import { useRoleRedirect } from '@/hooks/use-role-redirect';

// Current logged-in strategist
const CURRENT_STRATEGIST_ID = 'strategist-001';
const clients = getFullClientsByStrategist(CURRENT_STRATEGIST_ID);

// ============================================================================
// CLIENT ACTIVITY TYPES & GENERATION
// ============================================================================

type ActivityType =
  | 'account_created'
  | 'agreement_signed'
  | 'payment_received'
  | 'document_uploaded'
  | 'strategy_signed'
  | 'agreement_sent'
  | 'payment_pending';

interface ClientActivity {
  id: string;
  clientId: string;
  clientName: string;
  type: ActivityType;
  description: string;
  actionLabel: string;
  date: Date;
}

function generateClientActivities(clients: FullClientMock[]): ClientActivity[] {
  const activities: ClientActivity[] = [];

  clients.forEach(client => {
    const clientName = client.user.name?.split(' ')[0] || 'Client';

    // Account created
    activities.push({
      id: `${client.user.id}-created`,
      clientId: client.user.id,
      clientName,
      type: 'account_created',
      description: `${clientName} account was created`,
      actionLabel: 'View',
      date: client.user.createdAt,
    });

    // Agreement signed
    const agreementTask = client.onboardingTasks.find(t => t.type === 'sign_agreement');
    if (agreementTask?.status === 'completed' && agreementTask.completedAt) {
      activities.push({
        id: `${client.user.id}-agreement`,
        clientId: client.user.id,
        clientName,
        type: 'agreement_signed',
        description: `${clientName} signed the service agreement`,
        actionLabel: 'View',
        date: agreementTask.completedAt,
      });
    }

    // Payment received
    const payment = client.payments.find(p => p.status === 'completed');
    if (payment?.paidAt) {
      activities.push({
        id: `${client.user.id}-payment`,
        clientId: client.user.id,
        clientName,
        type: 'payment_received',
        description: `${clientName} paid $${payment.amount}`,
        actionLabel: 'View',
        date: payment.paidAt,
      });
    }

    // Documents uploaded
    const uploadedDocs = client.documents.filter(d => d.category !== 'contract');
    uploadedDocs.forEach(doc => {
      activities.push({
        id: `${client.user.id}-doc-${doc.id}`,
        clientId: client.user.id,
        clientName,
        type: 'document_uploaded',
        description: `${clientName} uploaded ${doc.originalName.replace(/\.[^/.]+$/, '')}`,
        actionLabel: 'View',
        date: doc.createdAt,
      });
    });

    // Strategy signed
    const strategyDoc = client.documents.find(
      d =>
        d.category === 'contract' &&
        d.originalName.toLowerCase().includes('strategy') &&
        d.signatureStatus === 'SIGNED'
    );
    if (strategyDoc?.signedAt) {
      activities.push({
        id: `${client.user.id}-strategy`,
        clientId: client.user.id,
        clientName,
        type: 'strategy_signed',
        description: `${clientName} signed the tax strategy`,
        actionLabel: 'View',
        date: strategyDoc.signedAt,
      });
    }
  });

  // Sort by date descending (most recent first)
  return activities.sort((a, b) => b.date.getTime() - a.date.getTime());
}

function groupActivitiesByDate(activities: ClientActivity[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; activities: ClientActivity[] }[] = [];

  const todayActivities = activities.filter(a => {
    const actDate = new Date(a.date);
    actDate.setHours(0, 0, 0, 0);
    return actDate.getTime() === today.getTime();
  });

  const yesterdayActivities = activities.filter(a => {
    const actDate = new Date(a.date);
    actDate.setHours(0, 0, 0, 0);
    return actDate.getTime() === yesterday.getTime();
  });

  const earlierActivities = activities.filter(a => {
    const actDate = new Date(a.date);
    actDate.setHours(0, 0, 0, 0);
    return actDate.getTime() < yesterday.getTime();
  });

  if (todayActivities.length > 0) {
    groups.push({ label: 'Today', activities: todayActivities });
  }
  if (yesterdayActivities.length > 0) {
    groups.push({ label: 'Yesterday', activities: yesterdayActivities });
  }
  if (earlierActivities.length > 0) {
    groups.push({ label: 'Earlier', activities: earlierActivities });
  }

  return groups;
}

// Generate activities from all clients
const allActivities = generateClientActivities(clients);
const groupedActivities = groupActivitiesByDate(allActivities);

// ============================================================================
// UPCOMING EVENTS
// ============================================================================

interface UpcomingEvent {
  id: string;
  title: string;
  date: Date;
  type: 'deadline' | 'meeting' | 'reminder';
}

const now = new Date();
const inHours = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000);
const inDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

const upcomingEvents: UpcomingEvent[] = [
  { id: '1', title: 'Client Call - Michael Chen', date: inHours(3), type: 'meeting' },
  { id: '2', title: 'Q4 Estimated Tax Payment Due', date: inDays(1), type: 'deadline' },
  { id: '3', title: 'Review Sarah Johnson Documents', date: inDays(2), type: 'reminder' },
  { id: '4', title: 'Form 1099 Filing Deadline', date: inDays(6), type: 'deadline' },
  { id: '5', title: 'W-2 Distribution Deadline', date: inDays(12), type: 'deadline' },
];

function formatTimeRemaining(date: Date): { text: string; isUrgent: boolean } {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs < 0) return { text: 'Passed', isUrgent: false };

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 60) return { text: `in ${diffMins}m`, isUrgent: true };
  if (diffHours < 24) return { text: `in ${diffHours}h`, isUrgent: true };
  if (diffDays === 1) return { text: 'Tomorrow', isUrgent: true };
  if (diffDays < 7) return { text: `in ${diffDays} days`, isUrgent: diffDays <= 3 };
  if (diffWeeks === 1) return { text: 'in 1 week', isUrgent: false };
  if (diffDays < 30) return { text: `in ${diffWeeks} weeks`, isUrgent: false };
  if (diffDays < 60) return { text: 'in 1 month', isUrgent: false };
  return { text: `in ${Math.floor(diffDays / 30)} months`, isUrgent: false };
}

function EventRow({ event }: { event: UpcomingEvent }) {
  const month = event.date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = event.date.getDate();
  const timeRemaining = formatTimeRemaining(event.date);

  return (
    <div className="flex items-center gap-4 py-3">
      <div className="flex h-9 w-9 flex-col items-center justify-center rounded-lg bg-emerald-50">
        <p className="text-[9px] font-semibold tracking-tight text-emerald-700">{month}</p>
        <p className="h-auto text-sm font-semibold text-emerald-700">{day}</p>
      </div>
      <div className="flex flex-1 flex-col">
        <span className="font-medium text-black">{event.title}</span>
        <span className="text-xs text-zinc-500">
          {event.date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
          {' at '}
          {event.date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })}
        </span>
      </div>
      <div
        className={`shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium ${timeRemaining.isUrgent ? 'text-zinc-700' : 'text-zinc-600'}`}
      >
        Deadline {timeRemaining.text}
      </div>
    </div>
  );
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
// ACTIVITY ROW COMPONENT
// ============================================================================

function ActivityRow({ activity }: { activity: ClientActivity }) {
  const router = useRouter();

  // Get the client to show their initials
  const client = clients.find(c => c.user.id === activity.clientId);
  const initials = getInitials(client?.user.name || null);
  const status = client ? getClientStatus(client) : null;

  return (
    <div className="flex items-center gap-4 py-3">
      {/* Avatar */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-white">
        {initials}
      </div>

      {/* Activity Info */}
      <div className="flex flex-1 flex-col">
        <div className="font-medium text-zinc-900">
          {activity.description}{' '}
          {/* {status && (
            <div className="hidden sm:flex">
              <span
                className={`flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 pl-2 text-xs font-medium ${status.textClassName}`}
              >
                <div className={`h-1 w-1 rounded-full ${status.badgeColor}`} />
                {status.label.split(' ')[0]}
              </span>
            </div>
          )}{' '} */}
        </div>
        <span className="text-sm text-zinc-500">{formatRelativeTime(activity.date)}</span>
      </div>

      {/* Status Badge (optional) */}

      {/* Action Button */}
      <button
        onClick={() => router.push(`/strategist/clients/${activity.clientId}`)}
        className="rounded-lg cursor-pointer bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600"
      >
        {activity.actionLabel}
      </button>
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function StrategistDashboardPage() {
  useRoleRedirect('STRATEGIST');
  const router = useRouter();

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1">
        {/* Top Section - Upcoming Tax Deadlines */}
        <div className="shrink-0 bg-zinc-50/90 pt-8 pb-6">
          <div className="mx-auto w-full max-w-[642px]">
            <h2 className="mb-4 text-xl font-medium tracking-tight">Upcoming Tax Deadlines</h2>
            <div className="flex flex-col gap-2 overflow-x-auto pb-2">
              {upcomingEvents.map(event => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section - Recent Activity */}
        <div className="bg-white pb-42">
          <div className="mx-auto flex w-full max-w-[642px] flex-col py-6">
            <div className="mb-4 flex w-full items-center justify-between">
              {/* <div>
                <h2 className="font-medium text-zinc-900">Recent Activity</h2>
                <p className="text-sm text-zinc-500">{allActivities.length} activities from {clients.length} clients</p>
              </div> */}
              {/* <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/strategist/clients')}
              >
                View all clients
              </Button> */}
            </div>

            {/* Grouped Activities */}
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

              {allActivities.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="mb-1 text-lg font-semibold text-zinc-800">No recent activity</p>
                  <p className="text-sm text-zinc-400">Client activities will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
