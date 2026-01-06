import { ORPCError, os } from '@orpc/server';
import { getAuth } from '@/lib/firebase';
import type { BaseContext, AuthenticatedContext } from './context';

/**
 * Base procedure builder
 * Available to all requests
 */
export const baseProcedure = os.$context<BaseContext>();

/**
 * Authenticated procedure that requires a valid Firebase session
 * Extracts token from Authorization header
 */
export const authenticatedProcedure = baseProcedure.use(async ({ context, next }) => {
  try {
    // Get authorization header
    const authHeader =
      context.headers instanceof Headers
        ? context.headers.get('authorization')
        : context.headers.authorization;

    if (!authHeader) {
      throw new ORPCError('UNAUTHORIZED', {
        message: 'Missing authorization header',
      });
    }

    // Extract Bearer token
    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new ORPCError('UNAUTHORIZED', {
        message: 'Invalid authorization format',
      });
    }

    // Verify Firebase token
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);

    return next({
      context: {
        ...context,
        userId: decodedToken.uid,
        userEmail: decodedToken.email || null,
        userRole: (decodedToken.role as 'ADMIN' | 'CLIENT') || 'CLIENT',
      } as AuthenticatedContext,
    });
  } catch (error) {
    throw new ORPCError('UNAUTHORIZED', {
      message: 'Invalid or expired authentication token',
    });
  }
});

/**
 * Admin-only procedure
 */
export const adminProcedure = authenticatedProcedure.use(async ({ context, next }) => {
  if (context.userRole !== 'ADMIN') {
    throw new ORPCError('FORBIDDEN', {
      message: 'Admin access required',
    });
  }
  return next();
});
