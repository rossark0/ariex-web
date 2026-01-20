'use client';

import { useAuth } from '@/contexts/auth/AuthStore';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { FileIcon, Check, SpinnerGap } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { EmptyDocumentsIllustration } from '@/components/ui/empty-documents-illustration';
import { useState, useEffect } from 'react';
import {
  getClientDashboardData,
  type ClientDashboardData,
  type ClientAgreement,
  type ClientDocument,
} from '@/lib/api/client.api';

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

function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // If today, show time
  if (diffDays === 0) {
    return dateObj.toLocaleTimeString('en-US', {
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
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function groupDocumentsByDate(documents: ClientDocument[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; documents: ClientDocument[] }[] = [];

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
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<ClientDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data from API
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const data = await getClientDashboardData();
        setDashboardData(data);
        setError(null);
      } catch (err) {
        console.error('[ClientDashboard] Failed to fetch data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      fetchData();
    }
  }, [user]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center">
        <SpinnerGap className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="mt-4 text-sm text-zinc-500">Loading your dashboard...</p>
      </div>
    );
  }

  // Not authenticated
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

  // Error state or no data
  if (error || !dashboardData) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900">Welcome to Ariex!</h1>
          <p className="mt-2 text-zinc-500">
            {error || 'Your dashboard is being set up. Please check back shortly.'}
          </p>
          <p className="mt-4 text-sm text-zinc-400">
            Your tax strategist will reach out soon to get started.
          </p>
        </div>
      </div>
    );
  }

  const { user: clientUser, profile, strategist, agreements, documents, todos } = dashboardData;
  const clientName = clientUser.fullName || clientUser.name || clientUser.email.split('@')[0];
  const businessName = profile?.businessName;
  const createdAt = new Date(clientUser.createdAt);

  // Find service agreement
  const serviceAgreement = agreements.find(
    a => a.type === 'service_agreement' || a.type === 'onboarding'
  );

  // Find strategy document
  const strategyDoc = documents.find(d => d.type === 'strategy' || d.category === 'strategy');

  // Uploaded documents (excluding agreements/strategies)
  const uploadedDocs = documents.filter(
    d => d.type !== 'agreement' && d.type !== 'strategy' && d.category !== 'contract'
  );

  // Calculate step completion states
  const step1Complete = true; // Account always created
  const step2Sent = serviceAgreement?.status === 'sent' || serviceAgreement?.status === 'signed';
  const step2Complete = serviceAgreement?.status === 'signed' || serviceAgreement?.status === 'completed';
  const step3Sent = !!serviceAgreement?.paymentReference || serviceAgreement?.paymentAmount !== undefined;
  const step3Complete = serviceAgreement?.status === 'completed';
  const step4Sent = step3Complete; // Docs requested after payment
  const step4Complete = uploadedDocs.length > 0;
  const step5Sent = strategyDoc?.signatureStatus === 'SENT';
  const step5Complete = strategyDoc?.signatureStatus === 'SIGNED';

  const paymentAmount = serviceAgreement?.paymentAmount || 499;

  function formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
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
            <h2 className="mb-6 text-2xl font-medium text-zinc-900">Your to-dos</h2>
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
                      Account created for {businessName || clientName}
                    </span>
                    <span className="text-sm text-zinc-500">
                      Onboarding initiated by your tax strategist
                    </span>
                    <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                      {formatDate(createdAt)}
                      {strategist && ` · Created by ${strategist.name}`}
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
                      {formatDate(serviceAgreement?.updatedAt || createdAt)}
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
                          ? `Payment completed · $${paymentAmount}`
                          : step3Sent
                            ? `Payment pending · $${paymentAmount}`
                            : 'Payment link pending'}
                      </span>
                    </div>
                    <span className="text-sm text-zinc-500">
                      {step3Complete
                        ? 'Onboarding Fee - Tax Strategy Setup'
                        : step3Sent
                          ? 'Complete payment to activate your account'
                          : 'Payment link will be sent after agreement is signed'}
                    </span>
                    <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                      {formatDate(serviceAgreement?.updatedAt || createdAt)}
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
                          ? `Initial documents uploaded · ${uploadedDocs.length} files`
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
                      {formatDate(createdAt)}
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
                        ? strategyDoc?.name || 'Tax Strategy Plan'
                        : step5Sent
                          ? 'Review and sign your personalized tax strategy'
                          : 'Your strategist will create your personalized tax strategy after documents are reviewed'}
                    </span>
                    <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                      {strategyDoc?.createdAt
                        ? formatDate(strategyDoc.createdAt)
                        : formatDate(createdAt)}
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
            <h2 className="mb-4 text-lg font-medium text-zinc-900">Documents required</h2>
            {/* Empty State - No documents yet */}
            {uploadedDocs.length === 0 && (
              <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center">
                {/* Empty */}
                <EmptyDocumentsIllustration />
                <p className="text-lg font-semibold text-zinc-800">No documents yet</p>
                <p className="text-sm text-zinc-400">Documents you upload will appear here</p>
              </div>
            )}

            {/* Documents List */}
            {uploadedDocs.length > 0 && (
              <div className="">
                {groupDocumentsByDate(
                  [...uploadedDocs]
                    .filter(d => d.category !== 'contract')
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
                                {doc.name.replace(/\.[^/.]+$/, '')}
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