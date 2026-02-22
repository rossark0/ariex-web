'use client';

import { AgreementStatus } from '@/types/agreement';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CaretDown, Check, FileText, Plus } from '@phosphor-icons/react';
import { useState } from 'react';

// ─── Inline formatters (avoids deep relative import for reuse outside strategist ctx) ──

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function statusLabel(status: AgreementStatus | string): string {
  const map: Record<string, string> = {
    [AgreementStatus.DRAFT]: 'Draft',
    [AgreementStatus.PENDING_SIGNATURE]: 'Pending Signature',
    [AgreementStatus.PENDING_PAYMENT]: 'Pending Payment',
    [AgreementStatus.PENDING_TODOS_COMPLETION]: 'Pending Documents',
    [AgreementStatus.PENDING_STRATEGY]: 'Pending Strategy',
    [AgreementStatus.PENDING_STRATEGY_REVIEW]: 'Under Review',
    [AgreementStatus.CANCELLED]: 'Cancelled',
    [AgreementStatus.COMPLETED]: 'Completed',
  };
  return map[status] ?? status;
}

function statusVariant(
  status: AgreementStatus | string
): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' {
  switch (status) {
    case AgreementStatus.COMPLETED:
      return 'success';
    case AgreementStatus.CANCELLED:
      return 'destructive';
    case AgreementStatus.DRAFT:
      return 'secondary';
    case AgreementStatus.PENDING_SIGNATURE:
    case AgreementStatus.PENDING_PAYMENT:
      return 'warning';
    case AgreementStatus.PENDING_STRATEGY:
    case AgreementStatus.PENDING_STRATEGY_REVIEW:
    case AgreementStatus.PENDING_TODOS_COMPLETION:
      return 'info';
    default:
      return 'outline';
  }
}

// ─── Types ────────────────────────────────────────────────────────────────

/** Minimal agreement shape accepted by the selector (works with both ApiAgreement & ClientAgreement) */
export interface AgreementSelectorItem {
  id: string;
  name?: string;
  title?: string;
  status: AgreementStatus | string;
  price?: string | number;
  createdAt: string;
}

function agreementDisplayName(a: AgreementSelectorItem): string {
  return a.name || a.title || 'Untitled Agreement';
}

// ─── Props ────────────────────────────────────────────────────────────────

interface AgreementSelectorProps {
  agreements: AgreementSelectorItem[];
  selectedAgreementId: string | null;
  onSelect: (id: string) => void;
  onCreateNew?: () => void;
  isLoading?: boolean;
  /** Compact mode for sidebar placement */
  compact?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────

export function AgreementSelector({
  agreements,
  selectedAgreementId,
  onSelect,
  onCreateNew,
  isLoading,
  compact,
}: AgreementSelectorProps) {
  const [open, setOpen] = useState(false);

  if (isLoading) return null;

  // No agreements yet — show only the create button
  if (agreements.length === 0) {
    if (!onCreateNew) return null;
    return (
      <div className="mb-4 mt-2">
        <button
          type="button"
          onClick={onCreateNew}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900"
        >
          <Plus className="h-4 w-4" weight="bold" />
          New Agreement
        </button>
      </div>
    );
  }

  const sorted = [...agreements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const selected = sorted.find(a => a.id === selectedAgreementId) ?? sorted[0];
  const selectedPrice =
    typeof selected.price === 'string' ? parseFloat(selected.price) : selected.price;

  // ─── Compact variant (sidebar) ─────────────────────────────────────────
  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full cursor-pointer px-2 uppercase items-center justify-center gap-1 rounded-md border border-emerald-200 py-0.5 text-xs font-medium tracking-wide text-emerald-700 transition-colors duration-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
          >
            <span className="truncate">{agreementDisplayName(selected)}</span>
            <CaretDown
              className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
              weight="bold"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" side="top" className="w-56 p-1">
          <div className="max-h-64 overflow-y-auto">
            {sorted.map(agreement => {
              const isActive = agreement.id === selected.id;
              return (
                <button
                  key={agreement.id}
                  type="button"
                  onClick={() => {
                    onSelect(agreement.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                    isActive ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{agreementDisplayName(agreement)}</p>
                    <p className="text-[10px] text-zinc-500">
                      {statusLabel(agreement.status)}
                    </p>
                  </div>
                  {isActive && <Check className="h-3 w-3 shrink-0 text-emerald-600" weight="bold" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // ─── Full variant (page content area) ──────────────────────────────────
  return (
    <div className="mb-4 mt-2 flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full min-w-0 flex-1 items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-5 w-5 shrink-0 text-zinc-400" weight="duotone" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {agreementDisplayName(selected)}
                </p>
                <p className="text-xs text-zinc-500">
                  {formatDate(new Date(selected.createdAt))}
                  {' · '}
                  {formatCurrency(selectedPrice)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-3">
              <Badge variant={statusVariant(selected.status)} className="text-[10px] px-2 py-0">
                {statusLabel(selected.status)}
              </Badge>
              <CaretDown
                className={`h-4 w-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
                weight="bold"
              />
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-1">
          <div className="max-h-64 overflow-y-auto">
            {sorted.map(agreement => {
              const isActive = agreement.id === selected.id;
              const price =
                typeof agreement.price === 'string'
                  ? parseFloat(agreement.price)
                  : agreement.price;

              return (
                <button
                  key={agreement.id}
                  type="button"
                  onClick={() => {
                    onSelect(agreement.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {agreementDisplayName(agreement)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatDate(new Date(agreement.createdAt))}
                      {' · '}
                      {formatCurrency(price)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={statusVariant(agreement.status)}
                      className="text-[10px] px-2 py-0"
                    >
                      {statusLabel(agreement.status)}
                    </Badge>
                    {isActive && <Check className="h-4 w-4 text-emerald-600" weight="bold" />}
                  </div>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {onCreateNew && (
        <button
          type="button"
          onClick={onCreateNew}
          title="New agreement"
          className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white text-zinc-500 transition-colors hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900"
        >
          <Plus className="h-5 w-5" weight="bold" />
        </button>
      )}
    </div>
  );
}
