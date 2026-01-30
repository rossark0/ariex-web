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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
    // STEP 3: Update agreement with strategy envelope info
    // ========================================================================
    console.log('[Strategies] Step 3: Updating agreement status');

    // Update agreement status to PENDING_STRATEGY_REVIEW
    // Include strategy metadata in description (similar to how agreement does it)
    const strategyMetadata = {
      type: 'STRATEGY',
      strategyEnvelopeId: signatureResult.envelopeId,
      strategyDocumentId: documentRecord.id,
      strategyCeremonyUrl: signatureResult.ceremonyUrl,
      strategyRecipientId: signatureResult.recipientId,
      sentAt: new Date().toISOString(),
    };

    const updated = await updateAgreementWithMetadata(agreementId, {
      status: AgreementStatus.PENDING_STRATEGY_REVIEW,
      description: `__STRATEGY_METADATA__:${JSON.stringify(strategyMetadata)}`,
    });

    if (updated) {
      console.log('[Strategies] Agreement status updated to PENDING_STRATEGY_REVIEW');
    } else {
      console.warn('[Strategies] Failed to update agreement status (envelope was created)');
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
    await apiRequest(`/agreements/${agreementId}/complete`, {
      method: 'POST',
    });
    console.log('[Strategies] Agreement completed successfully');
    return { success: true };
  } catch (error) {
    console.error('[Strategies] Failed to complete agreement:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete agreement',
    };
  }
}
