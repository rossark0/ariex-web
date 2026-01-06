import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

export interface PaymentState {
  payments: any[];
  isProcessing: boolean;
  isLoading: boolean;
  setPayments: (payments: any[]) => void;
  setIsProcessing: (processing: boolean) => void;
  setIsLoading: (loading: boolean) => void;
}

export const paymentStore = createStore<PaymentState>(set => ({
  payments: [],
  isProcessing: false,
  isLoading: false,
  setPayments: payments => set({ payments }),
  setIsProcessing: processing => set({ isProcessing: processing }),
  setIsLoading: loading => set({ isLoading: loading }),
}));

export const usePayment = <T>(selector: (state: PaymentState) => T) =>
  useStore(paymentStore, selector);
