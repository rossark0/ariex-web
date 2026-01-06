'use client';

import type { RouterClient } from '@orpc/server';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { AppRouter } from './router';
import { auth } from '@/lib/firebase-client';

/**
 * Get the API base URL
 */
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    return '';
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  return 'http://localhost:3000';
};

/**
 * RPC Link configuration with Firebase auth
 */
const link = new RPCLink({
  url: `${getBaseURL()}/api/orpc`,
  headers: async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add Firebase token if user is authenticated
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error('Failed to get Firebase token:', error);
      }
    }

    return headers;
  },
  fetch: (input, init) => {
    return fetch(input, {
      ...init,
      credentials: 'include',
    });
  },
});

/**
 * Type-safe oRPC client
 *
 * @example
 * ```ts
 * import { orpc } from '@/orpc/client';
 *
 * const todos = await orpc.todos.list();
 * const newTodo = await orpc.todos.create({ title: 'Buy milk' });
 * ```
 */
export const orpc: RouterClient<AppRouter> = createORPCClient(link);
