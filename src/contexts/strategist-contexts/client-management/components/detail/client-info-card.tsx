/**
 * Client Info Card Component
 *
 * Displays client's business information and contact details
 */

'use client';

import { EnvelopeIcon, PhoneIcon, BuildingsIcon } from '@phosphor-icons/react';
import { ClientAvatar } from '../shared/client-avatar';
import { formatCurrency } from '../../utils/formatters';

interface ClientInfoCardProps {
  clientName: string | null;
  email: string | null;
  phoneNumber?: string | null;
  businessName?: string | null;
  businessType?: string | null;
  city?: string | null;
  state?: string | null;
  estimatedIncome?: number | null;
  filingStatus?: string | null;
}

export function ClientInfoCard({
  clientName,
  email,
  phoneNumber,
  businessName,
  businessType,
  city,
  state,
  estimatedIncome,
  filingStatus,
}: ClientInfoCardProps) {
  return (
    <div className="mb-4 rounded-xl bg-zinc-50 p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-zinc-500">About</span>
        <ClientAvatar name={clientName} size="sm" className="h-6 w-6" />
        <span className="text-sm font-medium text-zinc-500">{clientName}</span>
      </div>

      {/* Bio/Description */}
      <p className="mb-5 text-[15px] leading-relaxed text-zinc-700">
        {clientName} is the owner of {businessName || 'a business'}
        {/* {businessType ? `, a ${businessType}` : ''} based in {city}, {state}. */}
        {estimatedIncome ? ` Estimated annual income of ${formatCurrency(estimatedIncome)}.` : ''}
        {filingStatus ? ` Filing status: ${filingStatus.replace('_', ' ')}.` : ''}
      </p>

      {/* Contact Links */}
      <div className="flex flex-col gap-2.5">
        {email && (
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-2.5 text-sm text-zinc-600 hover:text-zinc-900"
          >
            <EnvelopeIcon weight="fill" className="h-4 w-4 text-zinc-400" />
            <span className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500">
              {email}
            </span>
          </a>
        )}

        {phoneNumber && (
          <a
            href={`tel:${phoneNumber}`}
            className="flex items-center gap-2.5 text-sm text-zinc-600 hover:text-zinc-900"
          >
            <PhoneIcon weight="fill" className="h-4 w-4 text-zinc-400" />
            <span className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500">
              {phoneNumber}
            </span>
          </a>
        )}

        {businessName && (
          <div className="flex items-center gap-2.5 text-sm text-zinc-600">
            <BuildingsIcon weight="fill" className="h-4 w-4 text-zinc-400" />
            <span>{businessName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
