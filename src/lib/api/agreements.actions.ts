'use server';

import { createEnvelopeWithCeremony } from '@/lib/signature/signatureapi';
import {
  createAgreement,
  createDocument,
  confirmDocumentUpload,
  getClientById,
  getCurrentUser,
  getDownloadUrl,
  attachContract,
  updateDocumentAgreement,
  updateAgreementStatus,
} from '@/lib/api/strategist.api';
import { 
  generateAgreementPdf, 
  generateAgreementPdfFromEditor,
  type AgreementPdfData,
  type Page,
} from '@/lib/agreement/generate-pdf';
import { AgreementStatus } from '@/types/agreement';

// ============================================================================
// Types
// ============================================================================

export interface SendAgreementResult {
  success: boolean;
  agreementId?: string;
  ceremonyUrl?: string;
  error?: string;
}

// ============================================================================
// Generate Agreement PDF
// ============================================================================

// PDF generation is now handled by @/lib/agreement/generate-pdf

// ============================================================================
// Send Agreement Action
// ============================================================================

/**
 * Main action to send an agreement to a client
 *
 * Flow (updated - SignatureAPI first):
 * 1. Create SignatureAPI envelope FIRST to get ceremonyUrl
 * 2. Create agreement in backend with ceremonyUrl in description metadata
 * 3. Create todo list for the agreement
 * 4. Create todo for signing the contract
 * 5. Create document (type: AGREEMENT) with todoId → returns uploadUrl
 * 6. Generate DOCX and upload to S3
 * 7. Confirm document upload
 * 8. Attach contract to agreement
 * 9. Create additional custom todos
 */
export async function sendAgreementToClient(params: {
  clientId: string;
  customTitle?: string;
  description?: string;
  price?: number;
  todos?: Array<{ title: string; description?: string }>;
  redirectUrl?: string;
  /** Optional markdown content from the Agreement Sheet editor */
  markdownContent?: string;
  /** Optional pages from the Agreement Sheet editor (includes signature fields) */
  pages?: Page[];
  /** Optional base64-encoded PDF generated client-side (preferred) */
  pdfBase64?: string;
  /** Total number of pages in the PDF (for signature positioning) */
  totalPages?: number;
}): Promise<SendAgreementResult> {
  const {
    clientId,
    customTitle = 'Ariex Tax Advisory Service Agreement 2024',
    description = 'Comprehensive tax advisory services including strategy development, filing support, and ongoing optimization.',
    price = 499,
    todos = [],
    redirectUrl,
    markdownContent,
    pages,
    pdfBase64,
    totalPages,
  } = params;

  try {
    // 1. Get client details
    const client = await getClientById(clientId);
    if (!client) {
      return { success: false, error: 'Client not found' };
    }

    if (!client.email) {
      return { success: false, error: 'Client email not found' };
    }

    const agreementTitle = customTitle;
    const clientName = client.name || client.fullName || client.email.split('@')[0];
    // Hardcode production URL for SignatureAPI redirect (env var not reliable at runtime)
    const baseUrl = 'https://ariex-web-nine.vercel.app';

    // Get strategist info for dual signing
    let strategistName = 'Ariex Tax Strategist';
    let strategistEmail: string | undefined;
    let currentStrategistId: string | undefined;
    try {
      const currentUser = await getCurrentUser();
      if (currentUser?.name) {
        strategistName = currentUser.name;
      }
      if (currentUser?.email) {
        strategistEmail = currentUser.email;
      }
      if (currentUser?.id) {
        currentStrategistId = currentUser.id;
      }
    } catch {
      // Use default name
    }

    // ========================================================================
    // STEP 1: Get or generate the PDF document
    // ========================================================================
    console.log('[Agreements] Step 1: Preparing PDF document');
    
    let pdfBuffer: Uint8Array;
    let documentTotalPages = totalPages || 1;
    
    // PREFERRED: Use client-side generated PDF (exact visual match)
    if (pdfBase64) {
      console.log('[Agreements] Using client-side generated PDF');
      // Convert base64 to Uint8Array
      const binaryString = Buffer.from(pdfBase64, 'base64');
      pdfBuffer = new Uint8Array(binaryString);
    } else if (pages && pages.length > 0) {
      // FALLBACK: Server-side generation from editor pages
      console.log('[Agreements] Using server-side PDF generation from pages');
      pdfBuffer = await generateAgreementPdfFromEditor({
        title: agreementTitle,
        pages,
        clientName,
        strategistName,
      });
      documentTotalPages = pages.length;
    } else {
      // LEGACY: Use hardcoded template
      console.log('[Agreements] Using legacy template for PDF generation');
      const pdfData: AgreementPdfData = {
        agreementTitle,
        date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        strategistName,
        clientName,
        clientEmail: client.email,
        strategies: [
          {
            name: 'Tax Optimization Strategy',
            description: description,
            estimatedSavings: price * 3,
          },
        ],
        totalSavings: price * 3,
        serviceFee: price,
      };
      pdfBuffer = await generateAgreementPdf(pdfData);
    }
    
    console.log('[Agreements] PDF ready, size:', pdfBuffer.length, 'pages:', documentTotalPages);

    // ========================================================================
    // STEP 2: Upload PDF to a temporary location so SignatureAPI can access it
    // We'll use the document creation flow but without an agreementId first
    // ========================================================================
    console.log('[Agreements] Step 2: Creating temporary document for SignatureAPI');
    const tempFileName = `temp-agreement-${clientName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
    const tempDocumentRecord = await createDocument({
      type: 'AGREEMENT',
      fileName: tempFileName,
      mimeType: 'application/pdf',
      size: pdfBuffer.length,
      clientId: clientId,
      strategistId: currentStrategistId,
    });

    if (!tempDocumentRecord || !tempDocumentRecord.uploadUrl) {
      return { success: false, error: 'Failed to create temporary document record' };
    }
    console.log('[Agreements] Temp document record created:', tempDocumentRecord.id);

    // Upload to S3
    const tempUploadResponse = await fetch(tempDocumentRecord.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: Buffer.from(pdfBuffer),
    });

    if (!tempUploadResponse.ok) {
      console.error('[Agreements] Temp S3 upload failed:', tempUploadResponse.status);
      return { success: false, error: 'Failed to upload temporary document' };
    }
    console.log('[Agreements] Temp S3 upload successful');

    // Confirm upload
    await confirmDocumentUpload(tempDocumentRecord.id);

    // Get the download URL
    const tempDownloadUrl = await getDownloadUrl(tempDocumentRecord.id);
    const signatureDocumentUrl = tempDownloadUrl || 
      'https://pub-9cb75390636c4a8a83a6f76da33d7f45.r2.dev/privacy-placeholder.pdf';
    console.log('[Agreements] Document URL for SignatureAPI:', signatureDocumentUrl);

    // ========================================================================
    // STEP 3: Create SignatureAPI envelope FIRST (before agreement)
    // ========================================================================
    console.log('[Agreements] Step 3: Creating SignatureAPI envelope');
    console.log('[Agreements] Strategist email:', strategistEmail || 'Not available');
    console.log('[Agreements] Document total pages:', documentTotalPages);
    
    const signatureResult = await createEnvelopeWithCeremony({
      title: agreementTitle,
      documentUrl: signatureDocumentUrl,
      recipient: {
        name: clientName,
        email: client.email,
      },
      // Include strategist as second signer if we have their email
      strategist: strategistEmail ? {
        name: strategistName,
        email: strategistEmail,
      } : undefined,
      redirectUrl: redirectUrl || `${baseUrl}/client/onboarding?signed=true`,
      metadata: {
        clientId,
        agreementTitle,
        strategistId: currentStrategistId || '',
      },
      // Place signatures on the last page of the document
      totalPages: documentTotalPages,
    });
    console.log('[Agreements] SignatureAPI envelope created:', signatureResult.envelopeId);
    console.log('[Agreements] Client ceremony URL:', signatureResult.ceremonyUrl);
    if (signatureResult.strategistCeremonyUrl) {
      console.log('[Agreements] Strategist ceremony URL:', signatureResult.strategistCeremonyUrl);
    }

    // ========================================================================
    // STEP 4: Create agreement with __SIGNATURE_METADATA__ embedded in description
    // ========================================================================
    console.log('[Agreements] Step 4: Creating agreement with signature metadata embedded');
    const signatureMetadata = {
      envelopeId: signatureResult.envelopeId,
      recipientId: signatureResult.recipientId,
      ceremonyUrl: signatureResult.ceremonyUrl,
      strategistRecipientId: signatureResult.strategistRecipientId,
      strategistCeremonyUrl: signatureResult.strategistCeremonyUrl,
      createdAt: new Date().toISOString(),
    };
    
    // Embed metadata in description (this is how the working agreements do it)
    const descriptionWithMetadata = `${description}\n\n__SIGNATURE_METADATA__:${JSON.stringify(signatureMetadata)}`;
    
    const agreement = await createAgreement({
      name: agreementTitle,
      description: descriptionWithMetadata, // Include metadata so client can find ceremonyUrl
      clientId,
      price,
    });

    if (!agreement) {
      return { success: false, error: 'Failed to create agreement in backend' };
    }
    console.log('[Agreements] Agreement created with embedded metadata:', agreement.id);

    // ========================================================================
    // STEP 4a: Attach the contract document to the agreement
    // First update the document to set its agreementId, then attach it
    // ========================================================================
    console.log('[Agreements] Step 4a: Linking document to agreement');
    
    // Update document with agreementId (as Daniel said - document should have agreementId)
    const documentLinked = await updateDocumentAgreement(tempDocumentRecord.id, agreement.id);
    if (documentLinked) {
      console.log('[Agreements] Document linked to agreement via agreementId');
    } else {
      console.warn('[Agreements] Failed to link document via agreementId (trying attachContract fallback)');
    }
    
    // Also call attachContract as before (sets contractDocumentId on agreement)
    const contractAttached = await attachContract(agreement.id, tempDocumentRecord.id);
    if (contractAttached) {
      console.log('[Agreements] Contract document attached:', tempDocumentRecord.id);
    } else {
      console.warn('[Agreements] Failed to attach contract document (continuing anyway)');
    }

    // ========================================================================
    // NOTE: Charge and Todos are NOT created here anymore
    // - Charge is created when strategist clicks "Send payment link" (after signing)
    // - Todos are created when strategist clicks "Request documents" (after payment)
    // ========================================================================

    // ========================================================================
    // STEP 5: Update agreement status to PENDING_SIGNATURE
    // ========================================================================
    try {
      await updateAgreementStatus(agreement.id, AgreementStatus.PENDING_SIGNATURE);
      console.log('[Agreements] Updated status to PENDING_SIGNATURE');
    } catch (e) {
      console.error('[Agreements] Failed to update status:', e);
      // Continue anyway - agreement was created successfully
    }

    console.log('[Agreements] ✅ Agreement flow completed successfully');
    console.log('[Agreements] Agreement ID:', agreement.id);
    console.log('[Agreements] Ceremony URL available in description metadata');

    return {
      success: true,
      agreementId: agreement.id,
      ceremonyUrl: signatureResult.ceremonyUrl,
    };
  } catch (error) {
    console.error(
      '[Agreements] sendAgreementToClient error:',
      error instanceof Error ? error.message : error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Resend an agreement that was already created
 */
export async function resendAgreement(agreementId: string): Promise<SendAgreementResult> {
  return {
    success: false,
    error: 'Resend not yet implemented - please create a new agreement',
  };
}
