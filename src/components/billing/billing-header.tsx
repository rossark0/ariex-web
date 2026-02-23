import { Plus } from '@phosphor-icons/react';

interface BillingHeaderProps {
  onCreatePaymentLink?: () => void;
  hideCreateButton?: boolean;
}

export function BillingHeader({ onCreatePaymentLink, hideCreateButton = false }: BillingHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="mb-2 text-2xl font-medium tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Track all charges and payment statuses across your clients
        </p>
      </div>
      {!hideCreateButton && onCreatePaymentLink && (
        <button
          onClick={onCreatePaymentLink}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" weight="bold" />
          Create Payment Link
        </button>
      )}
    </div>
  );
}
