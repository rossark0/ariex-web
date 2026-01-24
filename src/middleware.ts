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
  '/strategist': ['STRATEGIST', 'COMPLIANCE', 'ADMIN'],
  '/client': ['CLIENT', 'ADMIN'],
};

// Auth-related routes that should be accessible when not authenticated
const authRoutes = ['/login', '/register', '/confirm-email', '/forgot-password', '/reset-password'];

// Special route that requires password challenge cookie
const passwordChallengeRoute = '/complete-password';

// Public routes that don't require authentication
const publicRoutes = ['/', '/pricing', '/about', '/privacy', '/terms'];

export function middleware(request: NextRequest) {
  const bypassAuth = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true';
  const { pathname } = request.nextUrl;

  // Always allow API routes and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Get auth info from cookies
  // For Cognito: we check for access token
  // For both: we check for role cookie (set after successful login)
  const accessToken = request.cookies.get('ariex_access_token')?.value;
  const rawRole = request.cookies.get('ariex_user_role')?.value;
  // Normalize role to uppercase (API returns lowercase, frontend expects uppercase)
  const userRole = rawRole ? (rawRole.toUpperCase() as Role) : undefined;
  const userId = request.cookies.get('ariex_user_id')?.value;
  const hasPasswordChallenge = request.cookies.get('ariex_password_challenge')?.value === 'true';

  // Debug logging (commented out for production)
  // console.log(`[Middleware] path=${pathname} role=${userRole} userId=${userId}`);

  // User is authenticated if they have either:
  // 1. A valid access token (Cognito)
  // 2. OR role + userId cookies (mock auth fallback)
  const hasTokenAuth = !!accessToken;
  const hasCookieAuth = !!userRole && !!userId;
  const isAuthenticated = hasTokenAuth || hasCookieAuth;

  // Log current user info
  if (isAuthenticated && userRole && userId) {
    console.log(`[Logged User] role=${userRole} userId=${userId}`);
  }

  // Check if current route is public
  const isPublicRoute = publicRoutes.some(route => pathname === route);

  // Check if current route is an auth route (login, register, etc.)
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // Check if trying to access password challenge route
  const isPasswordChallengeRoute = pathname.startsWith(passwordChallengeRoute);

  // Handle /complete-password route - only allow if has password challenge cookie
  if (isPasswordChallengeRoute) {
    if (hasPasswordChallenge) {
      return NextResponse.next();
    }
    // No password challenge, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user has password challenge pending, they MUST go to /complete-password
  // Block access to login and other auth routes
  if (hasPasswordChallenge) {
    if (!isPasswordChallengeRoute) {
      return NextResponse.redirect(new URL('/complete-password', request.url));
    }
  }

  // If user is authenticated and trying to access auth routes, redirect to their dashboard
  if (isAuthenticated && isAuthRoute) {
    // If we have a role, redirect to role-specific dashboard
    if (userRole) {
      return NextResponse.redirect(new URL(roleHomeMap[userRole], request.url));
    }
    // If authenticated but no role cookie yet, let the request continue
    // The login page will handle the redirect properly using the user state
    // DO NOT redirect to a hardcoded route - this causes role mismatch issues
    return NextResponse.next();
  }

  // Allow access to public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Allow auth routes if not authenticated
  if (isAuthRoute && !isAuthenticated) {
    return NextResponse.next();
  }

  // If auth is bypassed for development and user has cookie auth
  if (bypassAuth && hasCookieAuth && userRole) {
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
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    // Optionally store the intended destination
    if (!isAuthRoute && !isPublicRoute) {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
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

  // User is authenticated but no role cookie yet
  // This can happen briefly during login flow
  // Allow the request to continue - client-side will handle role fetching
  if (isAuthenticated && !userRole) {
    // For token auth without role cookie, we need to let the app handle it
    // The client will fetch user data and set the role cookie
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
