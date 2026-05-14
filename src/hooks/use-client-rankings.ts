'use client';

import { useEffect, useRef, useState } from 'react';
import type { ApiAgreement, ApiClient } from '@/lib/api/strategist.api';
import {
  computeClientPriority,
  type ClientPriority,
} from '@/lib/client-priority';
import { sanitizePageContext } from '@/lib/ai/sanitize-pii';
import type {
  ClientRanking,
  PrioritizeResponse,
} from '@/app/api/ai/prioritize-clients/route';

export type { ClientRanking };

export interface RankingsResult {
  /** Map of clientId → ranking, ordered by score DESC in the order it returned. */
  rankings: ClientRanking[];
  /** Lookup helper. */
  byClientId: Map<string, ClientRanking>;
  /** 'ai' when the AI endpoint returned, 'fallback' on error/timeout. */
  source: 'ai' | 'fallback';
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const FALLBACK_TIMEOUT_MS = 3000;

/**
 * Source of truth for client urgency. Posts the strategist's client +
 * agreement lists to /api/ai/prioritize-clients and returns the AI rankings.
 *
 * Until the AI responds (or if it fails), we synthesize an interim ranking
 * from the deterministic computeClientPriority engine so the UI never sits
 * in a blank loading state. As soon as the AI lands, those rankings replace
 * the interim ones.
 */
export function useClientRankings(
  clients: ApiClient[],
  agreements: ApiAgreement[]
): RankingsResult {
  const [rankings, setRankings] = useState<ClientRanking[]>([]);
  const [source, setSource] = useState<'ai' | 'fallback'>('fallback');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const lastSigRef = useRef<string>('');

  useEffect(() => {
    if (clients.length === 0) {
      setRankings([]);
      setSource('fallback');
      setIsLoading(false);
      setError(null);
      return;
    }

    // Compute the deterministic fallback ranking immediately so the UI has
    // something to render right away.
    const fallback: ClientRanking[] = clients
      .map<ClientRanking>(client => {
        const p: ClientPriority = computeClientPriority(client, agreements);
        return {
          clientId: client.id,
          score: Math.min(100, Math.round(p.score)),
          riskBand: p.riskBand,
          atRisk: p.atRisk,
          signal: p.signal,
          reasoning: '',
        };
      })
      .sort((a, b) => b.score - a.score);

    setRankings(fallback);
    setSource('fallback');

    // Skip the AI call if the input hasn't meaningfully changed (cheap guard
    // on top of the server-side cache).
    const signature = `${clients.length}|${clients
      .map(c => c.id + c.status)
      .join(',')}|${agreements
      .map(a => `${a.clientId}:${a.status}:${a.updatedAt}`)
      .join(',')}|${refetchKey}`;
    if (signature === lastSigRef.current) {
      setIsLoading(false);
      return;
    }
    lastSigRef.current = signature;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    const timeoutId = setTimeout(() => controller.abort(), FALLBACK_TIMEOUT_MS * 4);

    // Strip PII before the data leaves the browser. Keep just what the
    // model needs to rank: ids, status, dates, amounts.
    const sanitized = sanitizePageContext({
      clients: clients.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        createdAt: c.createdAt,
        status: c.status,
      })),
      agreements: agreements.map(a => ({
        clientId: a.clientId,
        status: a.status,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        price: a.price,
      })),
    });

    fetch('/api/ai/prioritize-clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(sanitized),
    })
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `Rankings request failed (${res.status})`);
        }
        return (await res.json()) as PrioritizeResponse;
      })
      .then(payload => {
        if (abortRef.current === controller) {
          if (payload.rankings.length > 0) {
            setRankings(payload.rankings);
            setSource('ai');
          }
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        if (abortRef.current === controller) {
          console.warn('[useClientRankings] AI failed, keeping deterministic fallback:', err);
          setError(err instanceof Error ? err.message : 'Failed to load rankings');
          setIsLoading(false);
          // Keep the fallback rankings already in state — no UI regression.
        }
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      clearTimeout(timeoutId);
    };
  }, [clients, agreements, refetchKey]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const byClientId = new Map<string, ClientRanking>();
  for (const r of rankings) byClientId.set(r.clientId, r);

  return {
    rankings,
    byClientId,
    source,
    isLoading,
    error,
    refetch: () => setRefetchKey(k => k + 1),
  };
}
