'use client';

import { useQuery } from '@tanstack/react-query';
import { listAgreements, listClients, type ApiAgreement, type ApiClient } from '@/lib/api/strategist.api';
import { getClientDashboardData, getChargesForAgreement } from '@/lib/api/client.api';
import { computeClientPriority } from '@/lib/client-priority';
import { sanitizePageContext } from '@/lib/ai/sanitize-pii';
import { isAgreementSigned, isAgreementPaid, AgreementStatus } from '@/types/agreement';
import type { ClientRanking, PrioritizeResponse } from '@/app/api/ai/prioritize-clients/route';

export interface UrgentAlertsResult {
  /** Total number of items needing attention. 0 = nothing urgent. */
  count: number;
  /** Short copy used for the badge tooltip. */
  label: string;
  /** Where clicking the badge should navigate. */
  href: string;
}

interface UseUrgentAlertsOptions {
  role: string | undefined;
  /** Disable network polling (e.g., on auth pages). */
  enabled?: boolean;
}

/**
 * Source-of-truth for the "you have X urgent items" badge that lives in the
 * top context bar. Role-aware: strategists see high-priority client count,
 * clients see their own outstanding actions, others see 0.
 *
 * Uses React-Query (1-min stale, already configured app-wide) so we hit the
 * underlying APIs at most once per minute regardless of how many components
 * mount the hook.
 */
export function useUrgentAlerts({
  role,
  enabled = true,
}: UseUrgentAlertsOptions): UrgentAlertsResult {
  const query = useQuery<UrgentAlertsResult>({
    queryKey: ['urgent-alerts', role],
    enabled: enabled && !!role,
    queryFn: async () => {
      if (role === 'STRATEGIST') {
        return computeStrategistUrgentAlerts();
      }
      if (role === 'CLIENT') {
        return computeClientUrgentAlerts();
      }
      return { count: 0, label: '', href: '/' };
    },
    // Tolerate API hiccups quietly — a missing badge is OK; an error UI is not.
    retry: 1,
  });

  return (
    query.data ?? {
      count: 0,
      label: role === 'STRATEGIST' ? 'Loading priorities…' : 'Loading…',
      href: role === 'STRATEGIST' ? '/strategist/home' : '/client/home',
    }
  );
}

// ─── Strategist: count high-risk clients ──────────────────────────────────

async function computeStrategistUrgentAlerts(): Promise<UrgentAlertsResult> {
  try {
    const [clients, agreements] = await Promise.all([listClients(), listAgreements()]);
    if (!clients || clients.length === 0) {
      return { count: 0, label: 'All clear', href: '/strategist/clients' };
    }

    // Try the AI ranker first so the badge agrees with what the strategist
    // home shows. If the call fails (no key, rate limit, network), fall
    // back to the deterministic engine — no UI regression.
    const aiRankings = await fetchAiRankings(clients, agreements).catch(() => null);

    let highCount = 0;
    let mediumCount = 0;
    if (aiRankings && aiRankings.length > 0) {
      const byId = new Map(aiRankings.map(r => [r.clientId, r]));
      for (const client of clients) {
        const r = byId.get(client.id);
        if (!r) continue;
        if (r.riskBand === 'high' || r.atRisk) {
          highCount += 1;
        } else if (r.riskBand === 'medium') {
          mediumCount += 1;
        }
      }
    } else {
      for (const client of clients) {
        const priority = computeClientPriority(client, agreements || []);
        if (priority.riskBand === 'high' || priority.atRisk) {
          highCount += 1;
        } else if (priority.riskBand === 'medium') {
          mediumCount += 1;
        }
      }
    }

    if (highCount > 0) {
      return {
        count: highCount,
        label: `${highCount} client${highCount === 1 ? '' : 's'} need urgent attention`,
        href: '/strategist/clients',
      };
    }
    if (mediumCount > 0) {
      return {
        count: mediumCount,
        label: `${mediumCount} client${mediumCount === 1 ? '' : 's'} flagged for follow-up`,
        href: '/strategist/clients',
      };
    }
    return { count: 0, label: 'All clear', href: '/strategist/clients' };
  } catch (err) {
    console.error('[useUrgentAlerts] strategist computation failed:', err);
    return { count: 0, label: 'Status unavailable', href: '/strategist/clients' };
  }
}

// ─── Client: count their own outstanding actions ──────────────────────────

async function computeClientUrgentAlerts(): Promise<UrgentAlertsResult> {
  try {
    const data = await getClientDashboardData();
    if (!data) {
      return { count: 0, label: 'All clear', href: '/client/home' };
    }

    let count = 0;
    const reasons: string[] = [];

    // Each non-completed agreement contributes at most one item depending on phase.
    for (const agreement of data.agreements || []) {
      const status = agreement.status as AgreementStatus;
      if (status === AgreementStatus.COMPLETED || status === AgreementStatus.CANCELLED) {
        continue;
      }
      if (!isAgreementSigned(status)) {
        count += 1;
        reasons.push('Sign your agreement');
        continue;
      }
      if (!isAgreementPaid(status)) {
        count += 1;
        reasons.push('Complete payment');
        continue;
      }
      // Pending document uploads (client-facing todos that aren't done yet).
      if (status === AgreementStatus.PENDING_TODOS_COMPLETION) {
        const pendingDocs = (data.todos || []).filter(
          t => t.status !== 'completed'
        ).length;
        if (pendingDocs > 0) {
          count += pendingDocs;
          reasons.push(
            `${pendingDocs} document${pendingDocs === 1 ? '' : 's'} to upload`
          );
        }
      }
    }

    if (count === 0) {
      return { count: 0, label: 'All caught up', href: '/client/home' };
    }
    return {
      count,
      label: reasons.slice(0, 2).join(' · '),
      href: '/client/home',
    };
  } catch (err) {
    console.error('[useUrgentAlerts] client computation failed:', err);
    return { count: 0, label: 'Status unavailable', href: '/client/home' };
  }
}

// ─── AI ranker fetch (shared with strategist home) ────────────────────────

async function fetchAiRankings(
  clients: ApiClient[],
  agreements: ApiAgreement[]
): Promise<ClientRanking[] | null> {
  const sanitized = sanitizePageContext({
    clients: clients.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      createdAt: c.createdAt,
      status: c.status,
    })),
    agreements: (agreements || []).map(a => ({
      clientId: a.clientId,
      status: a.status,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      price: a.price,
    })),
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch('/api/ai/prioritize-clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitized),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as PrioritizeResponse;
    return payload.rankings.length > 0 ? payload.rankings : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Suppress unused warnings — `getChargesForAgreement` is reserved for a future
// granular payment-overdue count.
void getChargesForAgreement;
