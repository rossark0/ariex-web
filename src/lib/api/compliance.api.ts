'use server';

import { API_URL } from '@/lib/cognito-config';
import { cookies } from 'next/headers';
import type { ApiClient, ApiAgreement, ApiDocument, ApiTodo, ApiTodoList } from './strategist.api';

// ============================================================================
// Types
// ============================================================================

export interface ComplianceStrategist {
  id: string;
  cognitoSub?: string;
  email: string;
  fullName?: string;
  name?: string;
  status?: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
  clients?: ApiClient[];
}

export interface ComplianceStrategistMapping {
  id: string;
  complianceUserId: string;
  strategistUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceClientMapping {
  id: string;
  complianceUserId: string;
  strategistUserId: string;
  clientUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceComment {
  id: string;
  complianceUserId: string;
  strategistUserId: string;
  documentId?: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceInvitationResponse {
  token: string;
  complianceUserId: string;
  strategistUserId: string;
  expiresAt: string;
  message: string;
}

export interface ComplianceProfile {
  id: string;
  userId: string;
  phone?: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FileMetadata {
  id: string;
  originalName: string;
  downloadUrl?: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
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

  console.log('[Compliance API] Request', options.method ?? 'GET', options.body, endpoint, '- has token:', !!accessToken);

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

  console.log('[Compliance API] Response status:', response.status);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    console.log('[Compliance API] Error response:', error);
    throw new Error(error.message || 'Request failed');
  }

  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

// ============================================================================
// Invitation / Onboarding
// ============================================================================

/**
 * Invite a compliance user (called by strategist)
 *
 * Creates Cognito user with COMPLIANCE role, sends temp password email,
 * and returns a token for scope vinculation.
 */
export async function inviteComplianceUser(data: {
  email: string;
  profileData?: Record<string, unknown>;
  clientIds?: string[];
}): Promise<ComplianceInvitationResponse> {
  return apiRequest<ComplianceInvitationResponse>('/users/compliance/invite', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Accept strategist invitation using vinculation token.
 * Called by compliance user after first login.
 * Links the compliance user to the strategist's scope.
 */
export async function acceptComplianceInvitation(
  token: string
): Promise<ComplianceStrategistMapping> {
  return apiRequest<ComplianceStrategistMapping>('/compliance/add/strategist', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

// ============================================================================
// Compliance Profile
// ============================================================================

/**
 * Create or update compliance profile
 */
export async function updateComplianceProfile(
  userId: string,
  data: Partial<ComplianceProfile>
): Promise<ComplianceProfile> {
  return apiRequest<ComplianceProfile>(`/users/${userId}/compliance-profile`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get compliance profile
 */
export async function getComplianceProfile(userId: string): Promise<ComplianceProfile | null> {
  try {
    return await apiRequest<ComplianceProfile>(`/users/${userId}/compliance-profile`);
  } catch {
    return null;
  }
}

// ============================================================================
// Strategists (compliance scope)
// ============================================================================

/**
 * List all strategists in compliance user's scope.
 * Optionally join with their client lists.
 */
export async function getComplianceStrategists(
  joinClients = false
): Promise<ComplianceStrategist[]> {
  const query = joinClients ? '?join=clients' : '';
  try {
    const result = await apiRequest<ComplianceStrategist[] | { data: ComplianceStrategist[] }>(
      `/compliance/get-strategists${query}`
    );
    // Handle both array and paginated response formats
    return Array.isArray(result) ? result : result.data ?? [];
  } catch (error) {
    console.error('[Compliance API] Failed to list strategists:', error);
    return [];
  }
}

/**
 * Get a single strategist by ID in compliance scope.
 * Optionally join with their client list.
 */
export async function getComplianceStrategistById(
  id: string,
  joinClients = false
): Promise<ComplianceStrategist | null> {
  const query = joinClients ? '?join=clients' : '';
  try {
    return await apiRequest<ComplianceStrategist>(
      `/compliance/get-strategists/${id}${query}`
    );
  } catch (error) {
    console.error('[Compliance API] Failed to get strategist:', error);
    return null;
  }
}

// ============================================================================
// Clients (scoped to strategist)
// ============================================================================

/**
 * List all clients for a strategist within compliance scope.
 *
 * NOTE: strategistUserId is REQUIRED by the backend.
 */
export async function getComplianceClients(strategistUserId: string): Promise<ApiClient[]> {
  try {
    const result = await apiRequest<ApiClient[] | { data: ApiClient[] }>(
      `/compliance/get-clients?strategistUserId=${strategistUserId}`
    );
    return Array.isArray(result) ? result : result.data ?? [];
  } catch (error) {
    console.error('[Compliance API] Failed to list clients:', error);
    return [];
  }
}

/**
 * Get a single client by ID within compliance scope.
 *
 * NOTE: strategistUserId is REQUIRED by the backend.
 */
export async function getComplianceClientById(
  clientId: string,
  strategistUserId: string
): Promise<ApiClient | null> {
  try {
    return await apiRequest<ApiClient>(
      `/compliance/get-clients/${clientId}?strategistUserId=${strategistUserId}`
    );
  } catch (error) {
    console.error('[Compliance API] Failed to get client:', error);
    return null;
  }
}

// ============================================================================
// Scope Management
// ============================================================================

/**
 * Add a client to compliance scope (called by strategist or compliance)
 */
export async function addClientToScope(data: {
  strategistUserId: string;
  clientUserId: string;
}): Promise<ComplianceClientMapping> {
  return apiRequest<ComplianceClientMapping>('/compliance/add/client', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get all compliance users linked to a strategist.
 * Called by strategist to manage their compliance team.
 */
export async function getLinkedComplianceUsers(): Promise<ApiClient[]> {
  try {
    const result = await apiRequest<ApiClient[] | { data: ApiClient[] }>(
      '/compliance/strategist/allowed-compliance'
    );
    return Array.isArray(result) ? result : result.data ?? [];
  } catch (error) {
    console.error('[Compliance API] Failed to get linked compliance users:', error);
    return [];
  }
}

/**
 * Remove a compliance user from a strategist's scope
 */
export async function removeComplianceUser(mappingId: string): Promise<boolean> {
  try {
    await apiRequest(`/compliance/strategist/allowed-compliance/${mappingId}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error('[Compliance API] Failed to remove compliance user:', error);
    return false;
  }
}

// ============================================================================
// Agreements (compliance scope)
// ============================================================================

/**
 * List agreements for a strategist within compliance scope
 */
export async function getStrategistAgreements(strategistId: string): Promise<ApiAgreement[]> {
  try {
    const result = await apiRequest<ApiAgreement[] | { data: ApiAgreement[] }>(
      `/compliance/strategists/${strategistId}/agreements`
    );
    return Array.isArray(result) ? result : result.data ?? [];
  } catch (error) {
    console.error('[Compliance API] Failed to list strategist agreements:', error);
    return [];
  }
}

/**
 * Get a single agreement by ID within compliance scope
 */
export async function getComplianceAgreement(
  agreementId: string
): Promise<ApiAgreement | null> {
  try {
    return await apiRequest<ApiAgreement>(
      `/compliance/agreements/${agreementId}`
    );
  } catch (error) {
    console.error('[Compliance API] Failed to get agreement:', error);
    return null;
  }
}

/**
 * Update an agreement within compliance scope (status, description/metadata).
 * Uses PATCH /compliance/agreements/{id}.
 */
export async function updateComplianceAgreement(
  agreementId: string,
  updates: { status?: string; description?: string }
): Promise<boolean> {
  try {
    await apiRequest(`/compliance/agreements/${agreementId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return true;
  } catch (error) {
    console.error('[Compliance API] Failed to update agreement:', error);
    return false;
  }
}

// ============================================================================
// Documents & Files (compliance scope)
// ============================================================================

/**
 * List documents for an agreement within compliance scope
 */
export async function getAgreementDocuments(agreementId: string): Promise<ApiDocument[]> {
  try {
    const result = await apiRequest<ApiDocument[] | { data: ApiDocument[] }>(
      `/compliance/agreements/${agreementId}/documents`
    );
    return Array.isArray(result) ? result : result.data ?? [];
  } catch (error) {
    console.error('[Compliance API] Failed to list agreement documents:', error);
    return [];
  }
}

/**
 * List file metadata for an agreement within compliance scope
 */
export async function getAgreementFiles(agreementId: string): Promise<FileMetadata[]> {
  try {
    const result = await apiRequest<FileMetadata[] | { data: FileMetadata[] }>(
      `/compliance/agreements/${agreementId}/files`
    );
    return Array.isArray(result) ? result : result.data ?? [];
  } catch (error) {
    console.error('[Compliance API] Failed to list agreement files:', error);
    return [];
  }
}

// ============================================================================
// Todos (compliance scope)
// ============================================================================

/**
 * List todo lists for an agreement within compliance scope
 */
export async function getAgreementTodoLists(agreementId: string): Promise<ApiTodoList[]> {
  try {
    const result = await apiRequest<ApiTodoList[] | { data: ApiTodoList[] }>(
      `/compliance/agreements/${agreementId}/todo-lists`
    );
    return Array.isArray(result) ? result : result.data ?? [];
  } catch (error) {
    console.error('[Compliance API] Failed to list agreement todo lists:', error);
    return [];
  }
}

/**
 * List todos for an agreement within compliance scope
 */
export async function getAgreementTodos(agreementId: string): Promise<ApiTodo[]> {
  try {
    const result = await apiRequest<ApiTodo[] | { data: ApiTodo[] }>(
      `/compliance/agreements/${agreementId}/todos`
    );
    return Array.isArray(result) ? result : result.data ?? [];
  } catch (error) {
    console.error('[Compliance API] Failed to list agreement todos:', error);
    return [];
  }
}

// ============================================================================
// Documents (compliance-scoped)
// ============================================================================

/**
 * Get a document by ID within compliance scope.
 * Returns full document metadata including files with download URLs.
 */
export async function getComplianceDocument(documentId: string): Promise<ApiDocument | null> {
  try {
    const doc = await apiRequest<ApiDocument>(`/compliance/documents/${documentId}`);
    return doc;
  } catch (error) {
    console.error('[Compliance API] Failed to get document:', error);
    return null;
  }
}

/**
 * Update document acceptance status within compliance scope.
 * Used for approving/rejecting strategy documents.
 */
export async function updateComplianceDocumentAcceptance(
  documentId: string,
  acceptanceStatus: 'ACCEPTED_BY_COMPLIANCE' | 'REJECTED_BY_COMPLIANCE' | 'REQUEST_CLIENT_ACCEPTANCE'
): Promise<ApiDocument | null> {
  try {
    const doc = await apiRequest<ApiDocument>(`/compliance/documents/${documentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ acceptanceStatus }),
    });
    return doc;
  } catch (error) {
    console.error('[Compliance API] Failed to update document acceptance:', error);
    return null;
  }
}

/**
 * Get a document download URL using compliance-scoped endpoints.
 * Attempts to get the document via /compliance/documents/{id} endpoint
 * and extract the download URL from the response.
 */
export async function getComplianceDocumentUrl(
  documentId: string,
  agreementId?: string
): Promise<string | null> {
  // Attempt 1: Get document via compliance endpoint
  try {
    const doc = await getComplianceDocument(documentId);
    if (doc) {
      // Check for download URL in various possible locations
      const docAny = doc as any;
      const url =
        docAny.downloadUrl ??
        docAny.url ??
        docAny.files?.[0]?.downloadUrl ??
        docAny.files?.[0]?.url ??
        null;
      if (url) return url;
    }
  } catch (err) {
    console.error('[Compliance] Failed to get document via compliance endpoint:', err);
  }

  // Attempt 2: Fallback to searching agreement files
  if (agreementId) {
    try {
      const docs = await getAgreementDocuments(agreementId);
      const matchingDoc = docs.find(d => d.id === documentId);
      if (matchingDoc?.fileId) {
        const files = await getAgreementFiles(agreementId);
        const matchingFile = files.find(f => f.id === matchingDoc.fileId);
        if (matchingFile?.downloadUrl) return matchingFile.downloadUrl;
      }
      // Try matching any file named "strategy"
      const files = await getAgreementFiles(agreementId);
      const stratFile = files.find(f => f.originalName?.toLowerCase().includes('strategy'));
      if (stratFile?.downloadUrl) {
        return stratFile.downloadUrl;
      }
    } catch (err) {
      console.error('[Compliance] Agreement files fallback failed:', err);
    }
  }

  return null;
}

// ============================================================================
// Comments
// ============================================================================

/**
 * Add a compliance comment for a strategist or document.
 *
 * @param data.strategistUserId - Required: the strategist this comment is about
 * @param data.documentId - Optional: link comment to a specific document
 * @param data.body - The comment text
 */
export async function addComplianceComment(data: {
  strategistUserId: string;
  documentId?: string;
  body: string;
}): Promise<ComplianceComment> {
  return apiRequest<ComplianceComment>('/compliance/add-comment', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get comments for a document using the generic comment endpoint
 */
export async function getDocumentComments(documentId: string): Promise<ComplianceComment[]> {
  try {
    const result = await apiRequest<ComplianceComment[] | { data: ComplianceComment[] }>(
      `/comment?filter=documentId||$eq||${documentId}&sort=createdAt,DESC`
    );
    return Array.isArray(result) ? result : result.data ?? [];
  } catch (error) {
    console.error('[Compliance API] Failed to get document comments:', error);
    return [];
  }
}

// ============================================================================
// AI Assistant
// ============================================================================

/**
 * Create or get compliance AI chat thread
 */
export async function createComplianceChat(userId: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>('/assistants/compliance/chats', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

/**
 * Send a message to the compliance AI assistant
 */
export async function sendComplianceChatMessage(
  chatId: string,
  data: { userId: string; content: string }
): Promise<{ id: string; content: string; role: string }> {
  return apiRequest<{ id: string; content: string; role: string }>(
    `/assistants/compliance/chats/${chatId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

// ============================================================================
// Strategist-side: Update compliance client access
// ============================================================================

/**
 * Update which clients a compliance user can access.
 * Called by strategist.
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
    console.error('[Compliance API] Failed to update client access:', error);
    return false;
  }
}
