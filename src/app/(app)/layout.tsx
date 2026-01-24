'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth/AuthStore';
import { Role } from '@/types/user';

const roleHomeMap: Record<Role, string> = {
  ADMIN: '/admin/dashboard',
  COMPLIANCE: '/compliance/strategists',
  STRATEGIST: '/strategist/home',
  CLIENT: '/client/home',
};

// Define which roles can access which route patterns
const roleRouteAccess: Record<string, Role[]> = {
  '/admin': ['ADMIN'],
  '/compliance': ['COMPLIANCE', 'ADMIN'],
  '/strategist': ['STRATEGIST', 'COMPLIANCE', 'ADMIN'],
  '/client': ['CLIENT', 'ADMIN'],
};

export default function AppRootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to finish loading
    if (isLoading) return;

    // If not authenticated, redirect to login
    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    const role = user.role as Role;
    const homePath = roleHomeMap[role];

    // Update cookies to ensure they match actual user role
    if (typeof window !== 'undefined') {
      const maxAge = 60 * 60 * 24;
      document.cookie = `ariex_user_role=${role}; path=/; max-age=${maxAge}; SameSite=Lax`;
      document.cookie = `ariex_user_id=${user.id}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }

    // Check if user is in a role-specific section
    const currentSection = Object.keys(roleRouteAccess).find(section => 
      pathname.startsWith(section)
    );

    if (currentSection) {
      // User is in a role-specific section - check if they have access
      const allowedRoles = roleRouteAccess[currentSection];
      if (!allowedRoles.includes(role)) {
        // User doesn't have access to this section, redirect to their home
        console.log(`[AppLayout] User role ${role} cannot access ${currentSection}, redirecting to ${homePath}`);
        if (homePath) {
          router.replace(homePath);
        }
      }
    } else {
      // User is not in any role-specific section, redirect to their home
      if (homePath) {
        router.replace(homePath);
      }
    }
  }, [isAuthenticated, isLoading, user, pathname, router]);

  // Show nothing while checking auth or if user is in wrong section
  if (isLoading) {
    return null;
  }

  // Check if user should be redirected (don't render wrong content)
  if (user) {
    // Ensure role is uppercase for comparison
    const role = (typeof user.role === 'string' ? user.role.toUpperCase() : user.role) as Role;
    const currentSection = Object.keys(roleRouteAccess).find(section => 
      pathname.startsWith(section)
    );
    if (currentSection) {
      const allowedRoles = roleRouteAccess[currentSection];
      if (!allowedRoles.includes(role)) {
        console.log(`[AppLayout] Blocking render: role ${role} not in ${allowedRoles} for ${currentSection}`);
        return null; // Don't render content while redirecting
      }
    }
  }

  return children;
}
