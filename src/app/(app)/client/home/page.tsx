'use client';

import { useAuth } from '@/contexts/auth/AuthStore';
import { getFullUserProfile } from '@/contexts/auth/data/mock-users';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import type { FullClientMock } from '@/lib/mocks/client-full';
import { getStrategistById } from '@/lib/mocks/strategist-full';
import { FileIcon, Check } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { EmptyDocumentsIllustration } from '@/components/ui/empty-documents-illustration';
import { useState } from 'react';

// ============================================================================
// ANIMATED DOTS COMPONENT
// ============================================================================

function AnimatedDots() {
  return (
    <span className="inline-flex gap-0.5 pl-1">
      <span
        className="animate-[bounce_1.4s_ease-in-out_infinite]"
        style={{ animationDelay: '0ms' }}
      >
        .
      </span>
      <span
        className="animate-[bounce_1.4s_ease-in-out_infinite]"
        style={{ animationDelay: '200ms' }}
      >
        .
      </span>
      <span
        className="animate-[bounce_1.4s_ease-in-out_infinite]"
        style={{ animationDelay: '400ms' }}
      >
        .
      </span>
    </span>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // If today, show time
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // If yesterday
  if (diffDays === 1) {
    return 'Yesterday';
  }

  // If within a week
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  // Otherwise show date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function groupDocumentsByDate(
  documents: (typeof import('@/lib/mocks/client-full').fullClientMocks)[0]['documents']
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; documents: typeof documents }[] = [];

  const todayDocs = documents.filter(d => {
    const docDate = new Date(d.createdAt);
    docDate.setHours(0, 0, 0, 0);
    return docDate.getTime() === today.getTime();
  });

  const yesterdayDocs = documents.filter(d => {
    const docDate = new Date(d.createdAt);
    docDate.setHours(0, 0, 0, 0);
    return docDate.getTime() === yesterday.getTime();
  });

  const olderDocs = documents.filter(d => {
    const docDate = new Date(d.createdAt);
    docDate.setHours(0, 0, 0, 0);
    return docDate.getTime() < yesterday.getTime();
  });

  if (todayDocs.length > 0) {
    groups.push({ label: 'Today', documents: todayDocs });
  }
  if (yesterdayDocs.length > 0) {
    groups.push({ label: 'Yesterday', documents: yesterdayDocs });
  }
  if (olderDocs.length > 0) {
    groups.push({ label: 'Earlier', documents: olderDocs });
  }

  return groups;
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
  const strategist = currentClient.strategistId
    ? getStrategistById(currentClient.strategistId)
    : null;
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
            <h2 className="mb-4 text-xl font-medium text-zinc-900">Your to-dos</h2>
            <div className="relative pl-6">
              <div className="flex flex-col gap-0">
                {/* Step 1: Account Created - Always complete */}
                <div className="relative flex gap-4 pb-6">
                  <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                    <Check weight="bold" className="h-3 w-3 text-emerald-500" />
                  </div>
                  {/* Line to next step */}
                  <div className="absolute top-5 bottom-2 -left-[19px] w-0.5 bg-emerald-200" />
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium text-zinc-900">
                      Account created for{' '}
                      {currentClient.profile.businessName || currentClient.user.name}
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
                    {step2Complete ? (
                      <Check weight="bold" className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <div
                        className={`h-2 w-2 rounded-full ${step2Sent ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                      />
                    )}
                  </div>
                  {/* Line to next step */}
                  <div
                    className={`absolute top-5 bottom-2 -left-[19px] w-0.5 ${step2Complete ? 'bg-emerald-200' : 'bg-zinc-200'}`}
                  />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900">
                        {step2Complete
                          ? 'Service agreement signed'
                          : step2Sent
                            ? 'Agreement sent for signature'
                            : 'Agreement pending'}
                      </span>
                    </div>
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
                    {step1Complete && !step2Complete && (
                      <Badge variant={step2Sent ? 'warning' : 'warning'} className="mt-2 w-fit">
                        {step2Sent ? (
                          'Action required'
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                            </span>
                            Tax strategist action required
                          </span>
                        )}
                      </Badge>
                    )}
                    {/* Show button only if previous step complete AND current step not complete */}
                    {step1Complete && step2Sent && !step2Complete && (
                      <button className="mt-2 w-fit rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
                        Sign agreement
                      </button>
                    )}
                  </div>
                </div>

                {/* Step 3: Payment Phase */}
                <div className="relative flex gap-4 pb-6">
                  <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                    {step3Complete ? (
                      <Check weight="bold" className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <div
                        className={`h-2 w-2 rounded-full ${step3Sent ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                      />
                    )}
                  </div>
                  {/* Line to next step */}
                  <div
                    className={`absolute top-5 bottom-2 -left-[19px] w-0.5 ${step3Complete ? 'bg-emerald-200' : 'bg-zinc-200'}`}
                  />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900">
                        {step3Complete
                          ? `Payment completed · $${payment?.amount || 499}`
                          : step3Sent
                            ? `Payment pending · $${payment?.amount || 499}`
                            : 'Payment link pending'}
                      </span>
                    </div>
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
                    {step2Complete && !step3Complete && (
                      <Badge variant={step3Sent ? 'warning' : 'warning'} className="mt-2 w-fit">
                        {step3Sent ? (
                          'Action required'
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                            </span>
                            Tax strategist action required
                          </span>
                        )}
                      </Badge>
                    )}
                    {/* Show button only if step 2 complete AND current step not complete */}
                    {step2Complete && step3Sent && !step3Complete && (
                      <button className="mt-2 w-fit rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
                        Complete payment
                      </button>
                    )}
                  </div>
                </div>

                {/* Step 4: Documents Phase */}
                <div className="relative flex gap-4 pb-6">
                  <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                    {step4Complete ? (
                      <Check weight="bold" className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <div
                        className={`h-2 w-2 rounded-full ${step4Sent ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                      />
                    )}
                  </div>
                  {/* Line to next step */}
                  <div
                    className={`absolute top-5 bottom-2 -left-[19px] w-0.5 ${step4Complete ? 'bg-emerald-200' : 'bg-zinc-200'}`}
                  />
                  <div className="flex flex-1 flex-col items-start">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900">
                        {step4Complete
                          ? `Initial documents uploaded · ${currentClient.documents.filter(d => d.category !== 'contract').length} files`
                          : step4Sent
                            ? 'Waiting for document upload'
                            : 'Documents'}
                      </span>
                    </div>
                    <span className="text-sm text-zinc-500">
                      {step4Complete
                        ? 'W-2s, 1099s, and tax documents received'
                        : step4Sent
                          ? 'Please upload W-2s, 1099s, and relevant tax documents'
                          : 'You will be notified when documents are needed'}
                    </span>
                    <span className="mt-1 mb-2 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                      {formatDate(documentsTask?.updatedAt || currentClient.user.createdAt)}
                    </span>
                    {step3Complete && !step4Complete && (
                      <Badge variant={step4Sent ? 'warning' : 'warning'} className="w-fit">
                        {step4Sent ? (
                          'Action required'
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                            </span>
                            Tax strategist action required
                          </span>
                        )}
                      </Badge>
                    )}
                    {/* Show button only if step 3 complete AND current step not complete */}
                    {step3Complete && step4Sent && !step4Complete && (
                      <button className="mt-2 w-fit rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
                        Upload documents
                      </button>
                    )}
                  </div>
                </div>

                {/* Step 5: Strategy Phase */}
                <div className="relative flex gap-4">
                  <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                    {step5Complete ? (
                      <Check weight="bold" className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <div
                        className={`h-2 w-2 rounded-full ${step5Sent ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900">
                        {step5Complete
                          ? 'Tax strategy approved & signed'
                          : step5Sent
                            ? 'Strategy sent for approval'
                            : 'Tax strategy pending'}
                      </span>
                    </div>
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
                    {step4Complete && !step5Complete && (
                      <Badge variant={step5Sent ? 'warning' : 'warning'} className="mt-2 w-fit">
                        {step5Sent ? (
                          'Action required'
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                            </span>
                            Tax strategist action required
                          </span>
                        )}
                      </Badge>
                    )}
                    {/* Show button only if step 4 complete (onboarding done) AND strategy is sent but not signed */}
                    {step4Complete && step5Sent && !step5Complete && (
                      <button className="mt-2 w-fit rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
                        Review strategy
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Recent Documents */}
        <div className="bg-white pb-42">
          <div className="mx-auto flex w-full max-w-[642px] flex-col py-6">
            <h2 className="mb-4 text-xl font-medium text-zinc-900">Documents required</h2>
            {/* Empty State - No documents yet */}
            {currentClient.documents.filter(d => d.category !== 'contract').length === 0 && (
              <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center">
                {/* Empty */}
                <EmptyDocumentsIllustration />
                <p className="text-lg font-semibold text-zinc-800">No documents yet</p>
                <p className="text-sm text-zinc-400">Documents you upload will appear here</p>
              </div>
            )}

            {/* Documents List */}
            {currentClient.documents.filter(d => d.category !== 'contract').length > 0 && (
              <div className="">
                {groupDocumentsByDate(
                  [...currentClient.documents]
                    .filter(d => d.category !== 'contract')
                    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                ).map(group => (
                  <div key={group.label} className="mb-6">
                    {/* Date Group Label */}
                    <p className="mb-3 text-sm font-medium text-zinc-400">{group.label}</p>

                    {/* Document List */}
                    <div className="flex flex-col">
                      {group.documents.map(doc => (
                        <div key={doc.id} className="group relative">
                          {/* Document Row */}
                          <div className="flex items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-zinc-50">
                            {/* Document Icon */}
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                              <FileIcon className="h-5 w-5 text-zinc-400" />
                            </div>

                            {/* Document Info */}
                            <div className="flex flex-1 flex-col">
                              <span className="font-medium text-zinc-900">
                                {doc.originalName.replace(/\.[^/.]+$/, '')}
                              </span>
                              <span className="text-sm text-zinc-500">Me</span>
                            </div>

                            {/* Timestamp */}
                            <span className="text-sm text-zinc-400">
                              {formatRelativeTime(doc.createdAt)}
                            </span>
                          </div>
                        </div>
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
