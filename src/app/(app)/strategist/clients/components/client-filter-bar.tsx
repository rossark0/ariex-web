'use client';

import { useEffect, useRef, useState } from 'react';
import { CaretDown, Check, FloppyDisk, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  DEADLINE_WINDOW_LABEL,
  RISK_BAND_LABEL,
  type DeadlineWindow,
  type RiskBand,
} from '@/lib/client-priority';
import { useSavedViews, type SavedView } from '@/contexts/strategist-contexts/client-management/saved-views';

// ─── Filter state ─────────────────────────────────────────────────────────

export type WorkflowGroup =
  | 'action_required'
  | 'waiting_on_client'
  | 'waiting_on_compliance'
  | 'active_clients'
  | 'archived';

export const WORKFLOW_GROUP_LABEL: Record<WorkflowGroup, string> = {
  action_required: 'Action required',
  waiting_on_client: 'Waiting on client',
  waiting_on_compliance: 'Waiting on compliance',
  active_clients: 'Active',
  archived: 'Archived',
};

export interface ClientFilters {
  workflows: WorkflowGroup[];
  risks: RiskBand[];
  deadlineWindows: DeadlineWindow[];
}

export const EMPTY_FILTERS: ClientFilters = {
  workflows: [],
  risks: [],
  deadlineWindows: [],
};

export function filtersAreEmpty(f: ClientFilters): boolean {
  return f.workflows.length === 0 && f.risks.length === 0 && f.deadlineWindows.length === 0;
}

export function countActiveFilters(f: ClientFilters): number {
  return f.workflows.length + f.risks.length + f.deadlineWindows.length;
}

// ─── Filter bar component ─────────────────────────────────────────────────

interface ClientFilterBarProps {
  filters: ClientFilters;
  onChange: (next: ClientFilters) => void;
  searchQuery: string;
  onSearchQueryChange?: (next: string) => void;
  viewMode: string;
  onViewModeChange?: (next: string) => void;
}

const WORKFLOW_KEYS: WorkflowGroup[] = [
  'action_required',
  'waiting_on_client',
  'waiting_on_compliance',
  'active_clients',
  'archived',
];

const RISK_KEYS: RiskBand[] = ['high', 'medium', 'low'];

const DEADLINE_KEYS: DeadlineWindow[] = ['overdue', 'this_week', 'this_month', 'later', 'none'];

export function ClientFilterBar({
  filters,
  onChange,
  searchQuery,
  onSearchQueryChange,
  viewMode,
  onViewModeChange,
}: ClientFilterBarProps) {
  const { views, saveView, removeView } = useSavedViews();
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  const total = countActiveFilters(filters);

  const toggle = <K extends keyof ClientFilters>(key: K, value: ClientFilters[K][number]) => {
    const current = filters[key] as Array<typeof value>;
    const exists = current.includes(value);
    const next = exists ? current.filter(v => v !== value) : [...current, value];
    onChange({ ...filters, [key]: next });
    setActiveViewId(null);
  };

  const clearAll = () => {
    onChange(EMPTY_FILTERS);
    setActiveViewId(null);
  };

  const handleSave = () => {
    const defaultName = `View ${views.length + 1}`;
    const name = window.prompt('Name this view', defaultName);
    if (!name?.trim()) return;
    const saved = saveView({
      name: name.trim().slice(0, 60),
      filters: filters as unknown as Record<string, unknown>,
      searchQuery,
      viewMode,
    });
    setActiveViewId(saved.id);
  };

  const handleApplyView = (view: SavedView) => {
    const payload = view.filters as unknown as ClientFilters;
    onChange({
      workflows: payload.workflows ?? [],
      risks: payload.risks ?? [],
      deadlineWindows: payload.deadlineWindows ?? [],
    });
    if (onSearchQueryChange) onSearchQueryChange(view.searchQuery ?? '');
    if (onViewModeChange) onViewModeChange(view.viewMode);
    setActiveViewId(view.id);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Facet dropdowns + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterDropdown
          label="Status"
          activeCount={filters.workflows.length}
          options={WORKFLOW_KEYS.map(k => ({ value: k, label: WORKFLOW_GROUP_LABEL[k] }))}
          selected={filters.workflows}
          onToggle={v => toggle('workflows', v)}
          onClear={() => onChange({ ...filters, workflows: [] })}
        />
        <FilterDropdown
          label="Risk"
          activeCount={filters.risks.length}
          options={RISK_KEYS.map(k => ({ value: k, label: RISK_BAND_LABEL[k] }))}
          selected={filters.risks}
          onToggle={v => toggle('risks', v)}
          onClear={() => onChange({ ...filters, risks: [] })}
        />
        <FilterDropdown
          label="Deadline"
          activeCount={filters.deadlineWindows.length}
          options={DEADLINE_KEYS.map(k => ({ value: k, label: DEADLINE_WINDOW_LABEL[k] }))}
          selected={filters.deadlineWindows}
          onToggle={v => toggle('deadlineWindows', v)}
          onClear={() => onChange({ ...filters, deadlineWindows: [] })}
        />

        {total > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="rounded-md px-2 py-1 text-xs font-medium text-steel-gray transition-colors duration-150 ease-linear hover:bg-white/8 hover:text-soft-white"
          >
            Clear ({total})
          </button>
        )}

        {!filtersAreEmpty(filters) && (
          <button
            type="button"
            onClick={handleSave}
            className="ml-auto flex items-center gap-1.5 rounded-md border border-white/10 bg-white/3 px-2.5 py-1 text-xs font-medium text-soft-white transition-colors duration-150 ease-linear hover:bg-white/8"
          >
            <FloppyDisk weight="fill" className="h-3.5 w-3.5 text-electric-blue" />
            Save view
          </button>
        )}
      </div>

      {/* Saved view chips */}
      {views.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium tracking-wide text-steel-gray uppercase">
            Saved views
          </span>
          {views.map(view => (
            <SavedViewChip
              key={view.id}
              view={view}
              active={view.id === activeViewId}
              onApply={() => handleApplyView(view)}
              onRemove={() => {
                removeView(view.id);
                if (view.id === activeViewId) setActiveViewId(null);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Single facet dropdown ────────────────────────────────────────────────

interface FilterDropdownProps<T extends string> {
  label: string;
  activeCount: number;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
  onClear: () => void;
}

function FilterDropdown<T extends string>({
  label,
  activeCount,
  options,
  selected,
  onToggle,
  onClear,
}: FilterDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          'flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors duration-150 ease-linear',
          activeCount > 0
            ? 'border-electric-blue/40 bg-electric-blue/10 text-electric-blue hover:bg-electric-blue/15'
            : 'border-white/10 bg-deep-navy text-steel-gray hover:bg-white/5'
        )}
      >
        <span>{label}</span>
        {activeCount > 0 && (
          <span className="rounded-full bg-electric-blue/25 px-1.5 text-[10px] font-semibold tabular-nums text-soft-white">
            {activeCount}
          </span>
        )}
        <CaretDown
          weight="bold"
          className={cn(
            'h-3 w-3 transition-transform duration-150 ease-linear',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-40 mt-1 w-56 overflow-hidden rounded-lg border border-white/10 bg-deep-navy py-1 shadow-xl">
          {options.map(opt => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onToggle(opt.value)}
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs text-soft-white transition-colors duration-150 ease-linear hover:bg-white/5"
              >
                <span>{opt.label}</span>
                {isSelected && <Check weight="bold" className="h-3 w-3 text-electric-blue" />}
              </button>
            );
          })}
          {activeCount > 0 && (
            <div className="mt-1 border-t border-white/8 px-2 py-1.5">
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
                className="w-full rounded-md py-1 text-[11px] font-medium text-steel-gray transition-colors duration-150 ease-linear hover:bg-white/5 hover:text-soft-white"
              >
                Clear {label.toLowerCase()}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Saved view chip ──────────────────────────────────────────────────────

interface SavedViewChipProps {
  view: SavedView;
  active: boolean;
  onApply: () => void;
  onRemove: () => void;
}

function SavedViewChip({ view, active, onApply, onRemove }: SavedViewChipProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors duration-150 ease-linear',
        active
          ? 'border-electric-blue/50 bg-electric-blue/15 text-electric-blue'
          : 'border-white/10 bg-white/3 text-steel-gray hover:bg-white/8 hover:text-soft-white'
      )}
    >
      <button type="button" onClick={onApply} className="cursor-pointer">
        {view.name}
      </button>
      <button
        type="button"
        onClick={onRemove}
        title="Remove saved view"
        className="flex h-4 w-4 items-center justify-center rounded-full text-steel-gray/70 opacity-0 transition-opacity duration-150 ease-linear group-hover:opacity-100 hover:bg-white/10 hover:text-soft-white"
      >
        <X weight="bold" className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}
