/**
 * Client Info Card Component
 *
 * Displays client's business information and contact details
 */

'use client';

import { memo } from 'react';
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

export const ClientInfoCard = memo(function ClientInfoCard({
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
    <div className="mb-4 rounded-xl border border-white/6 bg-surface p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-steel-gray">About</span>
        <ClientAvatar name={clientName} size="sm" className="h-6 w-6" />
        <span className="text-sm font-medium text-steel-gray">{clientName}</span>
      </div>

      {/* Bio/Description */}
      <p className="mb-5 text-[15px] leading-relaxed text-soft-white/90">
        {estimatedIncome ? ` Estimated annual income of ${formatCurrency(estimatedIncome)}.` : ''}
        {filingStatus ? ` Filing status: ${filingStatus.replace('_', ' ')}.` : ''}
      </p>

      {/* Contact Links */}
      <div className="flex flex-col gap-2.5">
        {email && (
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-2.5 text-sm text-steel-gray transition-colors duration-150 ease-linear hover:text-soft-white"
          >
            <EnvelopeIcon weight="fill" className="h-4 w-4 text-steel-gray/70" />
            <span className="underline decoration-white/20 underline-offset-2 hover:decoration-white/50">
              {email}
            </span>
          </a>
        )}

        {phoneNumber && (
          <a
            href={`tel:${phoneNumber}`}
            className="flex items-center gap-2.5 text-sm text-steel-gray transition-colors duration-150 ease-linear hover:text-soft-white"
          >
            <PhoneIcon weight="fill" className="h-4 w-4 text-steel-gray/70" />
            <span className="underline decoration-white/20 underline-offset-2 hover:decoration-white/50">
              {phoneNumber}
            </span>
          </a>
        )}

        {businessName && (
          <div className="flex items-center gap-2.5 text-sm text-steel-gray">
            <BuildingsIcon weight="fill" className="h-4 w-4 text-steel-gray/70" />
            <span>{businessName}</span>
          </div>
        )}
      </div>
    </div>
  );
});
