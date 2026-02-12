/**
 * Strategy Models
 *
 * Type definitions and helpers for the compliance → client approval flow.
 *
 * Strategy lifecycle (tracked via document acceptanceStatus):
 *   REQUEST_COMPLIANCE_ACCEPTANCE  → sent to compliance, awaiting review
 *   ACCEPTED_BY_COMPLIANCE         → compliance approved (transient, auto-advances)
 *   REQUEST_CLIENT_ACCEPTANCE      → compliance approved, awaiting client
 *   ACCEPTED_BY_CLIENT             → client approved → agreement COMPLETED
 *   REJECTED_BY_COMPLIANCE         → compliance rejected → agreement back to PENDING_STRATEGY
 *   REJECTED_BY_CLIENT             → client declined  → agreement back to PENDING_STRATEGY
 */

import { AcceptanceStatus } from '@/types/document';
import { AgreementStatus } from '@/types/agreement';

// ─── Strategy Review Phase ────────────────────────────────────────────────

/**
 * High-level phase the strategy is in, derived from the document acceptanceStatus.
 */
export type StrategyPhase =
  | 'not_created'           // No strategy sent yet (PENDING_STRATEGY, no metadata)
  | 'compliance_review'     // Waiting for compliance to approve/reject
  | 'compliance_rejected'   // Compliance rejected — strategist must revise
  | 'client_review'         // Compliance approved, waiting for client
  | 'client_declined'       // Client declined — strategist must revise
  | 'completed';            // Both approved — agreement COMPLETED

/**
 * Detailed Step 5 state used by the hook and timeline.
 */
export interface Step5State {
  phase: StrategyPhase;

  /** Strategy has been created and sent (document exists) */
  strategySent: boolean;

  /** Compliance has approved the strategy document */
  complianceApproved: boolean;
  /** Compliance has rejected the strategy document */
  complianceRejected: boolean;

  /** Client has approved the strategy */
  clientApproved: boolean;
  /** Client has declined the strategy */
  clientDeclined: boolean;

  /** Both compliance AND client have approved → COMPLETED */
  isComplete: boolean;

  /** The raw acceptanceStatus of the strategy document, if any */
  acceptanceStatus: AcceptanceStatus | null;
}

// ─── Strategy Metadata ────────────────────────────────────────────────────

/**
 * Metadata stored in the agreement description as `__STRATEGY_METADATA__:{json}`.
 * This replaces the old envelope/ceremony fields with compliance tracking.
 */
export interface StrategyMetadata {
  type: 'STRATEGY';
  /** When the strategy was sent to compliance */
  sentAt: string;
  /** The document ID of the uploaded strategy PDF */
  strategyDocumentId: string;
  /** Who rejected (if applicable) and why */
  rejectedBy?: 'compliance' | 'client';
  rejectionReason?: string;
  rejectedAt?: string;

  // ── Legacy fields (backward compat only — never written by new flow) ──
  /** @deprecated No longer used — signing removed */
  strategyEnvelopeId?: string;
  /** @deprecated No longer used — signing removed */
  strategyCeremonyUrl?: string;
  /** @deprecated No longer used — signing removed */
  strategyRecipientId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Parse strategy metadata from the agreement description field.
 * Returns null if no metadata is found.
 */
export function parseStrategyMetadata(description?: string | null): StrategyMetadata | null {
  if (!description) return null;
  const match = description.match(/__STRATEGY_METADATA__:([\s\S]+)$/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as StrategyMetadata;
  } catch {
    return null;
  }
}

/**
 * Serialize strategy metadata into the description format.
 */
export function serializeStrategyMetadata(metadata: StrategyMetadata): string {
  return `__STRATEGY_METADATA__:${JSON.stringify(metadata)}`;
}

/**
 * Compute the Step 5 state from the agreement status and strategy document acceptanceStatus.
 *
 * @param agreementStatus - The current agreement status
 * @param docAcceptanceStatus - The acceptanceStatus on the strategy document (if it exists)
 */
export function computeStep5State(
  agreementStatus: string,
  docAcceptanceStatus?: AcceptanceStatus | string | null
): Step5State {
  const status = docAcceptanceStatus as AcceptanceStatus | null;

  // If agreement is COMPLETED, everything is done
  if (agreementStatus === AgreementStatus.COMPLETED) {
    return {
      phase: 'completed',
      strategySent: true,
      complianceApproved: true,
      complianceRejected: false,
      clientApproved: true,
      clientDeclined: false,
      isComplete: true,
      acceptanceStatus: status,
    };
  }

  // If agreement is PENDING_STRATEGY — either fresh or returned after rejection
  if (agreementStatus === AgreementStatus.PENDING_STRATEGY) {
    // Check if there was a previous rejection
    if (status === AcceptanceStatus.REJECTED_BY_COMPLIANCE) {
      return {
        phase: 'compliance_rejected',
        strategySent: true,
        complianceApproved: false,
        complianceRejected: true,
        clientApproved: false,
        clientDeclined: false,
        isComplete: false,
        acceptanceStatus: status,
      };
    }
    if (status === AcceptanceStatus.REJECTED_BY_CLIENT) {
      return {
        phase: 'client_declined',
        strategySent: true,
        complianceApproved: false,
        complianceRejected: false,
        clientApproved: false,
        clientDeclined: true,
        isComplete: false,
        acceptanceStatus: status,
      };
    }
    // Fresh — no strategy sent yet
    return {
      phase: 'not_created',
      strategySent: false,
      complianceApproved: false,
      complianceRejected: false,
      clientApproved: false,
      clientDeclined: false,
      isComplete: false,
      acceptanceStatus: null,
    };
  }

  // If agreement is PENDING_STRATEGY_REVIEW — strategy has been sent
  if (agreementStatus === AgreementStatus.PENDING_STRATEGY_REVIEW) {
    // Compliance is reviewing
    if (status === AcceptanceStatus.REQUEST_COMPLIANCE_ACCEPTANCE) {
      return {
        phase: 'compliance_review',
        strategySent: true,
        complianceApproved: false,
        complianceRejected: false,
        clientApproved: false,
        clientDeclined: false,
        isComplete: false,
        acceptanceStatus: status,
      };
    }

    // Compliance approved, client is reviewing
    if (
      status === AcceptanceStatus.ACCEPTED_BY_COMPLIANCE ||
      status === AcceptanceStatus.REQUEST_CLIENT_ACCEPTANCE
    ) {
      return {
        phase: 'client_review',
        strategySent: true,
        complianceApproved: true,
        complianceRejected: false,
        clientApproved: false,
        clientDeclined: false,
        isComplete: false,
        acceptanceStatus: status,
      };
    }

    // Client approved — should transition to COMPLETED soon
    if (status === AcceptanceStatus.ACCEPTED_BY_CLIENT) {
      return {
        phase: 'completed',
        strategySent: true,
        complianceApproved: true,
        complianceRejected: false,
        clientApproved: true,
        clientDeclined: false,
        isComplete: true,
        acceptanceStatus: status,
      };
    }

    // Fallback: strategy review without a known doc status — assume compliance pending
    return {
      phase: 'compliance_review',
      strategySent: true,
      complianceApproved: false,
      complianceRejected: false,
      clientApproved: false,
      clientDeclined: false,
      isComplete: false,
      acceptanceStatus: status,
    };
  }

  // Any other agreement status — strategy not started yet
  return {
    phase: 'not_created',
    strategySent: false,
    complianceApproved: false,
    complianceRejected: false,
    clientApproved: false,
    clientDeclined: false,
    isComplete: false,
    acceptanceStatus: null,
  };
}
