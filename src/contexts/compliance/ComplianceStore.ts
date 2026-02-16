/**
 * Compliance Store
 *
 * Vanilla Zustand store for compliance module state.
 * Mirrors the ClientManagementStore pattern.
 */

import { createStore } from 'zustand/vanilla';
import type { ApiClient, ApiAgreement, ApiDocument, ApiTodo, ApiTodoList } from '@/lib/api/strategist.api';
import type { ComplianceStrategist, ComplianceComment, FileMetadata } from '@/lib/api/compliance.api';
import type { ComplianceStrategistView, ComplianceClientView } from './models/compliance.model';

// ============================================================================
// State Interface
// ============================================================================

export interface ComplianceState {
  // ─── Strategists ─────────────────────────────────────────────
  strategists: ComplianceStrategist[];
  strategistViews: ComplianceStrategistView[];
  isLoadingStrategists: boolean;
  strategistError: string | null;

  // ─── Selected Strategist ─────────────────────────────────────
  selectedStrategist: ComplianceStrategist | null;
  isLoadingStrategistDetail: boolean;

  // ─── Clients (scoped to a strategist) ────────────────────────
  clients: ApiClient[];
  clientViews: ComplianceClientView[];
  isLoadingClients: boolean;
  clientError: string | null;

  // ─── Client Detail ───────────────────────────────────────────
  selectedClient: ApiClient | null;
  selectedAgreement: ApiAgreement | null;
  clientDocuments: ApiDocument[];
  clientFiles: FileMetadata[];
  clientTodoLists: ApiTodoList[];
  clientTodos: ApiTodo[];
  strategyDocument: ApiDocument | null;
  isLoadingClientDetail: boolean;
  clientDetailError: string | null;

  // ─── Comments ────────────────────────────────────────────────
  comments: ComplianceComment[];
  isLoadingComments: boolean;

  // ─── Actions ─────────────────────────────────────────────────

  // Strategists
  setStrategists: (strategists: ComplianceStrategist[]) => void;
  setStrategistViews: (views: ComplianceStrategistView[]) => void;
  setIsLoadingStrategists: (loading: boolean) => void;
  setStrategistError: (error: string | null) => void;

  // Selected strategist
  setSelectedStrategist: (strategist: ComplianceStrategist | null) => void;
  setIsLoadingStrategistDetail: (loading: boolean) => void;

  // Clients
  setClients: (clients: ApiClient[]) => void;
  setClientViews: (views: ComplianceClientView[]) => void;
  setIsLoadingClients: (loading: boolean) => void;
  setClientError: (error: string | null) => void;

  // Client detail
  setSelectedClient: (client: ApiClient | null) => void;
  setSelectedAgreement: (agreement: ApiAgreement | null) => void;
  setClientDocuments: (documents: ApiDocument[]) => void;
  setClientFiles: (files: FileMetadata[]) => void;
  setClientTodoLists: (todoLists: ApiTodoList[]) => void;
  setClientTodos: (todos: ApiTodo[]) => void;
  setStrategyDocument: (doc: ApiDocument | null) => void;
  setIsLoadingClientDetail: (loading: boolean) => void;
  setClientDetailError: (error: string | null) => void;

  // Comments
  setComments: (comments: ComplianceComment[]) => void;
  addComment: (comment: ComplianceComment) => void;
  setIsLoadingComments: (loading: boolean) => void;

  // Reset
  reset: () => void;
  resetClientDetail: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  strategists: [],
  strategistViews: [],
  isLoadingStrategists: false,
  strategistError: null,

  selectedStrategist: null,
  isLoadingStrategistDetail: false,

  clients: [],
  clientViews: [],
  isLoadingClients: false,
  clientError: null,

  selectedClient: null,
  selectedAgreement: null,
  clientDocuments: [],
  clientFiles: [],
  clientTodoLists: [],
  clientTodos: [],
  strategyDocument: null,
  isLoadingClientDetail: false,
  clientDetailError: null,

  comments: [],
  isLoadingComments: false,
};

// ============================================================================
// Store
// ============================================================================

export const complianceStore = createStore<ComplianceState>(set => ({
  ...initialState,

  // Strategists
  setStrategists: strategists => set({ strategists }),
  setStrategistViews: strategistViews => set({ strategistViews }),
  setIsLoadingStrategists: isLoadingStrategists => set({ isLoadingStrategists }),
  setStrategistError: strategistError => set({ strategistError }),

  // Selected strategist
  setSelectedStrategist: selectedStrategist => set({ selectedStrategist }),
  setIsLoadingStrategistDetail: isLoadingStrategistDetail => set({ isLoadingStrategistDetail }),

  // Clients
  setClients: clients => set({ clients }),
  setClientViews: clientViews => set({ clientViews }),
  setIsLoadingClients: isLoadingClients => set({ isLoadingClients }),
  setClientError: clientError => set({ clientError }),

  // Client detail
  setSelectedClient: selectedClient => set({ selectedClient }),
  setSelectedAgreement: selectedAgreement => set({ selectedAgreement }),
  setClientDocuments: clientDocuments => set({ clientDocuments }),
  setClientFiles: clientFiles => set({ clientFiles }),
  setClientTodoLists: clientTodoLists => set({ clientTodoLists }),
  setClientTodos: clientTodos => set({ clientTodos }),
  setStrategyDocument: strategyDocument => set({ strategyDocument }),
  setIsLoadingClientDetail: isLoadingClientDetail => set({ isLoadingClientDetail }),
  setClientDetailError: clientDetailError => set({ clientDetailError }),

  // Comments
  setComments: comments => set({ comments }),
  addComment: comment => set(state => ({ comments: [comment, ...state.comments] })),
  setIsLoadingComments: isLoadingComments => set({ isLoadingComments }),

  // Reset
  reset: () => set(initialState),
  resetClientDetail: () =>
    set({
      selectedClient: null,
      selectedAgreement: null,
      clientDocuments: [],
      clientFiles: [],
      clientTodoLists: [],
      clientTodos: [],
      strategyDocument: null,
      isLoadingClientDetail: false,
      clientDetailError: null,
      comments: [],
      isLoadingComments: false,
    }),
}));
