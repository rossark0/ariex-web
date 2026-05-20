'use client';

import { useMemo, useState } from 'react';
import {
  ArrowsClockwise,
  Lightning,
  Sparkle,
  Target,
  Warning,
  ChatCircleDots,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useAiInsights, type AiInsightItem } from '@/contexts/ai/hooks/use-ai-insights';
import { useAiPageContextStore } from '@/contexts/ai/AiPageContextStore';
import { useUiStore } from '@/contexts/ui/UiStore';
import { useCountUp } from '@/hooks/use-count-up';

// ─── Role-aware copy ───────────────────────────────────────────────────────
// The same three insight axes (risks / opportunities / actions) read very
// differently to a strategist managing a book of clients vs. a client
// looking at their own engagement. We only swap the framing copy here — the
// underlying AI prompt is already role-aware on the server.

interface RailCopy {
  heading: string;
  risksLabel: string;
  risksEmpty: string;
  /** Opportunities is strategist-only — clients don't action tax-saving
   *  angles, their strategist does. Hidden entirely for the client rail. */
  showOpportunities: boolean;
  oppsLabel: string;
  oppsEmpty: string;
  actionsLabel: string;
  actionsEmpty: string;
  emptyTitle: string;
  emptyBody: string;
}

const STRATEGIST_COPY: RailCopy = {
  heading: 'AI Copilot',
  risksLabel: 'Top Risks',
  risksEmpty: 'No risks detected on this page.',
  showOpportunities: true,
  oppsLabel: 'Opportunities',
  oppsEmpty: 'No tax-saving angles surfaced yet.',
  actionsLabel: 'Suggested Actions',
  actionsEmpty: 'No next actions queued.',
  emptyTitle: 'No insights yet',
  emptyBody: 'ARIEX surfaces signals here as data on this page evolves.',
};

const CLIENT_COPY: RailCopy = {
  heading: 'Your AI Advisor',
  risksLabel: 'Needs Your Attention',
  risksEmpty: 'Nothing needs your attention right now.',
  showOpportunities: false,
  oppsLabel: '',
  oppsEmpty: '',
  actionsLabel: 'Your Next Steps',
  actionsEmpty: "You're all caught up — nothing to do right now.",
  emptyTitle: 'Nothing to review yet',
  emptyBody:
    'As your engagement progresses, ARIEX will highlight what matters for you here.',
};

function copyForRole(role: string | undefined): RailCopy {
  return role === 'CLIENT' ? CLIENT_COPY : STRATEGIST_COPY;
}

/** Compliance/admin never get the AI copilot rail. */
function roleHasInsightsRail(role: string | undefined): boolean {
  return role === 'CLIENT' || role === 'STRATEGIST';
}

// ─── Severity → accent class ──────────────────────────────────────────────

const SEVERITY_CLASSES: Record<NonNullable<AiInsightItem['severity']>, { rail: string; dot: string; chip: string }> = {
  high: {
    rail: 'bg-red-400',
    dot: 'bg-red-400',
    chip: 'bg-red-500/15 text-red-300',
  },
  medium: {
    rail: 'bg-amber-400',
    dot: 'bg-amber-400',
    chip: 'bg-amber-500/15 text-amber-300',
  },
  low: {
    rail: 'bg-electric-blue',
    dot: 'bg-electric-blue',
    chip: 'bg-electric-blue/15 text-electric-blue',
  },
};

// ─── Impact formatter ─────────────────────────────────────────────────────

function formatImpact(value: number, format?: AiInsightItem['impactFormat']): string {
  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (format === 'percent') {
    return `${value}%`;
  }
  return new Intl.NumberFormat('en-US').format(value);
}

// ─── Impact value with 300ms count-up (ARIEX motion rule) ─────────────────

function ImpactValue({ value, format }: { value: number; format?: AiInsightItem['impactFormat'] }) {
  const animated = useCountUp(value, 300);

  if (format === 'currency') {
    return (
      <span className="text-sm font-medium tabular-nums text-soft-white">
        {formatImpact(Math.round(animated), 'currency')}
      </span>
    );
  }
  if (format === 'percent') {
    return (
      <span className="text-sm font-medium tabular-nums text-soft-white">
        {Math.round(animated)}%
      </span>
    );
  }
  return (
    <span className="text-sm font-medium tabular-nums text-soft-white">
      {formatImpact(Math.round(animated), format)}
    </span>
  );
}

// ─── Single insight card ──────────────────────────────────────────────────

interface InsightCardProps {
  item: AiInsightItem;
  focused: boolean;
  onFocusChange: (focused: boolean) => void;
  onAskFollowUp: (prompt: string) => void;
}

function InsightCard({ item, focused, onFocusChange, onAskFollowUp }: InsightCardProps) {
  const severity = item.severity ?? 'medium';
  const tone = SEVERITY_CLASSES[severity];

  return (
    <div
      data-focus-item
      data-focused={focused}
      onMouseEnter={() => onFocusChange(true)}
      onMouseLeave={() => onFocusChange(false)}
      className="group relative rounded-lg border border-white/6 bg-surface p-3 transition-colors duration-150 ease-linear hover:bg-white/5"
    >
      <span
        aria-hidden="true"
        className={cn('absolute top-3 left-0 h-[calc(100%-1.5rem)] w-[2px] rounded-full', tone.rail)}
      />
      <div className="pl-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium leading-snug text-soft-white">{item.title}</h4>
          {typeof item.impactValue === 'number' && (
            <ImpactValue value={item.impactValue} format={item.impactFormat} />
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-steel-gray">{item.detail}</p>

        {item.followUpPrompt && (
          <button
            type="button"
            onClick={() => onAskFollowUp(item.followUpPrompt!)}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-electric-blue transition-colors duration-150 ease-linear hover:text-electric-blue/80"
          >
            <ChatCircleDots weight="fill" className="h-3 w-3" />
            Ask ARIEX
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────

interface InsightSectionProps {
  icon: React.ReactNode;
  label: string;
  items: AiInsightItem[];
  emptyLabel: string;
  onAskFollowUp: (prompt: string) => void;
}

function InsightSection({ icon, label, items, emptyLabel, onAskFollowUp }: InsightSectionProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-soft-white uppercase">
          <span className="text-steel-gray">{icon}</span>
          {label}
        </div>
        <span className="text-[10px] tabular-nums text-steel-gray/70">{items.length}</span>
      </header>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/6 bg-surface p-3 text-xs text-steel-gray/70">
          {emptyLabel}
        </p>
      ) : (
        <div data-focus-group className="flex flex-col gap-2">
          {items.map((item, i) => (
            <InsightCard
              key={`${label}-${i}-${item.title}`}
              item={item}
              focused={focusedIndex === i}
              onFocusChange={f => setFocusedIndex(f ? i : null)}
              onAskFollowUp={onAskFollowUp}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Skeleton (loading state) ─────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-white/6 bg-surface p-3">
      <div className="h-3 w-3/4 animate-ariex-dot-pulse rounded bg-white/10" />
      <div className="mt-2 h-2 w-full animate-ariex-dot-pulse rounded bg-white/8" />
      <div className="mt-1 h-2 w-2/3 animate-ariex-dot-pulse rounded bg-white/8" />
    </div>
  );
}

function SkeletonSection({ label }: { label: string }) {
  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-soft-white uppercase">{label}</span>
        <span className="text-[10px] text-steel-gray/70">—</span>
      </header>
      <div className="flex flex-col gap-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </section>
  );
}

// ─── Content-only renderer (used by both standalone rail and tabbed views) ─

interface AiInsightsContentProps {
  /** Show the "Ask ARIEX" free-form footer button. Default true. */
  showAskFooter?: boolean;
}

export function AiInsightsContent({ showAskFooter = true }: AiInsightsContentProps) {
  const { data, isLoading, error, refetch } = useAiInsights();
  const { setAiChatOpen, sendAiMessage } = useUiStore();
  const role = useAiPageContextStore(s => s.pageContext?.userRole);
  const copy = copyForRole(role);

  const totals = useMemo(
    () => ({
      risks: data?.risks.length ?? 0,
      // Opportunities only count toward "has content" when the role shows them.
      opps: copy.showOpportunities ? (data?.opportunities.length ?? 0) : 0,
      actions: data?.actions.length ?? 0,
    }),
    [data, copy.showOpportunities]
  );

  const handleAskFollowUp = (prompt: string) => {
    setAiChatOpen(true);
    void sendAiMessage(prompt);
  };

  const handleAskFreeform = () => {
    setAiChatOpen(true);
  };

  const showSkeleton = isLoading && !data;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {showSkeleton ? (
          <div className="flex flex-col gap-5">
            <SkeletonSection label={copy.risksLabel} />
            {copy.showOpportunities && <SkeletonSection label={copy.oppsLabel} />}
            <SkeletonSection label={copy.actionsLabel} />
          </div>
        ) : error ? (
          <div className="flex flex-col gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-xs font-medium text-red-300">Insights unavailable</p>
            <p className="text-[11px] leading-relaxed text-red-300/80">{error}</p>
            <button
              type="button"
              onClick={refetch}
              className="mt-1 self-start text-[11px] font-medium text-red-300 underline hover:text-red-200"
            >
              Try again
            </button>
          </div>
        ) : !data || totals.risks + totals.opps + totals.actions === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/6 bg-surface px-4 py-8 text-center">
            <Sparkle weight="duotone" className="h-6 w-6 text-steel-gray/70" />
            <p className="text-xs font-medium text-soft-white">{copy.emptyTitle}</p>
            <p className="text-[11px] leading-relaxed text-steel-gray/70">{copy.emptyBody}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <InsightSection
              icon={<Warning weight="fill" className="h-3.5 w-3.5" />}
              label={copy.risksLabel}
              items={data.risks}
              emptyLabel={copy.risksEmpty}
              onAskFollowUp={handleAskFollowUp}
            />
            {copy.showOpportunities && (
              <InsightSection
                icon={<Lightning weight="fill" className="h-3.5 w-3.5" />}
                label={copy.oppsLabel}
                items={data.opportunities}
                emptyLabel={copy.oppsEmpty}
                onAskFollowUp={handleAskFollowUp}
              />
            )}
            <InsightSection
              icon={<Target weight="fill" className="h-3.5 w-3.5" />}
              label={copy.actionsLabel}
              items={data.actions}
              emptyLabel={copy.actionsEmpty}
              onAskFollowUp={handleAskFollowUp}
            />
          </div>
        )}
      </div>

      {showAskFooter && (
        <footer className="border-t border-white/6 px-4 py-3">
          <button
            type="button"
            onClick={handleAskFreeform}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-electric-blue/15 px-3 py-2 text-xs font-medium text-electric-blue transition-colors duration-150 ease-linear hover:bg-electric-blue/25"
          >
            <ChatCircleDots weight="fill" className="h-3.5 w-3.5" />
            Ask ARIEX
          </button>
        </footer>
      )}
    </div>
  );
}

/** Refresh button — exported so tabbed views can place it next to tabs. */
export function AiInsightsRefreshButton() {
  const { isLoading, refetch } = useAiInsights();
  return (
    <button
      type="button"
      onClick={refetch}
      disabled={isLoading}
      title="Refresh insights"
      className="flex h-6 w-6 items-center justify-center rounded text-steel-gray transition-colors duration-150 ease-linear hover:bg-white/8 hover:text-soft-white disabled:opacity-40"
    >
      <ArrowsClockwise
        weight="bold"
        className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')}
      />
    </button>
  );
}

// ─── Standalone rail (used on home pages) ─────────────────────────────────

interface AiInsightsRailProps {
  className?: string;
}

export function AiInsightsRail({ className }: AiInsightsRailProps) {
  const role = useAiPageContextStore(s => s.pageContext?.userRole);

  // Defense in depth: compliance / admin must never see the AI copilot
  // rail, regardless of how app-layout routing evolves.
  if (!roleHasInsightsRail(role)) return null;

  const copy = copyForRole(role);

  return (
    <aside
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border border-white/10 bg-deep-navy',
        className
      )}
      aria-label="AI Insights"
    >
      <header className="flex items-center justify-between border-b border-white/6 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkle weight="fill" className="h-4 w-4 text-electric-blue" />
          <h3 className="text-sm font-medium text-soft-white">{copy.heading}</h3>
        </div>
        <AiInsightsRefreshButton />
      </header>
      <AiInsightsContent />
    </aside>
  );
}
