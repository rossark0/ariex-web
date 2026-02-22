'use server';

import { API_URL } from '@/lib/cognito-config';
import { cookies } from 'next/headers';
import { AgreementStatus, isAgreementSigned } from '@/types/agreement';
import { AcceptanceStatus } from '@/types/document';

// ============================================================================
// Types
// ============================================================================

export interface ApiClient {
  id: string;
  cognitoSub?: string;
  email: string;
  name: string | null;
  fullName?: string | null;
  createdAt: string;
  updatedAt: string;
  status?: string;
  role?: string;
  roles?: { roleType: string }[];
  clients?: string[];
  strategists?: string[];
  clientProfile?: ApiClientProfile;
}

export interface ApiClientProfile {
  id?: string;
  userId?: string;
  phoneNumber?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  taxId?: string;
  businessName?: string;
  onboardingComplete?: boolean;
  filingStatus?: string;
  dependents?: number;
  estimatedIncome?: number;
  businessType?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiDocument {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  signatureStatus?: string;
  signedAt?: string;
  fileId?: string;
  description?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  category?: string;
  mimeType?: string;
  size?: number;
  todoId?: string; // Link to todo if document was uploaded for a todo request
  acceptanceStatus?: AcceptanceStatus; // Compliance/client approval status (used by strategy docs)
}

export interface ApiPayment {
  id: string;
  amount: number;
  status: string;
  type: string;
  createdAt: string;
  paidAt?: string;
}

export interface ApiTodo {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  todoListId: string;
  document?: {
    id: string;
    signedStatus: 'WAITING_SIGNED' | 'SIGNED';
    uploadStatus: 'WAITING_UPLOAD' | 'FILE_UPLOADED' | 'FILE_DELETED';
    acceptanceStatus?: AcceptanceStatus;
    files?: Array<{
      id: string;
      originalName: string;
      downloadUrl?: string;
      mimeType?: string;
      size?: number;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ApiTodoList {
  id: string;
  name: string;
  ownerId: string;
  assignedToId?: string;
  agreementId?: string;
  todos: ApiTodo[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiAgreement {
  id: string;
  name: string;
  description?: string;
  price: string | number;
  status: AgreementStatus;
  clientId: string;
  strategistId: string;
  paymentRef?: string;
  contractDocumentId?: string;
  contractDocument?: {
    id: string;
    signedStatus: 'WAITING_SIGNED' | 'SIGNED';
    uploadStatus: 'WAITING_UPLOAD' | 'FILE_UPLOADED' | 'FILE_DELETED';
  };
  signedDocumentFileId?: string; // S3 file ID for the signed PDF
  todoLists: ApiTodoList[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Legacy fields for backwards compatibility
  title?: string;
  signatureEnvelopeId?: string;
  signatureRecipientId?: string;
  signatureCeremonyUrl?: string;
  strategistRecipientId?: string;
  strategistCeremonyUrl?: string;
  paymentAmount?: number;
  paymentStatus?: 'pending' | 'paid' | 'failed';
  paymentLink?: string;
  signedAt?: string;
  paidAt?: string;
}

// ============================================================================
// Helper
// ============================================================================

async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('ariex_access_token')?.value || null;
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const accessToken = await getAccessToken();

  console.log('[API] Request to', endpoint, '- has token:', !!accessToken);
  if (endpoint === '/s3/upload-url') {
    console.log('[API] Token for curl:', accessToken);
    console.log('[API] curl command:');
    console.log(
      `curl -X POST "${API_URL}/s3/upload-url" -H "Content-Type: application/json" -H "Authorization: Bearer ${accessToken}" -d '${options.body}'`
    );
  }

  if (!accessToken) {
    throw new Error('User not authenticated. Please provide a valid access token.');
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  console.log('[API] Response status:', response.status);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    console.log('[API] Error response:', error);
    throw new Error(error.message || 'Request failed');
  }

  // Handle empty responses (like from DELETE)
  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

// ============================================================================
// Client/User API
// ============================================================================

/**
 * List all clients for the authenticated strategist
 * Uses the /users/my-clients endpoint
 */
export async function listClients(): Promise<ApiClient[]> {
  try {
    const response = await apiRequest<any>('/users/my-clients');

    // Handle both array and paginated response formats
    const clients = Array.isArray(response) ? response : response.data || response.items || [];

    // Map to ApiClient format
    return clients.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.fullName || user.email?.split('@')[0] || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      status: user.status,
      roles: user.role ? [{ roleType: user.role }] : [],
      clientProfile: user.clientProfile
        ? {
            phoneNumber: user.clientProfile.phone,
            address: user.clientProfile.address,
            onboardingComplete: false,
          }
        : undefined,
    }));
  } catch (error) {
    console.error('Failed to list clients:', error);
    return [];
  }
}

/**
 * Get a single client by ID with their profile
 * Fetches both /users/{id} and /users/{userId}/client-profile
 */
export async function getClientById(clientId: string): Promise<ApiClient | null> {
  try {
    // Fetch user data and client profile in parallel
    const [user, profile] = await Promise.all([
      apiRequest<any>(`/users/${clientId}`),
      apiRequest<any>(`/users/${clientId}/client-profile`).catch(() => null),
    ]);

    console.log('[API] getClientById user:', JSON.stringify(user, null, 2));
    console.log('[API] getClientById profile:', JSON.stringify(profile, null, 2));

    return {
      id: user.id,
      cognitoSub: user.cognitoSub,
      email: user.email,
      name: user.fullName || user.email?.split('@')[0] || null,
      fullName: user.fullName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      status: user.status,
      role: user.role,
      clients: user.clients,
      strategists: user.strategists,
      clientProfile: profile
        ? {
            id: profile.id,
            userId: profile.userId,
            phoneNumber: profile.phoneNumber || profile.phone,
            phone: profile.phone || profile.phoneNumber,
            address: profile.address,
            city: profile.city,
            state: profile.state,
            zipCode: profile.zipCode,
            taxId: profile.taxId,
            businessName: profile.businessName,
            onboardingComplete: profile.onboardingComplete,
            filingStatus: profile.filingStatus,
            dependents: profile.dependents,
            estimatedIncome: profile.estimatedIncome,
            businessType: profile.businessType,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
          }
        : undefined,
    };
  } catch (error) {
    console.error('[API] Failed to get client:', error);
    return null;
  }
}

/**
 * Get current user data
 */
export async function getCurrentUser(): Promise<ApiClient | null> {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('ariex_user_id')?.value;

    if (!userId || userId === 'unknown') {
      return null;
    }

    const user = await apiRequest<ApiClient>(`/users/${userId}`);
    return user;
  } catch (error) {
    console.error('[API] Failed to get current user:', error);
    return null;
  }
}

// ============================================================================
// Documents API
// ============================================================================

/**
 * List all documents for current user
 */
export async function listDocuments(): Promise<ApiDocument[]> {
  try {
    const documents = await apiRequest<ApiDocument[]>('/documents');
    return documents;
  } catch (error) {
    console.error('[API] Failed to list documents:', error);
    return [];
  }
}

/**
 * List documents for a specific client
 * @see https://qt4pgrsacn.us-east-2.awsapprunner.com/api#/Documents
 */
export async function listClientDocuments(clientId: string): Promise<ApiDocument[]> {
  try {
    const documents = await apiRequest<ApiDocument[]>(`/documents?clientId=${clientId}`);
    return documents;
  } catch (error) {
    console.error('[API] Failed to list client documents:', error);
    return [];
  }
}

/**
 * List documents for a specific agreement
 * @see https://qt4pgrsacn.us-east-2.awsapprunner.com/api#/Documents
 */
export async function listAgreementDocuments(agreementId: string): Promise<ApiDocument[]> {
  try {
    const documents = await apiRequest<ApiDocument[]>(`/documents?agreementId=${agreementId}`);
    return documents;
  } catch (error) {
    console.error('[API] Failed to list agreement documents:', error);
    return [];
  }
}

/**
 * Get document by ID
 */
export async function getDocumentById(documentId: string): Promise<ApiDocument | null> {
  try {
    const document = await apiRequest<ApiDocument>(`/documents/${documentId}`);
    return document;
  } catch (error) {
    console.error('[API] Failed to get document:', error);
    return null;
  }
}

/**
 * Upload a document
 */
export async function uploadDocument(data: {
  name: string;
  type: string;
  fileId: string;
}): Promise<ApiDocument | null> {
  try {
    const document = await apiRequest<ApiDocument>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return document;
  } catch (error) {
    console.error('[API] Failed to upload document:', error);
    return null;
  }
}

// ============================================================================
// Todo Lists API
// ============================================================================

/**
 * Create a todo list
 * @see https://qt4pgrsacn.us-east-2.awsapprunner.com/api#/Todo%20Lists/TodoListController_create
 */
export async function createTodoList(data: {
  name: string;
  assignedToId?: string;
  agreementId?: string;
}): Promise<{
  id: string;
  name: string;
  agreementId: string | null;
  assignedToId: string | null;
  todos: ApiTodo[];
} | null> {
  try {
    console.log('[API] createTodoList request:', JSON.stringify(data, null, 2));
    const result = await apiRequest<any>('/todo-lists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    console.log('[API] createTodoList response:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('[API] Failed to create todo list:', error);
    return null;
  }
}

/**
 * List todo lists for current user
 */
export async function listTodoLists(): Promise<any[]> {
  try {
    const lists = await apiRequest<any[]>('/todo-lists');
    return lists;
  } catch (error) {
    console.error('[API] Failed to list todo lists:', error);
    return [];
  }
}

// ============================================================================
// Documents API (with S3 upload)
// ============================================================================

/**
 * Document type enum matching backend
 */
export type DocumentType = 'AGREEMENT' | 'STRATEGY' | 'KYC' | 'INVOICE' | 'CONTRACT' | 'OTHER';

/**
 * Create a document and get presigned upload URL
 * @see https://qt4pgrsacn.us-east-2.awsapprunner.com/api#/Documents/DocumentController_createDocument
 */
export async function createDocument(data: {
  type: DocumentType;
  fileName: string;
  mimeType: string;
  size: number;
  agreementId?: string;
  todoId?: string;
  clientId?: string;
  strategistId?: string;
}): Promise<{
  id: string;
  uploadUrl: string;
  files: Array<{ id: string }>;
} | null> {
  try {
    console.log('[API] createDocument request:', JSON.stringify(data, null, 2));
    const result = await apiRequest<{
      id: string;
      uploadUrl: string;
      files: Array<{ id: string }>;
    }>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    console.log('[API] createDocument response:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('[API] Failed to create document:', error);
    return null;
  }
}

/**
 * Confirm file upload completion
 * @see https://qt4pgrsacn.us-east-2.awsapprunner.com/api#/Documents/DocumentController_confirmFileUpload
 */
export async function confirmDocumentUpload(documentId: string): Promise<boolean> {
  try {
    await apiRequest(`/documents/${documentId}/confirm-file`, { method: 'POST' });
    console.log('[API] Document upload confirmed:', documentId);
    return true;
  } catch (error) {
    console.error('[API] Failed to confirm document upload:', error);
    return false;
  }
}

/**
 * Update document to link it to an agreement
 * This is needed when the document is created before the agreement exists
 */
export async function updateDocumentAgreement(
  documentId: string,
  agreementId: string
): Promise<boolean> {
  try {
    console.log('[API] Linking document to agreement:', { documentId, agreementId });
    await apiRequest(`/documents/${documentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ agreementId }),
    });
    console.log('[API] Document linked to agreement');
    return true;
  } catch (error) {
    console.error('[API] Failed to link document to agreement:', error);
    return false;
  }
}

/**
 * Delete a document by ID
 * DELETE /documents/{id}
 */
export async function deleteDocument(documentId: string): Promise<boolean> {
  try {
    console.log('[API] Deleting document:', documentId);
    await apiRequest(`/documents/${documentId}`, {
      method: 'DELETE',
    });
    console.log('[API] Document deleted successfully');
    return true;
  } catch (error) {
    console.error('[API] Failed to delete document:', error);
    return false;
  }
}

/**
 * Get document by todo ID
 * @see https://qt4pgrsacn.us-east-2.awsapprunner.com/api#/Documents/DocumentController_getByTodoId
 */
export async function getDocumentByTodoId(todoId: string): Promise<{
  id: string;
  files: Array<{
    id: string;
    downloadUrl?: string;
    originalName: string;
    mimeType: string;
    size: number;
  }>;
} | null> {
  try {
    const result = await apiRequest<any>(`/documents/todo/${todoId}`);
    return result;
  } catch (error) {
    console.error('[API] Failed to get document by todo:', error);
    return null;
  }
}

/**
 * Legacy function - kept for backwards compatibility with generate-document.ts
 * Wraps the new createDocument API
 */
export async function getUploadUrl(data: {
  fileName: string;
  mimeType: string;
  size: number;
  type?: DocumentType;
  agreementId?: string;
  todoId?: string;
}): Promise<{ uploadUrl: string; fileId: string; documentId: string } | null> {
  const result = await createDocument({
    type: data.type || 'CONTRACT',
    fileName: data.fileName,
    mimeType: data.mimeType,
    size: data.size,
    agreementId: data.agreementId,
    todoId: data.todoId,
  });

  if (!result) return null;

  return {
    uploadUrl: result.uploadUrl,
    fileId: result.files?.[0]?.id || result.id,
    documentId: result.id,
  };
}

/**
 * Legacy function - wraps confirmDocumentUpload
 */
export async function confirmUpload(fileIdOrDocId: string): Promise<boolean> {
  return confirmDocumentUpload(fileIdOrDocId);
}

/**
 * Get presigned download URL for a document
 * Note: The download URL comes from getting the document by ID
 */
export async function getDownloadUrl(documentId: string): Promise<string | null> {
  try {
    console.log('[API] Getting download URL for document:', documentId);
    const doc = await apiRequest<{
      id: string;
      files?: Array<{ downloadUrl?: string; url?: string; id?: string; key?: string }>;
      downloadUrl?: string;
      url?: string;
    }>(`/documents/${documentId}`);
    console.log('[API] Document response:', JSON.stringify(doc, null, 2));

    // Try multiple possible locations for the download URL
    const downloadUrl =
      doc.files?.[0]?.downloadUrl || doc.files?.[0]?.url || doc.downloadUrl || doc.url || null;

    console.log('[API] Download URL:', downloadUrl);
    return downloadUrl;
  } catch (error) {
    console.error('[API] Failed to get download URL:', error);
    return null;
  }
}

// ============================================================================
// Payments API (placeholder)
// ============================================================================

export async function listPayments(): Promise<ApiPayment[]> {
  try {
    // Adjust endpoint based on actual API
    const payments = await apiRequest<ApiPayment[]>('/payments');
    return payments;
  } catch (error) {
    console.error('[API] Failed to list payments:', error);
    return [];
  }
}

// ============================================================================
// Client Creation API
// ============================================================================

export interface CreateClientData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  businessName?: string;
  strategistId: string;
  clientType: 'individual' | 'business';
}

/**
 * Invite a new client user
 *
 * Uses the dedicated invite endpoint which:
 * 1. Creates user in Cognito with temporary password
 * 2. Creates user in database with CLIENT role
 * 3. Sends invitation email with credentials
 * 4. Creates client profile with additional data
 *
 * The client will need to set a new password on first login.
 */
export async function createClient(data: CreateClientData): Promise<ApiClient | null> {
  const fullName = `${data.firstName} ${data.lastName}`.trim();

  console.log('Creating client with data:', data);

  try {
    // Use the dedicated invite endpoint
    // This handles Cognito user creation, role assignment, and sends email
    const inviteResult = await apiRequest<{
      id: string;
      email: string;
      fullName?: string;
      status?: string;
      strategistId: string;
    }>('/users/clients/invite', {
      method: 'POST',
      body: JSON.stringify({
        strategistId: data.strategistId, // Assigned automatically from token
        email: data.email,
        fullName: fullName,
        phone: data.phone || undefined,
        address: data.address || undefined,
        businessName: data.businessName || undefined,
        clientType: data.clientType,
      }),
    });

    console.log('[API] Client invited:', inviteResult);

    // Create client profile with additional data
    try {
      await apiRequest(`/users/${inviteResult.id}/client-profile`, {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: data.phone || null,
          address: data.address || null,
          businessName: data.businessName || null,
          businessType: data.clientType === 'business' ? 'Business' : null,
          onboardingComplete: false,
        }),
      });
      console.log('[API] Client profile created for:', inviteResult.id);
    } catch (profileError) {
      console.error('[API] Failed to create client profile:', profileError);
      // Don't fail the whole operation if profile creation fails
      // The profile can be created later
    }

    // Return the client data
    return {
      id: inviteResult.id,
      email: inviteResult.email,
      name: inviteResult.fullName || fullName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: inviteResult.status || 'invited',
    };
  } catch (error) {
    console.error('[API] Failed to invite client:', error);
    throw error;
  }
}

// ============================================================================
// Agreements API
// ============================================================================

/**
 * List all agreements for a client (includes todoLists with todos)
 * Fetches documents filtered by agreementId and merges into todos
 */
export async function listClientAgreements(clientId: string): Promise<ApiAgreement[]> {
  try {
    // Fetch agreements first
    const agreements = await apiRequest<ApiAgreement[]>('/agreements');

    console.log('[API] All agreements:', agreements.length);
    console.log('[API] Filtering for clientId:', clientId);

    // Filter by client ID (handle different possible field names)
    const clientAgreements = Array.isArray(agreements)
      ? agreements.filter(a => {
          const agreementClientId =
            a.clientId || (a as any).client_id || (a as any).userId || (a as any).client?.id;
          return agreementClientId === clientId;
        })
      : [];

    console.log('[API] Client agreements after filter:', clientAgreements.length);

    // For each agreement, fetch documents filtered by agreementId and merge into todos
    const enrichedAgreements = await Promise.all(
      clientAgreements.map(async a => {
        // Fetch documents for this specific agreement
        const documents = await apiRequest<StrategistDocument[]>(
          `/documents?agreementId=${a.id}`
        ).catch(() => []);
        console.log('[API] Documents for agreement', a.id, ':', documents.length);

        // Build lookup by todoId
        const documentsByTodoId = new Map<string, StrategistDocument>();
        for (const doc of documents) {
          if (doc.todoId) {
            documentsByTodoId.set(doc.todoId, doc);
            console.log('[API] Document', doc.id, 'has todoId:', doc.todoId);
          }
        }

        // Merge documents into todos
        if (a.todoLists) {
          for (const todoList of a.todoLists) {
            if (todoList.todos) {
              for (const todo of todoList.todos) {
                const matchingDoc = documentsByTodoId.get(todo.id);
                if (matchingDoc) {
                  todo.document = {
                    id: matchingDoc.id,
                    signedStatus: 'WAITING_SIGNED',
                    uploadStatus: matchingDoc.uploadStatus || 'FILE_UPLOADED',
                    acceptanceStatus: matchingDoc.acceptanceStatus,
                    files: matchingDoc.files,
                  };
                  console.log(
                    '[API] ✅ Merged document into todo:',
                    todo.id,
                    todo.title,
                    'acceptanceStatus:',
                    matchingDoc.acceptanceStatus
                  );
                } else {
                  console.log('[API] ❌ No document for todo:', todo.id, todo.title);
                }
              }
            }
          }
        }

        if (a.signatureEnvelopeId) {
          console.log('[API] Agreement', a.id, 'already has envelopeId:', a.signatureEnvelopeId);
          return a;
        }

        console.log('[API] Agreement', a.id, 'description:', a.description?.substring(0, 200));
        const metadataMatch = a.description?.match(/__SIGNATURE_METADATA__:([\s\S]+)$/);
        if (metadataMatch) {
          try {
            const metadata = JSON.parse(metadataMatch[1]);
            console.log('[API] Parsed metadata for agreement', a.id, ':', metadata);
            return {
              ...a,
              signatureEnvelopeId: metadata.envelopeId,
              signatureRecipientId: metadata.recipientId,
              signatureCeremonyUrl: metadata.ceremonyUrl,
              strategistRecipientId: metadata.strategistRecipientId,
              strategistCeremonyUrl: metadata.strategistCeremonyUrl,
            };
          } catch (e) {
            console.error('[API] Failed to parse metadata for agreement', a.id, ':', e);
          }
        } else {
          console.log('[API] No metadata found in agreement', a.id, 'description');
        }
        return a;
      })
    );

    return enrichedAgreements;
  } catch (error) {
    console.error(
      '[API] listClientAgreements failed:',
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

/**
 * Create a new agreement for a client
 * @see https://qt4pgrsacn.us-east-2.awsapprunner.com/api#/Agreements/AgreementController_create
 */
export async function createAgreement(data: {
  name: string;
  description: string;
  clientId: string;
  price: number;
  paymentRef?: string;
  contractDocumentId?: string;
}): Promise<ApiAgreement | null> {
  try {
    console.log('[API] createAgreement request:', JSON.stringify(data, null, 2));
    const agreement = await apiRequest<ApiAgreement>('/agreements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    console.log('[API] createAgreement response:', JSON.stringify(agreement, null, 2));
    return agreement;
  } catch (error) {
    console.error('[API] createAgreement failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Attach a contract file to an agreement
 * @param agreementId - The agreement ID
 * @param documentId - The document ID (not file ID)
 */
export async function attachContract(agreementId: string, documentId: string): Promise<boolean> {
  try {
    console.log('[API] Attaching contract:', { agreementId, documentId });
    await apiRequest(`/agreements/${agreementId}/contract`, {
      method: 'POST',
      body: JSON.stringify({ contractDocumentId: documentId }),
    });
    return true;
  } catch (error) {
    console.error('[API] Failed to attach contract:', error);
    return false;
  }
}

/**
 * Attach payment info to an agreement
 */
export async function attachPayment(
  agreementId: string,
  data: {
    amount: number;
    paymentLink?: string;
  }
): Promise<boolean> {
  try {
    await apiRequest(`/agreements/${agreementId}/payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return true;
  } catch (error) {
    console.error('[API] Failed to attach payment:', error);
    return false;
  }
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
    console.log('[API] Updating agreement status:', agreementId, '→', status);
    await apiRequest(`/agreements/${agreementId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    console.log('[API] Agreement status updated successfully');
    return true;
  } catch (error) {
    console.error('[API] Failed to update agreement status:', error);
    return false;
  }
}

/**
 * Update agreement with status and optional metadata in description
 * Used for strategy flow to embed strategy metadata
 */
export async function updateAgreementWithMetadata(
  agreementId: string,
  updates: {
    status?: AgreementStatus;
    description?: string;
  }
): Promise<boolean> {
  try {
    console.log('[API] Updating agreement with metadata:', agreementId);
    await apiRequest(`/agreements/${agreementId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    console.log('[API] Agreement updated successfully');
    return true;
  } catch (error) {
    console.error('[API] Failed to update agreement:', error);
    return false;
  }
}

/**
 * Get agreement by ID
 */
export async function getAgreement(agreementId: string): Promise<ApiAgreement | null> {
  try {
    const agreement = await apiRequest<ApiAgreement>(`/agreements/${agreementId}`);
    return agreement;
  } catch (error) {
    console.error('[API] Failed to get agreement:', error);
    return null;
  }
}

/**
 * Update agreement with SignatureAPI envelope info
 * Stores signature data in description field as JSON metadata since backend doesn't have signature fields yet
 */
export async function updateAgreementSignature(
  agreementId: string,
  data: {
    signatureEnvelopeId: string;
    signatureRecipientId: string;
    signatureCeremonyUrl?: string;
  }
): Promise<boolean> {
  try {
    // First get the current agreement to preserve existing description
    const agreement = await getAgreement(agreementId);
    if (!agreement) {
      console.error('[API] Agreement not found:', agreementId);
      return false;
    }

    // Parse existing description to preserve user text
    let userDescription = agreement.description || '';
    let signatureMetadata = {};

    // Check if description already has metadata
    const metadataMatch = userDescription.match(/\n\n__SIGNATURE_METADATA__:([\s\S]+)$/);
    if (metadataMatch) {
      try {
        signatureMetadata = JSON.parse(metadataMatch[1]);
        userDescription = userDescription.replace(/\n\n__SIGNATURE_METADATA__:[\s\S]+$/, '');
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Build new description with signature metadata appended
    const newSignatureMetadata = {
      envelopeId: data.signatureEnvelopeId,
      recipientId: data.signatureRecipientId,
      ceremonyUrl: data.signatureCeremonyUrl,
      updatedAt: new Date().toISOString(),
    };

    const newDescription = `${userDescription}\n\n__SIGNATURE_METADATA__:${JSON.stringify(newSignatureMetadata)}`;

    // Update the agreement with the new description
    await apiRequest(`/agreements/${agreementId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        description: newDescription,
      }),
    });

    console.log('[API] Stored signature metadata in agreement description');
    return true;
  } catch (error) {
    console.error('[API] Failed to update agreement signature:', error);
    return false;
  }
}

/**
 * Mark agreement as signed (called by webhook)
 */
export async function markAgreementSigned(agreementId: string): Promise<boolean> {
  try {
    await apiRequest(`/agreements/${agreementId}/complete`, {
      method: 'POST',
    });
    return true;
  } catch (error) {
    console.error('[API] Failed to mark agreement signed:', error);
    return false;
  }
}

/**
 * Mark a document as signed
 * POST /documents/{id}/sign
 */
export async function markDocumentSigned(documentId: string): Promise<boolean> {
  try {
    await apiRequest(`/documents/${documentId}/sign`, {
      method: 'POST',
    });
    console.log('[API] Document marked as signed:', documentId);
    return true;
  } catch (error) {
    console.error('[API] Failed to mark document signed:', error);
    return false;
  }
}

/**
 * Get all agreements (for webhook to find by envelope ID)
 */
export async function listAgreements(): Promise<ApiAgreement[]> {
  try {
    const agreements = await apiRequest<ApiAgreement[]>('/agreements');
    return agreements;
  } catch (error) {
    console.error('[API] Failed to list agreements:', error);
    return [];
  }
}

/**
 * Cancel an agreement
 */
export async function cancelAgreement(agreementId: string): Promise<boolean> {
  try {
    await apiRequest(`/agreements/${agreementId}/cancel`, {
      method: 'POST',
    });
    return true;
  } catch (error) {
    console.error('[API] Failed to cancel agreement:', error);
    return false;
  }
}

// ============================================================================
// Payment Integrations API
// ============================================================================

export interface PaymentIntegration {
  id: string;
  strategistId: string;
  provider: 'stripe';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get current strategist's payment integration
 * Returns null if no integration exists
 */
export async function getPaymentIntegration(): Promise<PaymentIntegration | null> {
  try {
    const integration = await apiRequest<PaymentIntegration>('/payment-integrations/mine');
    return integration;
  } catch (error) {
    // 404 means no integration - that's expected for new users
    console.log('[API] No payment integration found (or error):', error);
    return null;
  }
}

/**
 * Create/submit Stripe secret key for current strategist
 */
export async function createPaymentIntegration(
  stripeSecretKey: string
): Promise<PaymentIntegration | null> {
  try {
    const integration = await apiRequest<PaymentIntegration>('/payment-integrations', {
      method: 'POST',
      body: JSON.stringify({ stripeSecretKey, provider: 'stripe' }),
    });
    console.log('[API] Payment integration created');
    return integration;
  } catch (error) {
    console.error('[API] Failed to create payment integration:', error);
    throw error;
  }
}

/**
 * Delete/revoke payment integration
 */
export async function deletePaymentIntegration(integrationId: string): Promise<boolean> {
  try {
    await apiRequest(`/payment-integrations/${integrationId}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error('[API] Failed to delete payment integration:', error);
    return false;
  }
}

// ============================================================================
// Charges API
// ============================================================================

export interface Charge {
  id: string;
  agreementId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled' | 'failed';
  description?: string;
  paymentLink?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
  agreement?: {
    name: string;
    client?: {
      email: string;
    };
  };
}

/**
 * Create a charge for an agreement
 */
export async function createCharge(data: {
  agreementId: string;
  amount: number;
  currency?: string;
  description?: string;
}): Promise<Charge | null> {
  try {
    // Convert amount (dollars) to amountCents
    const amountCents = Math.round(data.amount * 100);

    const requestBody = {
      agreementId: data.agreementId,
      amountCents: amountCents,
      currency: data.currency || 'usd',
      description: data.description,
    };

    console.log('🔵 [API] Creating charge - Request body:', JSON.stringify(requestBody, null, 2));

    const raw = await apiRequest<any>('/charges', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    console.log('🔵 [API] Charge created - Response:', JSON.stringify(raw, null, 2));

    // Map backend amountCents → frontend amount in dollars
    const charge: Charge = {
      id: raw.id,
      agreementId: raw.agreementId,
      amount: raw.amountCents ? raw.amountCents / 100 : raw.amount || data.amount,
      currency: raw.currency || 'usd',
      status: raw.status,
      description: raw.description,
      paymentLink: raw.paymentLink,
      stripePaymentIntentId: raw.stripePaymentIntentId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      agreement: raw.agreement,
    };

    return charge;
  } catch (error) {
    console.error('🔵 [API] Failed to create charge:', error);
    throw error;
  }
}

/**
 * Get all charges for an agreement
 */
export async function getChargesForAgreement(agreementId: string): Promise<Charge[]> {
  try {
    const rawCharges = await apiRequest<any[]>(`/charges/agreement/${agreementId}`);

    // Map backend fields (amountCents) → frontend interface (amount in dollars)
    const charges: Charge[] = rawCharges.map(c => ({
      id: c.id,
      agreementId: c.agreementId,
      amount: c.amountCents ? c.amountCents / 100 : c.amount || 0,
      currency: c.currency || 'usd',
      status: c.status,
      description: c.description,
      paymentLink: c.paymentLink,
      stripePaymentIntentId: c.stripePaymentIntentId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      agreement: c.agreement,
    }));

    return charges;
  } catch (error) {
    console.error('[API] Failed to get charges for agreement:', error);
    return [];
  }
}

/**
 * Get a single charge by ID
 */
export async function getCharge(chargeId: string): Promise<Charge | null> {
  try {
    const raw = await apiRequest<any>(`/charges/${chargeId}`);
    return {
      id: raw.id,
      agreementId: raw.agreementId,
      amount: raw.amountCents ? raw.amountCents / 100 : raw.amount || 0,
      currency: raw.currency || 'usd',
      status: raw.status,
      description: raw.description,
      paymentLink: raw.paymentLink,
      stripePaymentIntentId: raw.stripePaymentIntentId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      agreement: raw.agreement,
    };
  } catch (error) {
    console.error('[API] Failed to get charge:', error);
    return null;
  }
}

/**
 * Generate payment link for a charge (Stripe checkout URL)
 * @param chargeId - The charge ID
 * @param options - Optional success/cancel URLs and customer email
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
    // Build the base URL
    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || 'https://ariex-web-nine.vercel.app';

    const body: Record<string, string> = {
      url: baseUrl,
      successUrl: options?.successUrl || `${baseUrl}/client/onboarding?payment=success`,
      cancelUrl: options?.cancelUrl || `${baseUrl}/client/onboarding?payment=cancel`,
    };

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
    console.log('[API] Payment link generated');
    return result.paymentLink || result.url || null;
  } catch (error) {
    console.error('[API] Failed to generate payment link:', error);
    throw error;
  }
}

/**
 * Cancel a charge
 */
export async function cancelCharge(chargeId: string): Promise<boolean> {
  try {
    await apiRequest(`/charges/${chargeId}/cancel`, {
      method: 'POST',
    });
    return true;
  } catch (error) {
    console.error('[API] Failed to cancel charge:', error);
    return false;
  }
}

/**
 * Get all charges for the strategist across all agreements
 */
export async function getAllCharges(): Promise<Charge[]> {
  try {
    const rawCharges = await apiRequest<any[]>('/charges');

    // Map backend fields (amountCents) → frontend interface (amount in dollars)
    const charges: Charge[] = rawCharges.map(c => ({
      id: c.id,
      agreementId: c.agreementId,
      amount: c.amountCents ? c.amountCents / 100 : c.amount || 0,
      currency: c.currency || 'usd',
      status: c.status,
      description: c.description,
      paymentLink: c.paymentLink,
      stripePaymentIntentId: c.stripePaymentIntentId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      agreement: c.agreement,
    }));

    return charges;
  } catch (error) {
    console.error('[API] Failed to get all charges:', error);
    return [];
  }
}

// ============================================================================
// Signature Status Sync
// ============================================================================

import {
  getEnvelopeDetails,
  createCeremonyForRecipient,
  getSignedDocumentUrl,
  findEnvelopeByClientId,
} from '@/lib/signature/signatureapi';

/**
 * Check envelope status from SignatureAPI for an agreement
 * This is used to verify signing status when the webhook may have failed
 */
export async function getAgreementEnvelopeStatus(
  agreementId: string,
  envelopeId: string
): Promise<{ status: string | null; error?: string }> {
  try {
    const envelopeDetails = await getEnvelopeDetails(envelopeId);
    console.log('[StrategistAPI] Envelope status from SignatureAPI:', envelopeDetails?.status);

    if (!envelopeDetails) {
      return { status: null, error: 'Could not get envelope details from SignatureAPI' };
    }

    // If envelope is completed (all recipients signed), update agreement to PENDING_PAYMENT
    if (envelopeDetails.status === 'completed') {
      console.log('[StrategistAPI] Envelope is COMPLETED - attempting to sync to backend');

      await apiRequest(`/agreements/${agreementId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: AgreementStatus.PENDING_PAYMENT,
          signedAt: new Date().toISOString(),
        }),
      }).catch(() => {
        console.log(
          '[StrategistAPI] Failed to update agreement status (backend may not support this)'
        );
      });
    }

    return { status: envelopeDetails.status };
  } catch (error) {
    console.error('[StrategistAPI] Failed to get envelope status:', error);
    return { status: null, error: 'Failed to check envelope status' };
  }
}

// ============================================================================
// Strategist Signing Info
// ============================================================================

export interface StrategistSigningInfo {
  strategistCeremonyUrl: string | null;
  strategistHasSigned: boolean;
  clientHasSigned: boolean;
  envelopeCompleted: boolean;
  signedDocumentUrl: string | null;
}

/**
 * Get strategist signing status, ceremony URL, and signed document URL for an agreement.
 *
 * Parses __SIGNATURE_METADATA__ from the agreement description, checks
 * individual recipient statuses via SignatureAPI, refreshes the ceremony
 * URL if it has expired, and fetches the signed PDF URL when available.
 */
export async function getStrategistSigningInfo(
  agreementId: string
): Promise<StrategistSigningInfo> {
  const fallback: StrategistSigningInfo = {
    strategistCeremonyUrl: null,
    strategistHasSigned: false,
    clientHasSigned: false,
    envelopeCompleted: false,
    signedDocumentUrl: null,
  };

  try {
    const agreement = await getAgreement(agreementId);
    console.log('[SigningInfo][DEBUG] agreement fetched:', JSON.stringify({
      id: agreement?.id,
      status: agreement?.status,
      signatureEnvelopeId: agreement?.signatureEnvelopeId,
      strategistRecipientId: agreement?.strategistRecipientId,
      signedDocumentFileId: agreement?.signedDocumentFileId,
      hasDescription: !!agreement?.description,
      descLength: agreement?.description?.length,
      hasMetadata: agreement?.description?.includes('__SIGNATURE_METADATA__'),
    }));
    if (!agreement) {
      console.log('[SigningInfo][DEBUG] ❌ No agreement found, returning fallback');
      return fallback;
    }

    // Try to get envelope ID from metadata first, then from agreement fields
    let envelopeId: string | undefined;
    let strategistRecipientId: string | undefined;
    let strategistCeremonyUrl: string | undefined;

    const metadataMatch = agreement.description?.match(/__SIGNATURE_METADATA__:([\s\S]+)$/);
    if (metadataMatch) {
      try {
        const metadata = JSON.parse(metadataMatch[1]);
        console.log('[SigningInfo][DEBUG] Parsed metadata:', JSON.stringify(metadata));
        envelopeId = metadata.envelopeId;
        strategistRecipientId = metadata.strategistRecipientId;
        strategistCeremonyUrl = metadata.strategistCeremonyUrl;
      } catch (e) {
        console.log('[SigningInfo][DEBUG] ❌ Metadata JSON parse failed:', e);
      }
    } else {
      console.log('[SigningInfo][DEBUG] No __SIGNATURE_METADATA__ found in description');
    }

    // Fallback to agreement-level fields if metadata didn't provide envelope ID
    if (!envelopeId && agreement.signatureEnvelopeId) {
      console.log('[SigningInfo][DEBUG] Using signatureEnvelopeId from agreement field:', agreement.signatureEnvelopeId);
      envelopeId = agreement.signatureEnvelopeId;
    }
    if (!strategistRecipientId && agreement.strategistRecipientId) {
      strategistRecipientId = agreement.strategistRecipientId;
    }
    if (!strategistCeremonyUrl && agreement.strategistCeremonyUrl) {
      strategistCeremonyUrl = agreement.strategistCeremonyUrl;
    }

    console.log('[SigningInfo][DEBUG] Resolved envelopeId:', envelopeId);
    if (!envelopeId) {
      // Fallback: search SignatureAPI envelopes by client_id metadata
      console.log('[SigningInfo][DEBUG] No envelopeId found — searching by clientId:', agreement.clientId);
      const foundEnvelope = await findEnvelopeByClientId(agreement.clientId);
      if (foundEnvelope) {
        console.log('[SigningInfo][DEBUG] ✅ Found envelope via client search:', foundEnvelope.id, 'status:', foundEnvelope.status);
        envelopeId = foundEnvelope.id;
        // Extract strategist recipient info from found envelope
        const stratRecipient = foundEnvelope.recipients?.find((r: any) => r.key === 'strategist');
        if (stratRecipient) {
          strategistRecipientId = stratRecipient.id;
        }
      } else {
        console.log('[SigningInfo][DEBUG] ❌ No envelope found for client — returning fallback');
        return fallback;
      }
    }

    console.log('[SigningInfo][DEBUG] Fetching envelope details for:', envelopeId);
    const envelope = await getEnvelopeDetails(envelopeId);
    console.log('[SigningInfo][DEBUG] Envelope:', JSON.stringify({
      status: envelope?.status,
      recipientCount: envelope?.recipients?.length,
      recipients: envelope?.recipients?.map(r => ({ key: r.key, status: r.status })),
    }));
    if (!envelope) {
      console.log('[SigningInfo][DEBUG] ❌ Envelope not found, trying direct getSignedDocumentUrl...');
      if (isAgreementSigned(agreement.status)) {
        const signedDocumentUrl = await getSignedDocumentUrl(envelopeId);
        console.log('[SigningInfo][DEBUG] Direct getSignedDocumentUrl result:', signedDocumentUrl);
        return { ...fallback, signedDocumentUrl, envelopeCompleted: true };
      }
      return fallback;
    }

    const envelopeCompleted = envelope.status === 'completed';
    console.log('[SigningInfo][DEBUG] envelopeCompleted:', envelopeCompleted);

    const clientRecipient = envelope.recipients?.find(r => r.key === 'client');
    const strategistRecipient = envelope.recipients?.find(r => r.key === 'strategist');

    const clientHasSigned = clientRecipient?.status === 'completed';
    const strategistHasSigned = strategistRecipient?.status === 'completed';

    // If strategist hasn't signed and envelope isn't done, try to ensure we
    // have a valid ceremony URL (they expire). Create a fresh one if needed.
    if (!strategistHasSigned && !envelopeCompleted && strategistRecipientId) {
      try {
        const ceremony = await createCeremonyForRecipient({
          recipientId: strategistRecipientId,
        });
        strategistCeremonyUrl = ceremony.ceremonyUrl;
      } catch {
        // Keep the original URL — it may still work
      }
    }

    // When envelope is completed, fetch the signed document URL.
    // The deliverable may take a few seconds to generate, so retry once.
    let signedDocumentUrl: string | null = null;
    if (envelopeCompleted) {
      console.log('[SigningInfo][DEBUG] Envelope completed! Fetching signed document URL...');
      signedDocumentUrl = await getSignedDocumentUrl(envelopeId);
      console.log('[SigningInfo][DEBUG] getSignedDocumentUrl attempt 1:', signedDocumentUrl);
      if (!signedDocumentUrl) {
        console.log('[SigningInfo][DEBUG] Retrying after 3s...');
        await new Promise(r => setTimeout(r, 3000));
        signedDocumentUrl = await getSignedDocumentUrl(envelopeId);
        console.log('[SigningInfo][DEBUG] getSignedDocumentUrl attempt 2:', signedDocumentUrl);
      }
    } else {
      console.log('[SigningInfo][DEBUG] Envelope NOT completed (status:', envelope.status, ') — skipping signed doc fetch');
    }

    const result = {
      strategistCeremonyUrl: strategistCeremonyUrl ?? null,
      strategistHasSigned: !!strategistHasSigned,
      clientHasSigned: !!clientHasSigned,
      envelopeCompleted,
      signedDocumentUrl,
    };
    console.log('[SigningInfo][DEBUG] ✅ Final result:', JSON.stringify(result));
    return result;
  } catch (error) {
    console.error('[StrategistAPI] getStrategistSigningInfo error:', error);
    return fallback;
  }
}

/**
 * Get the URL of the signed (fully executed) agreement PDF from SignatureAPI.
 * Only available after the envelope is completed (all parties signed).
 * Tries the direct envelope ID first, then falls back to searching by client ID.
 */
export async function getSignedAgreementDocumentUrl(envelopeId: string): Promise<string | null> {
  try {
    return await getSignedDocumentUrl(envelopeId);
  } catch (error) {
    console.error('[StrategistAPI] getSignedAgreementDocumentUrl error:', error);
    return null;
  }
}

/**
 * Find signed agreement URL by client ID when envelope ID is not available.
 * Searches SignatureAPI for completed envelopes matching the client.
 */
export async function findSignedAgreementByClientId(clientId: string): Promise<string | null> {
  try {
    const envelope = await findEnvelopeByClientId(clientId, true);
    if (!envelope || envelope.status !== 'completed') return null;
    return await getSignedDocumentUrl(envelope.id);
  } catch (error) {
    console.error('[StrategistAPI] findSignedAgreementByClientId error:', error);
    return null;
  }
}

// ============================================================================
// Document Request Flow
// ============================================================================

/**
 * Create document request (TodoList + Todos)
 * Creates a todo list with multiple todos for document requests
 */
export async function createDocumentRequest(data: {
  agreementId: string;
  clientId: string;
  documentNames: string[];
}): Promise<{ todoListId: string; todos: ApiTodo[] } | null> {
  try {
    console.log('[API] Creating document request:', data);

    // 1. Create TodoList
    // Note: When agreementId is provided, the backend automatically assigns the client
    // from the agreement, so we should NOT send assignedToId
    const todoList = await apiRequest<ApiTodoList>('/todo-lists', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Document Requests',
        agreementId: data.agreementId,
        // assignedToId is auto-assigned from agreement by backend
      }),
    });
    console.log('[API] TodoList created:', todoList.id);

    // 2. Create Todos for each document name
    const todos: ApiTodo[] = [];
    for (const title of data.documentNames) {
      const todo = await apiRequest<ApiTodo>('/todos', {
        method: 'POST',
        body: JSON.stringify({
          title,
          todoListId: todoList.id,
        }),
      });
      todos.push(todo);
      console.log('[API] Todo created:', todo.id, '-', title);
    }

    return { todoListId: todoList.id, todos };
  } catch (error) {
    console.error('[API] Failed to create document request:', error);
    return null;
  }
}

/**
 * Update document acceptance status
 * PATCH /documents/{id}
 */
export async function updateDocumentAcceptance(
  documentId: string,
  acceptanceStatus: AcceptanceStatus
): Promise<boolean> {
  try {
    console.log('[API] Updating document acceptance:', { documentId, acceptanceStatus });
    await apiRequest(`/documents/${documentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ acceptanceStatus }),
    });
    console.log('[API] Document acceptance updated');
    return true;
  } catch (error) {
    console.error('[API] Failed to update document acceptance:', error);
    return false;
  }
}

/**
 * Update todo status
 * PATCH /todos/{id}
 */
export async function updateTodoStatus(
  todoId: string,
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
): Promise<boolean> {
  try {
    console.log('[API] Updating todo status:', { todoId, status });
    await apiRequest(`/todos/${todoId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    console.log('[API] Todo status updated');
    return true;
  } catch (error) {
    console.error('[API] Failed to update todo status:', error);
    return false;
  }
}

/**
 * Delete a todo
 * DELETE /todos/{id}
 */
export async function deleteTodo(todoId: string): Promise<boolean> {
  try {
    console.log('[API] Deleting todo:', todoId);

    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/todos/${todoId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('[API] Delete response status:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Delete failed' }));
      throw new Error(error.message || 'Delete failed');
    }

    console.log('[API] Todo deleted');
    return true;
  } catch (error) {
    console.error('[API] Failed to delete todo:', error);
    return false;
  }
}

// ============================================================================
// Document Management for Strategist
// ============================================================================

interface StrategistDocument {
  id: string;
  name?: string;
  type: string;
  todoId?: string;
  uploadStatus?: 'WAITING_UPLOAD' | 'FILE_UPLOADED' | 'FILE_DELETED';
  acceptanceStatus?: AcceptanceStatus;
  files?: Array<{
    id: string;
    originalName: string;
    downloadUrl?: string;
    mimeType?: string;
    size?: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all documents (strategist can see all)
 * Used to merge documents into todos since backend doesn't include document relation
 */
export async function getAllDocuments(): Promise<StrategistDocument[]> {
  try {
    const documents = await apiRequest<StrategistDocument[]>('/documents');
    console.log('[API] getAllDocuments count:', documents?.length || 0);
    // Log first few documents with their todoId field for debugging
    documents?.slice(0, 5).forEach(doc => {
      console.log(
        '[API] Document sample:',
        JSON.stringify({
          id: doc.id,
          type: doc.type,
          todoId: doc.todoId,
          todo: (doc as any).todo,
          uploadStatus: doc.uploadStatus,
          acceptanceStatus: doc.acceptanceStatus,
        })
      );
    });
    // Count documents with todoId
    const withTodoId = documents?.filter(d => d.todoId) || [];
    console.log('[API] Documents with todoId:', withTodoId.length, 'of', documents?.length || 0);
    return Array.isArray(documents) ? documents : [];
  } catch (error) {
    console.error('[API] Failed to get documents:', error);
    return [];
  }
}

// ============================================================================
// Compliance Invite API (Strategist-side)
// ============================================================================

export interface InviteComplianceData {
  email: string;
  profileData?: Record<string, unknown>;
  clientIds?: string[];
}

export interface ComplianceInvitationResponse {
  token: string;
  complianceUserId: string;
  strategistUserId: string;
  expiresAt: string;
  message: string;
}

/**
 * Invite a compliance user.
 *
 * This creates a Cognito user with COMPLIANCE role, sends temp password email,
 * and returns a token for scope vinculation.
 */
export async function inviteComplianceUser(
  data: InviteComplianceData
): Promise<ComplianceInvitationResponse> {
  return apiRequest<ComplianceInvitationResponse>('/users/compliance/invite', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get all compliance users linked to this strategist
 */
export async function getLinkedComplianceUsers(joinClients = false): Promise<ApiClient[]> {
  try {
    const query = joinClients ? '?join=clients' : '';
    const result = await apiRequest<ApiClient[] | { data: ApiClient[] }>(
      `/compliance/strategist/allowed-compliance${query}`
    );
    return Array.isArray(result) ? result : (result.data ?? []);
  } catch (error) {
    console.error('[API] Failed to get linked compliance users:', error);
    return [];
  }
}

/**
 * Remove a compliance user from strategist scope
 */
export async function removeComplianceUser(mappingId: string): Promise<boolean> {
  try {
    await apiRequest(`/compliance/strategist/allowed-compliance/${mappingId}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error('[API] Failed to remove compliance user:', error);
    return false;
  }
}

/**
 * Update which clients a compliance user can access.
 * Called by strategist to manage compliance scope.
 */
export async function updateComplianceClientAccess(
  complianceUserId: string,
  clientIds: string[]
): Promise<boolean> {
  try {
    await apiRequest(`/users/strategist/${complianceUserId}/clients`, {
      method: 'POST',
      body: JSON.stringify(clientIds),
    });
    return true;
  } catch (error) {
    console.error('[API] Failed to update compliance client access:', error);
    return false;
  }
}

/**
 * Remove a client from a compliance user's allowed clients
 */
export async function deleteComplianceClient(
  complianceUserId: string,
  clientUserId: string
): Promise<boolean> {
  try {
    await apiRequest(
      `/compliance/strategist/allowed-compliance/${complianceUserId}/clients/${clientUserId}`,
      {
        method: 'DELETE',
      }
    );
    return true;
  } catch (error) {
    console.error('[API] Failed to delete compliance client:', error);
    return false;
  }
}
