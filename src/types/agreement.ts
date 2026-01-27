/**
 * Agreement Status Enum
 * Matches backend AgreementStatus enum
 */
export enum AgreementStatus {
  DRAFT = 'DRAFT',
  PENDING_SIGNATURE = 'PENDING_SIGNATURE',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PENDING_TODOS_COMPLETION = 'PENDING_TODOS_COMPLETION',
  PENDING_STRATEGY = 'PENDING_STRATEGY',
  PENDING_STRATEGY_REVIEW = 'PENDING_STRATEGY_REVIEW',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

/**
 * Pure utility functions for agreement status lifecycle checks
 * These are pure functions - no dependencies on object state
 */

/**
 * Check if agreement is in an active state (not draft, completed, or cancelled)
 */
export function isAgreementActive(status: AgreementStatus): boolean {
  return (
    status !== AgreementStatus.DRAFT &&
    status !== AgreementStatus.COMPLETED &&
    status !== AgreementStatus.CANCELLED
  );
}

/**
 * Check if agreement has been signed
 * True for all statuses after PENDING_SIGNATURE
 */
export function isAgreementSigned(status: AgreementStatus): boolean {
  return (
    status !== AgreementStatus.DRAFT &&
    status !== AgreementStatus.PENDING_SIGNATURE
  );
}

/**
 * Check if agreement has been paid
 * True for all statuses after PENDING_PAYMENT
 */
export function isAgreementPaid(status: AgreementStatus): boolean {
  return (
    status !== AgreementStatus.DRAFT &&
    status !== AgreementStatus.PENDING_SIGNATURE &&
    status !== AgreementStatus.PENDING_PAYMENT
  );
}

/**
 * Check if all todos are completed
 * True for all statuses after PENDING_TODOS_COMPLETION
 */
export function areTodosCompleted(status: AgreementStatus): boolean {
  return (
    status !== AgreementStatus.DRAFT &&
    status !== AgreementStatus.PENDING_SIGNATURE &&
    status !== AgreementStatus.PENDING_PAYMENT &&
    status !== AgreementStatus.PENDING_TODOS_COMPLETION
  );
}

/**
 * Check if strategy has been sent
 * True for PENDING_STRATEGY_REVIEW and COMPLETED
 */
export function isStrategySent(status: AgreementStatus): boolean {
  return (
    status === AgreementStatus.PENDING_STRATEGY_REVIEW ||
    status === AgreementStatus.COMPLETED
  );
}

/**
 * Check if agreement is fully completed
 */
export function isAgreementCompleted(status: AgreementStatus): boolean {
  return status === AgreementStatus.COMPLETED;
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: AgreementStatus): string {
  switch (status) {
    case AgreementStatus.DRAFT:
      return 'Draft';
    case AgreementStatus.PENDING_SIGNATURE:
      return 'Awaiting Signature';
    case AgreementStatus.PENDING_PAYMENT:
      return 'Awaiting Payment';
    case AgreementStatus.PENDING_TODOS_COMPLETION:
      return 'Documents Required';
    case AgreementStatus.PENDING_STRATEGY:
      return 'Awaiting Strategy';
    case AgreementStatus.PENDING_STRATEGY_REVIEW:
      return 'Strategy Review';
    case AgreementStatus.CANCELLED:
      return 'Cancelled';
    case AgreementStatus.COMPLETED:
      return 'Completed';
    default:
      return 'Unknown';
  }
}
