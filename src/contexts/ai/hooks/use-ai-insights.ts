'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useAiPageContextStore } from '@/contexts/ai/AiPageContextStore';
import { sanitizePageContext } from '@/lib/ai/sanitize-pii';
import type { AiInsightItem, AiInsightsResponse } from '@/app/api/ai/insights/route';

export type { AiInsightItem, AiInsightsResponse };

interface UseAiInsightsState {
  data: AiInsightsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseAiInsightsOptions {
  /** Debounce in ms between context change and request. Default 600. */
  debounceMs?: number;
  /** Skip the fetch entirely when this is true (e.g., feature gated off). */
  disabled?: boolean;
}

const DEFAULT_DEBOUNCE_MS = 600;

/**
 * Subscribes to page context and fetches structured AI insights
 * (risks / opportunities / actions) whenever the context meaningfully changes.
 *
 * Production guarantees:
 *  - Debounces rapid context churn so we don't burn tokens during page transitions.
 *  - Cancels in-flight requests when a newer one is needed (no out-of-order writes).
 *  - **Coalesces every concurrent hook instance into a single request.** The
 *    rails render `<AiInsightsContent>` and `<AiInsightsRefreshButton>`
 *    side-by-side; previously each owned its own fetch, so every refresh fired
 *    `/api/ai/insights` twice with an identical payload. State now lives in a
 *    module-level store keyed by a stable context signature, so N mounted
 *    instances share exactly one request and one result.
 *  - Surfaces errors instead of throwing.
 */

// ─── Shared module-level store (one fetch across all hook instances) ───────

type SharedState = {
  data: AiInsightsResponse | null;
  isLoading: boolean;
  error: string | null;
};

let sharedState: SharedState = { data: null, isLoading: false, error: null };
let currentSignature = '';
let refetchToken = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let abortController: AbortController | null = null;
let subscriberCount = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function setSharedState(patch: Partial<SharedState>) {
  sharedState = { ...sharedState, ...patch };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return sharedState;
}

function computeSignature(pageContext: Record<string, unknown>): string {
  // Signature over the meaningful fields (skip the updatedAt timestamp), plus
  // the refetch token so an explicit refresh re-runs even when context is equal.
  return JSON.stringify({
    role: pageContext.userRole,
    path: pageContext.pagePath,
    client: pageContext.client,
    documents: pageContext.documents,
    agreements: pageContext.agreements,
    payments: pageContext.payments,
    strategy: pageContext.strategy,
    extra: pageContext.extra,
    _token: refetchToken,
  });
}

function ensureFetch(pageContext: Record<string, unknown>, debounceMs: number) {
  const signature = computeSignature(pageContext);
  if (signature === currentSignature) return; // already fetched/fetching this context
  currentSignature = signature;

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;

    setSharedState({ isLoading: true, error: null });

    fetch('/api/ai/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageContext: sanitizePageContext(pageContext) }),
      signal: controller.signal,
    })
      .then(async res => {
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error || `Insights request failed (${res.status})`);
        }
        return (await res.json()) as AiInsightsResponse;
      })
      .then(payload => {
        if (abortController === controller) {
          setSharedState({ data: payload, isLoading: false });
        }
      })
      .catch(err => {
        if (err?.name === 'AbortError') return;
        if (abortController === controller) {
          setSharedState({
            error: err instanceof Error ? err.message : 'Failed to load insights',
            isLoading: false,
          });
        }
      });
  }, debounceMs);
}

export function useAiInsights(options: UseAiInsightsOptions = {}): UseAiInsightsState {
  const { debounceMs = DEFAULT_DEBOUNCE_MS, disabled = false } = options;

  const pageContext = useAiPageContextStore(s => s.pageContext);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (disabled || !pageContext) return;
    ensureFetch(pageContext as unknown as Record<string, unknown>, debounceMs);
  }, [pageContext, disabled, debounceMs]);

  // Track live subscribers so we only tear down the shared request when the
  // last consumer unmounts. (In ClientDetailRail the refresh button unmounts
  // on tab switch while the content stays — we must not abort its data then.)
  useEffect(() => {
    subscriberCount += 1;
    return () => {
      subscriberCount -= 1;
      if (subscriberCount === 0) {
        if (debounceTimer) clearTimeout(debounceTimer);
        abortController?.abort();
        abortController = null;
        debounceTimer = null;
        currentSignature = '';
      }
    };
  }, []);

  if (disabled) {
    return { data: null, isLoading: false, error: null, refetch: () => {} };
  }

  return {
    data: snapshot.data,
    isLoading: snapshot.isLoading,
    error: snapshot.error,
    refetch: () => {
      refetchToken += 1;
      currentSignature = ''; // force the next ensureFetch to re-run
      if (pageContext) {
        ensureFetch(pageContext as unknown as Record<string, unknown>, 0);
      }
    },
  };
}
