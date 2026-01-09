'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth/AuthStore';
import { Role } from '@/types/user';

const roleHomeMap: Record<Role, string> = {
  ADMIN: '/admin/dashboard',
  COMPLIANCE: '/compliance/strategists',
  STRATEGIST: '/strategist/home',
  CLIENT: '/client/home',
};

export function useRoleRedirect(allowedRoles?: Role[] | Role) {
  const router = useRouter();
  const user = useAuth(state => state.user);
  const isAuthenticated = useAuth(state => state.isAuthenticated);
  const isLoading = useAuth(state => state.isLoading);
  const role = (user?.role as Role | undefined) ?? null;
  const bypassAuth = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true';

  const allowed = useMemo(() => {
    if (!allowedRoles) return undefined;
    return Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  }, [allowedRoles]);

  useEffect(() => {
    // Skip redirect checks during initial loading
    if (isLoading) return;

    // If auth bypass is enabled and no user, redirect to login
    if (bypassAuth && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // If not bypassing auth and not authenticated, redirect to home
    if (!bypassAuth && !isAuthenticated) {
      router.push('/');
      return;
    }

    // If no user or role, redirect to login
    if (!user || !role) {
      router.push('/login');
      return;
    }

    // If there are role restrictions and user doesn't have the right role
    if (allowed && !allowed.includes(role)) {
      const fallback = roleHomeMap[role] ?? '/login';
      router.push(fallback);
    }
  }, [user, role, isAuthenticated, isLoading, allowed, router, bypassAuth]);

  return { user, isAuthenticated, isLoading };
}
