/**
 * Compliance Service
 *
 * Orchestrates API calls and store updates for the compliance module.
 * Keeps hooks thin — all business logic lives here.
 */

import { complianceStore } from '../ComplianceStore';
import {
  getComplianceStrategists,
  getComplianceStrategistById,
  getComplianceClients,
  getComplianceClientById,
  getStrategistAgreements,
  getComplianceAgreement,
  getAgreementDocuments,
  getAgreementFiles,
  getAgreementTodoLists,
  getAgreementTodos,
  addComplianceComment as apiAddComment,
  getDocumentComments,
  acceptComplianceInvitation as apiAcceptInvitation,
} from '@/lib/api/compliance.api';
import {
  approveStrategyAsCompliance,
  rejectStrategyAsCompliance,
} from '@/lib/api/strategies.actions';
import {
  toStrategistView,
  toClientView,
  findStrategyDocument,
  computeClientStatusKey,
} from '../models/compliance.model';
import { parseStrategyMetadata } from '@/contexts/strategist-contexts/client-management/models/strategy.model';
import type { ComplianceStrategist } from '@/lib/api/compliance.api';
import type { ApiAgreement, ApiClient } from '@/lib/api/strategist.api';

// ============================================================================
// Strategists
// ============================================================================

/**
 * Fetch all strategists in the compliance user's scope
 */
export async function fetchStrategists(): Promise<void> {
  const store = complianceStore.getState();
  store.setIsLoadingStrategists(true);
  store.setStrategistError(null);

  try {
    const strategists = await getComplianceStrategists(true);
    store.setStrategists(strategists);
    store.setStrategistViews(strategists.map(toStrategistView));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load strategists';
    store.setStrategistError(message);
  } finally {
    store.setIsLoadingStrategists(false);
  }
}

/**
 * Fetch a single strategist detail
 */
export async function fetchStrategistDetail(strategistId: string): Promise<void> {
  const store = complianceStore.getState();
  store.setIsLoadingStrategistDetail(true);
  store.setSelectedStrategist(null);

  try {
    const strategist = await getComplianceStrategistById(strategistId, true);
    store.setSelectedStrategist(strategist);
  } catch (error) {
    console.error('[Compliance] Failed to fetch strategist detail:', error);
  } finally {
    store.setIsLoadingStrategistDetail(false);
  }
}

// ============================================================================
// Clients
// ============================================================================

/**
 * Fetch all clients for a strategist within compliance scope.
 * Also fetches agreements to compute client status keys.
 */
export async function fetchClients(strategistId: string): Promise<void> {
  const store = complianceStore.getState();
  store.setIsLoadingClients(true);
  store.setClientError(null);

  try {
    const [clients, agreements] = await Promise.all([
      getComplianceClients(strategistId),
      getStrategistAgreements(strategistId),
    ]);

    store.setClients(clients);

    // Build views with computed status from agreement data
    const views = clients.map(client => {
      const clientAgreement = agreements.find(a => a.clientId === client.id) ?? null;
      // If agreement has strategy metadata, find the strategy document's acceptance status
      let strategyDocAcceptance: string | null = null;
      if (clientAgreement) {
        const metadata = parseStrategyMetadata(clientAgreement.description);
        // We'd need to fetch each document to get acceptance status,
        // but for list view we can infer from agreement status
        // The detailed status is computed on the detail page
      }
      return toClientView(client, clientAgreement, strategyDocAcceptance);
    });

    store.setClientViews(views);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load clients';
    store.setClientError(message);
  } finally {
    store.setIsLoadingClients(false);
  }
}

// ============================================================================
// Client Detail
// ============================================================================

/**
 * Fetch full client detail including agreement, documents, todos, files.
 * This is the main data-loading function for the client detail page.
 */
export async function fetchClientDetail(
  clientId: string,
  strategistId: string
): Promise<void> {
  const store = complianceStore.getState();
  store.resetClientDetail();
  store.setIsLoadingClientDetail(true);

  try {
    // Step 1: Fetch client and their agreement
    const [client, agreements] = await Promise.all([
      getComplianceClientById(clientId, strategistId),
      getStrategistAgreements(strategistId),
    ]);

    if (!client) {
      store.setClientDetailError('Client not found');
      store.setIsLoadingClientDetail(false);
      return;
    }

    store.setSelectedClient(client);

    // Find the agreement for this client
    const agreement = agreements.find(a => a.clientId === clientId) ?? null;
    store.setSelectedAgreement(agreement);

    if (!agreement) {
      // No agreement yet — minimal detail
      store.setIsLoadingClientDetail(false);
      return;
    }

    // Step 2: Fetch all agreement-related data in parallel
    const [documents, files, todoLists, todos] = await Promise.all([
      getAgreementDocuments(agreement.id),
      getAgreementFiles(agreement.id),
      getAgreementTodoLists(agreement.id),
      getAgreementTodos(agreement.id),
    ]);

    store.setClientDocuments(documents);
    store.setClientFiles(files);
    store.setClientTodoLists(todoLists);
    store.setClientTodos(todos);

    // Find strategy document
    const strategyDoc = findStrategyDocument(documents);
    store.setStrategyDocument(strategyDoc);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load client detail';
    store.setClientDetailError(message);
    console.error('[Compliance] Failed to fetch client detail:', error);
  } finally {
    store.setIsLoadingClientDetail(false);
  }
}

// ============================================================================
// Strategy Actions
// ============================================================================

/**
 * Approve strategy as compliance officer.
 * Uses the already-built server action from strategies.actions.ts.
 */
export async function approveStrategy(documentId: string): Promise<boolean> {
  try {
    const result = await approveStrategyAsCompliance(documentId);
    if (result.success) {
      // Refresh the strategy document status in store
      const store = complianceStore.getState();
      const agreement = store.selectedAgreement;
      if (agreement) {
        const documents = await getAgreementDocuments(agreement.id);
        store.setClientDocuments(documents);
        store.setStrategyDocument(findStrategyDocument(documents));
        // Refresh agreement for updated status
        const updated = await getComplianceAgreement(agreement.id);
        if (updated) store.setSelectedAgreement(updated);
      }
    }
    return result.success;
  } catch (error) {
    console.error('[Compliance] Failed to approve strategy:', error);
    return false;
  }
}

/**
 * Reject strategy as compliance officer.
 * Uses the already-built server action from strategies.actions.ts.
 */
export async function rejectStrategy(
  agreementId: string,
  documentId: string,
  reason: string
): Promise<boolean> {
  try {
    const result = await rejectStrategyAsCompliance(agreementId, documentId, reason);
    if (result.success) {
      // Refresh data
      const store = complianceStore.getState();
      const [documents, agreement] = await Promise.all([
        getAgreementDocuments(agreementId),
        getComplianceAgreement(agreementId),
      ]);
      store.setClientDocuments(documents);
      store.setStrategyDocument(findStrategyDocument(documents));
      if (agreement) store.setSelectedAgreement(agreement);
    }
    return result.success;
  } catch (error) {
    console.error('[Compliance] Failed to reject strategy:', error);
    return false;
  }
}

// ============================================================================
// Comments
// ============================================================================

/**
 * Fetch comments for a specific document
 */
export async function fetchComments(documentId: string): Promise<void> {
  const store = complianceStore.getState();
  store.setIsLoadingComments(true);

  try {
    const comments = await getDocumentComments(documentId);
    store.setComments(comments);
  } catch (error) {
    console.error('[Compliance] Failed to fetch comments:', error);
  } finally {
    store.setIsLoadingComments(false);
  }
}

/**
 * Add a comment
 */
export async function addComment(data: {
  strategistUserId: string;
  documentId?: string;
  body: string;
}): Promise<boolean> {
  try {
    const comment = await apiAddComment(data);
    complianceStore.getState().addComment(comment);
    return true;
  } catch (error) {
    console.error('[Compliance] Failed to add comment:', error);
    return false;
  }
}

// ============================================================================
// Invitation
// ============================================================================

/**
 * Accept a strategist invitation using a token.
 * Called during onboarding after first login.
 */
export async function acceptInvitation(token: string): Promise<boolean> {
  try {
    await apiAcceptInvitation(token);
    return true;
  } catch (error) {
    console.error('[Compliance] Failed to accept invitation:', error);
    return false;
  }
}
