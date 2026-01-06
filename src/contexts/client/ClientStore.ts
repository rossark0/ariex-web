import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

export interface ClientState {
  profile: any | null;
  onboardingComplete: boolean;
  isLoading: boolean;
  setProfile: (profile: any) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setIsLoading: (loading: boolean) => void;
}

export const clientStore = createStore<ClientState>(set => ({
  profile: null,
  onboardingComplete: false,
  isLoading: false,
  setProfile: profile => set({ profile }),
  setOnboardingComplete: complete => set({ onboardingComplete: complete }),
  setIsLoading: loading => set({ isLoading: loading }),
}));

export const useClient = <T>(selector: (state: ClientState) => T) =>
  useStore(clientStore, selector);
