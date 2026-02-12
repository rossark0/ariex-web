'use client';

import { create } from 'zustand';

// ─── Page Context Types ───────────────────────────────────────────────────

export interface AiClientContext {
  id: string;
  name: string | null;
  email: string;
  phoneNumber?: string | null;
  businessName?: string | null;
  businessType?: string | null;
  city?: string | null;
  state?: string | null;
  estimatedIncome?: number | null;
  filingStatus?: string | null;
  dependents?: number | null;
  statusKey?: string;
}

export interface AiDocumentContext {
  id: string;
  name: string;
  type: string;
  status: string;
  category?: string | null;
  acceptanceStatus?: string;
  uploadedBy?: string | null;
  createdAt: string;
}

export interface AiAgreementContext {
  id: string;
  name: string;
  status: string;
  price?: number;
  createdAt: string;
}

export interface AiPaymentContext {
  id: string;
  amount: number;
  status: string;
  type: string;
  createdAt: string;
  paidAt?: string;
}

export interface AiStrategyContext {
  sent: boolean;
  phase?: string;
  isComplete: boolean;
}

export interface PageContext {
  /** Current route path e.g. /strategist/clients/abc123 */
  pagePath: string;
  /** Human-readable page description */
  pageTitle: string;
  /** User role (STRATEGIST, CLIENT, COMPLIANCE, ADMIN) */
  userRole: string;
  /** Timestamp when context was last set */
  updatedAt: number;
  /** Client data when viewing a client detail page */
  client?: AiClientContext | null;
  /** Documents visible on the current page */
  documents?: AiDocumentContext[];
  /** Agreements visible on the current page */
  agreements?: AiAgreementContext[];
  /** Payments visible on the current page */
  payments?: AiPaymentContext[];
  /** Strategy state when on client detail */
  strategy?: AiStrategyContext | null;
  /** Additional free-form context for the page (key-value pairs) */
  extra?: Record<string, unknown>;
}

// ─── Store ────────────────────────────────────────────────────────────────

interface AiPageContextState {
  pageContext: PageContext | null;
  setPageContext: (ctx: PageContext) => void;
  clearPageContext: () => void;
  /** Merge partial context into existing (useful for lazy-loaded data) */
  patchPageContext: (patch: Partial<PageContext>) => void;
}

export const useAiPageContextStore = create<AiPageContextState>((set, get) => ({
  pageContext: null,

  setPageContext: (ctx) =>
    set({ pageContext: { ...ctx, updatedAt: Date.now() } }),

  clearPageContext: () => set({ pageContext: null }),

  patchPageContext: (patch) =>
    set((state) => ({
      pageContext: state.pageContext
        ? { ...state.pageContext, ...patch, updatedAt: Date.now() }
        : null,
    })),
}));
