import { CreditCard, CheckCircle, LinkSimple } from '@phosphor-icons/react/dist/ssr';
import { billingStore } from '@/contexts/strategist-contexts/billing/BillingStore';

type ChargeStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

interface ChargesTableProps {
  charges: ReturnType<typeof billingStore.getState>['charges'];
  onVerifyCharge?: (chargeId: string) => Promise<void>;
  onGeneratePaymentLink?: (chargeId: string) => Promise<void>;
  loadingChargeId?: string | null;
}

function normalizeChargeStatus(status: unknown): ChargeStatus {
  if (status === 'pending' || status === 'paid' || status === 'failed' || status === 'cancelled') {
    return status;
  }
  return 'pending';
}

function getStatusBadgeColor(status: ChargeStatus): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-800';
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'cancelled':
      return 'bg-zinc-100 text-zinc-800';
    default:
      return 'bg-zinc-100 text-zinc-800';
  }
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

export function ChargesTable({ charges, onVerifyCharge, onGeneratePaymentLink, loadingChargeId }: ChargesTableProps) {
  if (charges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white py-12 text-center">
        <CreditCard weight="fill" className="mb-3 h-8 w-8 text-zinc-300" />
        <p className="text-sm font-medium text-zinc-600">No charges found</p>
        <p className="text-xs text-zinc-400">Try adjusting your filters or search</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-600">Agreement</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-600">Client</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-600">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-600">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-600">Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {charges.map(charge => {
              const normalizedStatus = normalizeChargeStatus(charge.status);

              return (
              <tr key={charge.id} className="hover:bg-zinc-50">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-zinc-900">{charge.agreement?.name || '—'}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-zinc-600">{charge.agreement?.client?.email || '—'}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-zinc-900">{formatCurrency(charge.amount, charge.currency)}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeColor(normalizedStatus)}`}>
                    {normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-600">
                  {formatDate(charge.createdAt)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {/* Verify Payment Button - for pending/failed charges */}
                    {(normalizedStatus === 'pending' || normalizedStatus === 'failed') && onVerifyCharge && (
                      <button
                        onClick={() => onVerifyCharge(charge.id)}
                        disabled={loadingChargeId === charge.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        title="Check if payment was successful"
                      >
                        <CheckCircle weight="bold" className="h-3.5 w-3.5" />
                        {loadingChargeId === charge.id ? 'Verifying...' : 'Verify'}
                      </button>
                    )}

                    {/* Generate Payment Link Button - for pending charges */}
                    {normalizedStatus === 'pending' && onGeneratePaymentLink && (
                      <button
                        onClick={() => onGeneratePaymentLink(charge.id)}
                        disabled={loadingChargeId === charge.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                        title="Generate payment link"
                      >
                        <LinkSimple weight="bold" className="h-3.5 w-3.5" />
                        {loadingChargeId === charge.id ? 'Generating...' : 'Pay'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
