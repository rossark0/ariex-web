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
 * Supports two signers: Client (primary) and Tax Strategist (secondary)
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
  strategist?: CreateRecipientParams; // Optional tax strategist signer
  message?: string;
  metadata?: Record<string, string>;
  signaturePage?: number; // Which page has signature fields (1-indexed), defaults to 1
  totalPages?: number; // Total pages in the document (signatures go on last page)
}): Promise<{ envelopeId: string; recipientId: string; strategistRecipientId?: string }> {
  // Place signatures on the last page (use totalPages if provided, otherwise signaturePage or 1)
  const signaturePage = params.totalPages || params.signaturePage || 1;
  
  // Build places and fixed_positions arrays for signature fields
  const places = [
    {
      key: 'client_signs_here',
      type: 'signature',
      recipient_key: 'client',
    },
  ];
  
  // Signature positioning: VERY BOTTOM of the page
  // A4 page is 595 x 842 pts, Letter is 612 x 792 pts
  // Signature field height is ~60pts
  // Position at absolute bottom with minimal margin
  const signatureTop = 820;   // Very bottom (842 - 60 - 22 margin for A4)
  const clientLeft = 400;     // RIGHT side for client
  const strategistLeft = 72;  // LEFT side for strategist (1 inch)
  
  const fixedPositions = [
    {
      place_key: 'client_signs_here',
      page: signaturePage,
      top: signatureTop,
      left: clientLeft,
    },
  ];
  
  // Add Tax Strategist signature if provided
  if (params.strategist) {
    places.push({
      key: 'strategist_signs_here',
      type: 'signature',
      recipient_key: 'strategist',
    });
    
    // Strategist signature on the LEFT
    fixedPositions.push({
      place_key: 'strategist_signs_here',
      page: signaturePage,
      top: signatureTop,
      left: strategistLeft,
    });
  }
  
  // Build recipients array
  const recipients: Array<{
    key: string;
    type: string;
    name: string;
    email: string;
  }> = [
    {
      key: 'client',
      type: 'signer',
      name: params.recipient.name,
      email: params.recipient.email,
      // No order field = parallel signing (both can sign at the same time)
    },
  ];
  
  if (params.strategist) {
    recipients.push({
      key: 'strategist',
      type: 'signer',
      name: params.strategist.name,
      email: params.strategist.email,
    });
  }
  
  const requestBody = {
    title: params.title,
    message: params.message || `Please review and sign the ${params.title}.`,
    metadata: params.metadata,
    // Use parallel routing so both signers can sign at the same time
    routing: params.strategist ? 'parallel' : 'sequential',
    documents: [
      {
        url: params.documentUrl,
        places,
        fixed_positions: fixedPositions,
      },
    ],
    recipients,
  };

  console.log('[SignatureAPI] Creating envelope with', recipients.length, 'signer(s):', params.documentUrl);

  const envelope = await api<SignatureApiEnvelope>('/envelopes', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  const envelopeId = envelope.id;
  const clientRecipient = envelope.recipients?.find(r => r.key === 'client');
  const strategistRecipient = envelope.recipients?.find(r => r.key === 'strategist');
  
  const recipientId = clientRecipient?.id || envelope.recipients?.[0]?.id || '';
  const strategistRecipientId = strategistRecipient?.id;

  console.log('[SignatureAPI] Envelope created:', envelopeId, 
    'clientRecipientId:', recipientId, 
    'strategistRecipientId:', strategistRecipientId || 'N/A',
    'status:', envelope.status);

  return { envelopeId, recipientId, strategistRecipientId };
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
  // Hardcode production URL for SignatureAPI redirect (env var not reliable at runtime)
  const baseUrl = 'https://ariex-web-nine.vercel.app';
  
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
    redirect_url: params.redirectUrl || `${baseUrl}/client/onboarding?signed=true`,
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
 * 1. Create envelope with document (supports both client and strategist signers)
 * 2. Wait for envelope to finish processing
 * 3. Create ceremony to get the signing URL (for client)
 */
export async function createEnvelopeWithCeremony(params: {
  title: string;
  documentUrl: string;
  recipient: CreateRecipientParams;
  strategist?: CreateRecipientParams; // Optional tax strategist signer
  message?: string;
  redirectUrl?: string;
  metadata?: Record<string, string>;
  signaturePage?: number; // Which page has signature fields (1-indexed)
  totalPages?: number; // Total pages in the document (signatures go on last page)
}): Promise<{ 
  envelopeId: string; 
  recipientId: string; 
  ceremonyUrl: string;
  strategistRecipientId?: string;
  strategistCeremonyUrl?: string;
}> {
  // Step 1: Create the envelope with both signers
  const { envelopeId, recipientId, strategistRecipientId } = await createEnvelopeWithDocument({
    title: params.title,
    documentUrl: params.documentUrl,
    recipient: params.recipient,
    strategist: params.strategist,
    message: params.message,
    metadata: params.metadata,
    signaturePage: params.signaturePage,
    totalPages: params.totalPages,
  });

  // Step 2: Wait for envelope to be ready (not "processing")
  console.log('[SignatureAPI] Waiting for envelope to be ready...');
  await waitForEnvelopeReady(envelopeId);

  // Step 3: Create ceremony for client to get the signing URL
  const { ceremonyUrl } = await createCeremonyForRecipient({
    recipientId,
    redirectUrl: params.redirectUrl,
  });

  // Step 4: If strategist is included, create ceremony for them too
  // Use try-catch since strategist signing is optional and shouldn't fail the whole flow
  let strategistCeremonyUrl: string | undefined;
  if (strategistRecipientId) {
    try {
      const strategistCeremony = await createCeremonyForRecipient({
        recipientId: strategistRecipientId,
        redirectUrl: params.redirectUrl,
      });
      strategistCeremonyUrl = strategistCeremony.ceremonyUrl;
      console.log('[SignatureAPI] Strategist ceremony URL:', strategistCeremonyUrl);
    } catch (error) {
      // Don't fail the whole flow - strategist can sign later
      console.warn('[SignatureAPI] Could not create strategist ceremony (will retry later):', error);
    }
  }

  return { 
    envelopeId, 
    recipientId, 
    ceremonyUrl,
    strategistRecipientId,
    strategistCeremonyUrl,
  };
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

    // console.log('[SignatureAPI] Envelope details:', JSON.stringify(envelope, null, 2));
    return envelope;
  } catch (error) {
    // console.error('[SignatureAPI] Failed to get envelope details:', error);
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
 * Get the URL of the signed PDF from SignatureAPI
 * This returns the direct URL to the signed document without downloading it
 */
export async function getSignedDocumentUrl(envelopeId: string): Promise<string | null> {
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
    
    const response = await res.json();
    console.log('[SignatureAPI] Deliverables:', response);
    
    // API returns { data: [...], links: {...} }
    const deliverables = response.data || response;
    
    if (!Array.isArray(deliverables) || deliverables.length === 0) {
      console.log('[SignatureAPI] No deliverables found');
      return null;
    }
    
    // Find a completed deliverable with a URL
    // Types can be: 'standard', 'signed_pdf', etc.
    const signedPdf = deliverables.find((d: any) => 
      d.status === 'completed' && d.url
    );
    
    if (!signedPdf?.url) {
      // Check if deliverables exist but are still pending
      const pendingDeliverable = deliverables.find((d: any) => d.status === 'pending');
      if (pendingDeliverable) {
        console.log('[SignatureAPI] Signed document is still being generated (pending)');
      } else {
        console.log('[SignatureAPI] No signed PDF found in deliverables');
      }
      return null;
    }
    
    return signedPdf.url;
  } catch (error) {
    console.error('[SignatureAPI] Failed to get signed document URL:', error);
    return null;
  }
}

/**
 * Download the signed PDF from SignatureAPI
 */
export async function downloadSignedDocument(envelopeId: string): Promise<Blob | null> {
  try {
    const signedUrl = await getSignedDocumentUrl(envelopeId);
    if (!signedUrl) {
      return null;
    }
    
    // Download the signed PDF
    const pdfRes = await fetch(signedUrl);
    if (!pdfRes.ok) {
      throw new Error(`Failed to download signed PDF: ${pdfRes.status}`);
    }
    
    return await pdfRes.blob();
  } catch (error) {
    console.error('[SignatureAPI] Failed to download signed document:', error);
    return null;
  }
}

// ============================================================================
// Get Recent Envelope for Email
// ============================================================================

/**
 * Search for a recent in_progress envelope for a specific email
 */
export async function getRecentEnvelopeForEmail(email: string): Promise<{ envelopeId: string; recipientId: string } | null> {
  try {
    console.log('[SignatureAPI] Searching for envelope for email:', email);
    
    // List recent envelopes
    const envelopes = await api<{ data: SignatureApiEnvelope[] }>('/envelopes?status=in_progress', {
      method: 'GET',
    });
    
    console.log('[SignatureAPI] Found', envelopes.data?.length || 0, 'in_progress envelopes');
    
    // Find envelope with matching recipient email
    for (const envelope of (envelopes.data || [])) {
      const recipient = envelope.recipients?.find(r => r.email.toLowerCase() === email.toLowerCase());
      if (recipient) {
        console.log('[SignatureAPI] Found matching envelope:', envelope.id, 'recipient:', recipient.id);
        return {
          envelopeId: envelope.id,
          recipientId: recipient.id,
        };
      }
    }
    
    console.log('[SignatureAPI] No matching envelope found for email:', email);
    return null;
  } catch (error) {
    console.error('[SignatureAPI] getRecentEnvelopeForEmail error:', error);
    return null;
  }
}

