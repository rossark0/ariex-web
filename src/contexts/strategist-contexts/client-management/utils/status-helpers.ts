import type { ApiClient, ApiAgreement, ApiDocument } from '@/lib/api/strategist.api';
import {
  AgreementStatus,
  isAgreementSigned,
  isAgreementPaid,
  areTodosCompleted,
} from '@/types/agreement';
import { type ClientStatusKey } from '@/lib/client-status';
import { AcceptanceStatus } from '@/types/document';

/**
 * Compute the overall client status based on their agreement progress
 */
export function computeClientStatus(
  client: ApiClient | null,
  agreements: ApiAgreement[]
): ClientStatusKey {
  if (!client || agreements.length === 0) {
    return 'awaiting_agreement';
  }

  // Get most recent agreement
  const sortedAgreements = [...agreements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const activeAgreement = sortedAgreements[0];

  // Map agreement status to client status
  switch (activeAgreement.status) {
    case AgreementStatus.DRAFT:
      return 'awaiting_agreement';
    case AgreementStatus.PENDING_SIGNATURE:
      return 'awaiting_agreement';
    case AgreementStatus.PENDING_PAYMENT:
      return 'awaiting_payment';
    case AgreementStatus.PENDING_TODOS_COMPLETION:
      return 'awaiting_documents';
    case AgreementStatus.PENDING_STRATEGY:
      return 'ready_for_strategy';
    case AgreementStatus.PENDING_STRATEGY_REVIEW:
      return 'awaiting_signature';
    case AgreementStatus.COMPLETED:
      return 'active';
    case AgreementStatus.CANCELLED:
      return 'awaiting_agreement'; // Cancelled treated as needs new agreement
    default:
      return 'awaiting_agreement';
  }
}

/**
 * Get priority value for agreement status (lower = higher priority)
 */
export function getStatusPriority(status: AgreementStatus): number {
  const priorities: Record<AgreementStatus, number> = {
    [AgreementStatus.DRAFT]: 1,
    [AgreementStatus.PENDING_SIGNATURE]: 2,
    [AgreementStatus.PENDING_PAYMENT]: 3,
    [AgreementStatus.PENDING_TODOS_COMPLETION]: 4,
    [AgreementStatus.PENDING_STRATEGY]: 5,
    [AgreementStatus.PENDING_STRATEGY_REVIEW]: 6,
    [AgreementStatus.COMPLETED]: 7,
    [AgreementStatus.CANCELLED]: 8,
  };
  return priorities[status] || 99;
}

/**
 * Check if strategist can send a payment link for the agreement
 */
export function canSendPaymentLink(agreement: ApiAgreement | null): boolean {
  if (!agreement) return false;
  return isAgreementSigned(agreement.status) && !isAgreementPaid(agreement.status);
}

/**
 * Check if strategist can advance agreement to strategy phase
 */
export function canAdvanceToStrategy(
  agreement: ApiAgreement | null,
  documents: ApiDocument[]
): boolean {
  if (!agreement) return false;

  // Must be paid
  if (!isAgreementPaid(agreement.status)) return false;

  // All todos must be completed
  if (!areTodosCompleted(agreement.status as AgreementStatus)) return false;

  // All uploaded documents must be accepted by strategist
  const hasUnacceptedDocs = documents.some(
    doc => (doc as any).acceptanceStatus !== AcceptanceStatus.ACCEPTED_BY_STRATEGIST
  );

  return !hasUnacceptedDocs;
}

/**
 * Check if strategist can send strategy for signature
 */
export function canSendStrategy(agreement: ApiAgreement | null): boolean {
  if (!agreement) return false;
  return agreement.status === AgreementStatus.PENDING_STRATEGY;
}

/**
 * Check if strategist can complete the agreement (finalize)
 */
export function canCompleteAgreement(agreement: ApiAgreement | null): boolean {
  if (!agreement) return false;
  return agreement.status === AgreementStatus.PENDING_STRATEGY_REVIEW;
}
