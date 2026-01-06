import type { IncomingHttpHeaders } from 'node:http';

/**
 * Base context available to all procedures
 */
export interface BaseContext {
  headers: Headers | IncomingHttpHeaders;
}

/**
 * Authenticated context with Firebase user info
 */
export interface AuthenticatedContext extends BaseContext {
  userId: string;
  userEmail: string | null;
  userRole: 'ADMIN' | 'CLIENT';
}

/**
 * Create context for each request
 */
export async function createContext(headers: Headers): Promise<BaseContext> {
  return {
    headers,
  };
}
