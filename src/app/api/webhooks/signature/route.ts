import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'standardwebhooks';
import type { SignatureWebhookEvent } from '@/lib/signature/signatureapi';

const WEBHOOK_SECRET = process.env.SIGNATURE_WEBHOOK_SECRET || '';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://qt4pgrsacn.us-east-2.awsapprunner.com';

// ============================================================================
// Internal API Helpers (use service account or API key for webhook context)
// ============================================================================

interface AgreementWithMetadata {
  id: string;
  name: string;
  description?: string;
  status: string;
  signatureEnvelopeId?: string; // Direct field if backend supports it
  todoLists?: Array<{
    id: string;
    todos: Array<{
      id: string;
      title: string;
      document?: {
        id: string;
      };
    }>;
  }>;
}

/**
 * Make authenticated API request for webhook context
 * Webhooks don't have user context, so we use a service account or direct DB access
 */
async function webhookApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        // Add service account token if available
        ...(process.env.SERVICE_API_KEY
          ? { 'X-Service-Key': process.env.SERVICE_API_KEY }
          : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      console.error('[Webhook] API request failed:', response.status, await response.text());
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('[Webhook] API request error:', error);
    return null;
  }
}

/**
 * Find agreement by SignatureAPI envelope ID
 * Tries multiple lookup strategies:
 * 1. Direct signatureEnvelopeId field (if backend supports it)
 * 2. Envelope ID in description metadata (current workaround)
 */
async function findAgreementByEnvelopeId(envelopeId: string): Promise<AgreementWithMetadata | null> {
  try {
    const agreements = await webhookApiRequest<AgreementWithMetadata[]>('/agreements');

    if (!agreements || !Array.isArray(agreements)) {
      console.error('[Webhook] No agreements found or invalid response');
      return null;
    }

    // Strategy 1: Check direct signatureEnvelopeId field
    for (const agreement of agreements) {
      if (agreement.signatureEnvelopeId === envelopeId) {
        console.log('[Webhook] Found agreement by direct envelopeId field:', agreement.id);
        return agreement;
      }
    }

    // Strategy 2: Find agreement with matching envelope ID in description metadata
    for (const agreement of agreements) {
      const metadataMatch = agreement.description?.match(
        /__SIGNATURE_METADATA__:([\s\S]+)$/
      );
      if (metadataMatch) {
        try {
          const metadata = JSON.parse(metadataMatch[1]);
          if (metadata.envelopeId === envelopeId) {
            console.log('[Webhook] Found agreement by description metadata:', agreement.id);
            return agreement;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    console.log('[Webhook] No agreement found for envelope:', envelopeId);
    return null;
  } catch (error) {
    console.error('[Webhook] Error finding agreement:', error);
    return null;
  }
}

/**
 * Get document ID and todo ID from agreement's todo list
 */
async function getDocumentAndTodoFromAgreement(agreementId: string): Promise<{
  documentId: string | null;
  todoId: string | null;
}> {
  try {
    const agreement = await webhookApiRequest<AgreementWithMetadata>(
      `/agreements/${agreementId}`
    );

    if (!agreement?.todoLists) {
      return { documentId: null, todoId: null };
    }

    for (const todoList of agreement.todoLists) {
      for (const todo of todoList.todos) {
        if (todo.document?.id) {
          return {
            documentId: todo.document.id,
            todoId: todo.id,
          };
        }
      }
    }

    return { documentId: null, todoId: null };
  } catch (error) {
    console.error('[Webhook] Error getting document from agreement:', error);
    return { documentId: null, todoId: null };
  }
}

// ============================================================================
// Status Update Functions
// ============================================================================

async function markDocumentSigned(documentId: string): Promise<boolean> {
  const result = await webhookApiRequest(`/documents/${documentId}/sign`, {
    method: 'POST',
  });
  return result !== null;
}

async function markTodoCompleted(todoId: string): Promise<boolean> {
  const result = await webhookApiRequest(`/todos/${todoId}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'completed' }),
  });
  return result !== null;
}

/**
 * Update agreement status to ACTIVE (signed but not yet completed)
 * Try multiple strategies since backend API varies
 */
async function markAgreementSigned(agreementId: string): Promise<boolean> {
  // Strategy 1: Try dedicated sign endpoint
  let result = await webhookApiRequest(`/agreements/${agreementId}/sign`, {
    method: 'POST',
  });
  if (result !== null) {
    console.log('[Webhook] Agreement marked signed via /sign endpoint');
    return true;
  }

  // Strategy 2: Try PATCH with status
  result = await webhookApiRequest(`/agreements/${agreementId}`, {
    method: 'PATCH',
    body: JSON.stringify({ 
      status: 'ACTIVE',
      signedAt: new Date().toISOString(),
    }),
  });
  if (result !== null) {
    console.log('[Webhook] Agreement marked signed via PATCH');
    return true;
  }

  // Strategy 3: Try PUT with status (some backends only support PUT)
  result = await webhookApiRequest(`/agreements/${agreementId}`, {
    method: 'PUT',
    body: JSON.stringify({ 
      status: 'ACTIVE',
    }),
  });
  if (result !== null) {
    console.log('[Webhook] Agreement marked signed via PUT');
    return true;
  }

  console.error('[Webhook] All strategies to mark agreement signed failed');
  return false;
}

/**
 * Mark agreement as fully completed (all tasks done)
 */
async function markAgreementCompleted(agreementId: string): Promise<boolean> {
  const result = await webhookApiRequest(`/agreements/${agreementId}/complete`, {
    method: 'POST',
  });
  return result !== null;
}

async function markAgreementDeclined(agreementId: string): Promise<boolean> {
  const result = await webhookApiRequest(`/agreements/${agreementId}/cancel`, {
    method: 'POST',
  });
  return result !== null;
}

// ============================================================================
// Signed Document Storage
// ============================================================================

/**
 * Download signed PDF and upload to S3, then update document record
 */
async function storeSignedDocument(
  signedPdfUrl: string,
  envelopeId: string,
  agreementId: string,
  documentId: string | null
): Promise<boolean> {
  try {
    console.log('[Webhook] Downloading signed PDF from:', signedPdfUrl);
    
    // Download the signed PDF
    const pdfResponse = await fetch(signedPdfUrl);
    if (!pdfResponse.ok) {
      console.error('[Webhook] Failed to download signed PDF:', pdfResponse.status);
      return false;
    }
    
    const pdfBlob = await pdfResponse.blob();
    const pdfBuffer = await pdfBlob.arrayBuffer();
    console.log('[Webhook] Downloaded signed PDF, size:', pdfBuffer.byteLength);

    // Get upload URL from backend
    const fileName = `signed-agreement-${agreementId}-${Date.now()}.pdf`;
    const uploadUrlResponse = await webhookApiRequest<{ uploadUrl: string; fileId: string }>(
      '/s3/upload-url',
      {
        method: 'POST',
        body: JSON.stringify({
          fileName,
          contentType: 'application/pdf',
        }),
      }
    );

    if (!uploadUrlResponse?.uploadUrl) {
      console.error('[Webhook] Failed to get upload URL for signed PDF');
      return false;
    }

    console.log('[Webhook] Got upload URL, uploading signed PDF...');

    // Upload to S3
    const uploadResponse = await fetch(uploadUrlResponse.uploadUrl, {
      method: 'PUT',
      body: pdfBuffer,
      headers: {
        'Content-Type': 'application/pdf',
      },
    });

    if (!uploadResponse.ok) {
      console.error('[Webhook] Failed to upload signed PDF to S3:', uploadResponse.status);
      return false;
    }

    console.log('[Webhook] Signed PDF uploaded to S3, fileId:', uploadUrlResponse.fileId);

    // If we have a document ID, create a new file version for it
    if (documentId) {
      const versionResult = await webhookApiRequest(
        `/documents/${documentId}/create-file-version`,
        {
          method: 'POST',
          body: JSON.stringify({
            fileId: uploadUrlResponse.fileId,
            fileName,
            isSigned: true,
          }),
        }
      );
      
      if (versionResult) {
        console.log('[Webhook] Created signed file version for document:', documentId);
      }
    }

    // Update agreement with signed document reference
    await webhookApiRequest(`/agreements/${agreementId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        signedDocumentFileId: uploadUrlResponse.fileId,
      }),
    });

    console.log('[Webhook] ✓ Signed document stored successfully');
    return true;
  } catch (error) {
    console.error('[Webhook] Error storing signed document:', error);
    return false;
  }
}

// ============================================================================
// Webhook Handler
// ============================================================================

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  console.log('[Webhook] Received SignatureAPI event');

  // Verify webhook signature if secret is configured
  if (WEBHOOK_SECRET) {
    try {
      const wh = new Webhook(WEBHOOK_SECRET);
      wh.verify(payload, headers);
      console.log('[Webhook] Signature verified');
    } catch (error) {
      console.error('[Webhook] Signature verification failed:', error);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else {
    console.warn('[Webhook] No webhook secret configured - skipping verification');
  }

  let event: SignatureWebhookEvent;
  try {
    event = JSON.parse(payload);
  } catch {
    console.error('[Webhook] Failed to parse event payload');
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  console.log('[Webhook] Event type:', event.type, '| Envelope:', event.data?.envelope_id);

  // Handle different event types
  switch (event.type) {
    case 'recipient.ceremony_started': {
      console.log('[Webhook] Recipient started ceremony:', event.data.recipient_id);
      break;
    }

    case 'recipient.completed': {
      // A recipient (signer) has completed signing
      console.log('[Webhook] Recipient completed signing:', event.data.recipient_id);

      const agreement = await findAgreementByEnvelopeId(event.data.envelope_id);
      if (!agreement) {
        console.log('[Webhook] No agreement found for envelope');
        break;
      }

      // Get and update document and todo
      const { documentId, todoId } = await getDocumentAndTodoFromAgreement(agreement.id);
      
      if (documentId) {
        const docSuccess = await markDocumentSigned(documentId);
        console.log('[Webhook] Document signed:', documentId, docSuccess ? '✓' : '✗');
      }

      if (todoId) {
        const todoSuccess = await markTodoCompleted(todoId);
        console.log('[Webhook] Todo completed:', todoId, todoSuccess ? '✓' : '✗');
      }

      // Mark agreement as ACTIVE (signed) - not COMPLETED yet (needs payment)
      const signedSuccess = await markAgreementSigned(agreement.id);
      console.log('[Webhook] Agreement marked as signed (ACTIVE):', agreement.id, signedSuccess ? '✓' : '✗');
      
      break;
    }

    case 'envelope.completed': {
      // All recipients have signed - the envelope is complete
      // Note: For single-signer flows, this fires after recipient.completed
      console.log('[Webhook] Envelope completed:', event.data.envelope_id);

      const agreement = await findAgreementByEnvelopeId(event.data.envelope_id);
      if (agreement) {
        // Don't mark as COMPLETED here - that should only happen after payment
        // The agreement is already ACTIVE from recipient.completed
        console.log('[Webhook] Envelope complete for agreement:', agreement.id, '(already ACTIVE)');
      } else {
        console.log('[Webhook] No agreement found for envelope:', event.data.envelope_id);
      }
      break;
    }

    case 'envelope.declined': {
      console.log('[Webhook] Envelope declined:', event.data.envelope_id);
      const agreement = await findAgreementByEnvelopeId(event.data.envelope_id);
      if (agreement) {
        const success = await markAgreementDeclined(agreement.id);
        console.log('[Webhook] Agreement declined:', agreement.id, success ? '✓' : '✗');
      }
      break;
    }

    case 'envelope.voided': {
      console.log('[Webhook] Envelope voided:', event.data.envelope_id);
      const agreement = await findAgreementByEnvelopeId(event.data.envelope_id);
      if (agreement) {
        const success = await markAgreementDeclined(agreement.id);
        console.log('[Webhook] Agreement cancelled:', agreement.id, success ? '✓' : '✗');
      }
      break;
    }

    case 'deliverable.generated': {
      // The signed PDF is ready for download - store it in S3
      console.log('[Webhook] Deliverable generated for envelope:', event.data.envelope_id);
      
      if (event.data.deliverable_url) {
        console.log('[Webhook] Signed document URL:', event.data.deliverable_url);
        
        const agreement = await findAgreementByEnvelopeId(event.data.envelope_id);
        if (agreement) {
          const { documentId } = await getDocumentAndTodoFromAgreement(agreement.id);
          
          const stored = await storeSignedDocument(
            event.data.deliverable_url,
            event.data.envelope_id,
            agreement.id,
            documentId
          );
          console.log('[Webhook] Signed document stored:', stored ? '✓' : '✗');
        }
      }
      break;
    }

    default:
      console.log('[Webhook] Unhandled event type:', event.type);
  }

  return NextResponse.json({ received: true, type: event.type });
}
