/**
 * @deprecated Use `useClientDetailStore` from `./ClientDetailStore` instead.
 * This vanilla Zustand store has non-standard subscription patterns.
 * Will be removed after confirming zero consumers.
 *
 * Client Management Store
 *
 * Vanilla Zustand store for managing strategist's client data
 */

import { createStore } from 'zustand/vanilla';
import type { ApiClient, ApiAgreement, ApiDocument } from '@/lib/api/strategist.api';
import type { PaymentCharge } from './models/client.model';

export interface ClientManagementState {
  // Current client being viewed
  currentClient: ApiClient | null;
  isLoadingClient: boolean;
  clientError: string | null;

  // Agreements
  agreements: ApiAgreement[];
  isLoadingAgreements: boolean;
  agreementError: string | null;

  // Documents
  documents: ApiDocument[];
  selectedDocIds: Set<string>;
  isLoadingDocuments: boolean;
  documentError: string | null;

  // Payments
  payments: PaymentCharge[];
  isLoadingPayments: boolean;
  paymentError: string | null;

  // SignatureAPI envelope statuses (source of truth for signatures)
  envelopeStatuses: Record<string, string>;

  // UI state
  activeTab: 'overview' | 'agreements' | 'documents' | 'payments' | 'strategy';

  // Actions - Client
  setCurrentClient: (client: ApiClient | null) => void;
  setIsLoadingClient: (loading: boolean) => void;
  setClientError: (error: string | null) => void;

  // Actions - Agreements
  setAgreements: (agreements: ApiAgreement[]) => void;
  setIsLoadingAgreements: (loading: boolean) => void;
  setAgreementError: (error: string | null) => void;

  // Actions - Documents
  setDocuments: (documents: ApiDocument[]) => void;
  toggleDocSelection: (docId: string) => void;
  clearSelectedDocs: () => void;
  setIsLoadingDocuments: (loading: boolean) => void;
  setDocumentError: (error: string | null) => void;

  // Actions - Payments
  setPayments: (payments: PaymentCharge[]) => void;
  setIsLoadingPayments: (loading: boolean) => void;
  setPaymentError: (error: string | null) => void;

  // Actions - Envelope statuses
  setEnvelopeStatus: (agreementId: string, status: string) => void;
  setEnvelopeStatuses: (statuses: Record<string, string>) => void;

  // Actions - UI
  setActiveTab: (tab: ClientManagementState['activeTab']) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  currentClient: null,
  isLoadingClient: false,
  clientError: null,

  agreements: [],
  isLoadingAgreements: false,
  agreementError: null,

  documents: [],
  selectedDocIds: new Set<string>(),
  isLoadingDocuments: false,
  documentError: null,

  payments: [],
  isLoadingPayments: false,
  paymentError: null,

  envelopeStatuses: {},

  activeTab: 'overview' as const,
};

export const clientManagementStore = createStore<ClientManagementState>(set => ({
  ...initialState,

  // Client actions
  setCurrentClient: client => set({ currentClient: client }),
  setIsLoadingClient: loading => set({ isLoadingClient: loading }),
  setClientError: error => set({ clientError: error }),

  // Agreement actions
  setAgreements: agreements => set({ agreements }),
  setIsLoadingAgreements: loading => set({ isLoadingAgreements: loading }),
  setAgreementError: error => set({ agreementError: error }),

  // Document actions
  setDocuments: documents => set({ documents }),
  toggleDocSelection: docId =>
    set(state => {
      const newSelected = new Set(state.selectedDocIds);
      if (newSelected.has(docId)) {
        newSelected.delete(docId);
      } else {
        newSelected.add(docId);
      }
      return { selectedDocIds: newSelected };
    }),
  clearSelectedDocs: () => set({ selectedDocIds: new Set() }),
  setIsLoadingDocuments: loading => set({ isLoadingDocuments: loading }),
  setDocumentError: error => set({ documentError: error }),

  // Payment actions
  setPayments: payments => set({ payments }),
  setIsLoadingPayments: loading => set({ isLoadingPayments: loading }),
  setPaymentError: error => set({ paymentError: error }),

  // Envelope status actions
  setEnvelopeStatus: (agreementId, status) =>
    set(state => ({
      envelopeStatuses: {
        ...state.envelopeStatuses,
        [agreementId]: status,
      },
    })),
  setEnvelopeStatuses: statuses => set({ envelopeStatuses: statuses }),

  // UI actions
  setActiveTab: tab => set({ activeTab: tab }),

  // Reset all state
  reset: () => set(initialState),
}));

/**
 * Hook to use the client management store in React components
 *
 * Usage:
 * const client = useClientManagement((state) => state.currentClient);
 * const setClient = useClientManagement((state) => state.setCurrentClient);
 */
export function useClientManagement<T>(selector: (state: ClientManagementState) => T): T {
  const [state, setState] = React.useState(() => selector(clientManagementStore.getState()));

  React.useEffect(() => {
    const unsubscribe = clientManagementStore.subscribe(() => {
      setState(selector(clientManagementStore.getState()));
    });
    return unsubscribe;
  }, [selector]);

  return state;
}

// For convenience - import React
import React from 'react';
