/**
 * Client Header Component
 *
 * Displays client avatar, name, status badge, and action buttons
 */

'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, StarFourIcon } from '@phosphor-icons/react';
import { ChevronDown } from 'lucide-react';
import { ClientAvatar } from '../shared/client-avatar';
import { StatusBadge } from '../shared/status-badge';
import { CLIENT_STATUS_CONFIG, type ClientStatusKey } from '@/lib/client-status';
import { Check, Clock, Strategy } from '@phosphor-icons/react/dist/ssr';
import { AgreementStatus } from '@/types/agreement';

interface ClientHeaderProps {
  clientName: string | null;
  statusKey: ClientStatusKey;
  canSendStrategy: boolean;
  onStrategyClick: () => void;
}

export function ClientHeader({
  clientName,
  statusKey,
  canSendStrategy,
  onStrategyClick,
}: ClientHeaderProps) {
  const router = useRouter();
  const statusConfig = CLIENT_STATUS_CONFIG[statusKey];

  // Icon mapping for status badge
  const statusIconMap: Record<ClientStatusKey, typeof Clock> = {
    awaiting_agreement: Clock,
    awaiting_payment: Clock,
    awaiting_documents: Clock,
    ready_for_strategy: Strategy,
    awaiting_compliance: Clock,
    awaiting_approval: Clock,
    awaiting_signature: Clock,
    active: Check,
  };

  const PlanIcon = statusIconMap[statusKey] || Clock;

  return (
    <>
      {/* Back Button */}
      <div className="absolute top-4 left-4 mb-4 flex items-center gap-2">
        <div
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-700"
          onClick={() => router.back()}
        >
          <ArrowLeftIcon weight="bold" className="h-4 w-4" />
        </div>
      </div>

      <div className="relative z-40 mx-auto w-full max-w-2xl px-4 pt-22">
        {/* Banner color */}
        <div className="absolute top-0 left-0 -z-10 h-24 w-full bg-zinc-50" />

        {/* Header Section */}
        <div className="flex flex-col gap-4">
          <ClientAvatar name={clientName} size="lg" className="h-12 w-12" />
          <h1 className="z-20 text-2xl font-semibold">{clientName}</h1>

          {/* Action Buttons */}
          <div className="mb-6 flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Strategy Plan Status */}
              <div
                className={`flex items-center gap-1.5 rounded-lg border border-dashed ${statusConfig.borderClassName} px-2 py-1 text-sm font-medium ${statusConfig.textClassName}`}
              >
                <PlanIcon className="h-4 w-4" />
                <span>{statusConfig.label}</span>
              </div>

              {/* Add to Folder Button */}
              {/* <button className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
                <span>Add to folder</span>
                <ChevronDown className="h-4 w-4" />
              </button> */}
            </div>

            <button
              disabled={!canSendStrategy}
              onClick={canSendStrategy ? onStrategyClick : undefined}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-sm font-medium transition-colors ${
                canSendStrategy
                  ? 'cursor-pointer border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400'
              }`}
            >
              <StarFourIcon weight="fill" className="h-4 w-4" />
              <span>Strategy</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
