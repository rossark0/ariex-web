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

// ============================================================================
// DEBUG LOGGING
// ============================================================================

type UserRole = 'strategist' | 'client';

const ROLE_EMOJI: Record<UserRole, string> = {
  strategist: '🔵', // Blue circle for strategist
  client: '🟣',     // Purple circle for client
};

const STATUS_EMOJI: Record<AgreementStatus, string> = {
  [AgreementStatus.DRAFT]: '📝',
  [AgreementStatus.PENDING_SIGNATURE]: '✍️',
  [AgreementStatus.PENDING_PAYMENT]: '💳',
  [AgreementStatus.PENDING_TODOS_COMPLETION]: '📋',
  [AgreementStatus.PENDING_STRATEGY]: '📊',
  [AgreementStatus.PENDING_STRATEGY_REVIEW]: '👀',
  [AgreementStatus.CANCELLED]: '❌',
  [AgreementStatus.COMPLETED]: '✅',
};

/**
 * Log agreement status with role-specific emoji
 */
export function logAgreementStatus(
  role: UserRole,
  agreementId: string,
  status: AgreementStatus,
  context?: string
): void {
  const roleEmoji = ROLE_EMOJI[role];
  const statusEmoji = STATUS_EMOJI[status] || '❓';
  const label = getStatusLabel(status);
  
  console.log(
    `${roleEmoji} [${role.toUpperCase()}] ${statusEmoji} Agreement ${agreementId.slice(0, 8)}... → ${label} (${status})${context ? ` | ${context}` : ''}`
  );
}

/**
 * Log multiple agreements at once
 */
export function logAgreements(
  role: UserRole,
  agreements: Array<{ id: string; status: AgreementStatus; name?: string }>,
  context?: string
): void {
  const roleEmoji = ROLE_EMOJI[role];
  console.log(`\n${roleEmoji} [${role.toUpperCase()}] ${context || 'Agreements loaded'}:`);
  console.log('─'.repeat(50));
  
  if (agreements.length === 0) {
    console.log('  (no agreements)');
  } else {
    agreements.forEach((a, i) => {
      const statusEmoji = STATUS_EMOJI[a.status] || '❓';
      const label = getStatusLabel(a.status);
      console.log(
        `  ${i + 1}. ${statusEmoji} ${a.name || a.id.slice(0, 8) + '...'} → ${label}`
      );
    });
  }
  console.log('─'.repeat(50) + '\n');
}
