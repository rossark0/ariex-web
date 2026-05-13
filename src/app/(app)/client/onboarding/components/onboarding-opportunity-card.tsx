'use client';

import { useEffect, useRef, useState } from 'react';
import { Lightning, Sparkle } from '@phosphor-icons/react';
import type { AiInsightItem, AiInsightsResponse } from '@/app/api/ai/insights/route';

interface OnboardingFormSnapshot {
  filingStatus?: string;
  dependents?: number | null;
  estimatedIncome?: number | null;
  businessName?: string;
  businessType?: string;
  taxId?: string;
  state?: string;
  city?: string;
}

interface OnboardingOpportunityCardProps {
  form: OnboardingFormSnapshot;
  /** Minimum fields required before we fire a request. */
  enabled: boolean;
}

const DEBOUNCE_MS = 900;

/**
 * Real-time AI panel that surfaces tax planning opportunities while a client
 * completes onboarding. Fires the existing /api/ai/insights endpoint with the
 * current form snapshot; renders the "opportunities" axis only since
 * risks/actions aren't meaningful pre-onboarding.
 */
export function OnboardingOpportunityCard({
  form,
  enabled,
}: OnboardingOpportunityCardProps) {
  const [items, setItems] = useState<AiInsightItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const lastSignatureRef = useRef<string>('');

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setError(null);
      setLoading(false);
      abortRef.current?.abort();
      return;
    }

    const signature = JSON.stringify(form);
    if (signature === lastSignatureRef.current) return;
    lastSignatureRef.current = signature;

    const timeout = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);

      fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          pageContext: {
            pagePath: '/client/onboarding',
            pageTitle: 'Client Onboarding',
            userRole: 'CLIENT',
            client: form,
            extra: { stage: 'onboarding_profile' },
          },
        }),
      })
        .then(async res => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.error || `Failed (${res.status})`);
          }
          return (await res.json()) as AiInsightsResponse;
        })
        .then(payload => {
          if (abortRef.current === controller) {
            setItems(payload.opportunities ?? []);
            setLoading(false);
          }
        })
        .catch(err => {
          if (err.name === 'AbortError') return;
          if (abortRef.current === controller) {
            setError(err instanceof Error ? err.message : 'Failed to load suggestions');
            setLoading(false);
          }
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [form, enabled]);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (!enabled) return null;

  return (
    <div className="rounded-xl border border-electric-blue/25 bg-electric-blue/8 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkle weight="fill" className="h-4 w-4 text-electric-blue" />
        <h4 className="text-sm font-medium text-soft-white">Planning opportunities</h4>
        {loading && (
          <span className="ml-auto text-[10px] tracking-wide text-electric-blue uppercase">
            Analyzing…
          </span>
        )}
      </div>

      {error ? (
        <p className="text-xs leading-relaxed text-red-300/90">{error}</p>
      ) : items.length === 0 && !loading ? (
        <p className="text-xs leading-relaxed text-steel-gray">
          Once we know your business type and a rough income range, your strategist&apos;s AI will
          surface specific tax-saving opportunities here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((item, i) => (
            <li
              key={`${item.title}-${i}`}
              className="rounded-lg border border-white/8 bg-deep-navy/60 p-3"
            >
              <div className="flex items-start gap-2">
                <Lightning weight="fill" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-electric-blue" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-soft-white">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-steel-gray">{item.detail}</p>
                </div>
                {typeof item.impactValue === 'number' && item.impactFormat === 'currency' && (
                  <span className="shrink-0 text-xs font-medium tabular-nums text-emerald-300">
                    ~${Math.round(item.impactValue).toLocaleString()}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-steel-gray/70">
        Suggestions are illustrative — your strategist will confirm which apply.
      </p>
    </div>
  );
}
