'use server';

import { API_URL } from '@/lib/cognito-config';
import { cookies } from 'next/headers';
import { getEnvelopeDetails, createEmbeddedCeremonyUrl, getRecentEnvelopeForEmail, createCeremonyForRecipient, getSignedDocumentUrl } from '@/lib/signature/signatureapi';

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
  status:
    | 'draft'
    | 'pending'
    | 'sent'
    | 'signed'
    | 'completed'
    | 'declined'
    | 'expired'
    | 'cancelled';
  price?: string | number;
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
        signedStatus: string;
        uploadStatus: string;
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
  } catch (error) {
    console.error('[ClientAPI] Failed to get current user:', error);
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
  } catch (error) {
    console.error('[ClientAPI] Failed to update client profile:', error);
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
    const rawAgreements = await apiRequest<any[]>('/agreements');
    // console.log('[ClientAPI] Raw agreements from backend:', JSON.stringify(rawAgreements, null, 2));

    if (!Array.isArray(rawAgreements)) {
      return [];
    }

    // Map backend agreement format to client format
    const agreements: ClientAgreement[] = await Promise.all(
      rawAgreements.map(async a => {
        console.log('[ClientAPI] Processing agreement:', a.id, 'raw data:', JSON.stringify(a, null, 2));
        // Map backend status to client-friendly status
        let status: ClientAgreement['status'] = 'draft';
        const backendStatus = a.status?.toUpperCase();

        if (backendStatus === 'DRAFT') {
          // DRAFT = sent but not signed yet = pending
          status = 'pending';
        } else if (backendStatus === 'ACTIVE') {
          // ACTIVE = signed
          status = 'signed';
        } else if (backendStatus === 'COMPLETED') {
          status = 'completed';
        } else if (backendStatus === 'CANCELLED') {
          status = 'cancelled';
        } else if (backendStatus === 'ARCHIVED') {
          status = 'cancelled';
        }

        // Parse signature metadata from description (workaround until backend has proper fields)
        const signatureData = parseSignatureMetadata(a.description);
        console.log('[ClientAPI] Parsed signature data for agreement', a.id, ':', signatureData);

        // Get ceremony URL - try multiple sources
        let ceremonyUrl = a.signatureCeremonyUrl || signatureData.ceremonyUrl;
        let envelopeId = a.signatureEnvelopeId || signatureData.envelopeId;
        let recipientId = a.signatureRecipientId || signatureData.recipientId;

        console.log('[ClientAPI] Initial ceremony data:', { ceremonyUrl, envelopeId, recipientId });

        // If we have an envelope ID but no ceremony URL, try to get or create one
        if (!ceremonyUrl && envelopeId && recipientId && status === 'pending') {
          console.log('[ClientAPI] Fetching ceremony URL from SignatureAPI for envelope:', envelopeId);
          try {
            // First try to get existing ceremony URL from envelope
            const envelopeDetails = await getEnvelopeDetails(envelopeId);
            const recipient = envelopeDetails?.recipients?.find(r => r.id === recipientId);
            
            if (recipient?.ceremony?.url) {
              ceremonyUrl = recipient.ceremony.url;
              console.log('[ClientAPI] Got ceremony URL from envelope:', ceremonyUrl);
            } else {
              // If no URL exists, create a new ceremony for the recipient
              console.log('[ClientAPI] No ceremony URL found, creating ceremony...');
              const embeddedUrl = await createEmbeddedCeremonyUrl(envelopeId, recipientId);
              if (embeddedUrl) {
                ceremonyUrl = embeddedUrl;
                console.log('[ClientAPI] Created ceremony URL:', ceremonyUrl);
              }
            }
          } catch (error) {
            console.error('[ClientAPI] Failed to get/create ceremony URL from SignatureAPI:', error);
          }
        }

        // FALLBACK: If still no ceremonyUrl and status is pending, search by email
        if (!ceremonyUrl && status === 'pending') {
          console.log('[ClientAPI] Trying fallback: search SignatureAPI by email');
          try {
            // Get current user's email from cookie
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
              console.log('[ClientAPI] Searching envelope for email:', userEmail);
              const envelopeMatch = await getRecentEnvelopeForEmail(userEmail);
              
              if (envelopeMatch) {
                console.log('[ClientAPI] Found envelope by email:', envelopeMatch.envelopeId);
                envelopeId = envelopeMatch.envelopeId;
                recipientId = envelopeMatch.recipientId;
                
                // Create ceremony for this recipient
                const newCeremonyUrl = await createCeremonyForRecipient(
                  envelopeMatch.envelopeId,
                  envelopeMatch.recipientId,
                  'http://localhost:3000/client/agreements?signed=true'
                );
                
                if (newCeremonyUrl) {
                  ceremonyUrl = newCeremonyUrl;
                  console.log('[ClientAPI] Created ceremony URL from email search:', ceremonyUrl);
                }
              }
            }
          } catch (error) {
            console.error('[ClientAPI] Email search fallback failed:', error);
          }
        }

        console.log('[ClientAPI] Final ceremony URL for agreement', a.id, ':', ceremonyUrl);

        return {
          id: a.id,
          title: a.name || a.title || 'Service Agreement',
          name: a.name,
          description: signatureData.cleanDescription, // Use clean description without metadata
          status,
          price: a.price,
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
  } catch (error) {
    console.error('[ClientAPI] Failed to get agreements:', error);
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
  } catch (error) {
    console.error('[ClientAPI] Failed to get agreement:', error);
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
  } catch (error) {
    console.error('[ClientAPI] Failed to get agreement status:', error);
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
    // console.log('[ClientAPI] getClientDocuments:', documents);
    return Array.isArray(documents) ? documents : [];
  } catch (error) {
    console.error('[ClientAPI] Failed to get documents:', error);
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
  } catch (error) {
    console.error('[ClientAPI] Failed to get upload URL:', error);
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
  } catch (error) {
    console.error('[ClientAPI] Failed to confirm upload:', error);
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
  } catch (error) {
    console.error('[ClientAPI] Failed to create document:', error);
    return null;
  }
}

/**
 * Get presigned download URL for a document
 * Can accept either a fileId (S3 key) or documentId (database record)
 */
export async function getDocumentDownloadUrl(fileIdOrDocId: string): Promise<string | null> {
  try {
    // Fetch document by ID - this returns files with downloadUrl
    console.log('[ClientAPI] Getting document download URL for:', fileIdOrDocId);
    const doc = await apiRequest<{
      id: string;
      files?: Array<{ downloadUrl?: string; id?: string; key?: string }>;
    }>(`/documents/${fileIdOrDocId}`);
    
    console.log('[ClientAPI] Document response:', JSON.stringify(doc, null, 2));
    
    // The API returns files with downloadUrl already populated
    if (doc.files?.[0]?.downloadUrl) {
      console.log('[ClientAPI] Found downloadUrl in files:', doc.files[0].downloadUrl);
      return doc.files[0].downloadUrl;
    }
    
    console.log('[ClientAPI] No downloadUrl found in document files');
    return null;
  } catch (error) {
    console.error('[ClientAPI] Failed to get download URL:', error);
    return null;
  }
}

// ============================================================================
// Todos API
// ============================================================================

/**
 * Get all todos for current client
 */
export async function getClientTodos(): Promise<ClientTodo[]> {
  try {
    const todos = await apiRequest<ClientTodo[]>('/todos');
    // console.log('[ClientAPI] getClientTodos:', todos);
    return Array.isArray(todos) ? todos : [];
  } catch (error) {
    // console.error('[ClientAPI] Failed to get todos:', error);
    return [];
  }
}

/**
 * Update todo status (mark as complete)
 */
export async function updateTodoStatus(
  todoId: string,
  status: 'pending' | 'in_progress' | 'completed'
): Promise<ClientTodo | null> {
  try {
    console.log('[ClientAPI] Updating todo:', todoId, 'to status:', status);
    const todo = await apiRequest<ClientTodo>(`/todos/${todoId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    console.log('[ClientAPI] Todo updated successfully:', todo);
    return todo;
  } catch (error) {
    console.error('[ClientAPI] Failed to update todo:', todoId, 'Error:', error);
    return null;
  }
}

/**
 * Mark onboarding todos (Sign + Pay) as completed
 * Called after client finishes onboarding flow
 */
export async function markOnboardingTodosComplete(): Promise<{ success: boolean; error?: string }> {
  try {
    // Get all agreements to find todos
    const agreements = await getClientAgreements();
    if (!agreements || agreements.length === 0) {
      console.log('[ClientAPI] No agreements found for marking todos complete');
      return { success: false, error: 'No agreements found' };
    }

    const serviceAgreement = agreements[0];
    const todos = serviceAgreement?.todoLists?.flatMap(list => list.todos || []) || [];
    console.log('[ClientAPI] Found todos:', todos.map(t => ({ id: t.id, title: t.title, status: t.status })));

    // Find sign and pay todos
    const signTodo = todos.find(t => 
      t.title.toLowerCase().includes('sign') && t.title.toLowerCase().includes('agreement')
    );
    const payTodo = todos.find(t => 
      t.title.toLowerCase() === 'pay' || t.title.toLowerCase().includes('payment')
    );

    console.log('[ClientAPI] Sign todo found:', signTodo ? { id: signTodo.id, title: signTodo.title, status: signTodo.status } : 'NOT FOUND');
    console.log('[ClientAPI] Pay todo found:', payTodo ? { id: payTodo.id, title: payTodo.title, status: payTodo.status } : 'NOT FOUND');

    let signUpdated = false;
    let payUpdated = false;

    // Mark sign todo as completed
    if (signTodo && signTodo.status !== 'completed') {
      const result = await updateTodoStatus(signTodo.id, 'completed');
      signUpdated = !!result;
      console.log('[ClientAPI] Sign todo marked complete:', signUpdated);
    } else if (signTodo?.status === 'completed') {
      signUpdated = true;
      console.log('[ClientAPI] Sign todo already completed');
    }

    // Mark pay todo as completed
    if (payTodo && payTodo.status !== 'completed') {
      const result = await updateTodoStatus(payTodo.id, 'completed');
      payUpdated = !!result;
      console.log('[ClientAPI] Pay todo marked complete:', payUpdated);
    } else if (payTodo?.status === 'completed') {
      payUpdated = true;
      console.log('[ClientAPI] Pay todo already completed');
    }

    return { 
      success: signUpdated || payUpdated,
      error: (!signUpdated && !payUpdated) ? 'No todos were updated' : undefined
    };
  } catch (error) {
    console.error('[ClientAPI] Failed to mark onboarding todos complete:', error);
    return { success: false, error: 'Failed to update todos' };
  }
}

/**
 * Sync agreement signature status from SignatureAPI
 * This is called when the dashboard detects a signed document but backend hasn't been updated
 * (fallback for when webhook didn't fire or failed)
 */
export async function syncAgreementSignatureStatus(agreementId: string): Promise<{ success: boolean; status?: string; error?: string }> {
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
    console.log('[ClientAPI] Envelope status from SignatureAPI:', envelopeDetails?.status);

    if (!envelopeDetails) {
      return { success: false, error: 'Could not get envelope details from SignatureAPI' };
    }

    // If envelope is completed, update backend
    if (envelopeDetails.status === 'completed') {
      console.log('[ClientAPI] Envelope is COMPLETED - syncing to backend');
      
      // Try to update agreement status to ACTIVE (signed)
      const updateResult = await apiRequest(`/agreements/${agreementId}`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          status: 'ACTIVE',
          signedAt: new Date().toISOString(),
        }),
      }).catch(() => null);

      // Also try to mark the document as signed
      if (agreement.contractDocumentId) {
        await apiRequest(`/documents/${agreement.contractDocumentId}/sign`, {
          method: 'POST',
        }).catch((e) => console.log('[ClientAPI] Document sign endpoint failed:', e));
      }

      // Also mark the "Sign service agreement" todo as complete
      const todos = agreement.todoLists?.flatMap(list => list.todos || []) || [];
      const signTodo = todos.find(t => 
        t.title.toLowerCase().includes('sign') && t.title.toLowerCase().includes('agreement')
      );
      if (signTodo && signTodo.status !== 'completed') {
        await updateTodoStatus(signTodo.id, 'completed').catch(() => null);
      }

      return { 
        success: updateResult !== null, 
        status: 'signed',
        error: updateResult === null ? 'Failed to update agreement status in backend' : undefined
      };
    }

    return { success: true, status: envelopeDetails.status };
  } catch (error) {
    console.error('[ClientAPI] Failed to sync agreement status:', error);
    return { success: false, error: 'Failed to sync status' };
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
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all charges for an agreement
 */
export async function getChargesForAgreement(agreementId: string): Promise<ClientCharge[]> {
  try {
    const charges = await apiRequest<ClientCharge[]>(`/charges/agreement/${agreementId}`);
    return charges;
  } catch (error) {
    console.error('[ClientAPI] Failed to get charges for agreement:', error);
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
    const baseUrl = typeof window !== 'undefined' 
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

    const result = await apiRequest<{ paymentLink: string; url?: string }>(`/charges/${chargeId}/payment-link`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    console.log('[ClientAPI] Payment link generated with success/cancel URLs');
    return result.paymentLink || result.url || null;
  } catch (error) {
    console.error('[ClientAPI] Failed to generate payment link:', error);
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
    const [user, profile, agreements, documents, todos] = await Promise.all([
      getCurrentClientUser(),
      getClientProfile(),
      getClientAgreements(),
      getClientDocuments(),
      getClientTodos(),
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

    return {
      user,
      profile,
      strategist,
      agreements,
      documents,
      todos,
    };
  } catch (error) {
    console.error('[ClientAPI] Failed to get dashboard data:', error);
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
  } catch (error) {
    console.error('[ClientAPI] Failed to get signed agreement URL:', error);
    return null;
  }
}

/**
 * Get the signed document URL - tries S3 first (if stored), then SignatureAPI
 * This provides a fallback mechanism for retrieving signed documents
 */
export async function getSignedDocumentDownloadUrl(
  signedDocumentFileId: string | null | undefined,
  envelopeId: string | null | undefined
): Promise<string | null> {
  // Strategy 1: Try S3 file ID if we have it (stored by webhook)
  if (signedDocumentFileId) {
    try {
      const s3Url = await getDocumentDownloadUrl(signedDocumentFileId);
      if (s3Url) {
        console.log('[ClientAPI] Got signed document from S3:', signedDocumentFileId);
        return s3Url;
      }
    } catch (error) {
      console.error('[ClientAPI] Failed to get signed document from S3:', error);
    }
  }

  // Strategy 2: Fallback to SignatureAPI
  if (envelopeId) {
    try {
      const signatureUrl = await getSignedDocumentUrl(envelopeId);
      if (signatureUrl) {
        console.log('[ClientAPI] Got signed document from SignatureAPI:', envelopeId);
        return signatureUrl;
      }
    } catch (error) {
      console.error('[ClientAPI] Failed to get signed document from SignatureAPI:', error);
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

  // Calculate payment received first
  const paymentReceived =
    serviceAgreement?.status === 'completed' ||
    (!!serviceAgreement?.paymentReference && serviceAgreement?.status !== 'pending');

  const status: OnboardingStatus = {
    accountCreated: true, // Always true if we have data
    agreementSent: serviceAgreement?.status === 'sent' || serviceAgreement?.status === 'signed',
    agreementSigned:
      serviceAgreement?.status === 'signed' || serviceAgreement?.status === 'completed',
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
