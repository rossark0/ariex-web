'use server';

import { AgreementStatus } from '@/types/agreement';
import { createEnvelopeWithCeremony } from '@/lib/signature/signatureapi';
import {
  createDocument,
  confirmDocumentUpload,
  getDownloadUrl,
  getCurrentUser,
  updateAgreementWithMetadata,
} from '@/lib/api/strategist.api';

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
  ceremonyUrl?: string;
  envelopeId?: string;
}
// ============================================================================
// SEND STRATEGY TO CLIENT
// ============================================================================

/**
 * Send a tax strategy document to the client for signature
 *
 * Flow:
 * 1. Upload PDF to S3 via document creation API
 * 2. Create SignatureAPI envelope with the document URL
 * 3. Update agreement status to PENDING_STRATEGY_REVIEW
 * 4. Store envelope info in agreement metadata
 */
export async function sendStrategyToClient(params: {
  agreementId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  strategistName: string;
  data: StrategySendData;
}): Promise<SendStrategyResult> {
  const { agreementId, clientId, clientName, clientEmail, strategistName, data } = params;

  console.log('[Strategies] Sending strategy to client:', {
    agreementId,
    clientId,
    clientEmail,
    title: data.title,
    totalPages: data.totalPages,
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

    // Get download URL for SignatureAPI
    const downloadUrl = await getDownloadUrl(documentRecord.id);
    if (!downloadUrl) {
      return { success: false, error: 'Failed to get document download URL' };
    }
    console.log('[Strategies] Document URL for SignatureAPI:', downloadUrl);

    // ========================================================================
    // STEP 2: Create SignatureAPI envelope
    // ========================================================================
    console.log('[Strategies] Step 2: Creating SignatureAPI envelope');

    // Hardcode production URL for SignatureAPI redirect (env var not reliable at runtime)
    const baseUrl = 'https://ariex-web-nine.vercel.app';

    const signatureResult = await createEnvelopeWithCeremony({
      title: data.title,
      documentUrl: downloadUrl,
      recipient: {
        name: clientName,
        email: clientEmail,
      },
      redirectUrl: `${baseUrl}/client/home?strategy_signed=true`,
      message: `Please review and sign your tax strategy document from ${strategistName}`,
      metadata: {
        agreementId,
        clientId,
        type: 'STRATEGY',
      },
      totalPages: data.totalPages,
    });

    console.log('[Strategies] Envelope created:', signatureResult.envelopeId);
    console.log('[Strategies] Ceremony URL:', signatureResult.ceremonyUrl);

    // ========================================================================
    // STEP 3: Store strategy envelope info (keep status as PENDING_STRATEGY)
    // ========================================================================
    console.log('[Strategies] Step 3: Storing strategy metadata (status stays PENDING_STRATEGY)');

    // Store strategy metadata in description - status will change to PENDING_STRATEGY_REVIEW
    // only AFTER the client signs (handled by syncStrategySignatureStatus)
    const strategyMetadata = {
      type: 'STRATEGY',
      strategyEnvelopeId: signatureResult.envelopeId,
      strategyDocumentId: documentRecord.id,
      strategyCeremonyUrl: signatureResult.ceremonyUrl,
      strategyRecipientId: signatureResult.recipientId,
      sentAt: new Date().toISOString(),
    };

    // Only update description with metadata, don't change status
    const updated = await updateAgreementWithMetadata(agreementId, {
      description: `__STRATEGY_METADATA__:${JSON.stringify(strategyMetadata)}`,
    });

    if (updated) {
      console.log('[Strategies] Strategy metadata stored (status remains PENDING_STRATEGY)');
    } else {
      console.warn('[Strategies] Failed to store strategy metadata (envelope was created)');
    }

    return {
      success: true,
      ceremonyUrl: signatureResult.ceremonyUrl,
      envelopeId: signatureResult.envelopeId,
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
// GET SIGNED STRATEGY DOCUMENT URL
// ============================================================================

/**
 * Get the URL to download the signed strategy document from SignatureAPI
 */
export async function getSignedStrategyUrl(
  envelopeId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  console.log('[Strategies] Getting signed strategy URL for envelope:', envelopeId);

  try {
    // Import the function dynamically to avoid circular deps
    const { getSignedDocumentUrl } = await import('@/lib/signature/signatureapi');
    
    const url = await getSignedDocumentUrl(envelopeId);
    
    if (!url) {
      return { success: false, error: 'Signed document not yet available' };
    }
    
    console.log('[Strategies] Got signed strategy URL');
    return { success: true, url };
  } catch (error) {
    console.error('[Strategies] Failed to get signed strategy URL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get signed document',
    };
  }
}

// ============================================================================
// COMPLETE AGREEMENT
// ============================================================================

/**
 * Mark an agreement as completed
 * Called by strategist after client has signed the strategy
 */
export async function completeAgreement(
  agreementId: string
): Promise<{ success: boolean; error?: string }> {
  console.log('[Strategies] Completing agreement:', agreementId);

  try {
    // Use updateAgreementWithMetadata to set status to COMPLETED
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
