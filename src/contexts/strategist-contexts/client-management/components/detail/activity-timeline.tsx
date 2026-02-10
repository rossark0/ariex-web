'use client';

import type { ApiAgreement } from '@/lib/api/strategist.api';
import type { FullClientMock } from '@/lib/mocks/client-full';
import { AgreementStatus } from '@/types/agreement';
import { AcceptanceStatus } from '@/types/document';
import {
  Check as CheckIcon,
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
  strategyCeremonyUrl?: string;
  strategyEnvelopeId?: string;
}

export interface ActivityTimelineProps {
  client: FullClientMock;
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
  step5Signed: boolean;
  step5Complete: boolean | string;
  strategyMetadata: StrategyMetadata | null;
  strategyDoc: {
    signedAt?: Date;
    createdAt: Date;
    originalName: string;
    signatureStatus?: string;
  } | null;

  // Action callbacks
  onOpenAgreementModal: () => void;
  onOpenPaymentModal: () => void;
  onSendPaymentReminder: () => void;
  onOpenRequestDocsModal: () => void;
  onOpenStrategySheet: () => void;
  onAdvanceToStrategy: () => Promise<void>;
  onCompleteAgreement: () => Promise<void>;
  onDownloadSignedStrategy: () => Promise<void>;
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
  step5Signed,
  step5Complete,
  strategyMetadata,
  strategyDoc,
  onOpenAgreementModal,
  onOpenPaymentModal,
  onSendPaymentReminder,
  onOpenRequestDocsModal,
  onOpenStrategySheet,
  onAdvanceToStrategy,
  onCompleteAgreement,
  onDownloadSignedStrategy,
  onAcceptDocument,
  onDeclineDocument,
  onDeleteTodoRequest,
}: ActivityTimelineProps) {
  // Internal loading states for document accept/decline/delete
  const [acceptingDocId, setAcceptingDocId] = useState<string | null>(null);
  const [decliningDocId, setDecliningDocId] = useState<string | null>(null);
  const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);
  const [isAdvancingToStrategy, setIsAdvancingToStrategy] = useState(false);

  // Derived data from client
  const agreementTask = client.onboardingTasks.find(t => t.type === 'sign_agreement');
  const docsTask = client.onboardingTasks.find(t => t.type === 'upload_documents');
  const payment = client.payments[0];

  const step1Complete = true;
  const step2Complete = hasAgreementSigned;

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
        <h2 className="mb-4 text-base font-medium text-zinc-900">Activity</h2>
        <div className="flex items-center justify-center py-12">
          <SpinnerGap className="h-6 w-6 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="mb-6">
      <h2 className="mb-4 text-base font-medium text-zinc-900">Activity</h2>
      <div className="relative pl-6">
        <div className="flex flex-col gap-0">
          {/* ── Step 1: Account Created ── */}
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
              <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                {formatDate(client.user.createdAt)} · Created by Alex Morgan
              </span>
            </div>
          </div>

          {/* ── Step 2: Agreement Phase ── */}
          <div className="relative flex gap-4 pb-6">
            <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
              <div
                className={`h-2 w-2 rounded-full ${hasAgreementSent || hasAgreementSigned ? 'bg-emerald-500' : 'bg-zinc-300'}`}
              />
            </div>
            <div
              className={`absolute top-5 bottom-2 -left-[19px] w-[2px] ${hasAgreementSigned ? 'bg-emerald-200' : 'bg-zinc-200'}`}
            />
            <div className="flex flex-1 flex-col">
              <span className="font-medium text-zinc-900">
                {hasAgreementSigned
                  ? 'Service agreement signed'
                  : hasAgreementSent
                    ? 'Agreement sent for signature'
                    : 'Agreement pending'}
              </span>
              <span className="text-sm text-zinc-500">
                {hasAgreementSigned
                  ? 'Ariex Service Agreement 2024 was signed '
                  : hasAgreementSent
                    ? 'Waiting for client to review and sign'
                    : 'Send service agreement to client'}
              </span>
              <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                {formatDate(agreementTask?.updatedAt || client.user.createdAt)}
              </span>
              {step1Complete && !hasAgreementSigned && (
                <button
                  onClick={onOpenAgreementModal}
                  className={`mt-2 flex w-fit items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${
                    hasAgreementSent
                      ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {hasAgreementSent ? 'Resend agreement' : 'Send agreement'}
                </button>
              )}
              {agreementError && (
                <span className="mt-1 text-xs text-red-500">{agreementError}</span>
              )}
            </div>
          </div>

          {/* ── Step 3: Payment Phase ── */}
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
              <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
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
                      ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
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
                className={`h-2 w-2 rounded-full ${hasDocumentsRequested || hasAllDocumentsUploaded ? 'bg-emerald-500' : 'bg-zinc-300'}`}
              />
            </div>
            <div
              className={`absolute top-5 bottom-2 -left-[19px] w-[2px] ${hasAllDocumentsAccepted ? 'bg-emerald-200' : 'bg-zinc-200'}`}
            />
            <div className="flex flex-1 flex-col">
              <span className="font-medium text-zinc-900">
                {hasAllDocumentsAccepted
                  ? `Documents accepted · ${acceptedDocCount}/${totalDocTodos} complete`
                  : hasAllDocumentsUploaded
                    ? `Documents uploaded · ${uploadedDocCount}/${totalDocTodos} (review required)`
                    : hasDocumentsRequested
                      ? `Documents pending · ${uploadedDocCount}/${totalDocTodos} uploaded`
                      : 'Documents'}
              </span>
              <span className="text-sm text-zinc-500">
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
                            ? 'border-red-200 bg-red-50'
                            : isAccepted
                              ? 'border-emerald-200 bg-emerald-50'
                              : 'border-zinc-200 bg-zinc-50'
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
                              className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500"
                            />
                          ) : (
                            <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-zinc-300" />
                          )}
                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium ${
                                  isAccepted
                                    ? 'text-emerald-700'
                                    : isRejected
                                      ? 'text-red-700'
                                      : 'text-zinc-700'
                                }`}
                              >
                                {todo.title}
                              </span>
                              {isPendingReview && (
                                <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-medium text-zinc-600">
                                  Pending review
                                </span>
                              )}
                              {isAccepted && (
                                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-600">
                                  Accepted
                                </span>
                              )}
                              {isRejected && (
                                <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-600">
                                  Declined
                                </span>
                              )}
                            </div>
                            {uploadedFile && (
                              <a
                                href={uploadedFile.downloadUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-600 hover:bg-zinc-200"
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
                                  className="flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-200 disabled:opacity-50"
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
                              <p className="mt-1 text-xs text-red-600">
                                Client needs to re-upload this document
                              </p>
                            )}
                          </div>
                          {/* Decline button on hover for accepted docs */}
                          {isAccepted && documentId && (
                            <button
                              onClick={() => handleDeclineDocument(documentId)}
                              disabled={decliningDocId === documentId}
                              className="rounded p-1 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                              title="Decline document"
                            >
                              {decliningDocId === documentId ? (
                                <SpinnerGap className="h-3 w-3 animate-spin" />
                              ) : (
                                <XIcon weight="bold" className="h-3 w-3" />
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
                              className="rounded p-1 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
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

              <span className="mt-2 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                {formatDate(docsTask?.updatedAt || client.user.createdAt)}
              </span>

              <div className="flex items-center gap-2">
                {/* Request documents or Add more */}
                {hasAgreementSigned && (
                  <button
                    onClick={onOpenRequestDocsModal}
                    className="mt-2 w-fit rounded bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-200"
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

          {/* ── Step 5: Strategy Phase ── */}
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
              <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                {strategyDoc?.signedAt
                  ? formatDate(strategyDoc.signedAt)
                  : strategyDoc?.createdAt
                    ? formatDate(strategyDoc.createdAt)
                    : strategyMetadata?.sentAt
                      ? formatDate(new Date(strategyMetadata.sentAt))
                      : step5Sent
                        ? 'Sent'
                        : 'Not started'}
              </span>
              {/* Create/Resend strategy button */}
              {signedAgreement?.status === AgreementStatus.PENDING_STRATEGY &&
                !step5Signed &&
                !step5Complete && (
                  <button
                    onClick={onOpenStrategySheet}
                    className={`mt-2 w-fit rounded px-2 py-1 text-xs font-semibold ${
                      step5Sent
                        ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {step5Sent ? 'Resend strategy' : 'Create strategy'}
                  </button>
                )}
              {/* Client signed - show Download and Finish buttons */}
              {step5Signed && !step5Complete && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => onDownloadSignedStrategy()}
                    disabled={!strategyMetadata?.strategyEnvelopeId}
                    className="w-fit rounded bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-200 disabled:opacity-50"
                  >
                    Download signed document
                  </button>
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
                </div>
              )}
              {step5Complete && (
                <div className="mt-2 flex items-center gap-2">
                  <button className="w-fit rounded bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-200">
                    View strategy
                  </button>
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
                    <span className="w-fit rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
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
