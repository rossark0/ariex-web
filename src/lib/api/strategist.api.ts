'use server';

import { API_URL } from '@/lib/cognito-config';
import { cookies } from 'next/headers';

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
    files?: Array<{
      id: string;
      originalName: string;
      downloadUrl?: string;
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
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
  clientId: string;
  strategistId: string;
  paymentRef?: string;
  contractDocumentId?: string;
  contractDocument?: {
    id: string;
    signedStatus: 'WAITING_SIGNED' | 'SIGNED';
    uploadStatus: 'WAITING_UPLOAD' | 'FILE_UPLOADED' | 'FILE_DELETED';
  };
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

  return response.json();
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
// Todos API
// ============================================================================

/**
 * List todos
 */
export async function listTodos(): Promise<ApiTodo[]> {
  try {
    const todos = await apiRequest<ApiTodo[]>('/todos');
    return todos;
  } catch (error) {
    console.error('[API] Failed to list todos:', error);
    return [];
  }
}

/**
 * Create a todo in a todo list
 * @see https://qt4pgrsacn.us-east-2.awsapprunner.com/api#/Todos/TodoController_create
 */
export async function createTodo(data: {
  title: string;
  description?: string;
  todoListId: string;
}): Promise<ApiTodo | null> {
  try {
    console.log('[API] createTodo request:', JSON.stringify(data, null, 2));
    const todo = await apiRequest<ApiTodo>('/todos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    console.log('[API] createTodo response:', JSON.stringify(todo, null, 2));
    return todo;
  } catch (error) {
    console.error('[API] Failed to create todo:', error);
    return null;
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
    const doc = await apiRequest<{
      files: Array<{ downloadUrl?: string }>;
    }>(`/documents/${documentId}`);
    return doc.files?.[0]?.downloadUrl || null;
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

  try {
    // Use the dedicated invite endpoint
    // This handles Cognito user creation, role assignment, and sends email
    const inviteResult = await apiRequest<{
      id: string;
      email: string;
      fullName?: string;
      status?: string;
    }>('/users/clients/invite', {
      method: 'POST',
      body: JSON.stringify({
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
 */
export async function listClientAgreements(clientId: string): Promise<ApiAgreement[]> {
  try {
    // The API returns agreements with nested todoLists and todos
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

    // The /agreements endpoint already returns nested todoLists with todos
    // No need to fetch them separately
    return clientAgreements;
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
 */
export async function attachContract(agreementId: string, fileId: string): Promise<boolean> {
  try {
    await apiRequest(`/agreements/${agreementId}/contract`, {
      method: 'POST',
      body: JSON.stringify({ fileId }),
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
    const metadataMatch = userDescription.match(/\n\n__SIGNATURE_METADATA__:(.+)$/s);
    if (metadataMatch) {
      try {
        signatureMetadata = JSON.parse(metadataMatch[1]);
        userDescription = userDescription.replace(/\n\n__SIGNATURE_METADATA__:.+$/s, '');
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
 * Update todo status
 * PUT /todos/{id}
 */
export async function updateTodoStatus(
  todoId: string,
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
): Promise<boolean> {
  try {
    await apiRequest(`/todos/${todoId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    console.log('[API] Todo status updated:', todoId, status);
    return true;
  } catch (error) {
    console.error('[API] Failed to update todo status:', error);
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
