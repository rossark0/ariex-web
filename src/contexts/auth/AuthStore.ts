import { create } from 'zustand';
import { User } from '@/types/user';
import {
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  signUp as cognitoSignUp,
  confirmEmail as cognitoConfirmEmail,
  forgotPassword as cognitoForgotPassword,
  confirmPasswordReset as cognitoConfirmPasswordReset,
  completePassword as cognitoCompletePassword,
  verifyToken,
  refreshAccessToken,
  getCurrentUser as getCurrentUserFromApi,
  type AuthUser,
  type SignUpData,
  type PasswordChallengeResponse,
} from './services/cognito.service';

// For development fallback
import { authenticateUser, getRoleHomePath } from './data/mock-users';

// Check if we should use mock auth (for development)
const USE_MOCK_AUTH = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isHydrated: boolean;

  // Email confirmation state
  pendingEmail: string | null;
  needsEmailConfirmation: boolean;

  // Password challenge state (for invited users)
  pendingPasswordChallenge: PasswordChallengeResponse | null;
  needsPasswordChange: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setIsAuthenticated: (authenticated: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPendingEmail: (email: string | null) => void;

  // Auth operations
  login: (
    email: string,
    password: string
  ) => Promise<{
    success: boolean;
    redirectTo?: string;
    needsConfirmation?: boolean;
    needsPasswordChange?: boolean;
  }>;
  register: (data: SignUpData) => Promise<{ success: boolean; error?: string }>;
  confirmEmail: (code: string) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (
    code: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  completePassword: (
    newPassword: string
  ) => Promise<{ success: boolean; redirectTo?: string; error?: string }>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

// Helper to convert AuthUser to User type
function authUserToUser(authUser: AuthUser): User {
  return {
    id: authUser.id,
    email: authUser.email,
    name: authUser.name,
    role: authUser.role,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Helper function to safely access localStorage (only on client)
const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem('ariex_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt),
      };
    }
  } catch (e) {
    console.error('Failed to parse stored user', e);
  }
  return null;
};

const storeUser = (user: User | null) => {
  if (typeof window === 'undefined') return;

  if (user) {
    localStorage.setItem('ariex_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('ariex_user');
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isHydrated: false,
  isLoading: false,
  error: null,
  pendingEmail: null,
  needsEmailConfirmation: false,
  pendingPasswordChallenge: null,
  needsPasswordChange: false,

  setUser: user => {
    set({ user, isAuthenticated: !!user, error: null });
    storeUser(user);
  },

  setIsAuthenticated: authenticated => set({ isAuthenticated: authenticated }),
  setIsLoading: loading => set({ isLoading: loading }),
  setError: error => set({ error }),
  setPendingEmail: email => set({ pendingEmail: email }),

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      // Use mock auth for development if enabled
      if (USE_MOCK_AUTH) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const result = authenticateUser(email, password);

        if (result.success && result.user) {
          const user = result.user;
          set({ user, isAuthenticated: true, isLoading: false, error: null });
          storeUser(user);

          // Set cookies for middleware
          if (typeof window !== 'undefined') {
            document.cookie = `ariex_user_role=${user.role}; path=/; max-age=86400`;
            document.cookie = `ariex_user_id=${user.id}; path=/; max-age=86400`;
          }

          return { success: true, redirectTo: getRoleHomePath(user.role) };
        } else {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: result.error || 'Login failed',
          });
          return { success: false };
        }
      }

      // Real Cognito authentication
      const result = await cognitoSignIn({ email, password });

      if (result.success && result.user) {
        const user = authUserToUser(result.user);
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          needsEmailConfirmation: false,
          pendingEmail: null,
          needsPasswordChange: false,
          pendingPasswordChallenge: null,
        });
        storeUser(user);

        // IMPORTANT: Set cookies from client side to ensure persistence
        // Server action cookies may not persist properly in all cases
        if (typeof window !== 'undefined') {
          const maxAge = 60 * 60 * 24; // 24 hours
          document.cookie = `ariex_user_role=${user.role}; path=/; max-age=${maxAge}; SameSite=Lax`;
          document.cookie = `ariex_user_id=${user.id}; path=/; max-age=${maxAge}; SameSite=Lax`;
          // console.log('[Auth] Set client-side cookies: role=', user.role, 'id=', user.id);
        }

        return { success: true, redirectTo: getRoleHomePath(user.role) };
      } else if (result.passwordChallenge) {
        // Password change required for invited users
        console.log('[Auth] Password change required, storing challenge:', result.passwordChallenge);
        
        // Store in sessionStorage so it survives page redirect
        // Also set a cookie for middleware to check
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('ariex_password_challenge', JSON.stringify(result.passwordChallenge));
          document.cookie = 'ariex_password_challenge=true; path=/; max-age=3600; SameSite=Lax';
        }
        
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          needsPasswordChange: true,
          pendingPasswordChallenge: result.passwordChallenge,
        });
        return { success: false, needsPasswordChange: true };
      } else {
        // Check if error is about unconfirmed email
        const needsConfirmation =
          result.error?.toLowerCase().includes('not confirmed') ||
          result.error?.toLowerCase().includes('confirm');

        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: result.error || 'Login failed',
          needsEmailConfirmation: needsConfirmation,
          pendingEmail: needsConfirmation ? email : null,
        });

        return { success: false, needsConfirmation };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });
      return { success: false };
    }
  },

  register: async (data: SignUpData) => {
    set({ isLoading: true, error: null });

    try {
      const result = await cognitoSignUp(data);

      if (result.success) {
        set({
          isLoading: false,
          pendingEmail: data.email,
          needsEmailConfirmation: true,
        });
        return { success: true };
      } else {
        set({ isLoading: false, error: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  confirmEmail: async (code: string) => {
    const { pendingEmail } = get();

    if (!pendingEmail) {
      return { success: false, error: 'No email pending confirmation' };
    }

    set({ isLoading: true, error: null });

    try {
      const result = await cognitoConfirmEmail(pendingEmail, code);

      if (result.success) {
        set({
          isLoading: false,
          needsEmailConfirmation: false,
          error: null,
        });
        return { success: true };
      } else {
        set({ isLoading: false, error: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Confirmation failed';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  forgotPassword: async (email: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await cognitoForgotPassword(email);

      if (result.success) {
        set({
          isLoading: false,
          pendingEmail: email,
        });
        return { success: true };
      } else {
        set({ isLoading: false, error: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Request failed';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  resetPassword: async (code: string, newPassword: string) => {
    const { pendingEmail } = get();

    if (!pendingEmail) {
      return { success: false, error: 'No email pending password reset' };
    }

    set({ isLoading: true, error: null });

    try {
      const result = await cognitoConfirmPasswordReset(pendingEmail, code, newPassword);

      if (result.success) {
        set({
          isLoading: false,
          pendingEmail: null,
          error: null,
        });
        return { success: true };
      } else {
        set({ isLoading: false, error: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  completePassword: async (newPassword: string) => {
    let challenge = get().pendingPasswordChallenge;

    // Try to get from sessionStorage if not in state
    if (!challenge && typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('ariex_password_challenge');
      if (stored) {
        try {
          challenge = JSON.parse(stored);
          console.log('[Auth] Loaded challenge from sessionStorage');
        } catch (e) {
          console.error('[Auth] Failed to parse stored challenge');
        }
      }
    }

    if (!challenge) {
      return { success: false, error: 'No password challenge pending' };
    }

    set({ isLoading: true, error: null });

    try {
      const result = await cognitoCompletePassword(
        challenge.username,
        newPassword,
        challenge.session
      );

      if (result.success && result.user) {
        const user = authUserToUser(result.user);
        
        // Clear sessionStorage and password challenge cookie
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('ariex_password_challenge');
          document.cookie = 'ariex_password_challenge=; path=/; max-age=0';
        }
        
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          needsPasswordChange: false,
          pendingPasswordChallenge: null,
        });
        storeUser(user);

        // Set cookies from client side
        if (typeof window !== 'undefined') {
          const maxAge = 60 * 60 * 24; // 24 hours
          document.cookie = `ariex_user_role=${user.role}; path=/; max-age=${maxAge}; SameSite=Lax`;
          document.cookie = `ariex_user_id=${user.id}; path=/; max-age=${maxAge}; SameSite=Lax`;
        }

        return { success: true, redirectTo: getRoleHomePath(user.role) };
      } else {
        set({ isLoading: false, error: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password setup failed';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  logout: async () => {
    set({ isLoading: true });

    try {
      if (!USE_MOCK_AUTH) {
        await cognitoSignOut();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }

    // Clear local state
    set({
      user: null,
      isAuthenticated: false,
      error: null,
      isLoading: false,
      pendingEmail: null,
      needsEmailConfirmation: false,
    });

    // Clear stored user
    storeUser(null);

    // Clear cookies (for mock auth)
    if (typeof window !== 'undefined') {
      document.cookie = 'ariex_user_role=; path=/; max-age=0';
      document.cookie = 'ariex_user_id=; path=/; max-age=0';
    }
  },

  hydrate: async () => {
    // Simply restore user from localStorage
    // Don't verify tokens or call APIs during hydration - that causes issues
    // The middleware already checks cookies for route protection
    const storedUser = getStoredUser();

    if (storedUser) {
      // console.log('[Auth] Hydrating from localStorage:', storedUser.email, storedUser.role);
      set({
        user: storedUser,
        isAuthenticated: true,
        isHydrated: true,
      });
    } else {
      // console.log('[Auth] No stored user, setting hydrated');
      set({ isHydrated: true });
    }
  },

  refreshSession: async () => {
    if (USE_MOCK_AUTH) {
      return true; // Mock auth doesn't need refresh
    }

    try {
      const result = await refreshAccessToken();

      if (result.success && result.user) {
        const user = authUserToUser(result.user);
        set({ user, isAuthenticated: true });
        storeUser(user);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  },
}));

// Backwards compatible export - use useAuthStore directly
export const useAuth = useAuthStore;
