import { RPCHandler } from '@orpc/server/fetch';
import { onError } from '@orpc/server';
import { CORSPlugin } from '@orpc/server/plugins';
import { router } from '@/orpc/router';
import { createContext } from '@/orpc/context';

/**
 * RPC Handler for Next.js App Router
 * Handles all /api/orpc/* requests
 */
const handler = new RPCHandler(router, {
  plugins: [
    new CORSPlugin({
      origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      credentials: true,
    }),
  ],
  interceptors: [
    onError(error => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[oRPC Error]', error);
      }
    }),
  ],
});

export async function GET(request: Request) {
  const context = await createContext(request.headers);
  const result = await handler.handle(request, { context });
  return result.matched ? result.response : new Response('Not Found', { status: 404 });
}

export async function POST(request: Request) {
  const context = await createContext(request.headers);
  const result = await handler.handle(request, { context });
  return result.matched ? result.response : new Response('Not Found', { status: 404 });
}

export async function OPTIONS(request: Request) {
  const context = await createContext(request.headers);
  const result = await handler.handle(request, { context });
  return result.matched ? result.response : new Response('Not Found', { status: 404 });
}
