/**
 * Client priority + risk computation for the matrix view, dashboard sort,
 * and AI insights. Derives a single normalized priority score, a risk band,
 * a projected next deadline, and an AI signal tag from raw API data.
 *
 * Designed to be replaced with server-computed signals once those exist —
 * keeps shape stable so callers don't need to change.
 */

import { AgreementStatus } from '@/types/agreement';
import type { ApiAgreement, ApiClient } from '@/lib/api/strategist.api';

export type RiskBand = 'high' | 'medium' | 'low';

/** Coarse-grained projected deadline window for filter UX. */
export type DeadlineWindow = 'overdue' | 'this_week' | 'this_month' | 'later' | 'none';

export interface ClientPriority {
  /** Numeric urgency score; higher = more urgent. Stable enough to sort by. */
  score: number;
  /** Discretized score for filters / visual indicators. */
  riskBand: RiskBand;
  /** Projected next deadline (ISO), or null when nothing actionable. */
  nextDeadline: string | null;
  deadlineWindow: DeadlineWindow;
  /** Short human-readable status the matrix shows in the "AI signal" column. */
  signal: string;
  /** Whether the user should be flagged as actively at risk. */
  atRisk: boolean;
  /** Latest agreement examined to derive this priority (or null). */
  latestAgreement: ApiAgreement | null;
}

// ─── SLA windows per agreement phase (days) ───────────────────────────────
// Adjust these when product/CS specify final SLAs.

const SLA_DAYS: Partial<Record<AgreementStatus, number>> = {
  [AgreementStatus.DRAFT]: 1,
  [AgreementStatus.PENDING_SIGNATURE]: 7,
  [AgreementStatus.PENDING_PAYMENT]: 5,
  [AgreementStatus.PENDING_TODOS_COMPLETION]: 14,
  [AgreementStatus.PENDING_STRATEGY]: 5,
  [AgreementStatus.PENDING_STRATEGY_REVIEW]: 7,
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function daysBetween(from: Date | number, to: Date | number): number {
  const a = typeof from === 'number' ? from : from.getTime();
  const b = typeof to === 'number' ? to : to.getTime();
  return (b - a) / (1000 * 60 * 60 * 24);
}

function pickLatestAgreement(agreements: ApiAgreement[]): ApiAgreement | null {
  if (agreements.length === 0) return null;
  return [...agreements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
}

function bandFromScore(score: number): RiskBand {
  if (score >= 100) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

function windowForDeadline(deadline: Date | null, now: Date): DeadlineWindow {
  if (!deadline) return 'none';
  const diffDays = daysBetween(now, deadline);
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'this_week';
  if (diffDays <= 30) return 'this_month';
  return 'later';
}

// ─── Per-status priority logic ────────────────────────────────────────────

interface PhaseSignals {
  score: number;
  deadline: Date | null;
  signal: string;
  atRisk: boolean;
}

function evaluatePhase(
  status: AgreementStatus,
  agreement: ApiAgreement,
  now: Date
): PhaseSignals {
  const sla = SLA_DAYS[status];
  const baseAnchor = new Date(agreement.updatedAt || agreement.createdAt).getTime();
  const ageDays = daysBetween(baseAnchor, now);
  const deadline = sla ? new Date(baseAnchor + sla * 24 * 60 * 60 * 1000) : null;
  const overshoot = deadline ? daysBetween(deadline, now) : 0;
  const overdue = overshoot > 0;

  switch (status) {
    case AgreementStatus.DRAFT:
      return {
        score: 90 + Math.max(0, ageDays - 1) * 10,
        deadline,
        signal: 'Send agreement',
        atRisk: ageDays > 2,
      };

    case AgreementStatus.PENDING_SIGNATURE:
      return {
        score: 70 + Math.max(0, overshoot) * 8,
        deadline,
        signal: overdue ? `Unsigned · ${Math.round(ageDays)}d` : 'Awaiting client signature',
        atRisk: overdue || ageDays >= 5,
      };

    case AgreementStatus.PENDING_PAYMENT:
      return {
        score: 80 + Math.max(0, overshoot) * 10,
        deadline,
        signal: overdue ? `Payment overdue · ${Math.round(overshoot)}d` : 'Awaiting payment',
        atRisk: overdue || ageDays >= 3,
      };

    case AgreementStatus.PENDING_TODOS_COMPLETION:
      return {
        score: 50 + Math.max(0, overshoot) * 5,
        deadline,
        signal: overdue ? `Docs stalled · ${Math.round(ageDays)}d` : 'Awaiting documents',
        atRisk: overdue,
      };

    case AgreementStatus.PENDING_STRATEGY:
      return {
        score: 95 + ageDays * 6,
        deadline,
        signal: 'Create strategy',
        atRisk: ageDays >= 3,
      };

    case AgreementStatus.PENDING_STRATEGY_REVIEW:
      return {
        score: 55 + Math.max(0, overshoot) * 4,
        deadline,
        signal: overdue ? 'Review overdue' : 'In review',
        atRisk: overdue,
      };

    case AgreementStatus.COMPLETED:
      return {
        score: 5,
        deadline: null,
        signal: 'Active engagement',
        atRisk: false,
      };

    case AgreementStatus.CANCELLED:
      return {
        score: 0,
        deadline: null,
        signal: 'Cancelled',
        atRisk: false,
      };

    default:
      return {
        score: 30,
        deadline,
        signal: 'In progress',
        atRisk: false,
      };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Compute a priority + risk profile for a client, given the full agreement
 * list (filtered internally to this client). Pure function — safe to call
 * inside useMemo without external deps.
 */
export function computeClientPriority(
  client: ApiClient,
  allAgreements: ApiAgreement[],
  nowMs: number = Date.now()
): ClientPriority {
  const now = new Date(nowMs);
  const myAgreements = allAgreements.filter(a => a.clientId === client.id);
  const latest = pickLatestAgreement(myAgreements);

  // No agreement yet → strategist needs to create one. Age-based urgency.
  if (!latest) {
    const ageDays = daysBetween(new Date(client.createdAt).getTime(), nowMs);
    const score = ageDays < 1 ? 60 : 60 + ageDays * 6;
    const deadline = new Date(new Date(client.createdAt).getTime() + 2 * 24 * 60 * 60 * 1000);
    return {
      score,
      riskBand: bandFromScore(score),
      nextDeadline: deadline.toISOString(),
      deadlineWindow: windowForDeadline(deadline, now),
      signal: 'No agreement yet',
      atRisk: ageDays >= 2,
      latestAgreement: null,
    };
  }

  const phase = evaluatePhase(latest.status, latest, now);

  return {
    score: Math.max(0, Math.round(phase.score)),
    riskBand: bandFromScore(phase.score),
    nextDeadline: phase.deadline ? phase.deadline.toISOString() : null,
    deadlineWindow: windowForDeadline(phase.deadline, now),
    signal: phase.signal,
    atRisk: phase.atRisk,
    latestAgreement: latest,
  };
}

// ─── Formatting helpers (used by UI) ──────────────────────────────────────

export function formatDeadlineLabel(priority: ClientPriority, nowMs: number = Date.now()): string {
  if (!priority.nextDeadline) return '—';
  const target = new Date(priority.nextDeadline).getTime();
  const diffDays = Math.round(daysBetween(nowMs, target));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 7) return `In ${diffDays}d`;
  return new Date(priority.nextDeadline).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export const RISK_BAND_LABEL: Record<RiskBand, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const DEADLINE_WINDOW_LABEL: Record<DeadlineWindow, string> = {
  overdue: 'Overdue',
  this_week: 'This week',
  this_month: 'This month',
  later: 'Later',
  none: 'No deadline',
};
