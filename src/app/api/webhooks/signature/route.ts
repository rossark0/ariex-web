import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'standardwebhooks';
import type { SignatureWebhookEvent } from '@/lib/signature/signatureapi';

const WEBHOOK_SECRET = process.env.SIGNATURE_WEBHOOK_SECRET || '';
const API_URL = process.env.NEXT_PUBLIC_API_URL 

// ============================================================================
// Internal API Helpers (use service account or API key for webhook context)
// ============================================================================

interface AgreementWithMetadata {
  id: string;
  name: string;
  description?: string;
  status: string;
  contractDocumentId?: string; // The document linked to this agreement
  signatureEnvelopeId?: string; // Direct field if backend supports it
  todoLists?: Array<{
    id: string;
    todos: Array<{
      id: string;
      title: string;
      status: string;
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
      console.log(`[Webhook] API request failed: ${endpoint}`, response.status);
      const text = await response.text();
      console.log(`[Webhook] Response:`, text.slice(0, 500));
      return null;
    }

    return response.json();
  } catch (error) {
    console.error(`[Webhook] API request error: ${endpoint}`, error);
    return null;
  }
}

/**
 * Find agreement by SignatureAPI envelope ID
 * Tries multiple lookup strategies:
 * 1. Direct lookup by envelope ID (if backend supports it)
 * 2. Use envelope metadata (clientId, strategistId) to find recent agreements
 * 3. Search all agreements for envelope ID in description metadata
 */
async function findAgreementByEnvelopeId(
  envelopeId: string, 
  envelopeMetadata?: Record<string, string>
): Promise<AgreementWithMetadata | null> {
  console.log(`[Webhook] Looking for agreement with envelope ID: ${envelopeId}`);
  if (envelopeMetadata) {
    console.log(`[Webhook] Envelope metadata:`, envelopeMetadata);
  }
  
  try {
    // Strategy 1: Direct lookup by envelope ID (if backend supports it)
    const directLookup = await webhookApiRequest<AgreementWithMetadata>(
      `/agreements/by-envelope/${envelopeId}`
    );
    if (directLookup) {
      console.log(`[Webhook] Found via direct lookup: ${directLookup.id}`);
      return directLookup;
    }

    // Strategy 2: If we have clientId from metadata, get client's agreements
    if (envelopeMetadata?.clientId) {
      const clientAgreements = await webhookApiRequest<AgreementWithMetadata[]>(
        `/agreements?clientId=${envelopeMetadata.clientId}`
      );
      if (clientAgreements && Array.isArray(clientAgreements)) {
        for (const agreement of clientAgreements) {
          const metadataMatch = agreement.description?.match(
            /__SIGNATURE_METADATA__:([\s\S]+)$/
          );
          if (metadataMatch) {
            try {
              const metadata = JSON.parse(metadataMatch[1]);
              if (metadata.envelopeId === envelopeId) {
                console.log(`[Webhook] Found via client agreements: ${agreement.id}`);
                return agreement;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    }

    // Strategy 3: Fallback - Get all agreements and search
    const agreements = await webhookApiRequest<AgreementWithMetadata[]>('/agreements');

    if (!agreements || !Array.isArray(agreements)) {
      console.log('[Webhook] No agreements returned from API');
      return null;
    }

    console.log(`[Webhook] Searching through ${agreements.length} agreements...`);

    // Check direct signatureEnvelopeId field
    for (const agreement of agreements) {
      if (agreement.signatureEnvelopeId === envelopeId) {
        console.log(`[Webhook] Found via signatureEnvelopeId field: ${agreement.id}`);
        return agreement;
      }
    }

    // Find agreement with matching envelope ID in description metadata
    for (const agreement of agreements) {
      const metadataMatch = agreement.description?.match(
        /__SIGNATURE_METADATA__:([\s\S]+)$/
      );
      if (metadataMatch) {
        try {
          const metadata = JSON.parse(metadataMatch[1]);
          if (metadata.envelopeId === envelopeId) {
            console.log(`[Webhook] Found via description metadata: ${agreement.id}`);
            return agreement;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    console.log('[Webhook] Agreement not found for envelope ID:', envelopeId);
    return null;
  } catch (error) {
    console.error('[Webhook] Error finding agreement:', error);
    return null;
  }
}

/**
 * Get document ID from agreement
 */
function getDocumentIdFromAgreement(agreement: AgreementWithMetadata): string | null {
  const documentId = agreement.contractDocumentId || null;
  console.log(`[Webhook] Found documentId: ${documentId}`);
  return documentId;
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

/**
 * Update agreement status to ACTIVE (signed but not yet completed)
 * Try multiple strategies since backend API varies
 */
async function markAgreementSigned(agreementId: string): Promise<boolean> {
  // Strategy 1: Try dedicated sign endpoint
  let result = await webhookApiRequest(`/agreements/${agreementId}/sign`, {
    method: 'POST',
  });
  if (result !== null) return true;

  // Strategy 2: Try PATCH with status
  result = await webhookApiRequest(`/agreements/${agreementId}`, {
    method: 'PATCH',
    body: JSON.stringify({ 
      status: 'ACTIVE',
      signedAt: new Date().toISOString(),
    }),
  });
  if (result !== null) return true;

  // Strategy 3: Try PUT with status (some backends only support PUT)
  result = await webhookApiRequest(`/agreements/${agreementId}`, {
    method: 'PUT',
    body: JSON.stringify({ 
      status: 'ACTIVE',
    }),
  });
  if (result !== null) return true;

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
    // Download the signed PDF
    const pdfResponse = await fetch(signedPdfUrl);
    if (!pdfResponse.ok) {
      return false;
    }
    
    const pdfBlob = await pdfResponse.blob();
    const pdfBuffer = await pdfBlob.arrayBuffer();

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
      return false;
    }

    // Upload to S3
    const uploadResponse = await fetch(uploadUrlResponse.uploadUrl, {
      method: 'PUT',
      body: pdfBuffer,
      headers: {
        'Content-Type': 'application/pdf',
      },
    });

    if (!uploadResponse.ok) {
      return false;
    }

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
      
    }

    // Update agreement with signed document reference
    await webhookApiRequest(`/agreements/${agreementId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        signedDocumentFileId: uploadUrlResponse.fileId,
      }),
    });

    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Webhook Handler
// ============================================================================

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  console.log('[Webhook] Received SignatureAPI webhook');

  // Verify webhook signature if secret is configured
  if (WEBHOOK_SECRET) {
    try {
      const wh = new Webhook(WEBHOOK_SECRET);
      wh.verify(payload, headers);
      console.log('[Webhook] Signature verified ✓');
    } catch (error) {
      console.error('[Webhook] Invalid signature:', error);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else {
    console.log('[Webhook] No webhook secret configured, skipping verification');
  }

  let event: SignatureWebhookEvent;
  try {
    event = JSON.parse(payload);
    console.log('[Webhook] Event type:', event.type);
    console.log('[Webhook] Envelope ID:', event.data.envelope_id);
    if (event.data.envelope_metadata) {
      console.log('[Webhook] Envelope metadata:', event.data.envelope_metadata);
    }
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Extract envelope metadata for agreement lookup
  const envelopeMetadata = event.data.envelope_metadata;

  // Handle different event types
  switch (event.type) {
    case 'recipient.ceremony_started':
      console.log('[Webhook] Recipient started signing ceremony');
      break;

    case 'recipient.completed': {
      // A recipient (signer) has completed signing
      console.log('[Webhook] Recipient completed signing');
      
      const agreement = await findAgreementByEnvelopeId(event.data.envelope_id, envelopeMetadata);
      if (!agreement) {
        console.log('[Webhook] ❌ Agreement not found for envelope:', event.data.envelope_id);
        break;
      }
      console.log('[Webhook] ✓ Found agreement:', agreement.id, agreement.name);

      // Get document ID from the agreement
      const documentId = getDocumentIdFromAgreement(agreement);
      
      // Update document signed status
      if (documentId) {
        const docSuccess = await markDocumentSigned(documentId);
        console.log('[Webhook] Document signed:', documentId, docSuccess ? '✓' : '✗');
      }

      // Mark agreement as ACTIVE (signed) - not COMPLETED yet (needs payment)
      const signedSuccess = await markAgreementSigned(agreement.id);
      console.log('[Webhook] Agreement status updated to ACTIVE:', agreement.id, signedSuccess ? '✓' : '✗');
      
      break;
    }

    case 'envelope.completed':
      // All recipients have signed - the envelope is complete
      console.log('[Webhook] Envelope completed (all recipients signed)');
      // Don't mark as COMPLETED here - that should only happen after payment
      break;

    case 'envelope.declined': {
      console.log('[Webhook] Envelope declined');
      const agreement = await findAgreementByEnvelopeId(event.data.envelope_id, envelopeMetadata);
      if (agreement) await markAgreementDeclined(agreement.id);
      break;
    }

    case 'envelope.voided': {
      console.log('[Webhook] Envelope voided');
      const agreement = await findAgreementByEnvelopeId(event.data.envelope_id, envelopeMetadata);
      if (agreement) await markAgreementDeclined(agreement.id);
      break;
    }

    case 'deliverable.generated': {
      // The signed PDF is ready for download - store it in S3
      console.log('[Webhook] Deliverable generated (signed PDF ready)');
      if (event.data.deliverable_url) {
        const agreement = await findAgreementByEnvelopeId(event.data.envelope_id, envelopeMetadata);
        if (agreement) {
          const { documentId } = await getDocumentAndTodoFromAgreement(agreement);
          await storeSignedDocument(
            event.data.deliverable_url,
            event.data.envelope_id,
            agreement.id,
            documentId
          );
        }
      }
      break;
    }

    default:
      console.log('[Webhook] Unhandled event type:', event.type);
      break;
  }

  return NextResponse.json({ received: true, type: event.type });
}
