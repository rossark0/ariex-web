'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { ApiAgreement, ApiClient } from '@/lib/api/strategist.api';
import {
  computeClientPriority,
  formatDeadlineLabel,
  RISK_BAND_LABEL,
  type ClientPriority,
  type RiskBand,
} from '@/lib/client-priority';
import { useClientRankings } from '@/hooks/use-client-rankings';

// ─── Sort state ───────────────────────────────────────────────────────────

type SortKey = 'priority' | 'name' | 'deadline' | 'risk';
type SortDir = 'asc' | 'desc';

interface ClientMatrixProps {
  clients: ApiClient[];
  agreements: ApiAgreement[];
}

interface MatrixRow {
  client: ApiClient;
  priority: ClientPriority;
}

const RISK_RANK: Record<RiskBand, number> = { high: 2, medium: 1, low: 0 };

const RISK_DOT: Record<RiskBand, string> = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-emerald-400',
};

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ClientMatrix({ clients, agreements }: ClientMatrixProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pull AI-driven rankings to override the deterministic priority signal/
  // score/atRisk for each client. Deadline projection still comes from the
  // deterministic engine because it depends on agreement timestamps the AI
  // doesn't compute itself.
  const { byClientId: rankingByClientId, source: rankingsSource } = useClientRankings(
    clients,
    agreements
  );

  const rows = useMemo<MatrixRow[]>(() => {
    const computed = clients.map<MatrixRow>(client => {
      const deterministic = computeClientPriority(client, agreements);
      const ai = rankingByClientId.get(client.id);
      const priority: ClientPriority = ai
        ? {
            ...deterministic,
            score: ai.score,
            riskBand: ai.riskBand,
            atRisk: ai.atRisk,
            signal: ai.signal,
          }
        : deterministic;
      return { client, priority };
    });

    const sorted = [...computed].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'priority':
          cmp = a.priority.score - b.priority.score;
          break;
        case 'name':
          cmp = (a.client.name ?? a.client.email).localeCompare(
            b.client.name ?? b.client.email
          );
          break;
        case 'deadline': {
          const aTime = a.priority.nextDeadline ? new Date(a.priority.nextDeadline).getTime() : Infinity;
          const bTime = b.priority.nextDeadline ? new Date(b.priority.nextDeadline).getTime() : Infinity;
          cmp = aTime - bTime;
          break;
        }
        case 'risk':
          cmp = RISK_RANK[a.priority.riskBand] - RISK_RANK[b.priority.riskBand];
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [clients, agreements, sortKey, sortDir, rankingByClientId]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-white/6 bg-surface py-16 text-center">
        <p className="text-sm font-medium text-soft-white">No clients match the current filters</p>
        <p className="mt-1 text-xs text-steel-gray/70">Adjust filters or clear them to see all clients.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {rankingsSource === 'ai' && (
        <div className="flex items-center gap-1.5 self-end">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/8 px-2 py-0.5 text-[10px] font-medium tracking-wide text-steel-gray uppercase">
            AI-ranked
          </span>
        </div>
      )}
    <div className="overflow-hidden rounded-lg border border-white/6 bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface">
            <tr className="text-left text-[11px] font-medium tracking-wide text-steel-gray uppercase">
              <HeaderCell label="Client" sortKey="name" active={sortKey} dir={sortDir} onSort={handleSort} />
              <HeaderCell label="Priority" sortKey="priority" active={sortKey} dir={sortDir} onSort={handleSort} alignRight />
              <HeaderCell label="Next Deadline" sortKey="deadline" active={sortKey} dir={sortDir} onSort={handleSort} />
              <HeaderCell label="Risk" sortKey="risk" active={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="px-4 py-2.5">AI Signal</th>
            </tr>
          </thead>
          <tbody data-focus-group>
            {rows.map(({ client, priority }) => (
              <MatrixRowView
                key={client.id}
                client={client}
                priority={priority}
                onOpen={() => router.push(`/strategist/clients/${client.id}`)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}

// ─── Header cell ──────────────────────────────────────────────────────────

interface HeaderCellProps {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  alignRight?: boolean;
}

function HeaderCell({ label, sortKey, active, dir, onSort, alignRight }: HeaderCellProps) {
  const isActive = active === sortKey;
  return (
    <th
      className={cn(
        'cursor-pointer px-4 py-2.5 transition-colors duration-150 ease-linear hover:bg-white/5',
        alignRight && 'text-right'
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive &&
          (dir === 'asc' ? (
            <CaretUp weight="bold" className="h-3 w-3" />
          ) : (
            <CaretDown weight="bold" className="h-3 w-3" />
          ))}
      </span>
    </th>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────

interface MatrixRowViewProps {
  client: ApiClient;
  priority: ClientPriority;
  onOpen: () => void;
}

function MatrixRowView({ client, priority, onOpen }: MatrixRowViewProps) {
  const [focused, setFocused] = useState(false);
  const deadlineLabel = formatDeadlineLabel(priority);
  const isOverdue = priority.deadlineWindow === 'overdue';

  return (
    <tr
      data-focus-item
      data-focused={focused}
      onMouseEnter={() => setFocused(true)}
      onMouseLeave={() => setFocused(false)}
      onClick={onOpen}
      className="cursor-pointer border-t border-white/6 transition-colors duration-150 ease-linear hover:bg-surface"
    >
      {/* Client */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-[11px] font-medium text-soft-white">
            {getInitials(client.name ?? client.email)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-soft-white">
              {client.name ?? client.email}
            </p>
            <p className="truncate text-[11px] text-steel-gray">{client.email}</p>
          </div>
        </div>
      </td>

      {/* Priority */}
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm tabular-nums text-soft-white">{priority.score}</span>
      </td>

      {/* Next deadline */}
      <td className="px-4 py-3">
        <span
          className={cn(
            'text-sm',
            isOverdue ? 'text-red-300 font-medium' : 'text-soft-white/85'
          )}
        >
          {deadlineLabel}
        </span>
      </td>

      {/* Risk */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={cn('h-2 w-2 rounded-full', RISK_DOT[priority.riskBand])}
            aria-label={RISK_BAND_LABEL[priority.riskBand]}
          />
          <span className="text-sm text-steel-gray">{RISK_BAND_LABEL[priority.riskBand]}</span>
        </div>
      </td>

      {/* AI Signal */}
      <td className="px-4 py-3">
        <span className="inline-flex items-center rounded-full bg-electric-blue/12 px-2 py-0.5 text-[11px] font-medium text-electric-blue">
          {priority.signal}
        </span>
      </td>
    </tr>
  );
}
