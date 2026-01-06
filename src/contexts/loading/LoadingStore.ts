import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

interface LoadingOperation {
  id: string;
  message: string;
  startTime: number;
}

interface LoadingState {
  operations: LoadingOperation[];
  isLoading: boolean;
  startOperation: (message: string) => string;
  finishOperation: (id: string) => void;
  clearAll: () => void;
}

/**
 * Global loading store to track app-wide loading operations
 * Used by server-loading-middleware to show global loading indicators
 */
export const loadingStore = createStore<LoadingState>((set, get) => ({
  operations: [],
  isLoading: false,

  startOperation: (message: string) => {
    const id = `op-${Date.now()}-${Math.random()}`;
    const operation: LoadingOperation = {
      id,
      message,
      startTime: Date.now(),
    };

    set(state => ({
      operations: [...state.operations, operation],
      isLoading: true,
    }));

    return id;
  },

  finishOperation: (id: string) => {
    set(state => {
      const operations = state.operations.filter(op => op.id !== id);
      return {
        operations,
        isLoading: operations.length > 0,
      };
    });
  },

  clearAll: () => {
    set({ operations: [], isLoading: false });
  },
}));

// React hook for components
export const useLoadingStore = <T>(selector: (state: LoadingState) => T): T => {
  return useStore(loadingStore, selector);
};

// Selectors
export const selectIsLoading = (state: LoadingState) => state.isLoading;
export const selectOperations = (state: LoadingState) => state.operations;
export const selectOperationCount = (state: LoadingState) => state.operations.length;
