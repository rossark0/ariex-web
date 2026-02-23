/**
 * Compliance Models
 *
 * Type definitions for the compliance module.
 * Compliance users review strategy documents before they reach the client.
 */

import type { ApiClient, ApiAgreement, ApiDocument, ApiTodo, ApiTodoList } from '@/lib/api/strategist.api';
import type { ComplianceStrategist, ComplianceComment, FileMetadata } from '@/lib/api/compliance.api';
import type { Step5State, StrategyMetadata } from '@/contexts/strategist-contexts/client-management/models/strategy.model';
import type { ClientStatusKey } from '@/lib/client-status';
import {
  AgreementStatus,
  isAgreementSigned,
  isAgreementPaid,
  areTodosCompleted,
} from '@/types/agreement';
import { computeStep5State, parseStrategyMetadata } from '@/contexts/strategist-contexts/client-management/models/strategy.model';

// ─── Compliance Strategist View ───────────────────────────────────────────

export interface ComplianceStrategistView {
  id: string;
  name: string;
  email: string;
  status: string;
  clientCount: number;
  activeClientCount: number;
  clients: ApiClient[];
}

/**
 * Map API strategist to view model
 */
export function toStrategistView(s: ComplianceStrategist): ComplianceStrategistView {
  const clients = s.clients ?? [];
  return {
    id: s.id,
    name: s.fullName || s.name || s.email,
    email: s.email,
    status: s.status || 'active',
    clientCount: clients.length,
    activeClientCount: clients.length, // refined later with agreement data
    clients,
  };
}

// ─── Compliance Client View ───────────────────────────────────────────────

export interface ComplianceClientView {
  id: string;
  name: string;
  email: string;
  businessName?: string;
  businessType?: string;
  city?: string;
  state?: string;
  phone?: string;
  filingStatus?: string;
  dependents?: number;
  estimatedIncome?: number;
  createdAt: string;
  statusKey: ClientStatusKey;
}

/**
 * Compute a client status key from their agreement data.
 * This is the real-data equivalent of getStatusKey() from client-status.ts.
 */
export function computeClientStatusKey(
  agreement?: ApiAgreement | null,
  strategyDocAcceptanceStatus?: string | null
): ClientStatusKey {
  if (!agreement) return 'awaiting_agreement';

  const status = agreement.status as AgreementStatus;

  // Check agreement status progression
  if (!isAgreementSigned(status)) return 'awaiting_agreement';
  if (!isAgreementPaid(status)) return 'awaiting_payment';
  if (!areTodosCompleted(status)) return 'awaiting_documents';

  // In strategy phase
  if (status === AgreementStatus.PENDING_STRATEGY) return 'ready_for_strategy';

  if (status === AgreementStatus.PENDING_STRATEGY_REVIEW) {
    // Use step5 computation for granular compliance/client states
    const step5 = computeStep5State(status, strategyDocAcceptanceStatus);
    if (step5.phase === 'compliance_review') return 'awaiting_compliance';
    if (step5.phase === 'client_review') return 'awaiting_approval';
    if (step5.phase === 'completed') return 'active';
    return 'awaiting_compliance';
  }

  if (status === AgreementStatus.COMPLETED) return 'active';

  return 'ready_for_strategy';
}

/**
 * Map API client + agreement to a compliance client view
 */
export function toClientView(
  client: ApiClient,
  agreement?: ApiAgreement | null,
  strategyDocAcceptanceStatus?: string | null
): ComplianceClientView {
  const profile = client.clientProfile;
  return {
    id: client.id,
    name: client.fullName || client.name || client.email,
    email: client.email,
    businessName: profile?.businessName ?? undefined,
    businessType: profile?.businessType ?? undefined,
    city: profile?.city ?? undefined,
    state: profile?.state ?? undefined,
    phone: profile?.phoneNumber || profile?.phone || undefined,
    filingStatus: profile?.filingStatus ?? undefined,
    dependents: profile?.dependents ?? undefined,
    estimatedIncome: profile?.estimatedIncome ?? undefined,
    createdAt: client.createdAt,
    statusKey: computeClientStatusKey(agreement, strategyDocAcceptanceStatus),
  };
}

// ─── Client Detail ────────────────────────────────────────────────────────

export interface ComplianceClientDetail {
  client: ApiClient;
  clientView: ComplianceClientView;
  agreement: ApiAgreement | null;
  documents: ApiDocument[];
  files: FileMetadata[];
  todoLists: ApiTodoList[];
  todos: ApiTodo[];
  comments: ComplianceComment[];
  strategyDocument: ApiDocument | null;
  strategyMetadata: StrategyMetadata | null;
  step5State: Step5State;
}

/**
 * Find the strategy document from a list of agreement documents
 */
export function findStrategyDocument(documents: ApiDocument[]): ApiDocument | null {
  return (
    documents.find(d => d.type === 'STRATEGY') ??
    documents.find(d => d.name?.toLowerCase().includes('strategy')) ??
    null
  );
}

// ─── Timeline State (real data) ───────────────────────────────────────────

export interface RealTimelineState {
  step1Complete: boolean;
  step2Complete: boolean;
  step3Complete: boolean;
  step4Complete: boolean;
  step5State: Step5State;
  step2Sent: boolean;
  step3Sent: boolean;
  step4Sent: boolean;
  statusKey: ClientStatusKey;
}

/**
 * Compute timeline state from real API data.
 * This replaces the mock-based getTimelineState().
 */
export function computeTimelineState(
  agreement: ApiAgreement | null,
  strategyDoc: ApiDocument | null
): RealTimelineState {
  if (!agreement) {
    return {
      step1Complete: true,
      step2Complete: false,
      step3Complete: false,
      step4Complete: false,
      step5State: computeStep5State('DRAFT', null),
      step2Sent: false,
      step3Sent: false,
      step4Sent: false,
      statusKey: 'awaiting_agreement',
    };
  }

  const status = agreement.status as AgreementStatus;
  const signed = isAgreementSigned(status);
  const paid = isAgreementPaid(status);
  const todosComplete = areTodosCompleted(status);

  const step5 = computeStep5State(status, strategyDoc?.acceptanceStatus ?? null);

  const statusKey = computeClientStatusKey(agreement, strategyDoc?.acceptanceStatus);

  return {
    step1Complete: true,
    step2Complete: signed,
    step3Complete: paid,
    step4Complete: todosComplete,
    step5State: step5,
    step2Sent: status !== AgreementStatus.DRAFT, // agreement exists = sent
    step3Sent: signed, // payment becomes available after signing
    step4Sent: paid, // todos become available after payment
    statusKey,
  };
}
