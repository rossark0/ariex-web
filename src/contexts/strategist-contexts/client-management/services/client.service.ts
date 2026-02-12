/**
 * Client Management Services
 *
 * Server Actions for client data operations
 */

'use server';

import { cookies } from 'next/headers';
import {
  getClientById as apiGetClientById,
  listClientAgreements as apiListClientAgreements,
  listAgreementDocuments as apiListAgreementDocuments,
  getAgreementEnvelopeStatus as apiGetAgreementEnvelopeStatus,
  getDownloadUrl as apiGetDownloadUrl,
  createCharge as apiCreateCharge,
  generatePaymentLink as apiGeneratePaymentLink,
  attachPayment as apiAttachPayment,
  getChargesForAgreement as apiGetChargesForAgreement,
  updateDocumentAcceptance as apiUpdateDocumentAcceptance,
  updateAgreementStatus as apiUpdateAgreementStatus,
  deleteDocument as apiDeleteDocument,
  deleteTodo as apiDeleteTodo,
  type ApiClient,
  type ApiAgreement,
  type ApiDocument,
} from '@/lib/api/strategist.api';

/**
 * Load client by ID
 */
export async function loadClient(clientId: string) {
  try {
    const client = await apiGetClientById(clientId);
    return { success: true, data: client };
  } catch (error) {
    console.error('[Service] Failed to load client:', error);
    return { success: false, error: 'Failed to load client' };
  }
}

/**
 * Load agreements for a client
 */
export async function loadAgreements(clientId: string) {
  try {
    const agreements = await apiListClientAgreements(clientId);
    return { success: true, data: agreements };
  } catch (error) {
    console.error('[Service] Failed to load agreements:', error);
    return { success: false, error: 'Failed to load agreements' };
  }
}

/**
 * Load documents for an agreement
 */
export async function loadDocuments(agreementId: string) {
  try {
    const documents = await apiListAgreementDocuments(agreementId);
    return { success: true, data: documents };
  } catch (error) {
    console.error('[Service] Failed to load documents:', error);
    return { success: false, error: 'Failed to load documents' };
  }
}

/**
 * Load payment charges for an agreement
 */
export async function loadCharges(agreementId: string) {
  try {
    const charges = await apiGetChargesForAgreement(agreementId);
    return { success: true, data: charges };
  } catch (error) {
    console.error('[Service] Failed to load charges:', error);
    return { success: false, error: 'Failed to load charges' };
  }
}

/**
 * Get envelope status from SignatureAPI
 */
export async function getEnvelopeStatus(agreementId: string, envelopeId: string) {
  try {
    const result = await apiGetAgreementEnvelopeStatus(agreementId, envelopeId);
    return { success: true, data: result };
  } catch (error) {
    console.error('[Service] Failed to get envelope status:', error);
    return { success: false, error: 'Failed to get envelope status' };
  }
}

/**
 * Accept a document (strategist approval)
 */
export async function acceptDocument(documentId: string) {
  try {
    const success = await apiUpdateDocumentAcceptance(documentId, 'ACCEPTED_BY_STRATEGIST' as any);
    return { success };
  } catch (error) {
    console.error('[Service] Failed to accept document:', error);
    return { success: false, error: 'Failed to accept document' };
  }
}

/**
 * Decline a document (strategist rejection)
 */
export async function declineDocument(documentId: string) {
  try {
    const success = await apiUpdateDocumentAcceptance(documentId, 'REJECTED_BY_STRATEGIST' as any);
    return { success };
  } catch (error) {
    console.error('[Service] Failed to decline document:', error);
    return { success: false, error: 'Failed to decline document' };
  }
}

/**
 * Update agreement status
 */
export async function updateStatus(agreementId: string, status: string) {
  try {
    const success = await apiUpdateAgreementStatus(agreementId, status as any);
    return { success };
  } catch (error) {
    console.error('[Service] Failed to update agreement status:', error);
    return { success: false, error: 'Failed to update status' };
  }
}

/**
 * Delete a document
 */
export async function removeDocument(documentId: string) {
  try {
    const success = await apiDeleteDocument(documentId);
    return { success };
  } catch (error) {
    console.error('[Service] Failed to delete document:', error);
    return { success: false, error: 'Failed to delete document' };
  }
}

/**
 * Delete a todo
 */
export async function removeTodo(todoId: string) {
  try {
    const success = await apiDeleteTodo(todoId);
    return { success };
  } catch (error) {
    console.error('[Service] Failed to delete todo:', error);
    return { success: false, error: 'Failed to delete todo' };
  }
}

/**
 * Get document download URL
 */
export async function getDocumentDownloadUrl(documentId: string) {
  try {
    const url = await apiGetDownloadUrl(documentId);
    return { success: true, data: url };
  } catch (error) {
    console.error('[Service] Failed to get download URL:', error);
    return { success: false, error: 'Failed to get download URL' };
  }
}

// ============================================================================
// Strategy Compliance/Client Approval Services
// ============================================================================

/**
 * Approve a strategy document as compliance.
 * Delegates to the strategies.actions server action.
 */
export async function approveStrategyCompliance(documentId: string) {
  try {
    const { approveStrategyAsCompliance } = await import('@/lib/api/strategies.actions');
    return await approveStrategyAsCompliance(documentId);
  } catch (error) {
    console.error('[Service] Failed to approve strategy as compliance:', error);
    return { success: false, error: 'Failed to approve strategy' };
  }
}

/**
 * Reject a strategy document as compliance.
 * Delegates to the strategies.actions server action.
 */
export async function rejectStrategyCompliance(
  agreementId: string,
  documentId: string,
  reason?: string
) {
  try {
    const { rejectStrategyAsCompliance } = await import('@/lib/api/strategies.actions');
    return await rejectStrategyAsCompliance(agreementId, documentId, reason);
  } catch (error) {
    console.error('[Service] Failed to reject strategy as compliance:', error);
    return { success: false, error: 'Failed to reject strategy' };
  }
}

/**
 * Approve a strategy document as client.
 * Delegates to the strategies.actions server action.
 */
export async function approveStrategyClient(agreementId: string, documentId: string) {
  try {
    const { approveStrategyAsClient } = await import('@/lib/api/strategies.actions');
    return await approveStrategyAsClient(agreementId, documentId);
  } catch (error) {
    console.error('[Service] Failed to approve strategy as client:', error);
    return { success: false, error: 'Failed to approve strategy' };
  }
}

/**
 * Decline a strategy document as client.
 * Delegates to the strategies.actions server action.
 */
export async function declineStrategyClient(
  agreementId: string,
  documentId: string,
  reason?: string
) {
  try {
    const { declineStrategyAsClient } = await import('@/lib/api/strategies.actions');
    return await declineStrategyAsClient(agreementId, documentId, reason);
  } catch (error) {
    console.error('[Service] Failed to decline strategy as client:', error);
    return { success: false, error: 'Failed to decline strategy' };
  }
}

/**
 * Get the download URL for a strategy document (for viewing).
 */
export async function getStrategyDocUrl(documentId: string) {
  try {
    const { getStrategyDocumentUrl } = await import('@/lib/api/strategies.actions');
    return await getStrategyDocumentUrl(documentId);
  } catch (error) {
    console.error('[Service] Failed to get strategy document URL:', error);
    return { success: false, error: 'Failed to get strategy document URL' };
  }
}
