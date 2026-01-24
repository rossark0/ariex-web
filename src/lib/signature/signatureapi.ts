import { NextRequest } from 'next/server';

const SIGNATURE_API_KEY = process.env.SIGNATURE_API_KEY || '';
const SIGNATURE_API_BASE = process.env.SIGNATURE_API_BASE || 'https://api.signatureapi.com/v1';

// ============================================================================
// Types
// ============================================================================

type CreateRecipientParams = {
  name: string;
  email: string;
  role?: 'signer' | 'cc';
};

export interface SignatureApiEnvelope {
  id: string;
  title: string;
  status: string;
  recipients: Array<{
    id: string;
    key: string;
    type: string;
    name: string;
    email: string;
    status?: string;
    ceremony?: {
      url?: string;
      authentication?: Array<{ type: string }>;
      embeddable_in?: string[];
      redirect_url?: string;
    };
  }>;
}

export interface SignatureApiCeremony {
  authentication: Array<{ type: string; provider?: string; data?: Record<string, string> }>;
  url: string;
  url_variant: string;
  embeddable_in?: string[];
  redirect_url?: string;
}

// ============================================================================
// API Helper
// ============================================================================

async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SIGNATURE_API_BASE}${path}`, {
    ...init,
    headers: {
      'X-Api-Key': SIGNATURE_API_KEY,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SignatureAPI error ${res.status}: ${text}`);
  }
  return res.json();
}

// ============================================================================
// Create Envelope with Document URL
// ============================================================================

/**
 * Create an envelope with a document from a URL (S3, etc.)
 * The document should already contain [[signer_signs_here]] placeholder for the signature field.
 * 
 * IMPORTANT: This creates the envelope but does NOT automatically generate a ceremony URL.
 * You must call createCeremonyForRecipient() separately to get the ceremony URL.
 * This is because:
 * - email_link auth sends URL via email, API returns url: null
 * - To get URL via API, we need email_code or custom auth via Create Ceremony endpoint
 */
export async function createEnvelopeWithDocument(params: {
  title: string;
  documentUrl: string;
  recipient: CreateRecipientParams;
  message?: string;
  metadata?: Record<string, string>;
}): Promise<{ envelopeId: string; recipientId: string }> {
  // Create envelope WITHOUT specifying ceremony config (will create ceremony separately)
  const requestBody = {
    title: params.title,
    message: params.message || `Please review and sign the ${params.title}.`,
    metadata: params.metadata,
    documents: [
      {
        url: params.documentUrl,
        places: [
          {
            key: 'signer_signs_here',
            type: 'signature',
            recipient_key: 'signer',
          },
        ],
      },
    ],
    recipients: [
      {
        key: 'signer',
        type: 'signer',
        name: params.recipient.name,
        email: params.recipient.email,
        // Don't specify delivery_type or ceremony here
        // We'll create the ceremony separately with custom auth to get the URL
      },
    ],
  };

  console.log('[SignatureAPI] Creating envelope:', params.documentUrl);

  const envelope = await api<SignatureApiEnvelope>('/envelopes', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  const envelopeId = envelope.id;
  const recipientId = envelope.recipients?.[0]?.id || '';

  console.log('[SignatureAPI] Envelope created:', envelopeId, 'recipientId:', recipientId, 'status:', envelope.status);

  return { envelopeId, recipientId };
}

// ============================================================================
// Wait for Envelope to be Ready
// ============================================================================

/**
 * Poll the envelope until it's ready (not in "processing" status)
 * Returns the envelope when ready, or throws after timeout
 */
async function waitForEnvelopeReady(
  envelopeId: string,
  maxAttempts: number = 10,
  delayMs: number = 1000
): Promise<SignatureApiEnvelope> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[SignatureAPI] Checking envelope status (attempt ${attempt}/${maxAttempts})...`);
    
    const envelope = await api<SignatureApiEnvelope>(`/envelopes/${envelopeId}`, {
      method: 'GET',
    });

    console.log(`[SignatureAPI] Envelope status: ${envelope.status}`);

    // If not processing anymore, it's ready
    if (envelope.status !== 'processing') {
      return envelope;
    }

    // Wait before next attempt
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`Envelope ${envelopeId} is still processing after ${maxAttempts} attempts`);
}

// ============================================================================
// Create Ceremony for Recipient (This returns the signing URL!)
// ============================================================================

/**
 * Create a signing ceremony for a recipient with custom authentication.
 * This is the KEY function that returns the ceremony URL for embedded signing.
 * 
 * Using "custom" authentication allows us to:
 * 1. Get the ceremony URL via API (not sent via email)
 * 2. Embed the signing ceremony in an iframe
 * 
 * @see https://signatureapi.com/docs/api/resources/ceremonies/create
 */
export async function createCeremonyForRecipient(params: {
  recipientId: string;
  redirectUrl?: string;
  embeddableIn?: string[];
}): Promise<{ ceremonyUrl: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // Create ceremony with custom authentication to get URL via API
  const requestBody = {
    authentication: [
      {
        type: 'custom',
        provider: 'Ariex',
        data: {
          'Authenticated via': 'Ariex Platform',
          'Session': new Date().toISOString(),
        },
      },
    ],
    // Allow embedding in our domain
    embeddable_in: params.embeddableIn || [
      baseUrl,
      'http://localhost:3000',
      'https://localhost:3000',
    ],
    redirect_url: params.redirectUrl || `${baseUrl}/client/agreements?signed=true`,
    url_variant: 'standard',
  };

  console.log('[SignatureAPI] Creating ceremony for recipient:', params.recipientId);
  console.log('[SignatureAPI] Ceremony request:', JSON.stringify(requestBody, null, 2));

  const ceremony = await api<SignatureApiCeremony>(
    `/recipients/${params.recipientId}/ceremonies`,
    {
      method: 'POST',
      body: JSON.stringify(requestBody),
    }
  );

  console.log('[SignatureAPI] Ceremony created:', JSON.stringify(ceremony, null, 2));
  console.log('[SignatureAPI] Ceremony URL:', ceremony.url);

  if (!ceremony.url) {
    throw new Error('SignatureAPI did not return a ceremony URL');
  }

  return { ceremonyUrl: ceremony.url };
}

// ============================================================================
// Combined: Create Envelope AND Get Ceremony URL
// ============================================================================

/**
 * High-level function that creates an envelope AND generates the ceremony URL.
 * This is the main function to use when sending a document for signing.
 * 
 * Flow:
 * 1. Create envelope with document
 * 2. Wait for envelope to finish processing
 * 3. Create ceremony to get the signing URL
 */
export async function createEnvelopeWithCeremony(params: {
  title: string;
  documentUrl: string;
  recipient: CreateRecipientParams;
  message?: string;
  redirectUrl?: string;
  metadata?: Record<string, string>;
}): Promise<{ envelopeId: string; recipientId: string; ceremonyUrl: string }> {
  // Step 1: Create the envelope
  const { envelopeId, recipientId } = await createEnvelopeWithDocument({
    title: params.title,
    documentUrl: params.documentUrl,
    recipient: params.recipient,
    message: params.message,
    metadata: params.metadata,
  });

  // Step 2: Wait for envelope to be ready (not "processing")
  console.log('[SignatureAPI] Waiting for envelope to be ready...');
  await waitForEnvelopeReady(envelopeId);

  // Step 3: Create ceremony to get the signing URL
  const { ceremonyUrl } = await createCeremonyForRecipient({
    recipientId,
    redirectUrl: params.redirectUrl,
  });

  return { envelopeId, recipientId, ceremonyUrl };
}

/**
 * Legacy function - kept for backwards compatibility
 * @deprecated Use createEnvelopeWithCeremony instead
 */
export async function createEnvelopeWithUploadAndRecipient(params: {
  envelope: { title: string };
  upload: { fileName: string; fileUrl: string };
  recipient: CreateRecipientParams;
  redirectUrl?: string;
}): Promise<{ envelopeId: string; recipientId: string; ceremonyUrl?: string }> {
  const result = await createEnvelopeWithCeremony({
    title: params.envelope.title,
    documentUrl: params.upload.fileUrl,
    recipient: params.recipient,
    redirectUrl: params.redirectUrl,
  });
  return result;
}

/**
 * Minimal webhook signature parser placeholder.
 * In production, verify using SignatureAPI's recommended scheme (if provided).
 */
export function parseSignatureWebhook(req: NextRequest): Promise<any> {
  return req.json();
}

// ============================================================================
// Get Envelope Details
// ============================================================================

/**
 * Get envelope details including recipient status and ceremony info
 */
export async function getEnvelopeDetails(envelopeId: string): Promise<SignatureApiEnvelope | null> {
  try {
    const envelope = await api<SignatureApiEnvelope>(`/envelopes/${envelopeId}`, {
      method: 'GET',
    });

    console.log('[SignatureAPI] Envelope details:', JSON.stringify(envelope, null, 2));
    return envelope;
  } catch (error) {
    console.error('[SignatureAPI] Failed to get envelope details:', error);
    return null;
  }
}

/**
 * Get recipient details including ceremony URL
 */
export async function getRecipientDetails(recipientId: string): Promise<{
  id: string;
  name: string;
  email: string;
  status: string;
  ceremonyUrl?: string;
} | null> {
  try {
    const recipient = await api<any>(`/recipients/${recipientId}`, {
      method: 'GET',
    });

    console.log('[SignatureAPI] Recipient details:', JSON.stringify(recipient, null, 2));
    
    return {
      id: recipient.id,
      name: recipient.name,
      email: recipient.email,
      status: recipient.status,
      ceremonyUrl: recipient.ceremony?.url,
    };
  } catch (error) {
    console.error('[SignatureAPI] Failed to get recipient details:', error);
    return null;
  }
}

// ============================================================================
// Create Embedded Ceremony URL (for existing recipients without URL)
// ============================================================================

/**
 * Create or refresh a ceremony URL for an existing recipient.
 * Use this when you have an envelope/recipient but need to get a ceremony URL.
 * 
 * This handles the case where:
 * - Old envelopes were created with email_link auth (no API URL)
 * - Envelope might still be in "processing" status
 */
export async function createEmbeddedCeremonyUrl(
  envelopeId: string,
  recipientId: string,
  redirectUrl?: string
): Promise<string | null> {
  try {
    console.log('[SignatureAPI] Creating ceremony URL for existing recipient:', recipientId);
    
    // First check if envelope is ready
    const envelope = await getEnvelopeDetails(envelopeId);
    if (!envelope) {
      console.error('[SignatureAPI] Envelope not found:', envelopeId);
      return null;
    }

    // If envelope is processing, wait for it
    if (envelope.status === 'processing') {
      console.log('[SignatureAPI] Envelope still processing, waiting...');
      try {
        await waitForEnvelopeReady(envelopeId, 5, 1000);
      } catch {
        console.log('[SignatureAPI] Envelope still processing after waiting');
        return null;
      }
    }

    // If envelope is completed/voided/declined, can't create ceremony
    if (['completed', 'voided', 'declined'].includes(envelope.status)) {
      console.log('[SignatureAPI] Envelope is', envelope.status, '- cannot create ceremony');
      return null;
    }

    // Try to create the ceremony
    const { ceremonyUrl } = await createCeremonyForRecipient({
      recipientId,
      redirectUrl,
    });
    
    return ceremonyUrl;
  } catch (error: any) {
    // Handle specific errors
    if (error.message?.includes('409')) {
      console.log('[SignatureAPI] Ceremony already exists or envelope not ready');
    } else {
      console.error('[SignatureAPI] Failed to create ceremony URL:', error);
    }
    return null;
  }
}

// ============================================================================
// Webhook Event Types
// ============================================================================

export type SignatureWebhookEvent = {
  id: string;
  type:
    | 'recipient.ceremony_started'
    | 'recipient.completed'
    | 'envelope.completed'
    | 'envelope.declined'
    | 'envelope.voided'
    | 'deliverable.generated';
  timestamp: string;
  data: {
    envelope_id: string;
    envelope_metadata?: Record<string, string>;
    object_id?: string;
    object_type?: string;
    recipient_id?: string;
    recipient_type?: string;
    deliverable_url?: string;
  };
};

/**
 * Download the signed PDF from SignatureAPI
 */
export async function downloadSignedDocument(envelopeId: string): Promise<Blob | null> {
  try {
    // Get deliverables for the envelope
    const res = await fetch(`${SIGNATURE_API_BASE}/envelopes/${envelopeId}/deliverables`, {
      headers: {
        'X-Api-Key': SIGNATURE_API_KEY,
      },
    });
    
    if (!res.ok) {
      throw new Error(`Failed to get deliverables: ${res.status}`);
    }
    
    const deliverables = await res.json();
    console.log('[SignatureAPI] Deliverables:', deliverables);
    
    // Find the signed PDF
    const signedPdf = deliverables.find((d: any) => d.type === 'signed_pdf');
    if (!signedPdf?.url) {
      console.log('[SignatureAPI] No signed PDF found');
      return null;
    }
    
    // Download the signed PDF
    const pdfRes = await fetch(signedPdf.url);
    if (!pdfRes.ok) {
      throw new Error(`Failed to download signed PDF: ${pdfRes.status}`);
    }
    
    return await pdfRes.blob();
  } catch (error) {
    console.error('[SignatureAPI] Failed to download signed document:', error);
    return null;
  }
}
