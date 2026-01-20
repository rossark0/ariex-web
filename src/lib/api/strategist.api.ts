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

export interface ApiTodo {
  id: string;
  title: string;
  description?: string;
  status: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPayment {
  id: string;
  amount: number;
  status: string;
  type: string;
  createdAt: string;
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
    const clients = Array.isArray(response) ? response : (response.data || response.items || []);

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
      clientProfile: profile ? {
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
      } : undefined,
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
 * Create a todo
 */
export async function createTodo(data: {
  title: string;
  description?: string;
  listId?: string;
}): Promise<ApiTodo | null> {
  try {
    const todo = await apiRequest<ApiTodo>('/todos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return todo;
  } catch (error) {
    console.error('[API] Failed to create todo:', error);
    return null;
  }
}

// ============================================================================
// S3 File API
// ============================================================================

/**
 * Get presigned upload URL
 */
export async function getUploadUrl(data: {
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
    console.error('[API] Failed to get upload URL:', error);
    return null;
  }
}

/**
 * Confirm file upload
 */
export async function confirmUpload(fileId: string): Promise<boolean> {
  try {
    await apiRequest(`/s3/confirm/${fileId}`, { method: 'POST' });
    return true;
  } catch (error) {
    console.error('[API] Failed to confirm upload:', error);
    return false;
  }
}

/**
 * Get presigned download URL
 */
export async function getDownloadUrl(fileId: string): Promise<string | null> {
  try {
    const result = await apiRequest<{ downloadUrl: string }>('/s3/download-url', {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    });
    return result.downloadUrl;
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
