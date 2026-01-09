import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type Role = 'ADMIN' | 'COMPLIANCE' | 'STRATEGIST' | 'CLIENT';

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
  '/strategist': ['STRATEGIST', 'ADMIN'],
  '/client': ['CLIENT', 'ADMIN'],
};

export function middleware(request: NextRequest) {
  const bypassAuth = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true';
  const { pathname } = request.nextUrl;

  // Always allow API routes and static files
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // Get user role from cookies (set by AuthStore)
  const userRole = request.cookies.get('ariex_user_role')?.value as Role | undefined;
  const userId = request.cookies.get('ariex_user_id')?.value;
  const isAuthenticated = !!userRole && !!userId;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/pricing', '/about'];
  const isPublicRoute = publicRoutes.some(route => pathname === route);

  // If user is authenticated and trying to access login, redirect to their dashboard
  if (pathname === '/login' && isAuthenticated && userRole) {
    return NextResponse.redirect(new URL(roleHomeMap[userRole], request.url));
  }

  // Allow access to public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Allow login/register routes if not authenticated
  if ((pathname === '/login' || pathname === '/register') && !isAuthenticated) {
    return NextResponse.next();
  }

  // If auth is bypassed for development, allow all authenticated routes
  if (bypassAuth && isAuthenticated) {
    // Check role-based access for protected routes
    for (const [routePattern, allowedRoles] of Object.entries(roleRouteAccess)) {
      if (pathname.startsWith(routePattern)) {
        if (!allowedRoles.includes(userRole)) {
          // User doesn't have access to this route, redirect to their dashboard
          return NextResponse.redirect(new URL(roleHomeMap[userRole], request.url));
        }
      }
    }
    return NextResponse.next();
  }

  // For protected routes, redirect to login if not authenticated
  if (!isAuthenticated && !isPublicRoute && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check role-based access for protected routes
  if (isAuthenticated && userRole) {
    for (const [routePattern, allowedRoles] of Object.entries(roleRouteAccess)) {
      if (pathname.startsWith(routePattern)) {
        if (!allowedRoles.includes(userRole)) {
          // User doesn't have access to this route, redirect to their dashboard
          return NextResponse.redirect(new URL(roleHomeMap[userRole], request.url));
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
