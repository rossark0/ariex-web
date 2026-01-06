'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UseAuthRedirectOptions {
  isAuthenticated: boolean;
  redirectTo?: string;
  redirectIfAuthenticated?: boolean;
}

/**
 * Hook to handle authentication redirects
 *
 * @param isAuthenticated - Whether the user is authenticated
 * @param redirectTo - Where to redirect (default: /dashboard if not auth, / if auth)
 * @param redirectIfAuthenticated - If true, redirect when user IS authenticated (for login/signup pages)
 */
export function useAuthRedirect({
  isAuthenticated,
  redirectTo,
  redirectIfAuthenticated = false,
}: UseAuthRedirectOptions) {
  const router = useRouter();

  useEffect(() => {
    if (redirectIfAuthenticated) {
      // Redirect authenticated users away from login/signup pages
      if (isAuthenticated) {
        router.push(redirectTo || '/dashboard');
      }
    } else {
      // Redirect unauthenticated users to login
      if (!isAuthenticated) {
        router.push(redirectTo || '/');
      }
    }
  }, [isAuthenticated, redirectTo, redirectIfAuthenticated, router]);
}
