'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../AuthStore';

// Must match the access token cookie maxAge (1 hour)
const SESSION_DURATION_MS = 60 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore(state => state.hydrate);
  const isHydrated = useAuthStore(state => state.isHydrated);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const logout = useAuthStore(state => state.logout);
  const router = useRouter();

  const handleAutoLogout = useCallback(async () => {
    console.log('[AuthProvider] Session expired — auto-logging out');
    await logout();
    router.replace('/login');
  }, [logout, router]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Auto-logout when the access token (session) expires
  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;

    const sessionStart = localStorage.getItem('ariex_session_start');
    if (!sessionStart) return;

    const elapsed = Date.now() - parseInt(sessionStart, 10);
    const remaining = SESSION_DURATION_MS - elapsed;

    if (remaining <= 0) {
      // Token already expired — logout immediately
      handleAutoLogout();
      return;
    }

    // Schedule logout for when the token expires
    console.log(
      `[AuthProvider] Session will expire in ${Math.round(remaining / 1000 / 60)} min`
    );
    const timer = setTimeout(handleAutoLogout, remaining);
    return () => clearTimeout(timer);
  }, [isHydrated, isAuthenticated, handleAutoLogout]);

  // Optionally show a loading state while hydrating
  if (!isHydrated) {
    return null; // Or a loading spinner
  }

  return <>{children}</>;
}
