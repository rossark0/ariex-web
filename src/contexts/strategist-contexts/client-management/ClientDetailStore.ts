'use client';

import { create } from 'zustand';
import {
  getClientById,
  type ApiClient,
  type ApiAgreement,
  type ApiDocument,
  listClientAgreements,
  listAgreementDocuments,
  getAgreementEnvelopeStatus,
  getDocumentById,
  getDownloadUrl,
  createCharge,
  generatePaymentLink,
  attachPayment,
  getChargesForAgreement,
  deleteTodo,
  updateDocumentAcceptance,
  updateAgreementStatus,
  deleteDocument,
  getStrategistSigningInfo,
  getSignedAgreementDocumentUrl,
  getLinkedComplianceUsers,
} from '@/lib/api/strategist.api';
import { sendAgreementToClient } from '@/lib/api/agreements.actions';
import {
  sendStrategyToClient,
  completeAgreement,
  getStrategyDocumentUrl,
} from '@/lib/api/strategies.actions';
import { useUiStore } from '@/contexts/ui/UiStore';
import { useAuthStore } from '@/contexts/auth/AuthStore';
import {
  AgreementStatus,
  isAgreementSigned,
  isAgreementPaid,
  logAgreements,
  logAgreementStatus,
} from '@/types/agreement';
import { AcceptanceStatus } from '@/types/document';
import {
  computeStep5State,
  parseStrategyMetadata,
  type Step5State,
  type StrategyMetadata,
} from './models/strategy.model';
import type { AgreementSendData } from '@/components/agreements/agreement-sheet';
import type { StrategySendData } from '@/components/strategy/strategy-sheet';
import type { ClientStatusKey } from '@/lib/client-status';

// ─── Types ────────────────────────────────────────────────────────────────

/**
 * Lightweight client information derived from `ApiClient`.
 *
 * Structurally compatible with `FullClientMock` so any component accepting
 * `ClientInfo` also accepts the legacy mock type without changes.
 */
export interface ClientInfo {
  user: {
    id: string;
    name: string | null;
    email: string;
    createdAt: Date;
  };
  profile: {
    phoneNumber: string | null;
    businessName: string | null;
    businessType: string | null;
    city: string | null;
    state: string | null;
    estimatedIncome: number | null;
    filingStatus: string | null;
    dependents: number | null;
  };
  /** Always empty when derived from API — kept for backward compat. */
  onboardingTasks: Array<{
    type: string;
    status: string;
    completedAt: Date | null;
    updatedAt?: Date;
  }>;
  /** Always empty when derived from API — kept for backward compat. */
  payments: Array<{
    amount: number;
    status: string;
    description?: string;
    paymentMethod?: string;
    paidAt?: Date | null;
    dueDate?: Date | null;
  }>;
}

/** Charge data shape used in the store. */
export interface ChargeInfo {
  id: string;
  paymentLink?: string;
  status: string;
  amount?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function apiClientToClientInfo(apiClient: ApiClient): ClientInfo {
  return {
    user: {
      id: apiClient.id,
      name: apiClient.name || apiClient.fullName || null,
      email: apiClient.email,
      createdAt: new Date(apiClient.createdAt),
    },
    profile: {
      phoneNumber:
        apiClient.clientProfile?.phoneNumber || apiClient.clientProfile?.phone || null,
      businessName: apiClient.clientProfile?.businessName || null,
      businessType: apiClient.clientProfile?.businessType || null,
      city: apiClient.clientProfile?.city || null,
      state: apiClient.clientProfile?.state || null,
      estimatedIncome: apiClient.clientProfile?.estimatedIncome ?? null,
      filingStatus: apiClient.clientProfile?.filingStatus || null,
      dependents: apiClient.clientProfile?.dependents ?? null,
    },
    onboardingTasks: [],
    payments: [],
  };
}

function getEnvelopeIdFromAgreement(agreement: ApiAgreement): string | null {
  if (agreement.signatureEnvelopeId) return agreement.signatureEnvelopeId;
  if (agreement.description) {
    const match = agreement.description.match(/__SIGNATURE_METADATA__:([\s\S]+)$/);
    if (match) {
      try {
        const metadata = JSON.parse(match[1]);
        if (metadata.envelopeId) return metadata.envelopeId;
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

async function fetchSignedDocUrl(agreement: ApiAgreement): Promise<string | null> {
  const envelopeId = getEnvelopeIdFromAgreement(agreement);
  if (envelopeId) {
    try {
      const url = await getSignedAgreementDocumentUrl(envelopeId);
      if (url) return url;
    } catch {
      /* non-critical */
    }
  }
  return null;
}

// ─── Store State ──────────────────────────────────────────────────────────

interface ClientDetailState {
  // ─── Client Slice ──────────────────────────
  clientId: string | null;
  isLoading: boolean;
  apiClient: ApiClient | null;
  clientInfo: ClientInfo | null;

  // ─── Agreements Slice ──────────────────────
  agreements: ApiAgreement[];
  isLoadingAgreements: boolean;
  agreementError: string | null;
  selectedAgreementId: string | null;
  isAgreementModalOpen: boolean;

  // ─── Payment Slice ────────────────────────
  existingCharge: ChargeInfo | null;
  isLoadingCharges: boolean;
  isPaymentModalOpen: boolean;
  isSendingPayment: boolean;
  paymentError: string | null;
  paymentAmount: number;

  // ─── Documents Slice ──────────────────────
  clientDocuments: ApiDocument[];
  selectedDocs: Set<string>;
  isLoadingDocuments: boolean;
  viewingDocId: string | null;
  isRequestDocsModalOpen: boolean;

  // ─── Todo Slice ───────────────────────────
  todoToDelete: { id: string; title: string } | null;
  deletingTodoId: string | null;

  // ─── Signing Slice ────────────────────────
  strategistCeremonyUrl: string | null;
  strategistHasSigned: boolean;
  clientHasSigned: boolean;
  signedAgreementDocUrl: string | null;
  envelopeStatuses: Record<string, string>;

  // ─── Strategy Slice ───────────────────────
  isStrategySheetOpen: boolean;
  isCompletingAgreement: boolean;
  strategyReviewPdfUrl: string | null;
  complianceUserId: string | null;
  complianceUsers: (ApiClient & { complianceUserId?: string })[];
  isStrategyReviewOpen: boolean;

  // ─── Internal ─────────────────────────────
  _hasSyncedEnvelopes: boolean;
  _hasFetchedSigningInfo: boolean;
  _initVersion: number;

  // ─── Actions ──────────────────────────────
  init: (clientId: string, initialAgreementId?: string) => Promise<void>;
  reset: () => void;
  selectAgreement: (id: string) => void;
  setSelectedAgreementId: (id: string) => void; // alias for selectAgreement
  refreshAgreements: () => Promise<void>;

  // UI toggles
  setIsAgreementModalOpen: (open: boolean) => void;
  setIsPaymentModalOpen: (open: boolean) => void;
  setPaymentAmount: (amount: number) => void;
  setViewingDocId: (id: string | null) => void;
  setIsRequestDocsModalOpen: (open: boolean) => void;
  setTodoToDelete: (todo: { id: string; title: string } | null) => void;
  setIsStrategySheetOpen: (open: boolean) => void;
  setIsStrategyReviewOpen: (open: boolean) => void;

  // Document actions
  toggleDocSelection: (docId: string) => void;

  // Handlers
  sendAgreement: (data: AgreementSendData) => Promise<void>;
  acceptDocument: (documentId: string) => Promise<void>;
  declineDocument: (documentId: string) => Promise<void>;
  advanceToStrategy: () => Promise<void>;
  sendStrategy: (data: StrategySendData) => Promise<void>;
  completeAgreementAction: () => Promise<void>;
  openPaymentModal: () => void;
  sendPaymentLink: () => Promise<void>;
  sendPaymentReminder: () => Promise<void>;
  viewStrategyDocument: () => Promise<void>;
  downloadSignedStrategy: () => Promise<void>;
  sendRevisedStrategy: (data: StrategySendData) => Promise<void>;
  deleteTodoAction: () => Promise<void>;
  viewDocument: (docId: string) => Promise<void>;
  strategistSign: () => void;
  refreshSigningInfo: () => Promise<void>;

  // Internal loading methods
  _loadParallelData: () => Promise<void>;
  _syncEnvelopeStatuses: () => Promise<void>;
  _loadStrategyDocUrl: () => Promise<void>;
  _loadComplianceUsers: () => Promise<void>;
}

// ─── Initial State ────────────────────────────────────────────────────────

const initialState = {
  clientId: null as string | null,
  isLoading: true,
  apiClient: null as ApiClient | null,
  clientInfo: null as ClientInfo | null,

  agreements: [] as ApiAgreement[],
  isLoadingAgreements: true,
  agreementError: null as string | null,
  selectedAgreementId: null as string | null,
  isAgreementModalOpen: false,

  existingCharge: null as ChargeInfo | null,
  isLoadingCharges: true,
  isPaymentModalOpen: false,
  isSendingPayment: false,
  paymentError: null as string | null,
  paymentAmount: 499,

  clientDocuments: [] as ApiDocument[],
  selectedDocs: new Set<string>(),
  isLoadingDocuments: true,
  viewingDocId: null as string | null,
  isRequestDocsModalOpen: false,

  todoToDelete: null as { id: string; title: string } | null,
  deletingTodoId: null as string | null,

  strategistCeremonyUrl: null as string | null,
  strategistHasSigned: false,
  clientHasSigned: false,
  signedAgreementDocUrl: null as string | null,
  envelopeStatuses: {} as Record<string, string>,

  isStrategySheetOpen: false,
  isCompletingAgreement: false,
  strategyReviewPdfUrl: null as string | null,
  complianceUserId: null as string | null,
  complianceUsers: [] as (ApiClient & { complianceUserId?: string })[],
  isStrategyReviewOpen: false,

  _hasSyncedEnvelopes: false,
  _hasFetchedSigningInfo: false,
  _initVersion: 0,
};

// ─── Store ────────────────────────────────────────────────────────────────

export const useClientDetailStore = create<ClientDetailState>((set, get) => ({
  ...initialState,

  // ──────────────────────────────────────────────────────────────────────
  // Initialization
  // ──────────────────────────────────────────────────────────────────────

  init: async (clientId: string, initialAgreementId?: string) => {
    const state = get();
    // Skip if already initialized for this client (HMR resilience)
    if (state.clientId === clientId && state.apiClient) return;

    const version = state._initVersion + 1;
    set({
      ...initialState,
      clientId,
      isLoading: true,
      selectedAgreementId: initialAgreementId ?? null,
      _initVersion: version,
    });

    // Load client + agreements in parallel
    const [clientResult, agreementsResult] = await Promise.allSettled([
      getClientById(clientId),
      listClientAgreements(clientId),
    ]);

    // Stale guard
    if (get()._initVersion !== version) return;

    // Process client
    let apiClient: ApiClient | null = null;
    if (clientResult.status === 'fulfilled' && clientResult.value) {
      apiClient = clientResult.value;
      set({
        apiClient,
        clientInfo: apiClientToClientInfo(apiClient),
      });
    }

    // Process agreements
    let agreements: ApiAgreement[] = [];
    if (agreementsResult.status === 'fulfilled') {
      agreements = agreementsResult.value;
      logAgreements(
        'strategist',
        agreements.map(a => ({
          id: a.id,
          status: a.status as AgreementStatus,
          name: a.name,
        })),
        `Client ${clientId}`
      );
      // Auto-select: prefer URL-provided ID if it exists in the list, else newest
      let selectedId = get().selectedAgreementId;
      if (selectedId && !agreements.find(a => a.id === selectedId)) {
        // URL-provided agreement ID not found in this client's agreements — clear it
        selectedId = null;
      }
      if (!selectedId && agreements.length > 0) {
        const newest = [...agreements].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        selectedId = newest.id;
      }
      set({
        agreements,
        isLoadingAgreements: false,
        selectedAgreementId: selectedId,
      });
    } else {
      set({ isLoadingAgreements: false });
    }

    set({ isLoading: false });

    // Cascade: parallel data loading + envelope sync + compliance users
    if (agreements.length > 0) {
      get()._loadParallelData();
      get()._syncEnvelopeStatuses();
    } else {
      // No agreements → nothing to load; clear dependent loading flags
      // so the UI doesn't stay in an infinite spinner.
      set({
        isLoadingCharges: false,
        isLoadingDocuments: false,
      });
    }
    get()._loadComplianceUsers();
  },

  reset: () => {
    set({ ...initialState, _initVersion: get()._initVersion + 1 });
    // Clear UI store selection
    useUiStore.getState().clearSelection();
  },

  // ──────────────────────────────────────────────────────────────────────
  // Agreement Selection
  // ──────────────────────────────────────────────────────────────────────

  selectAgreement: (id: string) => {
    set({
      selectedAgreementId: id,
      signedAgreementDocUrl: null,
      strategistCeremonyUrl: null,
      strategistHasSigned: false,
      clientHasSigned: false,
      existingCharge: null,
      clientDocuments: [],
      _hasFetchedSigningInfo: false,
    });
    get()._loadParallelData();
  },

  setSelectedAgreementId: (id: string) => get().selectAgreement(id),

  refreshAgreements: async () => {
    const { clientId } = get();
    if (!clientId) return;
    const data = await listClientAgreements(clientId);
    set({ agreements: data });
    // Refresh parallel data with updated agreements
    get()._loadParallelData();
  },

  // ──────────────────────────────────────────────────────────────────────
  // UI Toggles
  // ──────────────────────────────────────────────────────────────────────

  setIsAgreementModalOpen: (open) => set({ isAgreementModalOpen: open }),
  setIsPaymentModalOpen: (open) => set({ isPaymentModalOpen: open }),
  setPaymentAmount: (amount) => set({ paymentAmount: amount }),
  setViewingDocId: (id) => set({ viewingDocId: id }),
  setIsRequestDocsModalOpen: (open) => set({ isRequestDocsModalOpen: open }),
  setTodoToDelete: (todo) => set({ todoToDelete: todo }),
  setIsStrategySheetOpen: (open) => set({ isStrategySheetOpen: open }),
  setIsStrategyReviewOpen: (open) => set({ isStrategyReviewOpen: open }),

  // ──────────────────────────────────────────────────────────────────────
  // Document Selection
  // ──────────────────────────────────────────────────────────────────────

  toggleDocSelection: (docId: string) => {
    const next = new Set(get().selectedDocs);
    if (next.has(docId)) next.delete(docId);
    else next.add(docId);
    set({ selectedDocs: next });

    // Sync with UiStore
    const { setSelection } = useUiStore.getState();
    setSelection(
      next.size,
      () => {
        set({ selectedDocs: new Set() });
        useUiStore.getState().setSelection(0, null, null, null);
      },
      next.size > 0
        ? async () => {
            useUiStore.getState().setDownloadingSelection(true);
            try {
              for (const id of get().selectedDocs) {
                try {
                  const url = await getDownloadUrl(id);
                  if (url) window.open(url, '_blank');
                } catch (error) {
                  console.error('Failed to download document:', id, error);
                }
              }
            } finally {
              useUiStore.getState().setDownloadingSelection(false);
            }
          }
        : null,
      next.size > 0
        ? async () => {
            const docs = get().selectedDocs;
            if (docs.size === 0) return;
            const msg =
              docs.size === 1
                ? 'Are you sure you want to delete this document?'
                : `Are you sure you want to delete ${docs.size} documents?`;
            if (!window.confirm(msg)) return;
            let deletedCount = 0;
            for (const id of docs) {
              try {
                const success = await deleteDocument(id);
                if (success) deletedCount++;
              } catch (error) {
                console.error('Failed to delete document:', id, error);
              }
            }
            set({ selectedDocs: new Set() });
            if (deletedCount > 0) await get().refreshAgreements();
          }
        : null
    );
  },

  // ──────────────────────────────────────────────────────────────────────
  // Agreement Handlers
  // ──────────────────────────────────────────────────────────────────────

  sendAgreement: async (data: AgreementSendData) => {
    const { clientId } = get();
    if (!clientId) return;

    set({ agreementError: null });
    try {
      const result = await sendAgreementToClient({
        clientId,
        customTitle: data.title,
        description: data.description,
        price: data.price,
        todos: data.todos,
        markdownContent: data.markdownContent,
        pages: data.pages,
        pdfBase64: data.pdfBase64,
        totalPages: data.totalPages,
      });
      if (result.success) {
        if (result.agreementId) {
          logAgreementStatus(
            'strategist',
            result.agreementId,
            AgreementStatus.PENDING_SIGNATURE,
            'Agreement sent'
          );
        }
        if (result.agreementId && result.ceremonyUrl) {
          const urls = JSON.parse(localStorage.getItem('ariex_ceremony_urls') || '{}');
          urls[result.agreementId] = result.ceremonyUrl;
          localStorage.setItem('ariex_ceremony_urls', JSON.stringify(urls));
        }
        try {
          const freshData = await listClientAgreements(clientId);
          const enriched = freshData.map(a => {
            const stored = JSON.parse(localStorage.getItem('ariex_ceremony_urls') || '{}');
            return {
              ...a,
              signatureCeremonyUrl: a.signatureCeremonyUrl || stored[a.id],
            };
          });
          set({ agreements: enriched });
          if (result.agreementId) set({ selectedAgreementId: result.agreementId });
        } catch {
          set({
            agreements: [
              {
                id: result.agreementId || 'temp',
                name: data.title,
                description: data.description,
                price: data.price,
                status: AgreementStatus.PENDING_SIGNATURE,
                clientId,
                strategistId: '',
                signatureCeremonyUrl: result.ceremonyUrl,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                todoLists: [],
              },
            ],
          });
        }
        set({ isAgreementModalOpen: false });
      } else {
        set({ agreementError: result.error || 'Failed to send agreement' });
      }
    } catch (error) {
      console.error('Failed to send agreement:', error);
      set({ agreementError: 'An unexpected error occurred' });
    }
  },

  // ──────────────────────────────────────────────────────────────────────
  // Document Handlers
  // ──────────────────────────────────────────────────────────────────────

  acceptDocument: async (documentId: string) => {
    try {
      const success = await updateDocumentAcceptance(
        documentId,
        AcceptanceStatus.ACCEPTED_BY_STRATEGIST
      );
      if (success) await get().refreshAgreements();
    } catch (error) {
      console.error('Failed to accept document:', error);
    }
  },

  declineDocument: async (documentId: string) => {
    try {
      const success = await updateDocumentAcceptance(
        documentId,
        AcceptanceStatus.REJECTED_BY_STRATEGIST
      );
      if (success) await get().refreshAgreements();
    } catch (error) {
      console.error('Failed to decline document:', error);
    }
  },

  viewDocument: async (docId: string) => {
    set({ viewingDocId: docId });
    try {
      const url = await getDownloadUrl(docId);
      if (url) window.open(url, '_blank');
    } catch (err) {
      console.error('[UI] Error getting download URL:', err);
    } finally {
      set({ viewingDocId: null });
    }
  },

  // ──────────────────────────────────────────────────────────────────────
  // Strategy Handlers
  // ──────────────────────────────────────────────────────────────────────

  advanceToStrategy: async () => {
    const signedAgreement = selectSignedAgreement(get());
    if (!signedAgreement) return;
    try {
      const success = await updateAgreementStatus(
        signedAgreement.id,
        AgreementStatus.PENDING_STRATEGY
      );
      if (success) {
        logAgreementStatus(
          'strategist',
          signedAgreement.id,
          AgreementStatus.PENDING_STRATEGY,
          'Ready for strategy'
        );
        await get().refreshAgreements();
      }
    } catch (error) {
      console.error('Failed to advance to strategy:', error);
    }
  },

  sendStrategy: async (data: StrategySendData) => {
    const signedAgreement = selectSignedAgreement(get());
    const { apiClient } = get();
    if (!signedAgreement || !apiClient) return;
    try {
      const result = await sendStrategyToClient({
        agreementId: signedAgreement.id,
        clientId: apiClient.id,
        clientName: apiClient.name || apiClient.fullName || apiClient.email.split('@')[0],
        clientEmail: apiClient.email,
        strategistName: 'Ariex Tax Strategist',
        data,
      });
      if (result.success) {
        logAgreementStatus(
          'strategist',
          signedAgreement.id,
          AgreementStatus.PENDING_STRATEGY_REVIEW,
          'Strategy sent'
        );
        set({ isStrategySheetOpen: false });
        await get().refreshAgreements();
      }
    } catch (error) {
      console.error('Failed to send strategy:', error);
    }
  },

  completeAgreementAction: async () => {
    const signedAgreement = selectSignedAgreement(get());
    if (!signedAgreement) return;
    set({ isCompletingAgreement: true });
    try {
      const result = await completeAgreement(signedAgreement.id);
      if (result.success) {
        logAgreementStatus(
          'strategist',
          signedAgreement.id,
          AgreementStatus.COMPLETED,
          'Agreement completed'
        );
        await get().refreshAgreements();
      }
    } catch (error) {
      console.error('Failed to complete agreement:', error);
    } finally {
      set({ isCompletingAgreement: false });
    }
  },

  viewStrategyDocument: async () => {
    const { strategyReviewPdfUrl } = get();
    const strategyDocumentId = selectStrategyDocumentId(get());
    if (strategyReviewPdfUrl) {
      set({ isStrategyReviewOpen: true });
    } else if (strategyDocumentId) {
      const result = await getStrategyDocumentUrl(strategyDocumentId);
      if (result.success && result.url) {
        set({ strategyReviewPdfUrl: result.url, isStrategyReviewOpen: true });
      } else {
        alert('Strategy document not yet available. Please try again in a moment.');
      }
    }
  },

  downloadSignedStrategy: async () => {
    // Alias for viewStrategyDocument
    await get().viewStrategyDocument();
  },

  sendRevisedStrategy: async (data: StrategySendData) => {
    const signedAgreement = selectSignedAgreement(get());
    const { apiClient } = get();
    if (!signedAgreement || !apiClient) return;
    try {
      const result = await sendStrategyToClient({
        agreementId: signedAgreement.id,
        clientId: apiClient.id,
        clientName: apiClient.name || apiClient.fullName || apiClient.email.split('@')[0],
        clientEmail: apiClient.email,
        strategistName: 'Ariex Tax Strategist',
        data,
      });
      if (result.success) {
        set({ isStrategyReviewOpen: false });
        await get().refreshAgreements();
      }
    } catch (error) {
      console.error('Failed to send revised strategy:', error);
    }
  },

  // ──────────────────────────────────────────────────────────────────────
  // Payment Handlers
  // ──────────────────────────────────────────────────────────────────────

  openPaymentModal: () => {
    const signedAgreement = selectSignedAgreement(get());
    if (!signedAgreement) return;
    let amount = 499;
    const match = signedAgreement.description?.match(/__SIGNATURE_METADATA__:([\s\S]+)$/);
    if (match) {
      try {
        const m = JSON.parse(match[1]);
        if (m.price) amount = m.price;
      } catch {
        /* default */
      }
    }
    set({ paymentAmount: amount, paymentError: null, isPaymentModalOpen: true });
  },

  sendPaymentLink: async () => {
    const { isSendingPayment, paymentAmount } = get();
    const signedAgreement = selectSignedAgreement(get());
    if (isSendingPayment || !signedAgreement) return;
    set({ isSendingPayment: true, paymentError: null });
    try {
      const newCharge = await createCharge({
        agreementId: signedAgreement.id,
        amount: paymentAmount,
        currency: 'usd',
        description: `Onboarding Fee - ${signedAgreement.name}`,
      });
      if (!newCharge) {
        set({ paymentError: 'Failed to create payment charge' });
        return;
      }

      let link: string | null = null;
      try {
        link = await generatePaymentLink(newCharge.id);
      } catch (e) {
        set({
          paymentError: `Failed to generate payment link: ${e instanceof Error ? e.message : 'Unknown error'}`,
        });
        return;
      }
      if (!link) {
        set({ paymentError: 'Failed to generate payment link' });
        return;
      }

      const success = await attachPayment(signedAgreement.id, {
        amount: paymentAmount,
        paymentLink: link,
      });
      if (success) {
        logAgreementStatus(
          'strategist',
          signedAgreement.id,
          AgreementStatus.PENDING_PAYMENT,
          'Payment link sent'
        );
        set({
          existingCharge: { ...newCharge, paymentLink: link },
          isPaymentModalOpen: false,
        });
        await get().refreshAgreements();
      } else {
        set({ paymentError: 'Failed to attach payment link' });
      }
    } catch (error) {
      console.error('Failed to send payment link:', error);
      set({
        paymentError: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      set({ isSendingPayment: false });
    }
  },

  sendPaymentReminder: async () => {
    const { isSendingPayment, existingCharge, paymentAmount } = get();
    const signedAgreement = selectSignedAgreement(get());
    if (isSendingPayment || !signedAgreement || !existingCharge) return;
    set({ isSendingPayment: true, paymentError: null });
    try {
      let link: string | null = null;
      try {
        link = await generatePaymentLink(existingCharge.id);
      } catch (e) {
        set({
          paymentError: `Failed to generate payment link: ${e instanceof Error ? e.message : 'Unknown error'}`,
        });
        return;
      }
      if (!link) {
        set({ paymentError: 'Failed to generate payment link' });
        return;
      }

      const success = await attachPayment(signedAgreement.id, {
        amount:
          typeof existingCharge.amount === 'number' ? existingCharge.amount : paymentAmount,
        paymentLink: link,
      });
      if (success) {
        logAgreementStatus(
          'strategist',
          signedAgreement.id,
          AgreementStatus.PENDING_PAYMENT,
          'Reminder sent'
        );
        set({ existingCharge: { ...existingCharge, paymentLink: link } });
        await get().refreshAgreements();
      } else {
        set({ paymentError: 'Failed to update payment link' });
      }
    } catch (error) {
      console.error('Failed to send payment reminder:', error);
      set({
        paymentError: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      set({ isSendingPayment: false });
    }
  },

  // ──────────────────────────────────────────────────────────────────────
  // Todo Handlers
  // ──────────────────────────────────────────────────────────────────────

  deleteTodoAction: async () => {
    const { todoToDelete } = get();
    if (!todoToDelete) return;
    set({ deletingTodoId: todoToDelete.id });
    const success = await deleteTodo(todoToDelete.id);
    if (success) await get().refreshAgreements();
    set({ deletingTodoId: null, todoToDelete: null });
  },

  // ──────────────────────────────────────────────────────────────────────
  // Signing Handlers
  // ──────────────────────────────────────────────────────────────────────

  strategistSign: () => {
    const { strategistCeremonyUrl } = get();
    if (strategistCeremonyUrl) {
      window.open(strategistCeremonyUrl, '_blank');
    }
  },

  refreshSigningInfo: async () => {
    const { agreements, selectedAgreementId } = get();
    const active =
      agreements.find(a => a.id === selectedAgreementId) ??
      [...agreements].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
    if (
      !active ||
      active.status === AgreementStatus.DRAFT ||
      active.status === AgreementStatus.CANCELLED
    ) {
      return;
    }
    try {
      const info = await getStrategistSigningInfo(active.id);
      // Only update if we're still on the same agreement
      if (get().selectedAgreementId !== selectedAgreementId) return;
      const changed =
        info.strategistHasSigned !== get().strategistHasSigned ||
        info.clientHasSigned !== get().clientHasSigned;
      set({
        strategistHasSigned: info.strategistHasSigned,
        clientHasSigned: info.clientHasSigned,
      });
      if (info.strategistCeremonyUrl) {
        set({ strategistCeremonyUrl: info.strategistCeremonyUrl });
      }
      if (info.signedDocumentUrl) {
        set({ signedAgreementDocUrl: info.signedDocumentUrl });
      }
      // If both just signed, refresh agreements to get updated status
      if (changed && info.strategistHasSigned && info.clientHasSigned) {
        await get().refreshAgreements();
      }
    } catch (error) {
      console.error('[Store] refreshSigningInfo failed:', error);
    }
  },

  // ──────────────────────────────────────────────────────────────────────
  // Internal: Parallel Data Loading
  // ──────────────────────────────────────────────────────────────────────

  _loadParallelData: async () => {
    const { agreements, selectedAgreementId, _initVersion } = get();
    if (agreements.length === 0) return;

    const version = _initVersion;
    const target =
      agreements.find(a => a.id === selectedAgreementId) ??
      [...agreements].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

    // 1. Load documents
    async function loadDocuments() {
      if (!target) {
        set({ isLoadingDocuments: false });
        return;
      }
      set({ isLoadingDocuments: true });
      try {
        const docs = await listAgreementDocuments(target.id);
        if (target.contractDocumentId) {
          const alreadyIncluded = docs.some(d => d.id === target.contractDocumentId);
          if (!alreadyIncluded) {
            try {
              const contractDoc = await getDocumentById(target.contractDocumentId);
              if (contractDoc) docs.unshift(contractDoc);
            } catch {
              /* non-critical */
            }
          }
        }
        if (get()._initVersion === version) set({ clientDocuments: docs });
      } catch (error) {
        console.error('[Store] Failed to load documents:', error);
      } finally {
        if (get()._initVersion === version) set({ isLoadingDocuments: false });
      }
    }

    // 2. Fetch charges (scoped to selected agreement only)
    async function fetchCharges() {
      set({ isLoadingCharges: true });
      const currentAgreements = get().agreements;
      const selectedAg = currentAgreements.find(a => a.id === get().selectedAgreementId);
      const signed = selectedAg && isAgreementSigned(selectedAg.status) ? selectedAg : null;
      if (!signed) {
        if (get()._initVersion === version) {
          set({ existingCharge: null, isLoadingCharges: false });
        }
        return;
      }
      try {
        const charges = await getChargesForAgreement(signed.id);
        if (get()._initVersion !== version) return;
        const pendingCharge = charges.find((c: any) => c.status === 'pending') || charges[0];
        set({ existingCharge: pendingCharge || null });

        // Auto-advance if charge is paid but agreement still at PENDING_PAYMENT
        const paidCharge = charges.find((c: any) => c.status === 'paid');
        if (paidCharge && signed.status === AgreementStatus.PENDING_PAYMENT) {
          updateAgreementStatus(signed.id, AgreementStatus.PENDING_TODOS_COMPLETION)
            .then(() => get().refreshAgreements())
            .catch(err => console.error('[Store] Failed to auto-advance agreement:', err));
        }
      } catch (error) {
        console.error('[Store] Failed to fetch charges:', error);
        if (get()._initVersion === version) set({ existingCharge: null });
      } finally {
        if (get()._initVersion === version) set({ isLoadingCharges: false });
      }
    }

    // 3. Fetch signing info
    async function fetchSigningInfo() {
      if (get()._hasFetchedSigningInfo) return;
      const currentAgreements = get().agreements;
      const active =
        currentAgreements.find(a => a.id === get().selectedAgreementId) ??
        [...currentAgreements].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];

      if (
        !active ||
        active.status === AgreementStatus.DRAFT ||
        active.status === AgreementStatus.CANCELLED
      ) {
        return;
      }
      set({ _hasFetchedSigningInfo: true });

      try {
        const info = await getStrategistSigningInfo(active.id);
        if (get()._initVersion !== version) return;

        set({
          strategistHasSigned: info.strategistHasSigned,
          clientHasSigned: info.clientHasSigned,
        });
        if (info.strategistCeremonyUrl) {
          set({ strategistCeremonyUrl: info.strategistCeremonyUrl });
        }
        if (info.signedDocumentUrl) {
          set({ signedAgreementDocUrl: info.signedDocumentUrl });
        } else if (isAgreementSigned(active.status)) {
          const url = await fetchSignedDocUrl(active);
          if (get()._initVersion === version && url) {
            set({ signedAgreementDocUrl: url });
          }
        }
      } catch (error) {
        console.error('[Store] getStrategistSigningInfo failed:', error);
        if (get()._initVersion !== version) return;
        const fallbackActive =
          currentAgreements.find(a => a.id === get().selectedAgreementId) ??
          [...currentAgreements].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
        if (fallbackActive && isAgreementSigned(fallbackActive.status)) {
          const url = await fetchSignedDocUrl(fallbackActive);
          if (get()._initVersion === version && url) {
            set({ signedAgreementDocUrl: url });
          }
        }
      }
    }

    await Promise.allSettled([loadDocuments(), fetchCharges(), fetchSigningInfo()]);

    // Load strategy doc URL if available
    get()._loadStrategyDocUrl();
  },

  // ──────────────────────────────────────────────────────────────────────
  // Internal: Envelope Status Sync
  // ──────────────────────────────────────────────────────────────────────

  _syncEnvelopeStatuses: async () => {
    if (get()._hasSyncedEnvelopes) return;
    const { agreements, _initVersion: version } = get();
    if (agreements.length === 0) return;
    set({ _hasSyncedEnvelopes: true });

    const agreementsWithEnvelopes = agreements.filter(a => a.signatureEnvelopeId);
    if (agreementsWithEnvelopes.length === 0) return;

    try {
      const results = await Promise.allSettled(
        agreementsWithEnvelopes.map(async agreement => {
          const result = await getAgreementEnvelopeStatus(
            agreement.id,
            agreement.signatureEnvelopeId!
          );
          return { agreementId: agreement.id, status: result.status, agreement };
        })
      );

      if (get()._initVersion !== version) return;

      const statuses: Record<string, string> = {};
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.status) {
          statuses[result.value.agreementId] = result.value.status;
          logAgreementStatus(
            'strategist',
            result.value.agreementId,
            result.value.agreement.status as AgreementStatus,
            `Envelope: ${result.value.status}`
          );
        }
      }

      if (Object.keys(statuses).length > 0) {
        set({ envelopeStatuses: statuses });
        if (Object.values(statuses).some(s => s === 'completed')) {
          await get().refreshAgreements();
        }
      }
    } catch (err) {
      console.error('[Store] Failed to sync envelope statuses:', err);
    }
  },

  // ──────────────────────────────────────────────────────────────────────
  // Internal: Strategy Doc URL
  // ──────────────────────────────────────────────────────────────────────

  _loadStrategyDocUrl: async () => {
    const strategyDocumentId = selectStrategyDocumentId(get());
    if (!strategyDocumentId) return;
    const { _initVersion: version } = get();
    try {
      const result = await getStrategyDocumentUrl(strategyDocumentId);
      if (get()._initVersion === version && result.success && result.url) {
        set({ strategyReviewPdfUrl: result.url });
      }
    } catch {
      /* non-critical */
    }
  },

  // ──────────────────────────────────────────────────────────────────────
  // Internal: Compliance Users
  // ──────────────────────────────────────────────────────────────────────

  _loadComplianceUsers: async () => {
    const authUserId = useAuthStore.getState().user?.id;
    if (!authUserId) return;
    const { _initVersion: version } = get();
    try {
      const fetchedUsers = await getLinkedComplianceUsers();
      if (get()._initVersion !== version) return;
      if (fetchedUsers.length > 0) {
        const mappedUsers = fetchedUsers.map((u: any) => ({
          ...u,
          complianceUserId: u.complianceUserId || u.userId || u.id,
        }));
        set({ complianceUsers: mappedUsers });

        const targetUser: any =
          mappedUsers.find((u: any) => u.email?.includes('koged')) || mappedUsers[0];
        const actualUserId = targetUser.complianceUserId;
        set({ complianceUserId: actualUserId });
      }
    } catch {
      /* non-critical */
    }
  },
}));

// ─── Computed Selectors ───────────────────────────────────────────────────

export function selectSortedAgreements(state: ClientDetailState): ApiAgreement[] {
  return [...state.agreements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function selectActiveAgreement(
  state: ClientDetailState
): ApiAgreement | undefined {
  const sorted = selectSortedAgreements(state);
  return state.agreements.find(a => a.id === state.selectedAgreementId) ?? sorted[0];
}

export function selectAllTodos(state: ClientDetailState) {
  const active = selectActiveAgreement(state);
  return active?.todoLists?.flatMap(list => list.todos || []) || [];
}

export function selectHasAgreementSent(state: ClientDetailState): boolean {
  const active = selectActiveAgreement(state);
  return active
    ? active.status !== AgreementStatus.DRAFT && active.status !== AgreementStatus.CANCELLED
    : false;
}

export function selectEnvelopeIsCompleted(state: ClientDetailState): boolean {
  const active = selectActiveAgreement(state);
  return !!(active && state.envelopeStatuses[active.id] === 'completed');
}

export function selectHasAgreementSigned(state: ClientDetailState): boolean {
  const active = selectActiveAgreement(state);
  return active
    ? isAgreementSigned(active.status) || selectEnvelopeIsCompleted(state)
    : false;
}

export function selectSignedAgreement(
  state: ClientDetailState
): ApiAgreement | null {
  const active = selectActiveAgreement(state);
  if (!active) return null;
  if (isAgreementSigned(active.status)) return active;
  if (selectHasAgreementSigned(state)) return active;
  return null;
}

export function selectHasPaymentSent(state: ClientDetailState): boolean {
  return !!state.existingCharge;
}

export function selectHasPaymentReceived(state: ClientDetailState): boolean {
  const signed = selectSignedAgreement(state);
  return !!(signed && isAgreementPaid(signed.status));
}

export function selectDocumentTodos(state: ClientDetailState) {
  const allTodos = selectAllTodos(state);
  return allTodos.filter(
    (todo: any) =>
      !todo.title.toLowerCase().includes('sign') && todo.title.toLowerCase() !== 'pay'
  );
}

export function selectUploadedDocCount(state: ClientDetailState): number {
  const docTodos = selectDocumentTodos(state);
  return docTodos.filter(
    (todo: any) =>
      todo.status === 'completed' || todo.document?.uploadStatus === 'FILE_UPLOADED'
  ).length;
}

export function selectAcceptedDocCount(state: ClientDetailState): number {
  const docTodos = selectDocumentTodos(state);
  return docTodos.filter(
    (todo: any) => todo.document?.acceptanceStatus === AcceptanceStatus.ACCEPTED_BY_STRATEGIST
  ).length;
}

export function selectTotalDocTodos(state: ClientDetailState): number {
  return selectDocumentTodos(state).length;
}

export function selectHasDocumentsRequested(state: ClientDetailState): boolean {
  return selectTotalDocTodos(state) > 0;
}

export function selectHasAllDocumentsUploaded(state: ClientDetailState): boolean {
  const total = selectTotalDocTodos(state);
  return total > 0 && selectUploadedDocCount(state) >= total;
}

export function selectHasAllDocumentsAccepted(state: ClientDetailState): boolean {
  const total = selectTotalDocTodos(state);
  return total > 0 && selectAcceptedDocCount(state) >= total;
}

export function selectTodoTitles(state: ClientDetailState): Map<string, string> {
  const allTodos = selectAllTodos(state);
  const m = new Map<string, string>();
  for (const todo of allTodos) m.set(todo.id, todo.title);
  return m;
}

export function selectStep3Sent(state: ClientDetailState): boolean {
  return (
    selectHasAgreementSigned(state) &&
    (selectHasPaymentSent(state) || selectHasPaymentReceived(state))
  );
}

export function selectStep3Complete(state: ClientDetailState): boolean {
  return selectHasPaymentReceived(state);
}

export function selectStrategyMetadata(
  state: ClientDetailState
): (StrategyMetadata & { strategyCeremonyUrl?: string; strategyEnvelopeId?: string }) | null {
  const signed = selectSignedAgreement(state);
  return parseStrategyMetadata(signed?.description) as any;
}

export function selectStrategyDocumentId(state: ClientDetailState): string | null {
  return selectStrategyMetadata(state)?.strategyDocumentId ?? null;
}

export function selectStrategyApiDoc(state: ClientDetailState): ApiDocument | null {
  const docId = selectStrategyDocumentId(state);
  return docId ? (state.clientDocuments.find(d => d.id === docId) ?? null) : null;
}

export function selectStep5State(state: ClientDetailState): Step5State {
  const active = selectActiveAgreement(state);
  const strategyDoc = selectStrategyApiDoc(state);
  return computeStep5State(
    active?.status ?? '',
    strategyDoc?.acceptanceStatus ?? null
  );
}

export function selectStep5Sent(
  state: ClientDetailState
): boolean | string | undefined {
  return selectStep5State(state).strategySent;
}

export function selectStep5Complete(
  state: ClientDetailState
): boolean | string {
  return selectStep5State(state).isComplete;
}

export function selectStrategyDoc(state: ClientDetailState): {
  signedAt?: Date;
  createdAt: Date;
  originalName: string;
  signatureStatus?: string;
} | null {
  // Legacy: previously derived from mock client.documents.
  // Now return null — the data was always empty when coming from the API.
  return null;
}

export function selectStatusKey(state: ClientDetailState): ClientStatusKey {
  const step5 = selectStep5State(state);
  if (!selectHasAgreementSigned(state)) return 'awaiting_agreement';
  if (!selectStep3Complete(state)) return 'awaiting_payment';
  if (!selectHasAllDocumentsAccepted(state)) return 'awaiting_documents';
  if (step5.isComplete) return 'active';
  if (step5.phase === 'client_review') return 'awaiting_approval';
  if (step5.phase === 'compliance_review') return 'awaiting_compliance';
  if (step5.strategySent) return 'awaiting_compliance';
  return 'ready_for_strategy';
}
