import { create } from 'zustand';
import { User } from '@/types/user';
import { authenticateUser, getRoleHomePath } from './data/mock-users';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isHydrated: boolean;
  setUser: (user: User | null) => void;
  setIsAuthenticated: (authenticated: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; redirectTo?: string }>;
  logout: () => void;
  hydrate: () => void;
}

// Helper function to safely access localStorage (only on client)
const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('ariex_mock_user');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse stored user', e);
  }
  return null;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isHydrated: false,
  isLoading: false,
  error: null,
  setUser: user => {
    set({ user, isAuthenticated: !!user, error: null });
    if (typeof window !== 'undefined') {
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
      if (typeof window !== 'undefined') {
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ariex_mock_user');
      // Clear cookies
      document.cookie = 'ariex_user_role=; path=/; max-age=0';
      document.cookie = 'ariex_user_id=; path=/; max-age=0';
    }
  },
  hydrate: () => {
    const storedUser = getStoredUser();
    set({ 
      user: storedUser, 
      isAuthenticated: !!storedUser,
      isHydrated: true 
    });
  },
}));

// Backwards compatible export - use useAuthStore directly
export const useAuth = useAuthStore;
