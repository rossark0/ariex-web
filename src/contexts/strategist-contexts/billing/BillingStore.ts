/**
 * Billing Store
 *
 * Vanilla Zustand store for managing strategist's billing and charges data
 */

import React from 'react';
import { createStore } from 'zustand/vanilla';
import type { Charge } from '@/lib/api/strategist.api';

export type ChargeFilter = 'all' | 'pending' | 'paid' | 'failed' | 'cancelled';

export interface BillingState {
  // Charges
  charges: Charge[];
  isLoadingCharges: boolean;
  chargesError: string | null;

  // Filters
  chargeFilter: ChargeFilter;
  searchQuery: string;

  // Selected charge (for detail view if needed)
  selectedCharge: Charge | null;

  // Actions - Charges
  setCharges: (charges: Charge[]) => void;
  setIsLoadingCharges: (loading: boolean) => void;
  setChargesError: (error: string | null) => void;

  // Actions - Filters
  setChargeFilter: (filter: ChargeFilter) => void;
  setSearchQuery: (query: string) => void;

  // Actions - Selection
  setSelectedCharge: (charge: Charge | null) => void;

  // Computed
  getFilteredCharges: () => Charge[];
  getTotalPending: () => number;
  getTotalPaid: () => number;
  getTotalFailed: () => number;

  // Reset
  reset: () => void;
}

const initialState = {
  charges: [] as Charge[],
  isLoadingCharges: false,
  chargesError: null,

  chargeFilter: 'all' as const,
  searchQuery: '',

  selectedCharge: null,
};

export const billingStore = createStore<BillingState>((set, get) => ({
  ...initialState,

  // Charges actions
  setCharges: (charges: Charge[]) => set({ charges }),
  setIsLoadingCharges: (loading: boolean) => set({ isLoadingCharges: loading }),
  setChargesError: (error: string | null) => set({ chargesError: error }),

  // Filter actions
  setChargeFilter: (filter: ChargeFilter) => set({ chargeFilter: filter }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),

  // Selection actions
  setSelectedCharge: (charge: Charge | null) => set({ selectedCharge: charge }),

  // Computed
  getFilteredCharges: (): Charge[] => {
    const state = get();
    let filtered: Charge[] = state.charges;

    // Apply status filter
    if (state.chargeFilter !== 'all') {
      filtered = filtered.filter((c: Charge) => c.status === state.chargeFilter);
    }

    // Apply search filter (search by agreement ID)
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c: Charge) =>
          c.agreementId.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }

    return filtered;
  },

  getTotalPending: (): number => {
    const state = get();
    return state.charges
      .filter((c: Charge) => c.status === 'pending')
      .reduce((sum: number, c: Charge) => sum + c.amount, 0);
  },

  getTotalPaid: (): number => {
    const state = get();
    return state.charges
      .filter((c: Charge) => c.status === 'paid')
      .reduce((sum: number, c: Charge) => sum + c.amount, 0);
  },

  getTotalFailed: (): number => {
    const state = get();
    return state.charges
      .filter((c: Charge) => c.status === 'failed')
      .reduce((sum: number, c: Charge) => sum + c.amount, 0);
  },

  // Reset all state
  reset: () => set(initialState),
}));

/**
 * Hook to use the billing store in React components
 *
 * Usage:
 * const charges = useBilling((state) => state.charges);
 * const setCharges = useBilling((state) => state.setCharges);
 */
export function useBilling<T>(selector: (state: BillingState) => T): T {
  const [state, setState] = React.useState(() => selector(billingStore.getState()));

  React.useEffect(() => {
    const unsubscribe = billingStore.subscribe(() => {
      setState(selector(billingStore.getState()));
    });
    return unsubscribe;
  }, [selector]);

  return state;
}
