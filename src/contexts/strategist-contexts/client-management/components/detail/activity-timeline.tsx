'use client';

import type { ApiAgreement } from '@/lib/api/strategist.api';
import { getDownloadUrl, getSignedAgreementDocumentUrl } from '@/lib/api/strategist.api';
import type { ClientInfo } from '@/contexts/strategist-contexts/client-management/ClientDetailStore';
import { AgreementStatus } from '@/types/agreement';
import { AcceptanceStatus } from '@/types/document';
import type { Step5State } from '../../models/strategy.model';
import {
  Check as CheckIcon,
  Eye,
  FileArrowDown as FileArrowDownIcon,
  SpinnerGap,
  X as XIcon,
} from '@phosphor-icons/react';
import { Clock } from '@phosphor-icons/react/dist/ssr';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';

// ─── Types ────────────────────────────────────────────────────────────────

interface TodoItem {
  id: string;
  title: string;
  status: string;
  document?: {
    id?: string;
    uploadStatus?: string;
    acceptanceStatus?: string;
    files?: { originalName: string; downloadUrl?: string }[];
  };
}

interface StrategyMetadata {
  sentAt?: string;
  /** @deprecated Legacy — signing removed */
  strategyCeremonyUrl?: string;
  /** @deprecated Legacy — signing removed */
  strategyEnvelopeId?: string;
  strategyDocumentId?: string;
}

export interface ActivityTimelineProps {
  client: ClientInfo;
  agreements: ApiAgreement[];
  existingCharge: { id: string; paymentLink?: string; status: string; amount?: number } | null;
  signedAgreement: ApiAgreement | null;

  // Loading flags
  isLoadingAgreements: boolean;
  isLoadingCharges: boolean;
  isSendingPayment: boolean;
  isCompletingAgreement: boolean;

  // Error messages
  paymentError: string | null;
  agreementError: string | null;

  // Computed step states
  hasAgreementSent: boolean;
  hasAgreementSigned: boolean;
  step3Sent: boolean;
  step3Complete: boolean;
  hasDocumentsRequested: boolean;
  hasAllDocumentsUploaded: boolean;
  hasAllDocumentsAccepted: boolean;
  documentTodos: TodoItem[];
  uploadedDocCount: number;
  totalDocTodos: number;
  acceptedDocCount: number;
  step5Sent: boolean | string | undefined;
  /** @deprecated Use step5State instead — always false now */
  step5Signed: boolean;
  step5Complete: boolean | string;
  step5State?: Step5State;
  strategyMetadata: StrategyMetadata | null;
  strategyDoc: {
    signedAt?: Date;
    createdAt: Date;
    originalName: string;
    signatureStatus?: string;
  } | null;

  // Strategist signing
  strategistCeremonyUrl?: string | null;
  strategistHasSigned?: boolean;
  clientHasSigned?: boolean;
  signedAgreementDocUrl?: string | null;
  onStrategistSign?: () => void;

  // Action callbacks
  onOpenAgreementModal: () => void;
  onOpenPaymentModal: () => void;
  onSendPaymentReminder: () => void;
  onOpenRequestDocsModal: () => void;
  onOpenStrategySheet: () => void;
  onAdvanceToStrategy: () => Promise<void>;
  onCompleteAgreement: () => Promise<void>;
  onDownloadSignedStrategy: () => Promise<void>;
  onViewStrategyDocument?: () => Promise<void>;
  onAcceptDocument: (documentId: string) => Promise<void>;
  onDeclineDocument: (documentId: string) => Promise<void>;
  onDeleteTodoRequest: (todo: { id: string; title: string }) => void;
}

// ─── Component ────────────────────────────────────────────────────────────

export function ActivityTimeline({
  client,
  agreements,
  existingCharge,
  signedAgreement,
  isLoadingAgreements,
  isLoadingCharges,
  isSendingPayment,
  isCompletingAgreement,
  paymentError,
  agreementError,
  hasAgreementSent,
  hasAgreementSigned,
  step3Sent,
  step3Complete,
  hasDocumentsRequested,
  hasAllDocumentsUploaded,
  hasAllDocumentsAccepted,
  documentTodos,
  uploadedDocCount,
  totalDocTodos,
  acceptedDocCount,
  step5Sent,
  step5Signed: _step5Signed, // deprecated — unused
  step5Complete,
  step5State,
  strategyMetadata,
  strategyDoc,
  strategistCeremonyUrl,
  strategistHasSigned,
  clientHasSigned,
  signedAgreementDocUrl,
  onStrategistSign,
  onOpenAgreementModal,
  onOpenPaymentModal,
  onSendPaymentReminder,
  onOpenRequestDocsModal,
  onOpenStrategySheet,
  onAdvanceToStrategy,
  onCompleteAgreement,
  onDownloadSignedStrategy,
  onViewStrategyDocument,
  onAcceptDocument,
  onDeclineDocument,
  onDeleteTodoRequest,
}: ActivityTimelineProps) {
  // Internal loading states for document accept/decline/delete
  const [acceptingDocId, setAcceptingDocId] = useState<string | null>(null);
  const [decliningDocId, setDecliningDocId] = useState<string | null>(null);
  const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);
  const [isAdvancingToStrategy, setIsAdvancingToStrategy] = useState(false);
  const [isDownloadingAgreement, setIsDownloadingAgreement] = useState(false);
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);
  // ─── On-demand signed agreement download ────────────────────────
  const handleDownloadSignedAgreement = async () => {
    // If we already have the cached URL, open it directly
    if (signedAgreementDocUrl) {
      window.open(signedAgreementDocUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!signedAgreement) return;
    setIsDownloadingAgreement(true);
    try {
      // 1. Try SignatureAPI deliverables via envelope ID
      const envelopeId =
        signedAgreement.signatureEnvelopeId ||
        (() => {
          const match = signedAgreement.description?.match(/__SIGNATURE_METADATA__:([\s\S]+)$/);
          if (match) {
            try { return JSON.parse(match[1]).envelopeId; } catch { return null; }
          }
          return null;
        })();
      if (envelopeId) {
        const url = await getSignedAgreementDocumentUrl(envelopeId);
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
          return;
        }
      }

      alert('Signed agreement document is not available yet. The e-signature process may not have fully completed. Please try again later.');
    } catch {
      alert('Failed to fetch the signed agreement. Please try again.');
    } finally {
      setIsDownloadingAgreement(false);
    }
  };

  // Derived data from client
  const agreementTask = client.onboardingTasks.find(t => t.type === 'sign_agreement');
  const docsTask = client.onboardingTasks.find(t => t.type === 'upload_documents');
  const payment = client.payments[0];

  // Resolve the display price from real API data.
  // Priority: charge amount (already in dollars) → agreement price → fallback
  const resolvedPrice = (() => {
    // 1. Prefer the real charge amount (data layer converts cents → dollars)
    if (existingCharge?.amount && existingCharge.amount > 0) {
      return existingCharge.amount;
    }
    // 2. Fall back to agreement price / paymentAmount
    if (signedAgreement) {
      const raw = signedAgreement.paymentAmount ?? signedAgreement.price;
      if (raw != null) {
        const n = typeof raw === 'string' ? parseFloat(raw) : raw;
        if (!isNaN(n) && n > 0) return n;
      }
    }
    // 3. Last resort
    return payment?.amount || 499;
  })();

  const step1Complete = true;
  const bothSigned = !!(strategistHasSigned && clientHasSigned);
  const step2Complete = hasAgreementSigned && bothSigned;

  // ── Handlers with loading spinners ──

  const handleAcceptDocument = async (documentId: string) => {
    setAcceptingDocId(documentId);
    try {
      await onAcceptDocument(documentId);
    } finally {
      setAcceptingDocId(null);
    }
  };

  const handleDeclineDocument = async (documentId: string) => {
    setDecliningDocId(documentId);
    try {
      await onDeclineDocument(documentId);
    } finally {
      setDecliningDocId(null);
    }
  };

  const handleAdvanceToStrategy = async () => {
    setIsAdvancingToStrategy(true);
    try {
      await onAdvanceToStrategy();
    } finally {
      setIsAdvancingToStrategy(false);
    }
  };

  // ── Loading state ──

  if (isLoadingAgreements || isLoadingCharges) {
    return (
      <div className="mb-6">
        <h2 className="mb-4 text-base font-medium text-soft-white">Activity</h2>
        <div className="flex items-center justify-center py-12">
          <SpinnerGap className="h-6 w-6 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="mb-6">
      <h2 className="mb-4 text-base font-medium text-soft-white">Activity</h2>
      <div className="relative pl-6">
        <div className="flex flex-col gap-0">
          {/* ── Step 1: Account Created ── */}
          <div className="relative flex gap-4 pb-6">
            <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <div className="absolute top-5 bottom-2 -left-[19px] w-[2px] bg-emerald-500/30" />
            <div className="flex flex-1 flex-col">
              <span className="font-medium text-soft-white">
                Account created for {client.profile.businessName || client.user.name}
              </span>
              <span className="text-sm text-steel-gray">
                Client onboarding initiated by strategist
              </span>
              <span className="mt-1 text-xs font-medium tracking-wide text-steel-gray/60 uppercase">
                {formatDate(client.user.createdAt)} · Created by Alex Morgan
              </span>
            </div>
          </div>

          {/* ── Step 2: Agreement Phase ── */}
          <div className="relative flex gap-4 pb-6">
            <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
              <div
                className={`h-2 w-2 rounded-full ${hasAgreementSent || hasAgreementSigned ? 'bg-emerald-500' : 'bg-white/20'}`}
              />
            </div>
            <div
              className={`absolute top-5 bottom-2 -left-[19px] w-[2px] ${hasAgreementSigned ? 'bg-emerald-500/30' : 'bg-white/12'}`}
            />
            <div className="flex flex-1 flex-col">
              <span className="font-medium text-soft-white">
                {hasAgreementSigned
                  ? 'Service agreement signed'
                  : hasAgreementSent
                    ? 'Agreement sent for signature'
                    : 'Agreement pending'}
              </span>
              <span className="text-sm text-steel-gray">
                {hasAgreementSigned
                  ? (strategistHasSigned && clientHasSigned)
                    ? 'Both parties have signed the agreement'
                    : strategistHasSigned
                      ? 'You signed — waiting for client signature'
                      : clientHasSigned
                        ? 'Client signed — waiting for your signature'
                        : 'Agreement signed'
                  : hasAgreementSent
                    ? 'Waiting for signatures'
                    : 'Send service agreement to client'}
              </span>
              <span className="mt-1 text-xs font-medium tracking-wide text-steel-gray/60 uppercase">
                {formatDate(agreementTask?.updatedAt || client.user.createdAt)}
              </span>

              {/* Signature status sub-steps (shown when not both parties have signed) */}
              {hasAgreementSent && !(strategistHasSigned && clientHasSigned) && strategistCeremonyUrl && (
                <div className="mt-2 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    {clientHasSigned ? (
                      <CheckIcon weight="bold" className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Clock weight="bold" className="h-3.5 w-3.5 text-steel-gray/60" />
                    )}
                    <span
                      className={`text-xs font-medium ${clientHasSigned ? 'text-emerald-400' : 'text-steel-gray'}`}
                    >
                      Client {clientHasSigned ? 'signed' : 'pending'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {strategistHasSigned ? (
                      <CheckIcon weight="bold" className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Clock weight="bold" className="h-3.5 w-3.5 text-steel-gray/60" />
                    )}
                    <span
                      className={`text-xs font-medium ${strategistHasSigned ? 'text-emerald-400' : 'text-steel-gray'}`}
                    >
                      Strategist {strategistHasSigned ? 'signed' : 'pending'}
                    </span>
                  </div>
                </div>
              )}

              {/* Signed state: badge + download / sign actions (only when both signed) */}
              {hasAgreementSigned && strategistHasSigned && clientHasSigned && (
                <div className="mt-2 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {strategistHasSigned && (
                      <span className="flex w-fit items-center gap-1 rounded bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300">
                        <CheckIcon weight="bold" className="h-3 w-3" />
                        You signed
                      </span>
                    )}
                    {signedAgreementDocUrl ? (
                      <button
                        onClick={handleDownloadSignedAgreement}
                        disabled={isDownloadingAgreement}
                        className="flex w-fit items-center gap-1 rounded bg-white/8 px-2 py-1 text-xs font-semibold text-steel-gray hover:bg-white/12 disabled:opacity-50"
                      >
                        {isDownloadingAgreement ? (
                          <SpinnerGap weight="bold" className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileArrowDownIcon weight="fill" className="h-3.5 w-3.5" />
                        )}
                        Download signed agreement
                      </button>
                    ) : (
                      <button
                        onClick={handleDownloadSignedAgreement}
                        disabled={isDownloadingAgreement}
                        className="flex w-fit items-center gap-1 rounded bg-white/8 px-2 py-1 text-xs font-semibold text-steel-gray hover:bg-white/12 disabled:opacity-50"
                      >
                        {isDownloadingAgreement ? (
                          <SpinnerGap weight="bold" className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileArrowDownIcon weight="fill" className="h-3.5 w-3.5" />
                        )}
                        Download signed agreement
                      </button>
                    )}
                  </div>
                  {/* Show sign button if e-signature not fully completed */}
                  {!signedAgreementDocUrl && !strategistHasSigned && strategistCeremonyUrl && onStrategistSign && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-400">
                        E-signature not fully completed
                      </span>
                      <button
                        onClick={onStrategistSign}
                        className="flex w-fit items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Complete signing
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                {/* Send / Resend agreement button */}
                {step1Complete && !hasAgreementSigned && (
                  <button
                    onClick={onOpenAgreementModal}
                    className={`mt-2 flex w-fit items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${
                      hasAgreementSent
                        ? 'bg-white/8 text-steel-gray hover:bg-white/12'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {hasAgreementSent ? 'Resend agreement' : 'Send agreement'}
                  </button>
                )}

                {/* Strategist sign button */}
                {hasAgreementSent &&
                  !strategistHasSigned &&
                  strategistCeremonyUrl &&
                  onStrategistSign && (
                    <button
                      onClick={onStrategistSign}
                      className="mt-2 flex w-fit items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Sign agreement
                    </button>
                  )}
              </div>

              {agreementError && (
                <span className="mt-1 text-xs text-red-500">{agreementError}</span>
              )}
            </div>
          </div>

          {/* ── Step 3: Payment Phase ── */}
          <div className="relative flex gap-4 pb-6">
            <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
              <div
                className={`h-2 w-2 rounded-full ${step3Sent || step3Complete ? 'bg-emerald-500' : 'bg-white/20'}`}
              />
            </div>
            <div
              className={`absolute top-5 bottom-2 -left-[19px] w-[2px] ${step3Complete ? 'bg-emerald-500/30' : 'bg-white/12'}`}
            />
            <div className="flex flex-1 flex-col">
              <span className="font-medium text-soft-white">
                {step3Complete
                  ? `Payment received · ${formatCurrency(resolvedPrice)}`
                  : step3Sent
                    ? `Payment pending · ${formatCurrency(resolvedPrice)}`
                    : 'Payment link pending'}
              </span>
              <span className="text-sm text-steel-gray">
                {step3Complete
                  ? `${payment?.description || 'Onboarding Fee'} via ${payment?.paymentMethod || 'Stripe'}`
                  : step3Sent
                    ? 'Awaiting payment via Stripe link'
                    : 'Send payment link to client'}
              </span>
              <span className="mt-1 text-xs font-medium tracking-wide text-steel-gray/60 uppercase">
                {payment?.paidAt
                  ? formatDate(payment.paidAt)
                  : payment?.dueDate
                    ? `Due ${formatDate(payment.dueDate)}`
                    : formatDate(client.user.createdAt)}
              </span>
              {step2Complete && !step3Complete && (
                <button
                  onClick={step3Sent ? onSendPaymentReminder : onOpenPaymentModal}
                  disabled={isSendingPayment}
                  className={`mt-2 flex w-fit items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${
                    step3Sent
                      ? 'bg-white/8 text-steel-gray hover:bg-white/12'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  } ${isSendingPayment ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  {isSendingPayment ? (
                    <>
                      <SpinnerGap className="h-3 w-3 animate-spin" />
                      Sending...
                    </>
                  ) : step3Sent ? (
                    'Send reminder'
                  ) : (
                    'Send payment link'
                  )}
                </button>
              )}
              {paymentError && <span className="mt-1 text-xs text-red-500">{paymentError}</span>}
            </div>
          </div>

          {/* ── Step 4: Documents Phase ── */}
          <div className="relative flex gap-4 pb-6">
            <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
              <div
                className={`h-2 w-2 rounded-full ${hasDocumentsRequested || hasAllDocumentsUploaded ? 'bg-emerald-500' : 'bg-white/20'}`}
              />
            </div>
            <div
              className={`absolute top-5 bottom-2 -left-[19px] w-[2px] ${hasAllDocumentsAccepted ? 'bg-emerald-500/30' : 'bg-white/12'}`}
            />
            <div className="flex flex-1 flex-col">
              <span className="font-medium text-soft-white">
                {hasAllDocumentsAccepted
                  ? `Documents accepted · ${acceptedDocCount}/${totalDocTodos} complete`
                  : hasAllDocumentsUploaded
                    ? `Documents uploaded · ${uploadedDocCount}/${totalDocTodos} (review required)`
                    : hasDocumentsRequested
                      ? `Documents pending · ${uploadedDocCount}/${totalDocTodos} uploaded`
                      : 'Documents'}
              </span>
              <span className="text-sm text-steel-gray">
                {hasAllDocumentsAccepted
                  ? 'All documents have been reviewed and accepted'
                  : hasAllDocumentsUploaded
                    ? 'Review and accept uploaded documents to proceed'
                    : hasDocumentsRequested
                      ? 'Waiting for client to upload requested documents'
                      : 'Request documents from client'}
              </span>

              {/* Individual todo items */}
              {hasDocumentsRequested && documentTodos.length > 0 && (
                <div className="mt-2 flex flex-col gap-2">
                  {documentTodos.map(todo => {
                    const isUploaded = todo.document?.uploadStatus === 'FILE_UPLOADED';
                    const isAccepted =
                      todo.document?.acceptanceStatus === AcceptanceStatus.ACCEPTED_BY_STRATEGIST;
                    const isRejected =
                      todo.document?.acceptanceStatus === AcceptanceStatus.REJECTED_BY_STRATEGIST;
                    const isPendingReview = isUploaded && !isAccepted && !isRejected;
                    const uploadedFile = todo.document?.files?.[0];
                    const documentId = todo.document?.id;

                    return (
                      <div
                        key={todo.id}
                        className={`group rounded-lg border p-2.5 ${
                          isRejected
                            ? 'border-red-500/30 bg-red-500/10'
                            : isAccepted
                              ? 'border-emerald-500/30 bg-emerald-500/15'
                              : 'border-white/10 bg-surface'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {isAccepted ? (
                            <CheckIcon
                              weight="bold"
                              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                            />
                          ) : isRejected ? (
                            <XIcon weight="bold" className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                          ) : isPendingReview ? (
                            <Clock
                              weight="bold"
                              className="mt-0.5 h-4 w-4 shrink-0 text-steel-gray"
                            />
                          ) : (
                            <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-white/20" />
                          )}
                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium ${
                                  isAccepted
                                    ? 'text-emerald-300'
                                    : isRejected
                                      ? 'text-red-300'
                                      : 'text-soft-white'
                                }`}
                              >
                                {todo.title}
                              </span>
                              {isPendingReview && (
                                <span className="rounded bg-white/12 px-1.5 py-0.5 text-xs font-medium text-steel-gray">
                                  Pending review
                                </span>
                              )}
                              {isAccepted && (
                                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-medium text-emerald-400">
                                  Accepted
                                </span>
                              )}
                              {isRejected && (
                                <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-xs font-medium text-red-400">
                                  Declined
                                </span>
                              )}
                            </div>
                            {uploadedFile && (
                              <a
                                href={uploadedFile.downloadUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded bg-white/8 px-1.5 py-0.5 text-steel-gray hover:bg-white/12"
                              >
                                <FileArrowDownIcon weight="fill" className="h-3.5 w-3.5" />
                                <span className="max-w-[200px] truncate">
                                  {uploadedFile.originalName}
                                </span>
                              </a>
                            )}
                            {/* Accept/Decline buttons for pending review */}
                            {isPendingReview && documentId && (
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  onClick={() => handleAcceptDocument(documentId)}
                                  disabled={
                                    acceptingDocId === documentId || decliningDocId === documentId
                                  }
                                  className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  {acceptingDocId === documentId ? (
                                    <SpinnerGap className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CheckIcon weight="bold" className="h-3 w-3" />
                                  )}
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleDeclineDocument(documentId)}
                                  disabled={
                                    acceptingDocId === documentId || decliningDocId === documentId
                                  }
                                  className="flex items-center gap-1 rounded bg-red-500/15 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                                >
                                  {decliningDocId === documentId ? (
                                    <SpinnerGap className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <XIcon weight="bold" className="h-3 w-3" />
                                  )}
                                  Decline
                                </button>
                              </div>
                            )}
                            {/* Re-upload message for rejected */}
                            {isRejected && (
                              <p className="mt-1 text-xs text-red-400">
                                Client needs to re-upload this document
                              </p>
                            )}
                          </div>
                          {/* Decline button on hover for accepted docs */}
                          {isAccepted && documentId && (
                            <button
                              onClick={() => handleDeclineDocument(documentId)}
                              disabled={decliningDocId === documentId}
                              className="rounded p-1 text-steel-gray/60 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                              title="Decline document"
                            >
                              {decliningDocId === documentId ? (
                                <SpinnerGap className="h-3 w-3 animate-spin" />
                              ) : (
                                <XIcon weight="bold" className="h-3 w-3" />
                              )}
                            </button>
                          )}
                          {/* Open button for uploaded docs */}
                          {isUploaded && documentId && (
                            <button
                              onClick={async () => {
                                setOpeningDocId(documentId);
                                try {
                                  const url = await getDownloadUrl(documentId);
                                  if (url) window.open(url, '_blank', 'noopener,noreferrer');
                                } finally {
                                  setOpeningDocId(null);
                                }
                              }}
                              disabled={openingDocId === documentId}
                              className="rounded p-1 text-steel-gray/60 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/12 hover:text-steel-gray disabled:opacity-50"
                              title="Open document"
                            >
                              {openingDocId === documentId ? (
                                <SpinnerGap className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Eye weight="bold" className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                          {/* Delete button - only show if not uploaded */}
                          {!isUploaded && (
                            <button
                              onClick={() =>
                                onDeleteTodoRequest({ id: todo.id, title: todo.title })
                              }
                              disabled={deletingTodoId === todo.id}
                              className="rounded p-1 text-steel-gray/60 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                              title="Delete request"
                            >
                              {deletingTodoId === todo.id ? (
                                <SpinnerGap className="h-3 w-3 animate-spin" />
                              ) : (
                                <XIcon weight="bold" className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <span className="mt-2 text-xs font-medium tracking-wide text-steel-gray/60 uppercase">
                {formatDate(docsTask?.updatedAt || client.user.createdAt)}
              </span>

              <div className="flex items-center gap-2">
                {/* Request documents or Add more */}
                {hasAgreementSigned && (
                  <button
                    onClick={onOpenRequestDocsModal}
                    className="mt-2 w-fit rounded bg-white/8 px-2 py-1 text-xs font-semibold text-steel-gray hover:bg-white/12"
                  >
                    {hasDocumentsRequested ? 'Ask more documents' : 'Request documents'}
                  </button>
                )}
                {/* Advance to Strategy button */}
                {hasAllDocumentsAccepted &&
                  hasDocumentsRequested &&
                  signedAgreement?.status === AgreementStatus.PENDING_TODOS_COMPLETION && (
                    <button
                      onClick={handleAdvanceToStrategy}
                      disabled={isAdvancingToStrategy}
                      className="mt-2 flex w-fit items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isAdvancingToStrategy ? (
                        <>
                          <SpinnerGap className="h-3 w-3 animate-spin" />
                          Advancing...
                        </>
                      ) : (
                        'Advance to strategy'
                      )}
                    </button>
                  )}
              </div>
            </div>
          </div>

          {/* ── Step 5: Strategy Phase (Compliance → Client Approval) ── */}
          <div className="relative flex gap-4">
            <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
              <div
                className={`h-2 w-2 rounded-full ${step5State?.strategySent || step5State?.isComplete ? 'bg-emerald-500' : step5Sent || step5Complete ? 'bg-emerald-500' : 'bg-white/20'}`}
              />
            </div>
            <div className="flex flex-1 flex-col">
              {/* ── Phase-aware headline ── */}
              <span className="font-medium text-soft-white">
                {step5State?.isComplete
                  ? 'Tax strategy approved'
                  : step5State?.phase === 'client_review'
                    ? 'Strategy awaiting client approval'
                    : step5State?.phase === 'client_declined'
                      ? 'Client declined strategy'
                      : step5State?.phase === 'compliance_review'
                        ? 'Strategy under compliance review'
                        : step5State?.phase === 'compliance_rejected'
                          ? 'Compliance rejected strategy'
                          : step5State?.strategySent || step5Sent
                            ? 'Strategy sent for review'
                            : 'Tax strategy pending'}
              </span>
              <span className="text-sm text-steel-gray">
                {step5State?.isComplete
                  ? 'Both compliance and client have approved'
                  : step5State?.phase === 'client_review'
                    ? 'Compliance approved — waiting for client to approve or decline'
                    : step5State?.phase === 'client_declined'
                      ? 'Client has declined the strategy. Revise and resend.'
                      : step5State?.phase === 'compliance_review'
                        ? 'Waiting for compliance team to review and approve'
                        : step5State?.phase === 'compliance_rejected'
                          ? 'Compliance has rejected the strategy. Revise and resend.'
                          : 'Ready to create personalized tax strategy'}
              </span>
              <span className="mt-1 text-xs font-medium tracking-wide text-steel-gray/60 uppercase">
                {strategyMetadata?.sentAt
                  ? formatDate(new Date(strategyMetadata.sentAt))
                  : 'Not started'}
              </span>

              {/* ── Compliance & Client review sub-steps ── */}
              {step5State && step5State.strategySent && (
                <div className="mt-3 flex flex-col gap-2">
                  {/* Compliance review sub-step */}
                  <div
                    className={`rounded-lg border p-2.5 ${
                      step5State.complianceRejected
                        ? 'border-red-500/30 bg-red-500/10'
                        : step5State.complianceApproved
                          ? 'border-emerald-500/30 bg-emerald-500/15'
                          : 'border-amber-500/30 bg-amber-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {step5State.complianceApproved ? (
                        <CheckIcon weight="bold" className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : step5State.complianceRejected ? (
                        <XIcon weight="bold" className="h-4 w-4 shrink-0 text-red-500" />
                      ) : (
                        <Clock weight="bold" className="h-4 w-4 shrink-0 text-amber-500" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          step5State.complianceRejected
                            ? 'text-red-300'
                            : step5State.complianceApproved
                              ? 'text-emerald-300'
                              : 'text-amber-300'
                        }`}
                      >
                        Compliance review
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          step5State.complianceRejected
                            ? 'bg-red-500/15 text-red-400'
                            : step5State.complianceApproved
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        {step5State.complianceRejected
                          ? 'Rejected'
                          : step5State.complianceApproved
                            ? 'Approved'
                            : 'Pending'}
                      </span>
                    </div>

                    {step5State.complianceRejected && (
                      <div className="mt-2 flex flex-col gap-2 border-t border-red-500/30 pt-2">
                        {/* {strategyMetadata?.rejectionReason && (
                          <p className="text-sm text-red-300">
                            <span className="font-medium">Reason:</span>{' '}
                            {strategyMetadata.rejectionReason}
                          </p>
                        )}
                        {strategyMetadata?.rejectedAt && (
                          <span className="text-xs text-red-500">
                            {formatDate(new Date(strategyMetadata.rejectedAt))}
                          </span>
                        )} */}
                        <button
                          onClick={onOpenStrategySheet}
                          className="mt-1 w-fit rounded bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700"
                        >
                          Revise strategy
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Client review sub-step (only shown if compliance approved) */}
                  {step5State.complianceApproved && (
                    <div
                      className={`rounded-lg border p-2.5 ${
                        step5State.clientDeclined
                          ? 'border-red-500/30 bg-red-500/10'
                          : step5State.clientApproved
                            ? 'border-emerald-500/30 bg-emerald-500/15'
                            : 'border-teal-500/30 bg-teal-500/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {step5State.clientApproved ? (
                          <CheckIcon weight="bold" className="h-4 w-4 shrink-0 text-emerald-500" />
                        ) : step5State.clientDeclined ? (
                          <XIcon weight="bold" className="h-4 w-4 shrink-0 text-red-500" />
                        ) : (
                          <Clock weight="bold" className="h-4 w-4 shrink-0 text-teal-500" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            step5State.clientDeclined
                              ? 'text-red-300'
                              : step5State.clientApproved
                                ? 'text-emerald-300'
                                : 'text-teal-300'
                          }`}
                        >
                          Client review
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                            step5State.clientDeclined
                              ? 'bg-red-500/15 text-red-400'
                              : step5State.clientApproved
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-teal-500/15 text-teal-400'
                          }`}
                        >
                          {step5State.clientDeclined
                            ? 'Declined'
                            : step5State.clientApproved
                              ? 'Approved'
                              : 'Pending'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Action buttons ── */}

              {/* Create / Revise strategy button */}
              {signedAgreement?.status === AgreementStatus.PENDING_STRATEGY &&
                !step5State?.isComplete && (
                  <button
                    onClick={onOpenStrategySheet}
                    className={`mt-2 w-fit rounded px-2 py-1 text-xs font-semibold ${
                      step5State?.complianceRejected || step5State?.clientDeclined
                        ? 'bg-amber-600 text-white hover:bg-amber-700'
                        : step5State?.strategySent
                          ? 'bg-white/8 text-steel-gray hover:bg-white/12'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {step5State?.complianceRejected || step5State?.clientDeclined
                      ? 'Revise & resend strategy'
                      : step5State?.strategySent
                        ? 'Resend strategy'
                        : 'Create strategy'}
                  </button>
                )}

              {/* View strategy doc button (available whenever strategy has been sent and not rejected) */}
              {step5State?.strategySent &&
                onViewStrategyDocument &&
                !step5State?.complianceRejected &&
                !step5State?.clientDeclined && (
                  <button
                    onClick={() => onViewStrategyDocument()}
                    className="mt-2 w-fit rounded bg-white/8 px-2 py-1 text-xs font-semibold text-steel-gray hover:bg-white/12"
                  >
                    View strategy document
                  </button>
                )}

              {/* Completed state */}
              {step5State?.isComplete && (
                <div className="mt-2 flex items-center gap-2">
                  {signedAgreement?.status !== AgreementStatus.COMPLETED && (
                    <button
                      onClick={() => onCompleteAgreement()}
                      disabled={isCompletingAgreement}
                      className="w-fit rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-400"
                    >
                      {isCompletingAgreement ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Completing...
                        </span>
                      ) : (
                        'Finish Agreement'
                      )}
                    </button>
                  )}
                  {signedAgreement?.status === AgreementStatus.COMPLETED && (
                    <span className="w-fit rounded bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300">
                      ✓ Completed
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
