'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { useRouter, useSearchParams } from 'next/navigation';
import { useComplianceClientDetail } from '@/contexts/compliance/hooks/use-compliance-client-detail';
import type { ClientStatusKey } from '@/lib/client-status';
import type { ApiDocument } from '@/lib/api/strategist.api';
import {
  BuildingsIcon,
  EnvelopeIcon,
  FileIcon,
  PhoneIcon,
  Check as CheckIcon,
  ChatCircle,
  CheckCircle,
  XCircle,
  SpinnerGap,
  WarningCircle,
} from '@phosphor-icons/react';
import { Check, Clock, Strategy, Warning } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { AiFloatingChatbot } from '@/components/ai/ai-floating-chatbot';
import { useAiPageContext } from '@/contexts/ai/hooks/use-ai-page-context';
import { useUiStore } from '@/contexts/ui/UiStore';
import { ChevronDown } from 'lucide-react';

interface Props {
  params: { clientId: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatRelativeTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
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

function groupDocumentsByDate(documents: ApiDocument[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; documents: ApiDocument[] }[] = [];

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

// ─── Rejection Modal ──────────────────────────────────────────────────────

function RejectStrategyModal({
  isOpen,
  isRejecting,
  onClose,
  onReject,
}: {
  isOpen: boolean;
  isRejecting: boolean;
  onClose: () => void;
  onReject: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-semibold text-zinc-900">Reject Strategy</h3>
        <p className="mb-4 text-sm text-zinc-500">
          Provide a reason for the rejection. The strategist will be notified.
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Enter rejection reason…"
          rows={4}
          className="mb-4 w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isRejecting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || isRejecting}
            onClick={() => onReject(reason.trim())}
          >
            {isRejecting ? (
              <>
                <SpinnerGap className="mr-1.5 h-4 w-4 animate-spin" />
                Rejecting…
              </>
            ) : (
              'Reject Strategy'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Approve Confirmation Modal ───────────────────────────────────────────

function ApproveStrategyModal({
  isOpen,
  isApproving,
  onClose,
  onApprove,
}: {
  isOpen: boolean;
  isApproving: boolean;
  onClose: () => void;
  onApprove: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-semibold text-zinc-900">Approve Strategy</h3>
        <p className="mb-4 text-sm text-zinc-500">
          Once approved, this strategy will be sent to the client for review. This action cannot be
          undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isApproving}>
            Cancel
          </Button>
          <Button
            onClick={onApprove}
            disabled={isApproving}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {isApproving ? (
              <>
                <SpinnerGap className="mr-1.5 h-4 w-4 animate-spin" />
                Approving…
              </>
            ) : (
              'Confirm Approval'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Comments Panel ───────────────────────────────────────────────────────

function CommentsPanel({
  comments,
  isLoading,
  onAddComment,
}: {
  comments: { id: string; body: string; createdAt: string; userId?: string; userName?: string }[];
  isLoading: boolean;
  onAddComment: (body: string) => Promise<boolean>;
}) {
  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setIsSending(true);
    const success = await onAddComment(newComment.trim());
    if (success) setNewComment('');
    setIsSending(false);
  };

  return (
    <div className="mt-6 mb-6">
      <h2 className="mb-4 text-base font-medium text-zinc-900">Comments</h2>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-zinc-400">
          <SpinnerGap className="h-4 w-4 animate-spin" />
          Loading comments…
        </div>
      ) : comments.length === 0 ? (
        <p className="py-4 text-sm text-zinc-400">No comments yet</p>
      ) : (
        <div className="mb-4 flex flex-col gap-3">
          {comments.map(c => (
            <div
              key={c.id}
              className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700">
                  {c.userName || 'Compliance'}
                </span>
                <span className="text-xs text-zinc-400">{formatRelativeTime(c.createdAt)}</span>
              </div>
              <p className="text-sm leading-relaxed text-zinc-600">{c.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add comment */}
      <div className="flex gap-2">
        <input
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
          placeholder="Add a comment…"
          className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
          disabled={isSending}
        />
        <Button size="sm" onClick={handleSubmit} disabled={!newComment.trim() || isSending}>
          {isSending ? <SpinnerGap className="h-4 w-4 animate-spin" /> : 'Send'}
        </Button>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex min-h-full flex-col bg-white">
      <div className="mx-auto w-full max-w-2xl animate-pulse px-4 pt-20">
        <div className="mb-4 h-12 w-12 rounded-full bg-zinc-200" />
        <div className="mb-2 h-8 w-48 rounded bg-zinc-200" />
        <div className="mb-8 h-6 w-32 rounded bg-zinc-100" />
        <div className="mb-4 h-40 rounded-xl bg-zinc-100" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-2 w-2 rounded-full bg-zinc-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-zinc-200" />
                <div className="h-3 w-1/2 rounded bg-zinc-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function ComplianceClientDetailPage({ params }: Props) {
  useRoleRedirect('COMPLIANCE');
  const router = useRouter();
  const searchParams = useSearchParams();
  const strategistId = searchParams.get('strategistId') || '';

  const {
    client,
    clientName,
    clientProfile,
    agreement,
    documents,
    todoLists,
    todos,
    strategyDocument,
    strategyMetadata,
    strategyPdfUrl,
    comments,
    timeline,
    statusKey,
    statusConfig,
    isLoading,
    isLoadingComments,
    isApproving,
    isRejecting,
    error,
    handleApproveStrategy,
    handleRejectStrategy,
    handleAddComment,
    refresh,
  } = useComplianceClientDetail(params.clientId, strategistId);

  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const { setSidebarCollapsed, isSidebarCollapsed } = useUiStore();

  // ─── AI Page Context ─────────────────────────────────────────────────
  useAiPageContext({
    userRole: 'COMPLIANCE',
    client: client
      ? {
          id: client.id,
          name: clientName,
          email: client.email,
          phoneNumber: clientProfile?.phoneNumber,
          businessName: clientProfile?.businessName,
          businessType: clientProfile?.businessType,
          city: clientProfile?.city,
          state: clientProfile?.state,
          estimatedIncome: clientProfile?.estimatedIncome,
          filingStatus: clientProfile?.filingStatus,
          dependents: clientProfile?.dependents,
          statusKey,
        }
      : null,
    documents: documents.map(d => ({
      id: d.id,
      name: d.name,
      type: d.type,
      status: d.status,
      category: d.category,
      acceptanceStatus: d.acceptanceStatus,
      uploadedBy: d.uploadedBy,
      createdAt: d.createdAt,
    })),
    agreements: agreement
      ? [
          {
            id: agreement.id,
            name: agreement.name,
            status: agreement.status,
            price: typeof agreement.price === 'string' ? parseFloat(agreement.price) : agreement.price,
            createdAt: agreement.createdAt,
          },
        ]
      : [],
    strategy: {
      sent: timeline.step5State.strategySent,
      phase: timeline.step5State.phase,
      isComplete: timeline.step5State.isComplete,
    },
  });

  // Collapse sidebar when entering this page
  useEffect(() => {
    setSidebarCollapsed(true);
    return () => {
      setSidebarCollapsed(false);
    };
  }, [setSidebarCollapsed]);

  // Auto-dismiss action feedback
  useEffect(() => {
    if (actionFeedback) {
      const t = setTimeout(() => setActionFeedback(null), 5000);
      return () => clearTimeout(t);
    }
  }, [actionFeedback]);

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const onApprove = useCallback(async () => {
    const success = await handleApproveStrategy();
    setIsApproveModalOpen(false);
    if (success) {
      setActionFeedback({ type: 'success', message: 'Strategy approved — sent to client for review.' });
      refresh();
    } else {
      setActionFeedback({ type: 'error', message: 'Failed to approve strategy. Please try again.' });
    }
  }, [handleApproveStrategy, refresh]);

  const onReject = useCallback(
    async (reason: string) => {
      const success = await handleRejectStrategy(reason);
      setIsRejectModalOpen(false);
      if (success) {
        setActionFeedback({
          type: 'success',
          message: 'Strategy rejected — strategist has been notified.',
        });
        refresh();
      } else {
        setActionFeedback({ type: 'error', message: 'Failed to reject strategy. Please try again.' });
      }
    },
    [handleRejectStrategy, refresh]
  );

  // ─── Loading / Error states ──────────────────────────────────────────

  if (isLoading) return <LoadingState />;

  if (error || !client) {
    return (
      <section className="flex flex-col items-center justify-center gap-4 p-12">
        <Warning className="h-12 w-12 text-amber-500" weight="duotone" />
        <h1 className="text-xl font-semibold text-zinc-900">
          {error || 'Client Not Found'}
        </h1>
        <p className="text-zinc-500">
          {error
            ? 'There was a problem loading this client.'
            : `The client with ID "${params.clientId}" does not exist.`}
        </p>
        <div className="flex gap-2">
          {error && (
            <Button onClick={refresh} variant="outline">
              Retry
            </Button>
          )}
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </section>
    );
  }

  // ─── Derived data ────────────────────────────────────────────────────

  const {
    step1Complete,
    step2Complete,
    step3Complete,
    step4Complete,
    step5State,
    step2Sent,
    step3Sent,
    step4Sent,
  } = timeline;

  const profile = clientProfile;
  const agreementPrice = agreement?.price
    ? typeof agreement.price === 'string'
      ? parseFloat(agreement.price)
      : agreement.price
    : null;

  const nonStrategyDocs = documents.filter(d => d.type !== 'STRATEGY');
  const uploadedCount = nonStrategyDocs.length;

  const statusIconMap: Record<ClientStatusKey, typeof Clock> = {
    awaiting_agreement: Clock,
    awaiting_payment: Clock,
    awaiting_documents: Clock,
    ready_for_strategy: Strategy,
    awaiting_compliance: Clock,
    awaiting_approval: Clock,
    awaiting_signature: Clock,
    active: Check,
  };
  const PlanIcon = statusIconMap[statusKey] || Clock;

  const isComplianceReview = step5State.phase === 'compliance_review';
  const strategyDocName = strategyDocument?.name?.replace(/\.[^/.]+$/, '') || 'Tax Strategy Plan';

  return (
    <div className="flex min-h-full flex-col bg-white">
      {/* Breadcrumb */}
      <div
        className={`fixed top-4 z-50 pt-3.75 pb-2 pl-2 transition-all duration-300 ${isSidebarCollapsed ? 'left-14' : 'left-60'}`}
      >
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/compliance/strategists">Strategists</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {strategistId && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={`/compliance/strategists/${strategistId}`}>Strategist</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage>{clientName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="relative flex-1 pt-10">
        <div className="relative z-40 mx-auto w-full max-w-2xl px-4 pt-8">
          {/* Banner color */}
          <div className="absolute top-0 left-0 -z-10 h-24 w-full bg-zinc-50" />

          {/* Action feedback banner */}
          {actionFeedback && (
            <div
              className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium ${
                actionFeedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {actionFeedback.type === 'success' ? (
                <CheckCircle className="h-4 w-4" weight="fill" />
              ) : (
                <WarningCircle className="h-4 w-4" weight="fill" />
              )}
              {actionFeedback.message}
            </div>
          )}

          {/* Header Section */}
          <div className="flex flex-col gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-2xl font-medium text-white">
              {getInitials(clientName)}
            </div>
            <h1 className="z-20 text-2xl font-semibold">{clientName}</h1>

            {/* Action Buttons */}
            <div className="mb-6 flex w-full items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* Status Badge */}
                {statusConfig && (
                  <div
                    className={`flex items-center gap-1.5 rounded-lg border border-dashed ${statusConfig.borderClassName} px-2 py-1 text-sm font-medium ${statusConfig.textClassName}`}
                  >
                    <PlanIcon className="h-4 w-4" />
                    <span>{statusConfig.label}</span>
                  </div>
                )}

                {/* Add to Folder Button */}
                <button className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
                  <span>Add to folder</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {/* Strategy PDF link */}
              {strategyPdfUrl && (
                <a
                  href={strategyPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-2 py-1 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  <ChatCircle className="h-4 w-4" />
                  <span>View Strategy</span>
                </a>
              )}
            </div>

            {/* Compliance Review Action Bar */}
            {isComplianceReview && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="mb-1 text-sm font-semibold text-amber-800">
                  Compliance Review Required
                </h3>
                <p className="mb-4 text-sm text-amber-700">
                  Review the tax strategy document and approve or reject it before it&apos;s sent to the client.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsApproveModalOpen(true)}
                    disabled={isApproving || isRejecting}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {isApproving ? (
                      <>
                        <SpinnerGap className="mr-1.5 h-4 w-4 animate-spin" />
                        Approving…
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-1.5 h-4 w-4" weight="fill" />
                        Approve Strategy
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsRejectModalOpen(true)}
                    disabled={isApproving || isRejecting}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="mr-1.5 h-4 w-4" weight="fill" />
                    Reject
                  </Button>
                </div>
              </div>
            )}

            {/* Previous rejection reason */}
            {strategyMetadata?.rejectionReason && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="mb-1 text-sm font-semibold text-red-800">
                  Previously Rejected
                  {strategyMetadata.rejectedBy ? ` by ${strategyMetadata.rejectedBy}` : ''}
                </h3>
                <p className="text-sm text-red-700">{strategyMetadata.rejectionReason}</p>
                {strategyMetadata.rejectedAt && (
                  <p className="mt-1 text-xs text-red-500">{formatDate(strategyMetadata.rejectedAt)}</p>
                )}
              </div>
            )}

            {/* About Section */}
            <div className="mb-4 rounded-xl bg-zinc-50 p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm text-zinc-500">About</span>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-white">
                  {getInitials(clientName)}
                </div>
                <span className="text-sm font-medium text-zinc-500">{clientName}</span>
              </div>

              <p className="mb-5 text-[15px] leading-relaxed text-zinc-700">
                {clientName} is the owner of {profile?.businessName || 'a business'}
                {profile?.businessType ? `, a ${profile.businessType}` : ''}
                {profile?.city || profile?.state
                  ? ` based in ${[profile?.city, profile?.state].filter(Boolean).join(', ')}`
                  : ''}
                .
                {profile?.estimatedIncome
                  ? ` Estimated annual income of ${formatCurrency(profile.estimatedIncome)}.`
                  : ''}
                {profile?.filingStatus
                  ? ` Filing status: ${profile.filingStatus.replace('_', ' ')}.`
                  : ''}
              </p>

              <div className="flex flex-col gap-2.5">
                <a
                  href={`mailto:${client.email}`}
                  className="flex items-center gap-2.5 text-sm text-zinc-600 hover:text-zinc-900"
                >
                  <EnvelopeIcon weight="fill" className="h-4 w-4 text-zinc-400" />
                  <span className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500">
                    {client.email}
                  </span>
                </a>

                {(profile?.phoneNumber || profile?.phone) && (
                  <a
                    href={`tel:${profile?.phoneNumber || profile?.phone}`}
                    className="flex items-center gap-2.5 text-sm text-zinc-600 hover:text-zinc-900"
                  >
                    <PhoneIcon weight="fill" className="h-4 w-4 text-zinc-400" />
                    <span className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500">
                      {profile?.phoneNumber || profile?.phone}
                    </span>
                  </a>
                )}

                {profile?.businessName && (
                  <div className="flex items-center gap-2.5 text-sm text-zinc-600">
                    <BuildingsIcon weight="fill" className="h-4 w-4 text-zinc-400" />
                    <span>{profile.businessName}</span>
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
                        Account created for {profile?.businessName || clientName}
                      </span>
                      <span className="text-sm text-zinc-500">
                        Client onboarding initiated by strategist
                      </span>
                      <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                        {formatDate(client.createdAt)}
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
                          ? (agreement?.name || 'Ariex Service Agreement') + ' was signed'
                          : step2Sent
                            ? 'Waiting for client to review and sign'
                            : 'Send service agreement to client'}
                      </span>
                      <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                        {formatDate(agreement?.updatedAt || client.createdAt)}
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
                          ? `Payment received · ${formatCurrency(agreementPrice)}`
                          : step3Sent
                            ? `Payment pending · ${formatCurrency(agreementPrice)}`
                            : 'Payment link pending'}
                      </span>
                      <span className="text-sm text-zinc-500">
                        {step3Complete
                          ? 'Onboarding Fee via Stripe'
                          : step3Sent
                            ? 'Awaiting payment via Stripe link'
                            : 'Send payment link to client'}
                      </span>
                      <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                        {formatDate(agreement?.updatedAt || client.createdAt)}
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
                      <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                        {formatDate(agreement?.updatedAt || client.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Step 5: Strategy Phase */}
                  <div className="relative flex gap-4">
                    <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                      <div
                        className={`h-2 w-2 rounded-full ${step5State.strategySent || step5State.isComplete ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                      />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <span className="font-medium text-zinc-900">
                        {step5State.isComplete
                          ? 'Tax strategy approved'
                          : step5State.complianceRejected
                            ? 'Strategy rejected by compliance'
                            : step5State.clientDeclined
                              ? 'Strategy declined by client'
                              : step5State.complianceApproved
                                ? 'Strategy approved by compliance — awaiting client'
                                : step5State.strategySent
                                  ? 'Strategy sent for compliance review'
                                  : 'Tax strategy pending'}
                      </span>
                      <span className="text-sm text-zinc-500">
                        {step5State.isComplete
                          ? strategyDocName
                          : step5State.complianceRejected
                            ? 'Strategist needs to revise and resubmit'
                            : step5State.strategySent
                              ? 'Awaiting compliance review of tax strategy'
                              : 'Ready to create personalized tax strategy'}
                      </span>
                      <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                        {strategyDocument?.createdAt
                          ? formatDate(strategyDocument.createdAt)
                          : 'Not started'}
                      </span>
                      {strategyPdfUrl && (
                        <a
                          href={strategyPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 w-fit rounded bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-200"
                        >
                          View strategy
                        </a>
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
              </div>

              {nonStrategyDocs.length === 0 && (
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

              {nonStrategyDocs.length > 0 && (
                <div>
                  {groupDocumentsByDate(
                    [...nonStrategyDocs].sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
                                      {(doc.name || 'Untitled').replace(/\.[^/.]+$/, '')}
                                    </span>
                                    <span className="text-sm text-zinc-500">
                                      {doc.uploadedByName || 'Client'}
                                    </span>
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
                </div>
              )}
            </div>

            {/* Todos Section (read-only) */}
            {todoLists.length > 0 && (
              <div className="mb-6">
                <h2 className="mb-4 text-base font-medium text-zinc-900">Todos</h2>
                <div className="flex flex-col gap-4">
                  {todoLists.map(list => {
                    const listTodos = todos.filter(
                      (t: { todoListId?: string }) => t.todoListId === list.id
                    );
                    const completedCount = listTodos.filter(
                      (t: { completed?: boolean; status?: string }) =>
                        t.completed || t.status === 'COMPLETED'
                    ).length;
                    const totalCount = listTodos.length;

                    return (
                      <div
                        key={list.id}
                        className="rounded-xl border border-zinc-100 bg-zinc-50 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-zinc-900">
                            {list.name || 'Todo List'}
                          </span>
                          <span className="text-xs font-medium text-zinc-400">
                            {completedCount}/{totalCount} completed
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{
                              width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%',
                            }}
                          />
                        </div>
                        {listTodos.length > 0 && (
                          <div className="flex flex-col gap-1.5">
                            {listTodos.map(
                              (todo: {
                                id: string;
                                name?: string;
                                title?: string;
                                completed?: boolean;
                                status?: string;
                              }) => {
                                const isDone = todo.completed || todo.status === 'COMPLETED';
                                return (
                                  <div
                                    key={todo.id}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <div
                                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${
                                        isDone
                                          ? 'bg-emerald-500'
                                          : 'border border-zinc-300 bg-white'
                                      }`}
                                    >
                                      {isDone && (
                                        <CheckIcon
                                          weight="bold"
                                          className="h-3 w-3 text-white"
                                        />
                                      )}
                                    </div>
                                    <span
                                      className={
                                        isDone
                                          ? 'text-zinc-400 line-through'
                                          : 'text-zinc-700'
                                      }
                                    >
                                      {todo.name || todo.title || 'Untitled'}
                                    </span>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Comments Panel */}
            {strategyDocument && (
              <CommentsPanel
                comments={comments}
                isLoading={isLoadingComments}
                onAddComment={handleAddComment}
              />
            )}
          </div>
        </div>
      </div>

      <AiFloatingChatbot
        selectedCount={selectedDocs.size}
        onClearSelection={() => setSelectedDocs(new Set())}
      />

      {/* Rejection Modal */}
      <RejectStrategyModal
        isOpen={isRejectModalOpen}
        isRejecting={isRejecting}
        onClose={() => setIsRejectModalOpen(false)}
        onReject={onReject}
      />

      {/* Approval Confirmation Modal */}
      <ApproveStrategyModal
        isOpen={isApproveModalOpen}
        isApproving={isApproving}
        onClose={() => setIsApproveModalOpen(false)}
        onApprove={onApprove}
      />
    </div>
  );
}
