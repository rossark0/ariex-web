/**
 * Client Status Logic
 * 
 * Computes client status based on the 5-step timeline:
 * 1. Account Created (always complete)
 * 2. Agreement signed
 * 3. Payment received
 * 4. Documents uploaded
 * 5. Strategy signed
 */

import type { FullClientMock } from '@/lib/mocks/client-full';

// ============================================================================
// TYPES
// ============================================================================

export type ClientStatusKey = 
  | 'awaiting_agreement' 
  | 'awaiting_payment' 
  | 'awaiting_documents' 
  | 'ready_for_strategy' 
  | 'awaiting_signature' 
  | 'active';

export interface ClientStatusConfig {
  label: string;
  badgeColor: string;
  badgeClassName: string;
  borderClassName: string;
  textClassName: string;
}

export interface TimelineStepState {
  step1Complete: boolean;
  step2Complete: boolean;
  step3Complete: boolean;
  step4Complete: boolean;
  step5Complete: boolean;
  step2Sent: boolean;
  step3Sent: boolean;
  step4Sent: boolean;
  step5Sent: boolean;
}

// ============================================================================
// STATUS CONFIGURATION
// ============================================================================

export const CLIENT_STATUS_CONFIG: Record<ClientStatusKey, ClientStatusConfig> = {
  awaiting_agreement: {
    label: 'agreement · pending signature',
    badgeColor: 'bg-amber-500',
    badgeClassName: 'bg-amber-100 text-amber-700',
    borderClassName: 'border-amber-400',
    textClassName: 'text-amber-600',
  },
  awaiting_payment: {
    label: 'payment · pending',
    badgeColor: 'bg-amber-500',
    badgeClassName: 'bg-amber-100 text-amber-700',
    borderClassName: 'border-amber-400',
    textClassName: 'text-amber-600',
  },
  awaiting_documents: {
    label: 'documents · pending upload',
    badgeColor: 'bg-amber-500',
    badgeClassName: 'bg-amber-100 text-amber-700',
    borderClassName: 'border-amber-400',
    textClassName: 'text-amber-600',
  },
  ready_for_strategy: {
    label: 'strategy · not created',
    badgeColor: 'bg-zinc-500',
    badgeClassName: 'bg-zinc-100 text-zinc-600',
    borderClassName: 'border-zinc-300',
    textClassName: 'text-zinc-500',
  },
  awaiting_signature: {
    label: 'strategy · pending signature',
    badgeColor: 'bg-teal-500',
    badgeClassName: 'bg-teal-100 text-teal-700',
    borderClassName: 'border-teal-500',
    textClassName: 'text-teal-600',
  },
  active: {
    label: 'strategy · active',
    badgeColor: 'bg-emerald-100',
    badgeClassName: 'bg-emerald-100 text-emerald-700',
    borderClassName: 'border-emerald-500',
    textClassName: 'text-emerald-600',
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Compute the 5-step timeline state for a client
 */
export function getTimelineState(client: FullClientMock): TimelineStepState {
  const agreementTask = client.onboardingTasks.find(t => t.type === 'sign_agreement');
  const docsTask = client.onboardingTasks.find(t => t.type === 'upload_documents');
  const payment = client.payments[0];
  const agreementDoc = client.documents.find(d => 
    d.category === 'contract' && d.id === agreementTask?.agreementDocumentId
  );
  const strategyDoc = client.documents.find(
    d => d.category === 'contract' && d.originalName.toLowerCase().includes('strategy')
  );

  // Step completion states (client has completed their part)
  const step1Complete = true; // Account created is always complete
  const step2Complete = agreementTask?.status === 'completed' || agreementDoc?.signatureStatus === 'SIGNED';
  const step3Complete = payment?.status === 'completed';
  const step4Complete = docsTask?.status === 'completed';
  const step5Complete = strategyDoc?.signatureStatus === 'SIGNED';

  // Strategist has acted on each step
  const step2Sent = agreementDoc?.signatureStatus === 'SENT' || agreementDoc?.signatureStatus === 'SIGNED';
  const step3Sent = step2Complete && !!payment?.paymentLinkUrl;
  const step4Sent = step3Complete;
  const step5Sent = step4Complete && (strategyDoc?.signatureStatus === 'SENT' || step5Complete);

  return {
    step1Complete,
    step2Complete,
    step3Complete,
    step4Complete,
    step5Complete,
    step2Sent: !!step2Sent,
    step3Sent,
    step4Sent,
    step5Sent,
  };
}

/**
 * Get the status key based on timeline state
 */
export function getStatusKey(state: TimelineStepState): ClientStatusKey {
  if (!state.step2Complete) return 'awaiting_agreement';
  if (!state.step3Complete) return 'awaiting_payment';
  if (!state.step4Complete) return 'awaiting_documents';
  if (state.step5Complete) return 'active';
  if (state.step5Sent) return 'awaiting_signature';
  return 'ready_for_strategy';
}

/**
 * Get the full status configuration for a client
 */
export function getClientStatus(client: FullClientMock): ClientStatusConfig & { key: ClientStatusKey } {
  const state = getTimelineState(client);
  const key = getStatusKey(state);
  return { ...CLIENT_STATUS_CONFIG[key], key };
}

/**
 * Get timeline state and status for a client (combined helper)
 */
export function getClientTimelineAndStatus(client: FullClientMock) {
  const state = getTimelineState(client);
  const key = getStatusKey(state);
  const config = CLIENT_STATUS_CONFIG[key];
  
  return {
    ...state,
    statusKey: key,
    statusConfig: config,
  };
}

