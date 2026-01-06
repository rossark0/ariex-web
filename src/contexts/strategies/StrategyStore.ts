import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

export interface StrategyState {
  strategies: any[];
  isGenerating: boolean;
  isLoading: boolean;
  setStrategies: (strategies: any[]) => void;
  setIsGenerating: (generating: boolean) => void;
  setIsLoading: (loading: boolean) => void;
}

export const strategyStore = createStore<StrategyState>(set => ({
  strategies: [],
  isGenerating: false,
  isLoading: false,
  setStrategies: strategies => set({ strategies }),
  setIsGenerating: generating => set({ isGenerating: generating }),
  setIsLoading: loading => set({ isLoading: loading }),
}));

export const useStrategy = <T>(selector: (state: StrategyState) => T) =>
  useStore(strategyStore, selector);
