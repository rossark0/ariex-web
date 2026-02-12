import type { ApiClient, ApiAgreement, ApiDocument } from '@/lib/api/strategist.api';
import {
  AgreementStatus,
  isAgreementSigned,
  isAgreementPaid,
  areTodosCompleted,
} from '@/types/agreement';
import { type ClientStatusKey } from '@/lib/client-status';
import { AcceptanceStatus } from '@/types/document';
import { computeStep5State, type Step5State } from '../models/strategy.model';

/**
 * Compute the overall client status based on agreement progress + strategy document state.
 *
 * @param client - The API client
 * @param agreements - All agreements for this client
 * @param strategyDocAcceptanceStatus - The acceptanceStatus on the strategy document (if any)
 */
export function computeClientStatus(
  client: ApiClient | null,
  agreements: ApiAgreement[],
  strategyDocAcceptanceStatus?: AcceptanceStatus | string | null
): ClientStatusKey {
  if (!client || agreements.length === 0) {
    return 'awaiting_agreement';
  }

  // Get most recent agreement
  const sortedAgreements = [...agreements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const activeAgreement = sortedAgreements[0];

  // For PENDING_STRATEGY_REVIEW, use Step 5 state to differentiate
  // compliance review vs client review
  if (activeAgreement.status === AgreementStatus.PENDING_STRATEGY_REVIEW) {
    const step5 = computeStep5State(activeAgreement.status, strategyDocAcceptanceStatus);
    if (step5.isComplete) return 'active';
    if (step5.phase === 'client_review') return 'awaiting_approval';
    return 'awaiting_compliance'; // compliance_review or fallback
  }

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
 * Check if agreement can be completed (both compliance + client approved)
 */
export function canCompleteAgreement(
  agreement: ApiAgreement | null,
  strategyDocAcceptanceStatus?: AcceptanceStatus | string | null
): boolean {
  if (!agreement) return false;
  if (agreement.status !== AgreementStatus.PENDING_STRATEGY_REVIEW) return false;

  // Both compliance and client must have approved
  const step5 = computeStep5State(agreement.status, strategyDocAcceptanceStatus);
  return step5.isComplete;
}

/**
 * Compute the full Step 5 state for use in components.
 * Re-exports from strategy.model for convenience.
 */
export { computeStep5State } from '../models/strategy.model';
export type { Step5State, StrategyPhase } from '../models/strategy.model';
