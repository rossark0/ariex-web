'use client';

import { CreditCard, CurrencyDollar, SpinnerGap, X as XIcon } from '@phosphor-icons/react';

interface PaymentModalProps {
  isOpen: boolean;
  clientName: string | null;
  agreementName: string;
  paymentAmount: number;
  isSending: boolean;
  error: string | null;
  onAmountChange: (amount: number) => void;
  onSend: () => void;
  onClose: () => void;
}

export function PaymentModal({
  isOpen,
  clientName,
  agreementName,
  paymentAmount,
  isSending,
  error,
  onAmountChange,
  onSend,
  onClose,
}: PaymentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
              <CreditCard className="h-5 w-5 text-zinc-600" weight="duotone" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Send Payment Link</h2>
              <p className="text-sm text-zinc-500">
                Create a Stripe checkout for {clientName || 'client'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-zinc-50 p-4">
          <p className="text-sm font-medium text-zinc-700">Agreement</p>
          <p className="text-sm text-zinc-600">{agreementName}</p>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-zinc-700">Payment Amount</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <CurrencyDollar className="h-5 w-5 text-zinc-400" />
            </div>
            <input
              type="number"
              value={paymentAmount}
              onChange={e => onAmountChange(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-300 py-2.5 pr-4 pl-10 text-zinc-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              placeholder="499"
              min={1}
            />
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            The client will receive a Stripe checkout link via email
          </p>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            onClick={onSend}
            disabled={isSending || paymentAmount <= 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSending ? (
              <>
                <SpinnerGap className="h-4 w-4 animate-spin" />
                Creating link...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Send Payment Link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
