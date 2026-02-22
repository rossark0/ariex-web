'use server';

import { API_URL } from '@/lib/cognito-config';
import { cookies } from 'next/headers';
import {
  getEnvelopeDetails,
  createEmbeddedCeremonyUrl,
  getRecentEnvelopeForEmail,
  createCeremonyForRecipient,
  getSignedDocumentUrl,
} from '@/lib/signature/signatureapi';
import { AgreementStatus, isAgreementSigned, isAgreementPaid } from '@/types/agreement';
import { AcceptanceStatus } from '@/types/document';

// ============================================================================
// Types
// ============================================================================

export interface ClientProfile {
  id: string;
  userId: string;
  phoneNumber?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  taxId?: string;
  businessName?: string;
  businessType?: string;
  filingStatus?: string;
  dependents?: number;
  estimatedIncome?: number;
  onboardingComplete?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientUser {
  id: string;
  cognitoSub?: string;
  email: string;
  fullName?: string;
  name?: string;
  status?: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
  strategists?: string[];
}

export interface ClientDashboardData {
  user: ClientUser;
  profile: ClientProfile | null;
  strategist: {
    id: string;
    name: string;
    email: string;
  } | null;
  agreements: ClientAgreement[];
  documents: ClientDocument[];
  todos: ClientTodo[];
}

export interface ClientAgreement {
  id: string;
  title: string;
  name?: string;
  description?: string;
  type?: string;
  status: AgreementStatus;
  price?: string | number;
  strategistId?: string;
  signatureEnvelopeId?: string;
  signatureRecipientId?: string;
  signatureCeremonyUrl?: string;
  signedDocumentFileId?: string; // S3 file ID for the signed PDF
  contractFileId?: string;
  contractDocumentId?: string;
  paymentReference?: string;
  paymentRef?: string;
  paymentAmount?: number;
  paymentStatus?: 'pending' | 'paid' | 'failed';
  paymentLink?: string;
  signedAt?: string;
  paidAt?: string;
  todoLists?: Array<{
    id: string;
    name: string;
    todos: Array<{
      id: string;
      title: string;
      description?: string;
      status: string;
      document?: {
        id: string;
        signedStatus?: string;
        uploadStatus?: string;
        acceptanceStatus?: string;
        files?: Array<{
          id: string;
          originalName: string;
          downloadUrl?: string;
        }>;
      };
    }>;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ClientDocument {
  id: string;
  name: string;
  type: string;
  category?: string;
  status: string;
  signatureStatus?: 'PENDING' | 'SENT' | 'SIGNED' | 'DECLINED';
  fileId?: string;
  todoId?: string; // Link to todo if document was uploaded for a todo
  uploadStatus?: 'WAITING_UPLOAD' | 'FILE_UPLOADED' | 'FILE_DELETED';
  acceptanceStatus?: AcceptanceStatus; // Strategist accept/decline status
  files?: Array<{
    id: string;
    originalName: string;
    downloadUrl?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ClientTodo {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Helper
// ============================================================================

async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('ariex_access_token')?.value || null;
}

async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('ariex_user_id')?.value || null;
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

// ============================================================================
// Client User API
// ============================================================================

/**
 * Get current client user data
 */
export async function getCurrentClientUser(): Promise<ClientUser | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId || userId === 'unknown') {
      // console.log('[ClientAPI] No user ID found');
      return null;
    }

    const user = await apiRequest<ClientUser>(`/users/${userId}`);
    // console.log('[ClientAPI] getCurrentClientUser:', user);
    return user;
  } catch {
    return null;
  }
}

/**
 * Get client profile for current user
 */
export async function getClientProfile(): Promise<ClientProfile | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId || userId === 'unknown') {
      // console.log('[ClientAPI] No user ID found for profile');
      return null;
    }

    const profile = await apiRequest<ClientProfile>(`/users/${userId}/client-profile`);
    // console.log('[ClientAPI] getClientProfile:', profile);
    return profile;
  } catch (error) {
    // console.error('[ClientAPI] Failed to get client profile:', error);
    return null;
  }
}

/**
 * Update client profile
 */
export async function updateClientProfile(
  data: Partial<ClientProfile>
): Promise<ClientProfile | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId || userId === 'unknown') {
      throw new Error('Not authenticated');
    }

    const profile = await apiRequest<ClientProfile>(`/users/${userId}/client-profile`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return profile;
  } catch {
    return null;
  }
}

// ============================================================================
// Agreements API
// ============================================================================

/**
 * Parse signature metadata from agreement description
 * The strategist API stores signature data as JSON in the description field
 */
function parseSignatureMetadata(description: string | undefined): {
  envelopeId?: string;
  recipientId?: string;
  ceremonyUrl?: string;
  cleanDescription: string;
} {
  if (!description) {
    return { cleanDescription: '' };
  }

  // Match __SIGNATURE_METADATA__ to the end of string ([\s\S]+ matches any char including newlines)
  const metadataMatch = description.match(/\n\n__SIGNATURE_METADATA__:([\s\S]+)$/);
  if (!metadataMatch) {
    return { cleanDescription: description };
  }

  try {
    const metadata = JSON.parse(metadataMatch[1]);
    const cleanDescription = description.replace(/\n\n__SIGNATURE_METADATA__:[\s\S]+$/, '');
    return {
      envelopeId: metadata.envelopeId,
      recipientId: metadata.recipientId,
      ceremonyUrl: metadata.ceremonyUrl,
      cleanDescription,
    };
  } catch (e) {
    return { cleanDescription: description };
  }
}

/**
 * Get all agreements for current client
 * Maps backend status (DRAFT, ACTIVE, COMPLETED) to client-friendly status
 * Parses signature metadata from description field
 */
export async function getClientAgreements(): Promise<ClientAgreement[]> {
  try {
    const userId = await getCurrentUserId();
    const rawAgreements = await apiRequest<any[]>('/agreements');

    // Filter agreements to only those belonging to this client
    // Check clientId field OR todoLists.assignedToId
    const clientAgreements =
      rawAgreements?.filter(a => {
        // Direct clientId match
        if (a.clientId === userId) return true;
        // Check if any todoList is assigned to this user
        if (a.todoLists?.some((list: any) => list.assignedToId === userId)) return true;
        // For agreements without todoLists, check if status suggests it belongs to user
        // (This is a fallback - ideally backend should have proper clientId)
        return false;
      }) || [];

    console.log('[ClientAPI] Logged in user:', userId, '- Agreements:', clientAgreements.length);
    console.log(
      '[ClientAPI] Client agreements:',
      JSON.stringify(
        clientAgreements?.map(a => ({
          id: a.id,
          name: a.name,
          status: a.status,
          todoLists: a.todoLists?.length || 0,
        })),
        null,
        2
      )
    );

    // Debug: Log todos with their document status
    clientAgreements.forEach(a => {
      a.todoLists?.forEach((list: any) => {
        list.todos?.forEach((todo: any) => {
          console.log(
            '[ClientAPI] Todo raw data:',
            todo.id,
            todo.title,
            'status:',
            todo.status,
            'document:',
            JSON.stringify(todo.document || 'NONE')
          );
        });
      });
    });

    if (!Array.isArray(clientAgreements) || clientAgreements.length === 0) {
      return [];
    }

    // Map backend agreement format to client format
    const agreements: ClientAgreement[] = await Promise.all(
      clientAgreements.map(async a => {
        // Use backend status directly (new enum-based status)
        const status = a.status as AgreementStatus;

        // Parse signature metadata from description (workaround until backend has proper fields)
        const signatureData = parseSignatureMetadata(a.description);

        // Get ceremony URL - try multiple sources
        let ceremonyUrl = a.signatureCeremonyUrl || signatureData.ceremonyUrl;
        let envelopeId = a.signatureEnvelopeId || signatureData.envelopeId;
        let recipientId = a.signatureRecipientId || signatureData.recipientId;

        // If we have an envelope ID but no ceremony URL, try to get or create one
        if (
          !ceremonyUrl &&
          envelopeId &&
          recipientId &&
          status === AgreementStatus.PENDING_SIGNATURE
        ) {
          try {
            const envelopeDetails = await getEnvelopeDetails(envelopeId);
            const recipient = envelopeDetails?.recipients?.find(r => r.id === recipientId);

            if (recipient?.ceremony?.url) {
              ceremonyUrl = recipient.ceremony.url;
            } else {
              const embeddedUrl = await createEmbeddedCeremonyUrl(envelopeId, recipientId);
              if (embeddedUrl) ceremonyUrl = embeddedUrl;
            }
          } catch {
            // Silently continue to fallback
          }
        }

        // FALLBACK: If still no ceremonyUrl and status is pending signature, search by email
        if (!ceremonyUrl && status === AgreementStatus.PENDING_SIGNATURE) {
          try {
            const cookieStore = await cookies();
            const userCookie = cookieStore.get('user')?.value;
            let userEmail: string | null = null;

            if (userCookie) {
              try {
                const userData = JSON.parse(userCookie);
                userEmail = userData.email;
              } catch {
                // ignore parse error
              }
            }

            if (userEmail) {
              const envelopeMatch = await getRecentEnvelopeForEmail(userEmail);

              if (envelopeMatch) {
                envelopeId = envelopeMatch.envelopeId;
                recipientId = envelopeMatch.recipientId;

                const newCeremony = await createCeremonyForRecipient({
                  recipientId: envelopeMatch.recipientId,
                  redirectUrl: 'https://ariex-web-nine.vercel.app/client/onboarding?signed=true',
                });

                if (newCeremony?.ceremonyUrl) ceremonyUrl = newCeremony.ceremonyUrl;
              }
            }
          } catch {
            // Silently fail fallback
          }
        }

        return {
          id: a.id,
          title: a.name || a.title || 'Service Agreement',
          name: a.name,
          description: signatureData.cleanDescription, // Use clean description without metadata
          status,
          price: a.price,
          strategistId: a.strategistId,
          signatureEnvelopeId: envelopeId,
          signatureRecipientId: recipientId,
          signatureCeremonyUrl: ceremonyUrl,
          signedDocumentFileId: a.signedDocumentFileId, // S3 file ID for signed PDF
          contractDocumentId: a.contractDocumentId,
          paymentRef: a.paymentRef,
          paymentAmount: a.paymentAmount,
          paymentStatus: a.paymentStatus,
          paymentLink: a.paymentLink,
          signedAt: a.signedAt,
          paidAt: a.paidAt,
          todoLists: a.todoLists || [],
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        };
      })
    );

    // console.log('[ClientAPI] Mapped agreements:', agreements);
    return agreements;
  } catch {
    return [];
  }
}

/**
 * Get specific agreement by ID
 */
export async function getAgreementById(agreementId: string): Promise<ClientAgreement | null> {
  try {
    const agreement = await apiRequest<ClientAgreement>(`/agreements/${agreementId}`);
    return agreement;
  } catch {
    return null;
  }
}

/**
 * Get agreement status
 */
export async function getAgreementStatus(agreementId: string): Promise<{ status: string } | null> {
  try {
    const status = await apiRequest<{ status: string }>(`/agreements/${agreementId}/status`);
    return status;
  } catch {
    return null;
  }
}

// ============================================================================
// Documents API
// ============================================================================

/**
 * Get all documents for current client
 */
export async function getClientDocuments(): Promise<ClientDocument[]> {
  try {
    const documents = await apiRequest<ClientDocument[]>('/documents');
    console.log(
      '[ClientAPI] getClientDocuments:',
      JSON.stringify(
        documents?.map(d => ({
          id: d.id,
          name: d.name,
          type: d.type,
          todoId: d.todoId || 'NONE',
          uploadStatus: d.uploadStatus,
        })),
        null,
        2
      )
    );
    return Array.isArray(documents) ? documents : [];
  } catch {
    return [];
  }
}

/**
 * Get presigned upload URL for document upload
 */
export async function getDocumentUploadUrl(data: {
  fileName: string;
  contentType: string;
}): Promise<{ uploadUrl: string; fileId: string } | null> {
  try {
    const result = await apiRequest<{ uploadUrl: string; fileId: string }>('/s3/upload-url', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result;
  } catch {
    return null;
  }
}

/**
 * Confirm file upload completion
 */
export async function confirmDocumentUpload(fileId: string): Promise<boolean> {
  try {
    await apiRequest(`/s3/confirm/${fileId}`, { method: 'POST' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create document record after upload
 */
export async function createDocument(data: {
  name: string;
  type: string;
  fileId: string;
  category?: string;
}): Promise<ClientDocument | null> {
  try {
    const document = await apiRequest<ClientDocument>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return document;
  } catch {
    return null;
  }
}

/**
 * Get presigned download URL for a document
 * Can accept either a fileId (S3 key) or documentId (database record)
 */
export async function getDocumentDownloadUrl(fileIdOrDocId: string): Promise<string | null> {
  try {
    console.log('[ClientAPI] Getting download URL for document:', fileIdOrDocId);
    const doc = await apiRequest<{
      id: string;
      files?: Array<{ downloadUrl?: string; url?: string; id?: string; key?: string }>;
      downloadUrl?: string;
      url?: string;
    }>(`/documents/${fileIdOrDocId}`);
    console.log('[ClientAPI] Document response:', JSON.stringify(doc, null, 2));

    // Try multiple possible locations for the download URL
    const downloadUrl =
      doc.files?.[0]?.downloadUrl || doc.files?.[0]?.url || doc.downloadUrl || doc.url || null;

    console.log('[ClientAPI] Download URL:', downloadUrl);
    return downloadUrl;
  } catch (error) {
    console.error('[ClientAPI] Failed to get download URL:', error);
    return null;
  }
}

/**
 * Sync agreement signature status from SignatureAPI
 * This is called when the dashboard detects a signed document but backend hasn't been updated
 * (fallback for when webhook didn't fire or failed)
 */
export async function syncAgreementSignatureStatus(
  agreementId: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    // Get the agreement to find the envelope ID
    const agreements = await getClientAgreements();
    const agreement = agreements.find(a => a.id === agreementId);

    if (!agreement) {
      return { success: false, error: 'Agreement not found' };
    }

    // Get envelope ID from agreement metadata
    const envelopeId = agreement.signatureEnvelopeId;
    if (!envelopeId) {
      return { success: false, error: 'No envelope ID found for agreement' };
    }

    // Check SignatureAPI for actual envelope status
    const envelopeDetails = await getEnvelopeDetails(envelopeId);

    if (!envelopeDetails) {
      return { success: false, error: 'Could not get envelope details from SignatureAPI' };
    }

    // Only advance to PENDING_PAYMENT when the envelope is fully completed
    // (all signers have signed). With dual signing (client + strategist), the
    // envelope stays in_progress until both finish. Individual recipient status
    // of "completed" is NOT enough — we need ALL parties to have signed.
    const isEnvelopeCompleted = envelopeDetails.status === 'completed';

    if (isEnvelopeCompleted) {
      let documentSignSuccess = false;
      let agreementUpdateSuccess = false;

      // Try mark document as signed
      if (agreement.contractDocumentId) {
        try {
          await apiRequest(`/documents/${agreement.contractDocumentId}/sign`, { method: 'POST' });
          documentSignSuccess = true;
        } catch {
          try {
            await apiRequest(`/documents/${agreement.contractDocumentId}`, {
              method: 'PUT',
              body: JSON.stringify({ signedStatus: 'SIGNED' }),
            });
            documentSignSuccess = true;
          } catch {
            // Continue to agreement update
          }
        }
      }

      // Try mark agreement as signed - update to PENDING_PAYMENT status
      try {
        await updateAgreementStatus(agreementId, AgreementStatus.PENDING_PAYMENT);
        agreementUpdateSuccess = true;
      } catch {
        // Fallback: try old endpoints
        try {
          await apiRequest(`/agreements/${agreementId}/sign`, { method: 'POST' });
          agreementUpdateSuccess = true;
        } catch {
          try {
            await apiRequest(`/agreements/${agreementId}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: AgreementStatus.PENDING_PAYMENT }),
            });
            agreementUpdateSuccess = true;
          } catch {
            // Failed
          }
        }
      }

      const success = documentSignSuccess || agreementUpdateSuccess;
      console.log(`✅ Sync: ${success ? '✓' : '✗'} agreement=${agreementId}`);

      return {
        success,
        status: 'signed',
        error: !success ? 'Failed to update backend' : undefined,
      };
    }

    // Return the actual status for debugging
    return { success: true, status: envelopeDetails.status };
  } catch {
    return { success: false, error: 'Failed to sync status' };
  }
}

/**
 * Sync strategy signature status from SignatureAPI
 * Called when client is redirected back after signing the strategy document
 * Updates agreement status from PENDING_STRATEGY to PENDING_STRATEGY_REVIEW
 * (Strategist will manually complete it by clicking "Finish Agreement")
 */
export async function syncStrategySignatureStatus(
  envelopeId: string
): Promise<{ success: boolean; agreementId?: string; error?: string }> {
  try {
    console.log('[API] Syncing strategy signature for envelope:', envelopeId);

    // Verify with SignatureAPI that the envelope is completed
    const envelopeDetails = await getEnvelopeDetails(envelopeId);

    if (!envelopeDetails) {
      return { success: false, error: 'Could not get envelope details from SignatureAPI' };
    }

    console.log('[API] Envelope status:', envelopeDetails.status);

    // Check if envelope is completed
    const isEnvelopeCompleted = envelopeDetails.status === 'completed';
    const clientRecipient = envelopeDetails.recipients?.find(
      r => r.key === 'client' || r.type === 'signer'
    );
    const isRecipientCompleted = clientRecipient?.status === 'completed';

    if (!isEnvelopeCompleted && !isRecipientCompleted) {
      return { success: false, error: `Envelope not completed. Status: ${envelopeDetails.status}` };
    }

    // Find the agreement that has this strategy envelope ID
    // The envelope ID is stored in the agreement's description as metadata
    const agreements = await getClientAgreements();

    // Find agreement with matching strategy envelope ID in its metadata
    const targetAgreement = agreements.find(a => {
      // Check if description contains strategy metadata with this envelope ID
      if (a.description?.includes('__STRATEGY_METADATA__')) {
        try {
          const metadataStr = a.description.split('__STRATEGY_METADATA__:')[1];
          const metadata = JSON.parse(metadataStr);
          return metadata.strategyEnvelopeId === envelopeId;
        } catch {
          return false;
        }
      }
      return false;
    });

    if (!targetAgreement) {
      console.error('[API] No agreement found with strategy envelope ID:', envelopeId);
      return { success: false, error: 'Agreement not found for this envelope' };
    }

    console.log(
      '[API] Found agreement:',
      targetAgreement.id,
      'Current status:',
      targetAgreement.status
    );

    // Update agreement status to PENDING_STRATEGY_REVIEW (client signed, strategist reviews)
    // Strategist will manually complete it by clicking "Finish Agreement"
    try {
      await updateAgreementStatus(targetAgreement.id, AgreementStatus.PENDING_STRATEGY_REVIEW);
      console.log('[API] ✅ Agreement updated to PENDING_STRATEGY_REVIEW:', targetAgreement.id);
      return { success: true, agreementId: targetAgreement.id };
    } catch (updateError) {
      console.error('[API] Failed to update agreement status:', updateError);

      // Try fallback with PATCH
      try {
        await apiRequest(`/agreements/${targetAgreement.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: AgreementStatus.PENDING_STRATEGY_REVIEW }),
        });
        console.log(
          '[API] ✅ Agreement updated to PENDING_STRATEGY_REVIEW (via PATCH):',
          targetAgreement.id
        );
        return { success: true, agreementId: targetAgreement.id };
      } catch {
        return {
          success: false,
          agreementId: targetAgreement.id,
          error: 'Failed to update agreement status',
        };
      }
    }
  } catch (error) {
    console.error('[API] Failed to sync strategy signature:', error);
    return { success: false, error: 'Failed to sync strategy signature status' };
  }
}

// ============================================================================
// Charges API (for payments)
// ============================================================================

export interface ClientCharge {
  id: string;
  agreementId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled' | 'failed';
  description?: string;
  paymentLink?: string;
  paymentIntentId?: string;
  checkoutSessionId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Update agreement status
 * Used for status transitions in the agreement lifecycle
 */
export async function updateAgreementStatus(
  agreementId: string,
  status: AgreementStatus
): Promise<boolean> {
  try {
    console.log('[ClientAPI] Updating agreement status:', agreementId, '→', status);
    await apiRequest(`/agreements/${agreementId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    console.log('[ClientAPI] Agreement status updated successfully');
    return true;
  } catch (error) {
    console.error('[ClientAPI] Failed to update agreement status:', error);
    return false;
  }
}

/**
 * Get all charges for an agreement
 */
export async function getChargesForAgreement(agreementId: string): Promise<ClientCharge[]> {
  try {
    console.log('[ClientAPI] Fetching charges for agreement:', agreementId);
    const rawCharges = await apiRequest<any[]>(`/charges/agreement/${agreementId}`);
    console.log('[ClientAPI] Charges response:', JSON.stringify(rawCharges, null, 2));

    // Map backend fields to frontend interface
    const charges: ClientCharge[] = rawCharges.map(c => ({
      id: c.id,
      agreementId: c.agreementId,
      amount: c.amountCents ? c.amountCents / 100 : c.amount || 0,
      currency: c.currency || 'usd',
      status: c.status,
      description: c.description,
      paymentLink: c.paymentLink,
      paymentIntentId: c.stripePaymentIntentId || c.paymentIntentId,
      checkoutSessionId: c.stripeCheckoutSessionId || c.checkoutSessionId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return charges;
  } catch (err) {
    console.error('[ClientAPI] Failed to fetch charges:', err);
    return [];
  }
}

/**
 * Generate payment link for a charge (Stripe checkout URL)
 * This is called by the CLIENT to get their payment link
 * @param chargeId - The charge ID to generate a payment link for
 * @param options - Optional success/cancel URLs and customer email for Stripe
 */
export async function generatePaymentLink(
  chargeId: string,
  options?: {
    successUrl?: string;
    cancelUrl?: string;
    customerEmail?: string;
  }
): Promise<string | null> {
  try {
    // Build the base URL - use window.location.origin on client, fallback for SSR
    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || 'https://ariex-web-nine.vercel.app';

    const body: Record<string, string> = {
      url: baseUrl,
      successUrl: options?.successUrl || `${baseUrl}/client/onboarding?payment=success`,
      cancelUrl: options?.cancelUrl || `${baseUrl}/client/onboarding?payment=cancel`,
    };

    // Add customer email if provided (pre-fills Stripe Checkout)
    if (options?.customerEmail) {
      body.customerEmail = options.customerEmail;
    }

    const result = await apiRequest<{ paymentLink: string; url?: string }>(
      `/charges/${chargeId}/payment-link`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
    return result.paymentLink || result.url || null;
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// Dashboard Aggregated Data
// ============================================================================

/**
 * Get all data needed for client dashboard
 * Fetches user, profile, agreements, documents, and todos in parallel
 */
export async function getClientDashboardData(): Promise<ClientDashboardData | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId || userId === 'unknown') {
      // console.log('[ClientAPI] No user ID for dashboard data');
      return null;
    }

    // Fetch all data in parallel
    const [user, profile, agreements, documents] = await Promise.all([
      getCurrentClientUser(),
      getClientProfile(),
      getClientAgreements(),
      getClientDocuments(),
    ]);

    if (!user) {
      // console.log('[ClientAPI] No user found for dashboard');
      return null;
    }

    // Get strategist info if assigned
    let strategist = null;
    if (user.strategists && user.strategists.length > 0) {
      try {
        const strategistUser = await apiRequest<{
          id: string;
          fullName?: string;
          email: string;
        }>(`/users/${user.strategists[0]}`);

        strategist = {
          id: strategistUser.id,
          name: strategistUser.fullName || 'Your Strategist',
          email: strategistUser.email,
        };
      } catch (e) {
        // console.log('[ClientAPI] Could not fetch strategist info');
      }
    }

    // =========================================================================
    // MERGE documents into todos
    // The backend doesn't include document relation on todos when fetching
    // agreements, so we merge them here based on todoId
    // =========================================================================
    const documentsByTodoId = new Map<string, ClientDocument>();
    for (const doc of documents) {
      if (doc.todoId) {
        documentsByTodoId.set(doc.todoId, doc);
      }
    }

    // Attach documents to todos in agreements
    for (const agreement of agreements) {
      if (agreement.todoLists) {
        for (const todoList of agreement.todoLists) {
          if (todoList.todos) {
            for (const todo of todoList.todos) {
              const matchingDoc = documentsByTodoId.get(todo.id);
              if (matchingDoc) {
                // Attach document info to todo (including acceptanceStatus)
                todo.document = {
                  id: matchingDoc.id,
                  uploadStatus: matchingDoc.uploadStatus || 'PENDING',
                  acceptanceStatus: matchingDoc.acceptanceStatus,
                  files: matchingDoc.files,
                };
                console.log(
                  '[ClientAPI] Merged document into todo:',
                  todo.id,
                  todo.title,
                  'uploadStatus:',
                  matchingDoc.uploadStatus,
                  'acceptanceStatus:',
                  matchingDoc.acceptanceStatus
                );
              }
            }
          }
        }
      }
    }

    return {
      user,
      profile,
      strategist,
      agreements,
      documents,
      todos: [], // Todos removed - always empty
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Onboarding Status Helper
// ============================================================================

export interface OnboardingStatus {
  accountCreated: boolean;
  agreementSent: boolean;
  agreementSigned: boolean;
  paymentSent: boolean;
  paymentReceived: boolean;
  documentsRequested: boolean;
  documentsUploaded: boolean;
  strategySent: boolean;
  strategySigned: boolean;
  isOnboardingComplete: boolean;
  currentStep: 'agreement' | 'payment' | 'documents' | 'strategy' | 'complete';
}

// ============================================================================
// Signed Document URL
// ============================================================================

/**
 * Get the URL for a signed document from SignatureAPI
 * This is used to display signed agreements to clients
 */
export async function getSignedAgreementUrl(envelopeId: string): Promise<string | null> {
  try {
    // This calls the server-side SignatureAPI function
    const url = await getSignedDocumentUrl(envelopeId);
    return url;
  } catch {
    return null;
  }
}

/**
 * Get the signed document URL.
 * IMPORTANT: Always prefers SignatureAPI deliverables (guaranteed to be the
 * actual signed PDF with embedded signatures). Only falls back to S3 if
 * SignatureAPI is unavailable, since S3 may contain the unsigned original.
 */
export async function getSignedDocumentDownloadUrl(
  signedDocumentFileId: string | null | undefined,
  envelopeId: string | null | undefined
): Promise<string | null> {
  // Strategy 1 (preferred): SignatureAPI deliverables — always the signed PDF
  if (envelopeId) {
    try {
      const signatureUrl = await getSignedDocumentUrl(envelopeId);
      if (signatureUrl) return signatureUrl;
    } catch {
      // Fall through to S3
    }
  }

  // Strategy 2 (fallback): S3 file ID stored by webhook after signing
  // NOTE: Only used when SignatureAPI deliverables are unavailable
  if (signedDocumentFileId) {
    try {
      const s3Url = await getDocumentDownloadUrl(signedDocumentFileId);
      if (s3Url) return s3Url;
    } catch {
      // No signed document available
    }
  }

  return null;
}

/**
 * Calculate onboarding status from dashboard data
 * Note: This is a pure utility function, not a server action
 */
function calculateOnboardingStatus(data: ClientDashboardData): OnboardingStatus {
  const { agreements, documents, profile } = data;

  // Find service agreement
  const serviceAgreement = agreements.find(
    a => a.type === 'service_agreement' || a.type === 'onboarding'
  );

  // Find strategy document
  const strategyDoc = documents.find(d => d.type === 'strategy' || d.category === 'strategy');

  // Check uploaded documents (excluding agreements/strategies)
  const uploadedDocs = documents.filter(
    d => d.type !== 'agreement' && d.type !== 'strategy' && d.category !== 'contract'
  );

  // Calculate payment received first using helper function
  const paymentReceived = serviceAgreement ? isAgreementPaid(serviceAgreement.status) : false;

  const status: OnboardingStatus = {
    accountCreated: true, // Always true if we have data
    agreementSent: serviceAgreement
      ? serviceAgreement.status === AgreementStatus.PENDING_SIGNATURE ||
        isAgreementSigned(serviceAgreement.status)
      : false,
    agreementSigned: serviceAgreement ? isAgreementSigned(serviceAgreement.status) : false,
    paymentSent: !!serviceAgreement?.paymentReference,
    paymentReceived,
    documentsRequested: paymentReceived, // Docs requested after payment
    documentsUploaded: uploadedDocs.length > 0,
    strategySent:
      strategyDoc?.signatureStatus === 'SENT' || strategyDoc?.signatureStatus === 'SIGNED',
    strategySigned: strategyDoc?.signatureStatus === 'SIGNED',
    isOnboardingComplete: profile?.onboardingComplete || false,
    currentStep: 'agreement',
  };

  // Determine current step
  if (status.strategySigned) {
    status.currentStep = 'complete';
  } else if (status.documentsUploaded) {
    status.currentStep = 'strategy';
  } else if (status.paymentReceived) {
    status.currentStep = 'documents';
  } else if (status.agreementSigned) {
    status.currentStep = 'payment';
  } else {
    status.currentStep = 'agreement';
  }

  return status;
}

// ============================================================================
// Document Upload for Todo
// ============================================================================

/**
 * Upload document for a todo
 * Creates document, uploads to S3, and confirms upload
 * If existingDocumentId is provided (re-upload after decline), replaces the file instead
 */
export async function uploadDocumentForTodo(data: {
  todoId: string;
  agreementId: string;
  strategistId: string;
  fileName: string;
  mimeType: string;
  size: number;
  fileContent: string; // Base64 encoded file content
  existingDocumentId?: string; // For re-upload after decline
}): Promise<{ success: boolean; documentId?: string; error?: string }> {
  try {
    console.log('[ClientAPI] Uploading document for todo:', {
      todoId: data.todoId,
      fileName: data.fileName,
      strategistId: data.strategistId,
      isReupload: !!data.existingDocumentId,
    });

    let documentId: string;
    let uploadUrl: string;

    if (data.existingDocumentId) {
      // Re-upload: Replace file on existing document
      console.log('[ClientAPI] Re-uploading to existing document:', data.existingDocumentId);
      const replaceResult = await apiRequest<{
        uploadUrl: string;
      }>(`/documents/${data.existingDocumentId}/replace-file`, {
        method: 'POST',
        body: JSON.stringify({
          fileName: data.fileName,
          mimeType: data.mimeType,
          size: data.size,
        }),
      });
      documentId = data.existingDocumentId;
      uploadUrl = replaceResult.uploadUrl;
      console.log('[ClientAPI] Got replace URL for document:', documentId);
    } else {
      // New upload: Create document with todoId
      const createResult = await apiRequest<{
        id: string;
        uploadUrl: string;
        files: Array<{ id: string }>;
      }>('/documents', {
        method: 'POST',
        body: JSON.stringify({
          type: 'KYC',
          fileName: data.fileName,
          mimeType: data.mimeType,
          size: data.size,
          todoId: data.todoId,
          agreementId: data.agreementId,
          strategistId: data.strategistId,
        }),
      });
      documentId = createResult.id;
      uploadUrl = createResult.uploadUrl;
      console.log('[ClientAPI] Document created:', documentId);
    }

    // 2. Upload file to S3 using presigned URL
    const fileBuffer = Buffer.from(data.fileContent, 'base64');
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: fileBuffer,
      headers: {
        'Content-Type': data.mimeType,
      },
    });

    if (!uploadResponse.ok) {
      console.error('[ClientAPI] S3 upload failed:', uploadResponse.status);
      return { success: false, error: 'Failed to upload file to storage' };
    }

    console.log('[ClientAPI] File uploaded to S3');

    // 3. Confirm upload
    await apiRequest(`/documents/${documentId}/confirm-file`, {
      method: 'POST',
    });

    console.log('[ClientAPI] Upload confirmed');

    // 4. If this was a re-upload, reset acceptance status to REQUEST_STRATEGIST_ACCEPTANCE
    if (data.existingDocumentId) {
      try {
        await apiRequest(`/documents/${documentId}`, {
          method: 'PATCH',
          body: JSON.stringify({ acceptanceStatus: 'REQUEST_STRATEGIST_ACCEPTANCE' }),
        });
        console.log(
          '[ClientAPI] Set acceptance status to REQUEST_STRATEGIST_ACCEPTANCE after re-upload'
        );
      } catch (e) {
        console.log('[ClientAPI] Could not set acceptance status (backend may handle it)');
      }
    }

    return { success: true, documentId };
  } catch (error) {
    console.error('[ClientAPI] Failed to upload document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload document',
    };
  }
}
