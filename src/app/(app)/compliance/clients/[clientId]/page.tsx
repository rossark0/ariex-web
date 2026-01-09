'use client';

import { useState } from 'react';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { useRouter } from 'next/navigation';
import { getFullClientById } from '@/lib/mocks/client-full';
import {
  getClientTimelineAndStatus,
  CLIENT_STATUS_CONFIG,
  type ClientStatusKey,
} from '@/lib/client-status';
import {
  ArrowLeftIcon,
  BuildingsIcon,
  EnvelopeIcon,
  FileIcon,
  PhoneIcon,
  Check as CheckIcon,
  ChatCircle,
} from '@phosphor-icons/react';
import { Check, Clock, Strategy, Warning } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { AiFloatingChatbot } from '@/components/ai/ai-floating-chatbot';
import { ChevronDown } from 'lucide-react';

interface Props {
  params: { clientId: string };
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

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
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  if (todayDocs.length > 0) groups.push({ label: 'Today', documents: todayDocs });
  if (yesterdayDocs.length > 0) groups.push({ label: 'Yesterday', documents: yesterdayDocs });
  if (olderDocs.length > 0) groups.push({ label: 'Earlier', documents: olderDocs });

  return groups;
}

export default function ComplianceClientDetailPage({ params }: Props) {
  useRoleRedirect('COMPLIANCE');
  const router = useRouter();
  const client = getFullClientById(params.clientId);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  if (!client) {
    return (
      <section className="flex flex-col items-center justify-center gap-4 p-12">
        <Warning className="h-12 w-12 text-amber-500" weight="duotone" />
        <h1 className="text-xl font-semibold text-zinc-900">Client Not Found</h1>
        <p className="text-zinc-500">
          The client with ID &quot;{params.clientId}&quot; does not exist.
        </p>
        <Button onClick={() => router.push('/compliance/clients')}>Back to Clients</Button>
      </section>
    );
  }

  // Timeline and status
  const timeline = getClientTimelineAndStatus(client);
  const {
    step1Complete,
    step2Complete,
    step3Complete,
    step4Complete,
    step5Complete,
    step2Sent,
    step3Sent,
    step4Sent,
    step5Sent,
    statusKey,
    statusConfig,
  } = timeline;

  const agreementTask = client.onboardingTasks.find(t => t.type === 'sign_agreement');
  const docsTask = client.onboardingTasks.find(t => t.type === 'upload_documents');
  const payment = client.payments[0];
  const strategyDoc = client.documents.find(
    d => d.category === 'contract' && d.originalName.toLowerCase().includes('strategy')
  );

  const statusIconMap: Record<ClientStatusKey, typeof Clock> = {
    awaiting_agreement: Clock,
    awaiting_payment: Clock,
    awaiting_documents: Clock,
    ready_for_strategy: Strategy,
    awaiting_signature: Clock,
    active: Check,
  };
  const PlanIcon = statusIconMap[statusKey];

  const uploadedCount = client.documents.filter(d => d.category !== 'contract').length;

  return (
    <div className="flex min-h-full flex-col bg-white">
      <div className="relative flex-1">
        {/* Back Button */}
        <div className="absolute top-4 left-4 mb-4 flex items-center gap-2">
          <div
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-700"
            onClick={() => router.back()}
          >
            <ArrowLeftIcon weight="bold" className="h-4 w-4" />
          </div>
        </div>

        <div className="relative z-40 mx-auto w-full max-w-2xl px-4 pt-22">
          {/* Banner color */}
          <div className="absolute top-0 left-0 -z-10 h-24 w-full bg-zinc-50" />

          {/* Header Section */}
          <div className="flex flex-col gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-2xl font-medium text-white">
              {getInitials(client.user.name)}
            </div>
            <h1 className="z-20 text-2xl font-semibold">{client.user.name}</h1>

            {/* Action Buttons */}
            <div className="mb-6 flex w-full items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* Status Badge */}
                <div
                  className={`flex items-center gap-1.5 rounded-lg border border-dashed ${statusConfig.borderClassName} px-2 py-1 text-sm font-medium ${statusConfig.textClassName}`}
                >
                  <PlanIcon className="h-4 w-4" />
                  <span>{statusConfig.label}</span>
                </div>

                {/* Add to Folder Button */}
                <button className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
                  <span>Add to folder</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={() => router.push(`/compliance/clients/${params.clientId}/comments`)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                <ChatCircle className="h-4 w-4" />
                <span>Comments</span>
              </button>
            </div>

            {/* About Section */}
            <div className="mb-4 rounded-xl bg-zinc-50 p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm text-zinc-500">About</span>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-white">
                  {getInitials(client.user.name)}
                </div>
                <span className="text-sm font-medium text-zinc-500">{client.user.name}</span>
              </div>

              <p className="mb-5 text-[15px] leading-relaxed text-zinc-700">
                {client.user.name} is the owner of {client.profile.businessName || 'a business'},
                {client.profile.businessType ? ` a ${client.profile.businessType}` : ''} based in{' '}
                {client.profile.city}, {client.profile.state}.
                {client.profile.estimatedIncome
                  ? ` Estimated annual income of ${formatCurrency(client.profile.estimatedIncome)}.`
                  : ''}
                {client.profile.filingStatus
                  ? ` Filing status: ${client.profile.filingStatus.replace('_', ' ')}.`
                  : ''}
              </p>

              <div className="flex flex-col gap-2.5">
                <a
                  href={`mailto:${client.user.email}`}
                  className="flex items-center gap-2.5 text-sm text-zinc-600 hover:text-zinc-900"
                >
                  <EnvelopeIcon weight="fill" className="h-4 w-4 text-zinc-400" />
                  <span className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500">
                    {client.user.email}
                  </span>
                </a>

                {client.profile.phoneNumber && (
                  <a
                    href={`tel:${client.profile.phoneNumber}`}
                    className="flex items-center gap-2.5 text-sm text-zinc-600 hover:text-zinc-900"
                  >
                    <PhoneIcon weight="fill" className="h-4 w-4 text-zinc-400" />
                    <span className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500">
                      {client.profile.phoneNumber}
                    </span>
                  </a>
                )}

                {client.profile.businessName && (
                  <div className="flex items-center gap-2.5 text-sm text-zinc-600">
                    <BuildingsIcon weight="fill" className="h-4 w-4 text-zinc-400" />
                    <span>{client.profile.businessName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="mb-6">
              <h2 className="mb-4 text-base font-medium text-zinc-900">Activity</h2>
              <div className="relative pl-6">
                <div className="flex flex-col gap-0">
                  {/* Step 1: Account Created */}
                  <div className="relative flex gap-4 pb-6">
                    <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    </div>
                    <div className="absolute top-5 bottom-2 -left-[19px] w-[2px] bg-emerald-200" />
                    <div className="flex flex-1 flex-col">
                      <span className="font-medium text-zinc-900">
                        Account created for {client.profile.businessName || client.user.name}
                      </span>
                      <span className="text-sm text-zinc-500">
                        Client onboarding initiated by strategist
                      </span>
                      <span className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
                        {formatDate(client.user.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Step 2: Agreement Phase */}
                  <div className="relative flex gap-4 pb-6">
                    <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                      <div
                        className={`h-2 w-2 rounded-full ${step2Sent || step2Complete ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                      />
                    </div>
                    <div
                      className={`absolute top-5 bottom-2 -left-[19px] w-[2px] ${step2Complete ? 'bg-emerald-200' : 'bg-zinc-200'}`}
                    />
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
                          ? 'Ariex Service Agreement 2024 was signed'
                          : step2Sent
                            ? 'Waiting for client to review and sign'
                            : 'Send service agreement to client'}
                      </span>
                      <span className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
                        {formatDate(agreementTask?.updatedAt || client.user.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Step 3: Payment Phase */}
                  <div className="relative flex gap-4 pb-6">
                    <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                      <div
                        className={`h-2 w-2 rounded-full ${step3Sent || step3Complete ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                      />
                    </div>
                    <div
                      className={`absolute top-5 bottom-2 -left-[19px] w-[2px] ${step3Complete ? 'bg-emerald-200' : 'bg-zinc-200'}`}
                    />
                    <div className="flex flex-1 flex-col">
                      <span className="font-medium text-zinc-900">
                        {step3Complete
                          ? `Payment received · ${formatCurrency(payment?.amount || 499)}`
                          : step3Sent
                            ? `Payment pending · ${formatCurrency(payment?.amount || 499)}`
                            : 'Payment link pending'}
                      </span>
                      <span className="text-sm text-zinc-500">
                        {step3Complete
                          ? `${payment?.description || 'Onboarding Fee'} via ${payment?.paymentMethod || 'Stripe'}`
                          : step3Sent
                            ? 'Awaiting payment via Stripe link'
                            : 'Send payment link to client'}
                      </span>
                      <span className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
                        {payment?.paidAt
                          ? formatDate(payment.paidAt)
                          : payment?.dueDate
                            ? `Due ${formatDate(payment.dueDate)}`
                            : formatDate(client.user.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Step 4: Documents Phase */}
                  <div className="relative flex gap-4 pb-6">
                    <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                      <div
                        className={`h-2 w-2 rounded-full ${step4Sent || step4Complete ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                      />
                    </div>
                    <div
                      className={`absolute top-5 bottom-2 -left-[19px] w-[2px] ${step4Complete ? 'bg-emerald-200' : 'bg-zinc-200'}`}
                    />
                    <div className="flex flex-1 flex-col">
                      <span className="font-medium text-zinc-900">
                        {step4Complete
                          ? `Initial documents uploaded · ${uploadedCount} files`
                          : step4Sent
                            ? 'Waiting for document upload'
                            : 'Documents'}
                      </span>
                      <span className="text-sm text-zinc-500">
                        {step4Complete
                          ? 'W-2s, 1099s, and tax documents received'
                          : step4Sent
                            ? 'Client needs to upload W-2s, 1099s, and relevant tax documents'
                            : 'Request documents from client'}
                      </span>
                      <span className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
                        {formatDate(docsTask?.updatedAt || client.user.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Step 5: Strategy Phase */}
                  <div className="relative flex gap-4">
                    <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                      <div
                        className={`h-2 w-2 rounded-full ${step5Sent || step5Complete ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                      />
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
                            ? 'Awaiting client signature on tax strategy document'
                            : 'Ready to create personalized tax strategy'}
                      </span>
                      <span className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
                        {strategyDoc?.signedAt
                          ? formatDate(strategyDoc.signedAt)
                          : strategyDoc?.createdAt
                            ? formatDate(strategyDoc.createdAt)
                            : 'Not started'}
                      </span>
                      {step5Complete && (
                        <button
                          onClick={() => router.push(`/compliance/clients/${params.clientId}/strategy`)}
                          className="mt-2 w-fit rounded bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-200"
                        >
                          View strategy
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div>
              <div className="flex w-full items-center justify-between">
                <h2 className="mb-8 text-base font-medium text-zinc-900">Documents</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/compliance/clients/${params.clientId}/documents`)}
                >
                  View All
                </Button>
              </div>

              {client.documents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative mb-6 h-28 w-28">
                    <div className="absolute top-2 left-2 h-20 w-16 -rotate-6 rounded-lg border border-zinc-200 bg-white shadow-sm">
                      <div className="mt-4 space-y-1.5 px-2.5">
                        <div className="h-1.5 w-full rounded-full bg-zinc-200" />
                        <div className="h-1.5 w-3/4 rounded-full bg-zinc-200" />
                        <div className="h-1.5 w-full rounded-full bg-zinc-200" />
                      </div>
                    </div>
                    <div className="absolute top-0 right-2 h-20 w-16 rotate-6 rounded-lg border border-zinc-200 bg-white shadow-sm">
                      <div className="mt-4 space-y-1.5 px-2.5">
                        <div className="h-1.5 w-full rounded-full bg-zinc-200" />
                        <div className="h-1.5 w-2/3 rounded-full bg-zinc-200" />
                        <div className="h-1.5 w-full rounded-full bg-zinc-200" />
                        <div className="h-1.5 w-1/2 rounded-full bg-zinc-200" />
                      </div>
                      <div className="absolute right-2 bottom-1 text-xs font-medium text-zinc-300">
                        ariex
                      </div>
                    </div>
                  </div>
                  <p className="mb-1.5 text-lg font-semibold text-zinc-800">No documents yet</p>
                  <p className="text-sm text-zinc-400">
                    When this client uploads a document, it will show up here
                  </p>
                </div>
              )}

              {client.documents.length > 0 && (
                <div className="">
                  {groupDocumentsByDate(
                    [...client.documents].sort(
                      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
                    )
                  )
                    .slice(0, 2)
                    .map(group => (
                      <div key={group.label} className="mb-6">
                        <p className="mb-3 text-sm font-medium text-zinc-400">{group.label}</p>
                        <div className="flex flex-col">
                          {group.documents.slice(0, 3).map(doc => {
                            const isSelected = selectedDocs.has(doc.id);
                            return (
                              <div key={doc.id} className="group relative">
                                <div
                                  className={`pointer-events-none absolute top-1/2 -left-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center transition-opacity ${
                                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                  }`}
                                >
                                  {isSelected ? (
                                    <div className="flex h-4 w-4 items-center justify-center rounded bg-teal-600">
                                      <CheckIcon weight="bold" className="h-3 w-3 text-white" />
                                    </div>
                                  ) : (
                                    <div className="h-4 w-4 rounded border-2 border-zinc-300 bg-white transition-colors group-hover:border-teal-400" />
                                  )}
                                </div>
                                <div
                                  onClick={() => toggleDocSelection(doc.id)}
                                  className={`flex cursor-pointer items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-zinc-50 ${
                                    isSelected ? 'bg-zinc-50' : ''
                                  }`}
                                >
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                                    <FileIcon className="h-5 w-5 text-zinc-400" />
                                  </div>
                                  <div className="flex flex-1 flex-col">
                                    <span className="font-medium text-zinc-900">
                                      {doc.originalName.replace(/\.[^/.]+$/, '')}
                                    </span>
                                    <span className="text-sm text-zinc-500">Client</span>
                                  </div>
                                  <span className="text-sm text-zinc-400">
                                    {formatRelativeTime(doc.createdAt)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                  {client.documents.length > 3 && (
                    <div className="mt-2 flex justify-center pb-8">
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/compliance/clients/${params.clientId}/documents`)}
                      >
                        View all {client.documents.length} documents
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AiFloatingChatbot
        selectedCount={selectedDocs.size}
        onClearSelection={() => setSelectedDocs(new Set())}
      />
    </div>
  );
}
