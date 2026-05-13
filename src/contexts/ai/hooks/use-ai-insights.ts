'use client';

import { useEffect, useRef, useState } from 'react';
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
 *  - Caches by stable context signature on the server, so revisits are free.
 *  - Surfaces errors instead of throwing.
 */
export function useAiInsights(options: UseAiInsightsOptions = {}): UseAiInsightsState {
  const { debounceMs = DEFAULT_DEBOUNCE_MS, disabled = false } = options;

  const pageContext = useAiPageContextStore(s => s.pageContext);

  const [data, setData] = useState<AiInsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signature of the context bits that affect insights — used to detect "real" changes
  const signatureRef = useRef<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Bumped on every refetch() to force a re-run even when signature is unchanged
  const [refetchToken, setRefetchToken] = useState(0);

  useEffect(() => {
    if (disabled) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!pageContext) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Compute signature over the meaningful fields (skip updatedAt timestamp)
    const signature = JSON.stringify({
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

    if (signature === signatureRef.current) {
      return;
    }
    signatureRef.current = signature;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

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
          // Only commit if this controller is still the active one
          if (abortRef.current === controller) {
            setData(payload);
            setIsLoading(false);
          }
        })
        .catch(err => {
          if (err.name === 'AbortError') return;
          if (abortRef.current === controller) {
            setError(err instanceof Error ? err.message : 'Failed to load insights');
            setIsLoading(false);
          }
        });
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [pageContext, disabled, debounceMs, refetchToken]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch: () => setRefetchToken(t => t + 1),
  };
}
