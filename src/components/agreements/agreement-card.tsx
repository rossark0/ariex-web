'use client';

import { Badge } from '@/components/ui/badge';
import type { SignatureStatus } from '@/types/document';
import { Paperclip, Check as CheckIcon } from '@phosphor-icons/react';

interface AgreementCardProps {
  title: string;
  category?: string;
  timestamp: string;
  status?: SignatureStatus;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

export function AgreementCard({
  title,
  category = 'Tax Advisory',
  timestamp,
  status,
  isSelected = false,
  onToggleSelection,
}: AgreementCardProps) {
  return (
    <div 
      onClick={onToggleSelection}
      className={`group relative flex h-[272px] cursor-pointer flex-col justify-between rounded-lg border bg-deep-navy p-4 shadow-sm transition-all hover:shadow-md ${
        isSelected ? 'border-electric-blue bg-electric-blue/5' : 'border-white/10'
      }`}
    >
      {/* Content */}
      <div>
        <div className="mb-1 flex items-start justify-between">
          <div className="flex-1">
            <p className="mb-1 text-sm font-medium text-steel-gray">{category}</p>
            <h3 className="text-sm font-semibold text-soft-white">{title}</h3>
          </div>
          {/* Clip Icon / Checkbox */}
          <div className="relative flex h-5 w-5 items-center justify-center">
            {/* Checkbox - appears on hover or when selected */}
            <div
              className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              {isSelected ? (
                <div className="flex h-4 w-4 items-center justify-center rounded bg-electric-blue">
                  <CheckIcon weight="bold" className="h-3 w-3 text-soft-white" />
                </div>
              ) : (
                <div className="h-4 w-4 rounded border-2 border-white/20 bg-transparent transition-colors group-hover:border-electric-blue" />
              )}
            </div>
            {/* Paperclip - hidden on hover or when selected */}
            <Paperclip 
              className={`h-5 w-5 text-steel-gray transition-opacity ${
                isSelected ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'
              }`} 
              weight="bold" 
            />
          </div>
        </div>

        {/* Preview Content Area */}

        <p className="text-sm leading-relaxed text-steel-gray">
          This agreement outlines the terms and conditions for tax strategy services provided by
          Ariex Tax Advisory...
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-steel-gray">{timestamp}</span>
        {status && (
          <Badge
            variant={
              status === 'SIGNED'
                ? 'success'
                : status === 'SENT'
                  ? 'warning'
                  : status === 'DECLINED' || status === 'EXPIRED'
                    ? 'destructive'
                    : 'default'
            }
            className="text-xs"
          >
            {status === 'SIGNED'
              ? 'Signed'
              : status === 'SENT'
                ? 'Pending'
                : status === 'NOT_SENT'
                  ? 'Not Sent'
                  : status === 'DECLINED'
                    ? 'Declined'
                    : status === 'EXPIRED'
                      ? 'Expired'
                      : 'Draft'}
          </Badge>
        )}
      </div>
    </div>
  );
}
