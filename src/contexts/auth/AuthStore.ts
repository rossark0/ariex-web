import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { User } from '@/types/user';
import { authenticateUser, getFullUserProfile, getRoleHomePath } from './data/mock-users';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setIsAuthenticated: (authenticated: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; redirectTo?: string }>;
  logout: () => void;
}

// Check if auth is bypassed and get initial user from localStorage
const bypassAuth = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true';
let initialUser: User | null = null;

if (typeof window !== 'undefined' && bypassAuth) {
  const stored = localStorage.getItem('ariex_mock_user');
  if (stored) {
    try {
      initialUser = JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse stored user', e);
    }
  }
}

export const authStore = createStore<AuthState>((set, get) => ({
  user: initialUser,
  isAuthenticated: !!initialUser,
  isLoading: false,
  error: null,
  setUser: user => {
    set({ user, isAuthenticated: !!user, error: null });
    if (typeof window !== 'undefined' && bypassAuth) {
      if (user) {
        localStorage.setItem('ariex_mock_user', JSON.stringify(user));
        // Also set cookie for middleware access
        document.cookie = `ariex_user_role=${user.role}; path=/; max-age=86400`;
        document.cookie = `ariex_user_id=${user.id}; path=/; max-age=86400`;
      } else {
        localStorage.removeItem('ariex_mock_user');
        // Clear cookies
        document.cookie = 'ariex_user_role=; path=/; max-age=0';
        document.cookie = 'ariex_user_id=; path=/; max-age=0';
      }
    }
  },
  setIsAuthenticated: authenticated => set({ isAuthenticated: authenticated }),
  setIsLoading: loading => set({ isLoading: loading }),
  setError: error => set({ error }),
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = authenticateUser(email, password);

    if (result.success && result.user) {
      const user = result.user;
      set({ user, isAuthenticated: true, isLoading: false, error: null });

      // Store in localStorage and cookies for persistence
      if (typeof window !== 'undefined' && bypassAuth) {
        localStorage.setItem('ariex_mock_user', JSON.stringify(user));
        // Set cookies for middleware
        document.cookie = `ariex_user_role=${user.role}; path=/; max-age=86400`;
        document.cookie = `ariex_user_id=${user.id}; path=/; max-age=86400`;
      }

      return { success: true, redirectTo: getRoleHomePath(user.role) };
    } else {
      set({ user: null, isAuthenticated: false, isLoading: false, error: result.error || 'Login failed' });
      return { success: false };
    }
  },
  logout: () => {
    set({ user: null, isAuthenticated: false, error: null });
    if (typeof window !== 'undefined' && bypassAuth) {
      localStorage.removeItem('ariex_mock_user');
      // Clear cookies
      document.cookie = 'ariex_user_role=; path=/; max-age=0';
      document.cookie = 'ariex_user_id=; path=/; max-age=0';
    }
  },
}));

export const useAuth = <T>(selector: (state: AuthState) => T) => useStore(authStore, selector);
