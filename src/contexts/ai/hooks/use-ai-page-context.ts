'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  useAiPageContextStore,
  type PageContext,
  type AiClientContext,
  type AiDocumentContext,
  type AiAgreementContext,
  type AiPaymentContext,
  type AiStrategyContext,
} from '@/contexts/ai/AiPageContextStore';

// ─── Re-exports for convenience ───────────────────────────────────────────

export type {
  PageContext,
  AiClientContext,
  AiDocumentContext,
  AiAgreementContext,
  AiPaymentContext,
  AiStrategyContext,
};

// ─── Route → page title mapping ──────────────────────────────────────────

function inferPageTitle(pathname: string): string {
  // Strategist routes
  if (pathname.match(/^\/strategist\/clients\/[^/]+$/)) return 'Client Detail';
  if (pathname === '/strategist/clients') return 'Client List';
  if (pathname === '/strategist/home') return 'Strategist Dashboard';
  if (pathname === '/strategist/agreements') return 'Agreements';
  if (pathname === '/strategist/documents') return 'Documents';
  if (pathname === '/strategist/payments') return 'Payments';

  // Client routes
  if (pathname === '/client/home') return 'Client Dashboard';
  if (pathname === '/client/documents') return 'My Documents';
  if (pathname === '/client/agreements') return 'My Agreements';
  if (pathname === '/client/payments') return 'My Payments';

  // Compliance routes
  if (pathname.match(/^\/compliance\/strategists\/[^/]+$/)) return 'Strategist Detail';
  if (pathname.match(/^\/compliance\/clients\/[^/]+$/)) return 'Client Detail (Compliance)';
  if (pathname === '/compliance/home') return 'Compliance Dashboard';

  // Admin routes
  if (pathname.startsWith('/admin')) return 'Admin Dashboard';

  return 'Dashboard';
}

// ─── Hook: Set page context from a page component ────────────────────────

interface UseAiPageContextOptions {
  pageTitle?: string;
  userRole: string;
  client?: AiClientContext | null;
  documents?: AiDocumentContext[];
  agreements?: AiAgreementContext[];
  payments?: AiPaymentContext[];
  strategy?: AiStrategyContext | null;
  extra?: Record<string, unknown>;
}

/**
 * Call from any page to register its context with the AI chatbot.
 * Context is automatically cleared when the component unmounts or the route changes.
 */
export function useAiPageContext(options: UseAiPageContextOptions) {
  const pathname = usePathname();
  const { setPageContext, clearPageContext } = useAiPageContextStore();

  // Serialize complex deps for stable change detection
  const clientKey = JSON.stringify(options.client ?? null);
  const strategyKey = JSON.stringify(options.strategy ?? null);
  const docCount = options.documents?.length ?? 0;
  const agreementCount = options.agreements?.length ?? 0;
  const paymentCount = options.payments?.length ?? 0;

  useEffect(() => {
    setPageContext({
      pagePath: pathname,
      pageTitle: options.pageTitle || inferPageTitle(pathname),
      userRole: options.userRole,
      client: options.client ?? undefined,
      documents: options.documents,
      agreements: options.agreements,
      payments: options.payments,
      strategy: options.strategy ?? undefined,
      extra: options.extra,
      updatedAt: Date.now(),
    });

    return () => {
      clearPageContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pathname,
    options.userRole,
    options.pageTitle,
    clientKey,
    docCount,
    agreementCount,
    paymentCount,
    strategyKey,
  ]);
}

/**
 * Lightweight version — only sets route and role context. Good for pages
 * that don't have specific data to share but still want the AI to know
 * what page the user is on.
 */
export function useAiBasicPageContext(userRole: string, pageTitle?: string) {
  const pathname = usePathname();
  const { setPageContext, clearPageContext } = useAiPageContextStore();

  useEffect(() => {
    setPageContext({
      pagePath: pathname,
      pageTitle: pageTitle || inferPageTitle(pathname),
      userRole,
      updatedAt: Date.now(),
    });

    return () => {
      clearPageContext();
    };
  }, [pathname, userRole, pageTitle, setPageContext, clearPageContext]);
}
