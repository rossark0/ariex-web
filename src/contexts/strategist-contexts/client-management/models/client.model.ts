/**
 * Client Management Models
 *
 * Type definitions for client data used in the strategist client management context
 */

import type { ApiClient, ApiAgreement, ApiDocument } from '@/lib/api/strategist.api';
import type { FullClientMock } from '@/lib/mocks/client-full';

// Re-export the new ClientInfo type from the store for convenience
export type { ClientInfo } from '../ClientDetailStore';

/**
 * Payment charge from Stripe
 */
export interface PaymentCharge {
  id: string;
  agreementId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentLink?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Extended client data with agreement and document information
 */
export interface ClientWithDetails extends ApiClient {
  agreements: ApiAgreement[];
  documents: ApiDocument[];
  payments: PaymentCharge[];
}

/**
 * @deprecated Use `ClientInfo` from `ClientDetailStore` and `apiClientToClientInfo` instead.
 * This function converts ApiClient to the legacy FullClientMock shape.
 * Will be removed after all consumers are migrated.
 */
export function apiClientToMockFormat(apiClient: ApiClient): FullClientMock {
  const now = new Date();
  return {
    user: {
      id: apiClient.id,
      email: apiClient.email,
      name: apiClient.name || apiClient.fullName || null,
      role: 'CLIENT',
      createdAt: new Date(apiClient.createdAt),
      updatedAt: new Date(apiClient.updatedAt),
    },
    profile: {
      id: apiClient.clientProfile?.id || `profile-${apiClient.id}`,
      userId: apiClient.id,
      phoneNumber: apiClient.clientProfile?.phoneNumber || apiClient.clientProfile?.phone || null,
      address: apiClient.clientProfile?.address || null,
      city: apiClient.clientProfile?.city || null,
      state: apiClient.clientProfile?.state || null,
      zipCode: apiClient.clientProfile?.zipCode || null,
      taxId: apiClient.clientProfile?.taxId || null,
      businessName: apiClient.clientProfile?.businessName || null,
      onboardingComplete: apiClient.clientProfile?.onboardingComplete || false,
      filingStatus: apiClient.clientProfile?.filingStatus || null,
      dependents: apiClient.clientProfile?.dependents || null,
      estimatedIncome: apiClient.clientProfile?.estimatedIncome || null,
      businessType: apiClient.clientProfile?.businessType || null,
      createdAt: apiClient.clientProfile?.createdAt
        ? new Date(apiClient.clientProfile.createdAt)
        : now,
      updatedAt: apiClient.clientProfile?.updatedAt
        ? new Date(apiClient.clientProfile.updatedAt)
        : now,
    },
    strategistId: apiClient.strategists?.[0] || '',
    isOnboardingComplete: apiClient.clientProfile?.onboardingComplete || false,
    // Empty arrays for features not yet implemented in API
    onboardingTasks: [],
    documents: [],
    payments: [],
    conversations: [],
    todos: [],
  };
}
