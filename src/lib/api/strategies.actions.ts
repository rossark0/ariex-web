'use server';

import { AgreementStatus } from '@/types/agreement';
import { AcceptanceStatus } from '@/types/document';
import {
  createDocument,
  confirmDocumentUpload,
  getDownloadUrl,
  getCurrentUser,
  getAgreement,
  updateAgreementWithMetadata,
  updateAgreementStatus,
  updateDocumentAcceptance,
} from '@/lib/api/strategist.api';
import {
  type StrategyMetadata,
  serializeStrategyMetadata,
  parseStrategyMetadata,
} from '@/contexts/strategist-contexts/client-management/models/strategy.model';

// ============================================================================
// TYPES
// ============================================================================

export interface StrategySendData {
  title: string;
  description: string;
  markdownContent: string;
  /** Base64-encoded PDF generated client-side */
  pdfBase64: string;
  /** Total number of pages in the PDF */
  totalPages: number;
}

interface SendStrategyResult {
  success: boolean;
  error?: string;
  documentId?: string;
}

interface StrategyActionResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// SEND STRATEGY TO COMPLIANCE
// ============================================================================

/**
 * Send a tax strategy document for compliance review.
 *
 * Flow:
 * 1. Upload PDF to S3 via document creation API
 * 2. Set document acceptanceStatus to REQUEST_COMPLIANCE_ACCEPTANCE
 * 3. Transition agreement to PENDING_STRATEGY_REVIEW
 * 4. Store strategy metadata in agreement description
 */
export async function sendStrategyToClient(params: {
  agreementId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  strategistName: string;
  data: StrategySendData;
}): Promise<SendStrategyResult> {
  const { agreementId, clientId, data } = params;

  console.log('[Strategies] Sending strategy for compliance review:', {
    agreementId,
    clientId,
    title: data.title,
  });

  try {
    // Get current user for strategist ID
    let currentStrategistId: string | undefined;
    try {
      const currentUser = await getCurrentUser();
      currentStrategistId = currentUser?.id;
    } catch {
      // Continue without strategist ID
    }

    // ========================================================================
    // STEP 1: Upload PDF to S3 via document API
    // ========================================================================
    console.log('[Strategies] Step 1: Creating document record for PDF upload');

    const pdfBuffer = Buffer.from(data.pdfBase64, 'base64');
    const fileName = `strategy-${data.title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;

    const documentRecord = await createDocument({
      type: 'STRATEGY',
      fileName: fileName,
      mimeType: 'application/pdf',
      size: pdfBuffer.length,
      clientId: clientId,
      strategistId: currentStrategistId,
      agreementId: agreementId,
    });

    if (!documentRecord || !documentRecord.uploadUrl) {
      return { success: false, error: 'Failed to create document record' };
    }
    console.log('[Strategies] Document record created:', documentRecord.id);

    // Upload to S3
    const uploadResponse = await fetch(documentRecord.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: pdfBuffer,
    });

    if (!uploadResponse.ok) {
      console.error('[Strategies] S3 upload failed:', uploadResponse.status);
      return { success: false, error: 'Failed to upload document to storage' };
    }
    console.log('[Strategies] S3 upload successful');

    // Confirm upload
    await confirmDocumentUpload(documentRecord.id);

    // ========================================================================
    // STEP 2: Set document acceptance to REQUEST_COMPLIANCE_ACCEPTANCE
    // ========================================================================
    console.log('[Strategies] Step 2: Setting document acceptance to REQUEST_COMPLIANCE_ACCEPTANCE');

    const acceptanceUpdated = await updateDocumentAcceptance(
      documentRecord.id,
      AcceptanceStatus.REQUEST_COMPLIANCE_ACCEPTANCE
    );

    if (!acceptanceUpdated) {
      console.warn('[Strategies] Failed to set acceptance status (document was created)');
    }

    // ========================================================================
    // STEP 3: Store strategy metadata + transition to PENDING_STRATEGY_REVIEW
    // ========================================================================
    console.log('[Strategies] Step 3: Storing metadata + transitioning to PENDING_STRATEGY_REVIEW');

    const strategyMetadata: StrategyMetadata = {
      type: 'STRATEGY',
      strategyDocumentId: documentRecord.id,
      sentAt: new Date().toISOString(),
    };

    const updated = await updateAgreementWithMetadata(agreementId, {
      status: AgreementStatus.PENDING_STRATEGY_REVIEW,
      description: serializeStrategyMetadata(strategyMetadata),
    });

    if (updated) {
      console.log('[Strategies] Agreement moved to PENDING_STRATEGY_REVIEW');
    } else {
      console.warn('[Strategies] Failed to update agreement (document was created)');
    }

    return {
      success: true,
      documentId: documentRecord.id,
    };
  } catch (error) {
    console.error('[Strategies] Failed to send strategy:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send strategy',
    };
  }
}

// ============================================================================
// COMPLIANCE ACTIONS
// ============================================================================

/**
 * Approve a strategy document as compliance.
 * Sets document acceptanceStatus to ACCEPTED_BY_COMPLIANCE, then REQUEST_CLIENT_ACCEPTANCE.
 */
export async function approveStrategyAsCompliance(
  documentId: string
): Promise<StrategyActionResult> {
  console.log('[Strategies] Compliance approving strategy document:', documentId);

  try {
    // First mark as accepted by compliance
    const accepted = await updateDocumentAcceptance(
      documentId,
      AcceptanceStatus.ACCEPTED_BY_COMPLIANCE
    );

    if (!accepted) {
      return { success: false, error: 'Failed to update compliance approval' };
    }

    // Then advance to request client acceptance
    const advanced = await updateDocumentAcceptance(
      documentId,
      AcceptanceStatus.REQUEST_CLIENT_ACCEPTANCE
    );

    if (!advanced) {
      console.warn('[Strategies] Compliance approved but failed to advance to client review');
      // Still return success — compliance approval went through
    }

    console.log('[Strategies] Compliance approved, document now awaiting client review');
    return { success: true };
  } catch (error) {
    console.error('[Strategies] Failed to approve as compliance:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve strategy',
    };
  }
}

/**
 * Reject a strategy document as compliance.
 * Sets document acceptanceStatus to REJECTED_BY_COMPLIANCE.
 * Moves agreement back to PENDING_STRATEGY so strategist can revise.
 */
export async function rejectStrategyAsCompliance(
  agreementId: string,
  documentId: string,
  reason?: string
): Promise<StrategyActionResult> {
  console.log('[Strategies] Compliance rejecting strategy document:', documentId, reason);

  try {
    // Set document as rejected by compliance
    const rejected = await updateDocumentAcceptance(
      documentId,
      AcceptanceStatus.REJECTED_BY_COMPLIANCE
    );

    if (!rejected) {
      return { success: false, error: 'Failed to update compliance rejection' };
    }

    // Move agreement back to PENDING_STRATEGY for revision
    const statusUpdated = await updateAgreementStatus(
      agreementId,
      AgreementStatus.PENDING_STRATEGY
    );

    if (!statusUpdated) {
      console.warn('[Strategies] Document rejected but failed to revert agreement status');
    }

    // Store rejection reason in metadata, preserving original sentAt
    if (reason) {
      const agreement = await getAgreement(agreementId);
      const existing = parseStrategyMetadata(agreement?.description);
      await updateAgreementWithMetadata(agreementId, {
        description: serializeStrategyMetadata({
          type: 'STRATEGY',
          strategyDocumentId: documentId,
          sentAt: existing?.sentAt ?? new Date().toISOString(),
          rejectedBy: 'compliance',
          rejectionReason: reason,
          rejectedAt: new Date().toISOString(),
        }),
      });
    }

    console.log('[Strategies] Compliance rejected, agreement back to PENDING_STRATEGY');
    return { success: true };
  } catch (error) {
    console.error('[Strategies] Failed to reject as compliance:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject strategy',
    };
  }
}

// ============================================================================
// CLIENT ACTIONS
// ============================================================================

/**
 * Approve a strategy document as client.
 * Sets document acceptanceStatus to ACCEPTED_BY_CLIENT.
 * If compliance has already approved, transitions agreement to COMPLETED.
 */
export async function approveStrategyAsClient(
  agreementId: string,
  documentId: string
): Promise<StrategyActionResult> {
  console.log('[Strategies] Client approving strategy document:', documentId);

  try {
    // Set document as accepted by client
    const accepted = await updateDocumentAcceptance(
      documentId,
      AcceptanceStatus.ACCEPTED_BY_CLIENT
    );

    if (!accepted) {
      return { success: false, error: 'Failed to update client approval' };
    }

    // Since client can only approve AFTER compliance approved (sequential flow),
    // both have now approved → complete the agreement
    const completed = await updateAgreementStatus(
      agreementId,
      AgreementStatus.COMPLETED
    );

    if (!completed) {
      console.warn('[Strategies] Client approved but failed to complete agreement');
      return { success: false, error: 'Failed to complete agreement' };
    }

    console.log('[Strategies] Client approved, agreement COMPLETED');
    return { success: true };
  } catch (error) {
    console.error('[Strategies] Failed to approve as client:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve strategy',
    };
  }
}

/**
 * Decline a strategy document as client.
 * Sets document acceptanceStatus to REJECTED_BY_CLIENT.
 * Moves agreement back to PENDING_STRATEGY — compliance approval resets too.
 */
export async function declineStrategyAsClient(
  agreementId: string,
  documentId: string,
  reason?: string
): Promise<StrategyActionResult> {
  console.log('[Strategies] Client declining strategy document:', documentId, reason);

  try {
    // Set document as rejected by client
    const rejected = await updateDocumentAcceptance(
      documentId,
      AcceptanceStatus.REJECTED_BY_CLIENT
    );

    if (!rejected) {
      return { success: false, error: 'Failed to update client decline' };
    }

    // Move agreement back to PENDING_STRATEGY — full reset
    const statusUpdated = await updateAgreementStatus(
      agreementId,
      AgreementStatus.PENDING_STRATEGY
    );

    if (!statusUpdated) {
      console.warn('[Strategies] Document declined but failed to revert agreement status');
    }

    // Store decline reason in metadata, preserving original sentAt
    if (reason) {
      const agreement = await getAgreement(agreementId);
      const existing = parseStrategyMetadata(agreement?.description);
      await updateAgreementWithMetadata(agreementId, {
        description: serializeStrategyMetadata({
          type: 'STRATEGY',
          strategyDocumentId: documentId,
          sentAt: existing?.sentAt ?? new Date().toISOString(),
          rejectedBy: 'client',
          rejectionReason: reason,
          rejectedAt: new Date().toISOString(),
        }),
      });
    }

    console.log('[Strategies] Client declined, agreement back to PENDING_STRATEGY');
    return { success: true };
  } catch (error) {
    console.error('[Strategies] Failed to decline as client:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to decline strategy',
    };
  }
}

// ============================================================================
// COMPLETE AGREEMENT
// ============================================================================

/**
 * Mark an agreement as completed.
 * Should only be called when both compliance AND client have approved.
 */
export async function completeAgreement(
  agreementId: string
): Promise<StrategyActionResult> {
  console.log('[Strategies] Completing agreement:', agreementId);

  try {
    const updated = await updateAgreementWithMetadata(agreementId, {
      status: AgreementStatus.COMPLETED,
    });

    if (updated) {
      console.log('[Strategies] Agreement completed successfully');
      return { success: true };
    } else {
      console.error('[Strategies] updateAgreementWithMetadata returned false');
      return { success: false, error: 'Failed to update agreement status' };
    }
  } catch (error) {
    console.error('[Strategies] Failed to complete agreement:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete agreement',
    };
  }
}

// ============================================================================
// STRATEGY DOCUMENT URL
// ============================================================================

/**
 * Get the download URL for a strategy document (for viewing, not signing)
 */
export async function getStrategyDocumentUrl(
  documentId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  console.log('[Strategies] Getting strategy document URL:', documentId);

  try {
    const url = await getDownloadUrl(documentId);

    if (!url) {
      return { success: false, error: 'Document URL not available' };
    }

    return { success: true, url };
  } catch (error) {
    console.error('[Strategies] Failed to get strategy document URL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get document URL',
    };
  }
}
