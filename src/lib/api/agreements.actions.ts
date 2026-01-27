'use server';

import { createEnvelopeWithCeremony } from '@/lib/signature/signatureapi';
import {
  createAgreement,
  createTodoList,
  createTodo,
  createDocument,
  confirmDocumentUpload,
  getClientById,
  getCurrentUser,
  getDownloadUrl,
  createCharge,
  attachContract,
  updateDocumentAgreement,
} from '@/lib/api/strategist.api';
import { generateAgreementPdf, type AgreementPdfData } from '@/lib/agreement/generate-pdf';

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
}): Promise<SendAgreementResult> {
  const {
    clientId,
    customTitle = 'Ariex Tax Advisory Service Agreement 2024',
    description = 'Comprehensive tax advisory services including strategy development, filing support, and ongoing optimization.',
    price = 499,
    todos = [],
    redirectUrl,
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Get strategist info
    let strategistName = 'Ariex Tax Strategist';
    let currentStrategistId: string | undefined;
    try {
      const currentUser = await getCurrentUser();
      if (currentUser?.name) {
        strategistName = currentUser.name;
      }
      if (currentUser?.id) {
        currentStrategistId = currentUser.id;
      }
    } catch {
      // Use default name
    }

    // ========================================================================
    // STEP 1: Generate the PDF document FIRST
    // ========================================================================
    console.log('[Agreements] Step 1: Generating PDF document');
    
    // Prepare PDF data with strategies (placeholder for now - can be enhanced)
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
          estimatedSavings: price * 3, // Estimated 3x ROI
        },
      ],
      totalSavings: price * 3,
      serviceFee: price,
    };
    
    const pdfBuffer = await generateAgreementPdf(pdfData);
    console.log('[Agreements] PDF generated, size:', pdfBuffer.length);

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
    const signatureResult = await createEnvelopeWithCeremony({
      title: agreementTitle,
      documentUrl: signatureDocumentUrl,
      recipient: {
        name: clientName,
        email: client.email,
      },
      redirectUrl: redirectUrl || `${baseUrl}/client/onboarding?signed=true`,
      metadata: {
        clientId,
        agreementTitle,
      },
    });
    console.log('[Agreements] SignatureAPI envelope created:', signatureResult.envelopeId);
    console.log('[Agreements] Ceremony URL:', signatureResult.ceremonyUrl);

    // ========================================================================
    // STEP 4: Create agreement with __SIGNATURE_METADATA__ embedded in description
    // ========================================================================
    console.log('[Agreements] Step 4: Creating agreement with signature metadata embedded');
    const signatureMetadata = {
      envelopeId: signatureResult.envelopeId,
      recipientId: signatureResult.recipientId,
      ceremonyUrl: signatureResult.ceremonyUrl,
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
    // STEP 4b: Create a charge for the agreement (for Stripe payments)
    // ========================================================================
    console.log('[Agreements] Step 4b: Creating charge for agreement');
    try {
      const charge = await createCharge({
        agreementId: agreement.id,
        amount: price,
        currency: 'usd',
        description: `Payment for ${agreementTitle}`,
      });
      if (charge) {
        console.log('[Agreements] Charge created:', charge.id);
      }
    } catch (chargeError) {
      // Don't fail the whole flow if charge creation fails
      // The strategist might not have payment integration set up yet
      console.error('[Agreements] Failed to create charge (continuing anyway):', chargeError);
    }

    // ========================================================================
    // STEP 5: Create todo list and signing todo
    // ========================================================================
    console.log('[Agreements] Step 5: Creating todo list');
    const todoList = await createTodoList({
      name: 'Contract Documents',
      agreementId: agreement.id,
    });

    if (!todoList) {
      return { success: false, error: 'Failed to create todo list' };
    }
    console.log('[Agreements] Todo list created:', todoList.id);

    console.log('[Agreements] Step 6: Creating default todos (sign + pay)');
    const signingTodo = await createTodo({
      title: 'Sign service agreement',
      description: `Please review and sign the ${agreementTitle}.`,
      todoListId: todoList.id,
    });

    if (!signingTodo) {
      return { success: false, error: 'Failed to create signing todo' };
    }
    console.log('[Agreements] Signing todo created:', signingTodo.id);

    // Create payment todo
    const paymentTodo = await createTodo({
      title: 'Pay',
      description: `Complete the onboarding payment of $${price}.`,
      todoListId: todoList.id,
    });

    if (!paymentTodo) {
      return { success: false, error: 'Failed to create payment todo' };
    }
    console.log('[Agreements] Payment todo created:', paymentTodo.id);

    // ========================================================================
    // STEP 7: Create custom todos if any
    // ========================================================================
    for (const todo of todos) {
      try {
        await createTodo({
          title: todo.title,
          description: todo.description,
          todoListId: todoList.id,
        });
        console.log('[Agreements] Created custom todo:', todo.title);
      } catch (e) {
        console.error('[Agreements] Failed to create custom todo:', todo.title, e);
      }
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
