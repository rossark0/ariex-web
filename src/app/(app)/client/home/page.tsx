'use client';

import { useState } from 'react';
import { AiFloatingChatbot } from '@/components/ai/ai-floating-chatbot';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { useAuth } from '@/contexts/auth/AuthStore';
import { getFullUserProfile } from '@/contexts/auth/data/mock-users';
import { getStrategistById } from '@/lib/mocks/strategist-full';
import type { FullClientMock } from '@/lib/mocks/client-full';
import {
  getClientTimelineAndStatus,
  CLIENT_STATUS_CONFIG,
  type ClientStatusKey,
} from '@/lib/client-status';
import {
  EnvelopeIcon,
  FileIcon,
  PhoneIcon,
  Check as CheckIcon,
  BuildingsIcon,
  CreditCard,
  PencilLine,
  ChartBar,
  CalendarDot,
  Paperclip,
  User,
} from '@phosphor-icons/react';
import { Check, Clock, Strategy } from '@phosphor-icons/react/dist/ssr';

// ============================================================================
// CLIENT ACTIVITY TYPES & DATA
// ============================================================================

type ActivityType =
  | 'document_uploaded'
  | 'payment_completed'
  | 'agreement_signed'
  | 'strategy_received'
  | 'meeting_scheduled'
  | 'document_requested';

interface ClientActivity {
  id: string;
  type: ActivityType;
  description: string;
  date: Date;
  actionLabel?: string;
}

// Helper functions for dates
const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

const clientActivities: ClientActivity[] = [
  {
    id: '1',
    type: 'payment_completed',
    description: 'Payment of $499 was processed successfully',
    date: daysAgo(1),
  },
  {
    id: '2',
    type: 'agreement_signed',
    description: 'You signed the service agreement',
    date: daysAgo(1),
  },
];

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

const groupedActivities = groupActivitiesByDate(clientActivities);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
  const getActivityIcon = () => {
    const iconClass = 'h-5 w-5 text-zinc-600';
    switch (activity.type) {
      case 'document_uploaded':
        return <FileIcon className={iconClass} weight="fill" />;
      case 'payment_completed':
        return <CreditCard className={iconClass} weight="fill" />;
      case 'agreement_signed':
        return <PencilLine className={iconClass} weight="fill" />;
      case 'strategy_received':
        return <ChartBar className={iconClass} weight="fill" />;
      case 'meeting_scheduled':
        return <CalendarDot className={iconClass} weight="fill" />;
      case 'document_requested':
        return <Paperclip className={iconClass} weight="fill" />;
      default:
        return <FileIcon className={iconClass} />;
    }
  };

  return (
    <div className="flex items-center gap-4 py-3">
      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100">
        {getActivityIcon()}
      </div>

      {/* Activity Info */}
      <div className="flex flex-1 flex-col">
        <div className="font-medium text-zinc-900">{activity.description}</div>
        <span className="text-sm text-zinc-500">{formatRelativeTime(activity.date)}</span>
      </div>

      {/* Action Button */}
      {activity.actionLabel && (
        <button className="cursor-pointer rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600">
          {activity.actionLabel}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function ClientDashboardPage() {
  useRoleRedirect('CLIENT');
  const user = useAuth(state => state.user);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  // Get the current client data from auth
  if (!user) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900">Not authenticated</h1>
          <p className="text-zinc-500">Please sign in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  const clientProfile = getFullUserProfile(user) as FullClientMock | null;
  
  if (!clientProfile) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900">Profile not found</h1>
          <p className="text-zinc-500">Could not load your client profile.</p>
        </div>
      </div>
    );
  }

  const currentClient = clientProfile;

  // Get strategist information
  const strategist = currentClient.strategistId ? getStrategistById(currentClient.strategistId) : null;
  const taxYear = currentClient.user.createdAt.getFullYear();

  // Timeline step completion states
  const agreementTask = currentClient.onboardingTasks.find(t => t.type === 'sign_agreement');
  const paymentTask = currentClient.onboardingTasks.find(t => t.type === 'pay_initial');
  const documentsTask = currentClient.onboardingTasks.find(t => t.type === 'upload_documents');
  const payment = currentClient.payments[0];
  const agreementDoc = currentClient.documents.find(d => d.category === 'contract');

  const step1Complete = true; // Account always created
  const step2Complete = agreementTask?.status === 'completed';
  const step2Sent = agreementDoc?.signatureStatus === 'SENT' || step2Complete;
  const step3Complete = payment?.status === 'completed';
  const step3Sent = payment !== undefined;
  const step4Complete = documentsTask?.status === 'completed';
  const step4Sent = documentsTask?.status !== 'pending';

  // For brand new clients, there won't be a strategy yet
  const strategyDoc = currentClient.documents.find(
    d => d.category === 'contract' && d.originalName.toLowerCase().includes('strategy')
  );
  const step5Complete = strategyDoc?.signatureStatus === 'SIGNED';
  const step5Sent = strategyDoc?.signatureStatus === 'SENT';

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <div className="flex min-h-full flex-col">
  

      <div className="flex-1">
        {/* Top Section - Onboarding Activity Timeline */}
        <div className="shrink-0 bg-zinc-50/90 pt-8 pb-6">
          <div className="mx-auto w-full max-w-[642px]">
            <h2 className="mb-4 text-xl font-medium text-zinc-900">Coming Up</h2>
            <div className="relative pl-6">
              <div className="flex flex-col gap-0">
                {/* Step 1: Account Created - Always complete */}
                <div className="relative flex gap-4 pb-6">
                  <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  </div>
                  {/* Line to next step */}
                  <div className="absolute top-5 bottom-2 -left-[19px] w-0.5 bg-emerald-200" />
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium text-zinc-900">
                      Account created for {currentClient.profile.businessName || currentClient.user.name}
                    </span>
                    <span className="text-sm text-zinc-500">
                      Onboarding initiated by your tax strategist
                    </span>
                    <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                      {formatDate(currentClient.user.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Step 2: Agreement Phase */}
                <div className="relative flex gap-4 pb-6">
                  <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                    <div className={`h-2 w-2 rounded-full ${step2Sent || step2Complete ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                  </div>
                  {/* Line to next step */}
                  <div className={`absolute top-5 bottom-2 -left-[19px] w-0.5 ${step2Complete ? 'bg-emerald-200' : 'bg-zinc-200'}`} />
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium text-zinc-900">
                      {step2Complete
                        ? 'Service agreement signed'
                        : step2Sent
                          ? 'Agreement sent for signature'
                          : 'Agreement pending'}
                    </span>
                    <span className="text-sm text-zinc-500">
                      {step2Complete
                        ? 'Ariex Service Agreement 2024 was signed '
                        : step2Sent
                          ? 'Please review and sign the service agreement'
                          : 'Your strategist will send the agreement shortly'}
                    </span>
                    <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                      {formatDate(agreementTask?.updatedAt || currentClient.user.createdAt)}
                    </span>
                    {/* Show button only if previous step complete AND current step not complete */}
                    {step1Complete && step2Sent && !step2Complete && (
                      <button className="mt-2 w-fit rounded px-2 py-1 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700">
                        Sign agreement
                      </button>
                    )}
                  </div>
                </div>

                {/* Step 3: Payment Phase */}
                <div className="relative flex gap-4 pb-6">
                  <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                    <div className={`h-2 w-2 rounded-full ${step3Sent || step3Complete ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                  </div>
                  {/* Line to next step */}
                  <div className={`absolute top-5 bottom-2 -left-[19px] w-0.5 ${step3Complete ? 'bg-emerald-200' : 'bg-zinc-200'}`} />
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium text-zinc-900">
                      {step3Complete
                        ? `Payment completed · $${payment?.amount || 499}`
                        : step3Sent
                          ? `Payment pending · $${payment?.amount || 499}`
                          : 'Payment link pending'}
                    </span>
                    <span className="text-sm text-zinc-500">
                      {step3Complete
                        ? `Onboarding Fee - Tax Strategy Setup via ${payment?.paymentMethod || 'stripe'}`
                        : step3Sent
                          ? 'Complete payment to activate your account'
                          : 'Payment link will be sent after agreement is signed'}
                    </span>
                    <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                      {payment?.paidAt
                        ? formatDate(payment.paidAt)
                        : payment?.dueDate
                          ? `Due ${formatDate(payment.dueDate)}`
                          : formatDate(currentClient.user.createdAt)}
                    </span>
                    {/* Show button only if step 2 complete AND current step not complete */}
                    {step2Complete && step3Sent && !step3Complete && (
                      <button className="mt-2 w-fit rounded px-2 py-1 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700">
                        Complete payment
                      </button>
                    )}
                  </div>
                </div>

                {/* Step 4: Documents Phase */}
                <div className="relative flex gap-4 pb-6">
                  <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                    <div className={`h-2 w-2 rounded-full ${step4Sent || step4Complete ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                  </div>
                  {/* Line to next step */}
                  <div className={`absolute top-5 bottom-2 -left-[19px] w-0.5 ${step4Complete ? 'bg-emerald-200' : 'bg-zinc-200'}`} />
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium text-zinc-900">
                      {step4Complete
                        ? `Initial documents uploaded · ${currentClient.documents.filter(d => d.category !== 'contract').length} files`
                        : step4Sent
                          ? 'Waiting for document upload'
                          : 'Document request pending'}
                    </span>
                    <span className="text-sm text-zinc-500">
                      {step4Complete
                        ? 'W-2s, 1099s, and tax documents received'
                        : step4Sent
                          ? 'Please upload W-2s, 1099s, and relevant tax documents'
                          : 'You will be notified when documents are needed'}
                    </span>
                    <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                      {formatDate(documentsTask?.updatedAt || currentClient.user.createdAt)}
                    </span>
                    {/* Show button only if step 3 complete AND current step not complete */}
                    {step3Complete && step4Sent && !step4Complete && (
                      <button className="mt-2 w-fit rounded px-2 py-1 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700">
                        Upload documents
                      </button>
                    )}
                  </div>
                </div>

                {/* Step 5: Strategy Phase */}
                <div className="relative flex gap-4">
                  <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                    <div className={`h-2 w-2 rounded-full ${step5Sent || step5Complete ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium text-zinc-900">
                      {step5Complete
                        ? 'Tax strategy approved & signed'
                        : step5Sent
                          ? 'Strategy sent for approval'
                          : 'Tax strategy pending'}
                    </span>
                    <span className="text-sm text-zinc-500">
                      {step5Complete
                        ? strategyDoc?.originalName.replace(/\.[^/.]+$/, '') || 'Tax Strategy Plan'
                        : step5Sent
                          ? 'Review and sign your personalized tax strategy'
                          : 'Your strategist will create your personalized tax strategy after documents are reviewed'}
                    </span>
                    <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                      {strategyDoc?.signedAt
                        ? formatDate(strategyDoc.signedAt)
                        : strategyDoc?.createdAt
                          ? formatDate(strategyDoc.createdAt)
                          : formatDate(currentClient.user.createdAt)}
                    </span>
                    {/* Show button only if step 4 complete (onboarding done) AND strategy is sent but not signed */}
                    {step4Complete && step5Sent && !step5Complete && (
                      <button className="mt-2 w-fit rounded px-2 py-1 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700">
                        Review strategy
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Recent Activity */}
        <div className="bg-white pb-42">
          <div className="mx-auto flex w-full max-w-[642px] flex-col py-6">
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

              {clientActivities.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="mb-1 text-lg font-semibold text-zinc-800">No recent activity</p>
                  <p className="text-sm text-zinc-400">Your activities will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>?
      </div>

      <AiFloatingChatbot />
    </div>
  );
}
