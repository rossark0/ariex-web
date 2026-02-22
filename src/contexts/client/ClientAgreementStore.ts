'use client';

import { create } from 'zustand';
import type { ClientAgreement } from '@/lib/api/client.api';

interface ClientAgreementState {
  agreements: ClientAgreement[];
  selectedAgreementId: string | null;
  setAgreements: (agreements: ClientAgreement[]) => void;
  setSelectedAgreementId: (id: string) => void;
}

const STATUS_PRIORITY: Record<string, number> = {
  COMPLETED: 7,
  PENDING_STRATEGY_REVIEW: 6,
  PENDING_STRATEGY: 5,
  PENDING_TODOS_COMPLETION: 4,
  PENDING_PAYMENT: 3,
  PENDING_SIGNATURE: 2,
  DRAFT: 1,
  CANCELLED: 0,
};

export const useClientAgreementStore = create<ClientAgreementState>((set) => ({
  agreements: [],
  selectedAgreementId: null,

  setAgreements: (agreements) => {
    set((state) => {
      // Auto-select most advanced agreement if nothing is selected yet
      if (!state.selectedAgreementId && agreements.length > 0) {
        const sorted = [...agreements].sort((a, b) => {
          const pa = STATUS_PRIORITY[a.status] ?? 0;
          const pb = STATUS_PRIORITY[b.status] ?? 0;
          if (pb !== pa) return pb - pa;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        return { agreements, selectedAgreementId: sorted[0].id };
      }
      return { agreements };
    });
  },

  setSelectedAgreementId: (id) => set({ selectedAgreementId: id }),
}));
