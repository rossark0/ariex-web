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
  updateComplianceDocumentAcceptance,
  updateComplianceAgreement,
} from '@/lib/api/compliance.api';
import {
  toStrategistView,
  toClientView,
  findStrategyDocument,
  computeClientStatusKey,
} from '../models/compliance.model';
import {
  parseStrategyMetadata,
  serializeStrategyMetadata,
} from '@/contexts/strategist-contexts/client-management/models/strategy.model';
import { AgreementStatus } from '@/types/agreement';
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
      // Pick the most recent agreement for this client
      const clientAgreements = agreements
        .filter(a => a.clientId === client.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const clientAgreement = clientAgreements[0] ?? null;
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
 * Supports multiple agreements per client — auto-selects the most recent.
 */
export async function fetchClientDetail(
  clientId: string,
  strategistId: string
): Promise<void> {
  const store = complianceStore.getState();
  store.resetClientDetail();
  store.setIsLoadingClientDetail(true);

  try {
    // Step 1: Fetch client and their agreements
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

    // Find ALL agreements for this client, sorted newest first
    const clientAgreements = agreements
      .filter(a => a.clientId === clientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    store.setClientAgreements(clientAgreements);

    // Auto-select the most recent agreement
    const agreement = clientAgreements[0] ?? null;
    store.setSelectedAgreementId(agreement?.id ?? null);
    store.setSelectedAgreement(agreement);

    if (!agreement) {
      // No agreement yet — minimal detail
      store.setIsLoadingClientDetail(false);
      return;
    }

    // Step 2: Fetch all agreement-related data in parallel
    await loadAgreementData(agreement.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load client detail';
    store.setClientDetailError(message);
    console.error('[Compliance] Failed to fetch client detail:', error);
  } finally {
    store.setIsLoadingClientDetail(false);
  }
}

/**
 * Load documents, files, todos for a specific agreement and update the store.
 */
async function loadAgreementData(agreementId: string): Promise<void> {
  const store = complianceStore.getState();
  const [documents, files, todoLists, todos] = await Promise.all([
    getAgreementDocuments(agreementId),
    getAgreementFiles(agreementId),
    getAgreementTodoLists(agreementId),
    getAgreementTodos(agreementId),
  ]);

  store.setClientDocuments(documents);
  store.setClientFiles(files);
  store.setClientTodoLists(todoLists);
  store.setClientTodos(todos);

  // Find strategy document
  const strategyDoc = findStrategyDocument(documents);
  store.setStrategyDocument(strategyDoc);
}

/**
 * Switch to a different agreement for the current client.
 * Clears stale data and re-fetches agreement-scoped resources.
 */
export async function selectComplianceAgreement(agreementId: string): Promise<void> {
  const store = complianceStore.getState();
  const agreement = store.clientAgreements.find(a => a.id === agreementId);
  if (!agreement) return;

  // Update selection
  store.setSelectedAgreementId(agreementId);
  store.setSelectedAgreement(agreement);

  // Clear stale dependent data
  store.setClientDocuments([]);
  store.setClientFiles([]);
  store.setClientTodoLists([]);
  store.setClientTodos([]);
  store.setStrategyDocument(null);

  // Reload data for newly selected agreement
  try {
    await loadAgreementData(agreementId);
  } catch (error) {
    console.error('[Compliance] Failed to load agreement data:', error);
  }
}

// ============================================================================
// Strategy Actions
// ============================================================================

/**
 * Approve strategy as compliance officer.
 * 1. Sets document to ACCEPTED_BY_COMPLIANCE
 * 2. Advances document to REQUEST_CLIENT_ACCEPTANCE
 */
export async function approveStrategy(documentId: string): Promise<boolean> {
  try {
    const accepted = await updateComplianceDocumentAcceptance(
      documentId,
      'ACCEPTED_BY_COMPLIANCE'
    );
    if (!accepted) return false;

    // Advance to client acceptance
    await updateComplianceDocumentAcceptance(
      documentId,
      'REQUEST_CLIENT_ACCEPTANCE'
    );

    // Refresh store
    const store = complianceStore.getState();
    const agreement = store.selectedAgreement;
    if (agreement) {
      const [documents, updated] = await Promise.all([
        getAgreementDocuments(agreement.id),
        getComplianceAgreement(agreement.id),
      ]);
      store.setClientDocuments(documents);
      store.setStrategyDocument(findStrategyDocument(documents));
      if (updated) store.setSelectedAgreement(updated);
    }
    return true;
  } catch (error) {
    console.error('[Compliance] Failed to approve strategy:', error);
    return false;
  }
}

/**
 * Reject strategy as compliance officer.
 * 1. Sets document acceptanceStatus to REJECTED_BY_COMPLIANCE
 * 2. Moves agreement back to PENDING_STRATEGY so strategist can revise
 * 3. Stores rejection reason in agreement metadata
 */
export async function rejectStrategy(
  agreementId: string,
  documentId: string,
  reason: string
): Promise<boolean> {
  try {
    const doc = await updateComplianceDocumentAcceptance(
      documentId,
      'REJECTED_BY_COMPLIANCE'
    );

    if (!doc) {
      console.error('[Compliance] rejectStrategy: failed to update document acceptance');
      return false;
    }

    // Move agreement back to PENDING_STRATEGY and store rejection metadata.
    // Preserve the existing description (HTML + __SIGNATURE_METADATA__) and
    // only replace the __STRATEGY_METADATA__ block.
    const store = complianceStore.getState();
    const agreement = store.selectedAgreement;
    const existing = parseStrategyMetadata(agreement?.description ?? null);

    const newStrategyBlock = serializeStrategyMetadata({
      type: 'STRATEGY',
      strategyDocumentId: documentId,
      sentAt: existing?.sentAt ?? new Date().toISOString(),
      rejectedBy: 'compliance',
      rejectionReason: reason,
      rejectedAt: new Date().toISOString(),
    });

    // Strip old __STRATEGY_METADATA__ block and append updated one
    const baseDescription = (agreement?.description ?? '')
      .replace(/__STRATEGY_METADATA__:[\s\S]+$/, '')
      .trimEnd();
    const updatedDescription = baseDescription
      ? `${baseDescription}\n${newStrategyBlock}`
      : newStrategyBlock;

    const agreementUpdated = await updateComplianceAgreement(agreementId, {
      status: AgreementStatus.PENDING_STRATEGY,
      description: updatedDescription,
    });

    if (!agreementUpdated) {
      console.warn('[Compliance] rejectStrategy: agreement status update failed, retrying status-only');
      await updateComplianceAgreement(agreementId, {
        status: AgreementStatus.PENDING_STRATEGY,
      });
    }

    // Refresh store data
    const [documents, updatedAgreement] = await Promise.all([
      getAgreementDocuments(agreementId),
      getComplianceAgreement(agreementId),
    ]);
    store.setClientDocuments(documents);
    store.setStrategyDocument(findStrategyDocument(documents));
    if (updatedAgreement) store.setSelectedAgreement(updatedAgreement);

    return true;
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
