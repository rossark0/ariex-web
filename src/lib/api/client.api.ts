'use server';

import { API_URL } from '@/lib/cognito-config';
import { cookies } from 'next/headers';

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
  type: string;
  status: 'pending' | 'sent' | 'signed' | 'completed' | 'cancelled';
  contractEnvelopeId?: string;
  paymentReference?: string;
  paymentAmount?: number;
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
      console.log('[ClientAPI] No user ID found');
      return null;
    }

    const user = await apiRequest<ClientUser>(`/users/${userId}`);
    console.log('[ClientAPI] getCurrentClientUser:', user);
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
      console.log('[ClientAPI] No user ID found for profile');
      return null;
    }

    const profile = await apiRequest<ClientProfile>(`/users/${userId}/client-profile`);
    console.log('[ClientAPI] getClientProfile:', profile);
    return profile;
  } catch (error) {
    console.error('[ClientAPI] Failed to get client profile:', error);
    return null;
  }
}

/**
 * Update client profile
 */
export async function updateClientProfile(data: Partial<ClientProfile>): Promise<ClientProfile | null> {
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
 * Get all agreements for current client
 */
export async function getClientAgreements(): Promise<ClientAgreement[]> {
  try {
    const agreements = await apiRequest<ClientAgreement[]>('/agreements');
    console.log('[ClientAPI] getClientAgreements:', agreements);
    return Array.isArray(agreements) ? agreements : [];
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
    console.log('[ClientAPI] getClientDocuments:', documents);
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
 */
export async function getDocumentDownloadUrl(fileId: string): Promise<string | null> {
  try {
    const result = await apiRequest<{ downloadUrl: string }>('/s3/download-url', {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    });
    return result.downloadUrl;
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
    console.log('[ClientAPI] getClientTodos:', todos);
    return Array.isArray(todos) ? todos : [];
  } catch (error) {
    console.error('[ClientAPI] Failed to get todos:', error);
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
    const todo = await apiRequest<ClientTodo>(`/todos/${todoId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return todo;
  } catch (error) {
    console.error('[ClientAPI] Failed to update todo:', error);
    return null;
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
      console.log('[ClientAPI] No user ID for dashboard data');
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
      console.log('[ClientAPI] No user found for dashboard');
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
        console.log('[ClientAPI] Could not fetch strategist info');
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

/**
 * Calculate onboarding status from dashboard data
 * Note: This is a pure utility function, not a server action
 */
function calculateOnboardingStatus(data: ClientDashboardData): OnboardingStatus {
  const { agreements, documents, profile } = data;

  // Find service agreement
  const serviceAgreement = agreements.find(a => 
    a.type === 'service_agreement' || a.type === 'onboarding'
  );

  // Find strategy document
  const strategyDoc = documents.find(d => 
    d.type === 'strategy' || d.category === 'strategy'
  );

  // Check uploaded documents (excluding agreements/strategies)
  const uploadedDocs = documents.filter(d => 
    d.type !== 'agreement' && d.type !== 'strategy' && d.category !== 'contract'
  );

  // Calculate payment received first
  const paymentReceived = serviceAgreement?.status === 'completed' || 
                          (!!serviceAgreement?.paymentReference && serviceAgreement?.status !== 'pending');

  const status: OnboardingStatus = {
    accountCreated: true, // Always true if we have data
    agreementSent: serviceAgreement?.status === 'sent' || serviceAgreement?.status === 'signed',
    agreementSigned: serviceAgreement?.status === 'signed' || serviceAgreement?.status === 'completed',
    paymentSent: !!serviceAgreement?.paymentReference,
    paymentReceived,
    documentsRequested: paymentReceived, // Docs requested after payment
    documentsUploaded: uploadedDocs.length > 0,
    strategySent: strategyDoc?.signatureStatus === 'SENT' || strategyDoc?.signatureStatus === 'SIGNED',
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
