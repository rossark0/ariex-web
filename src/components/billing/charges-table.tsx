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
      return 'bg-emerald-500/15 text-emerald-400';
    case 'pending':
      return 'bg-amber-500/15 text-amber-400';
    case 'failed':
      return 'bg-red-500/15 text-red-400';
    case 'cancelled':
      return 'bg-white/8 text-steel-gray';
    default:
      return 'bg-white/8 text-steel-gray';
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
      <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-deep-navy py-12 text-center">
        <CreditCard weight="fill" className="mb-3 h-8 w-8 text-steel-gray" />
        <p className="text-sm font-medium text-soft-white">No charges found</p>
        <p className="text-xs text-steel-gray">Try adjusting your filters or search</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-deep-navy">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/8 bg-white/4">
              <th className="px-6 py-3 text-left text-xs font-semibold text-steel-gray">Agreement</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-steel-gray">Client</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-steel-gray">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-steel-gray">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-steel-gray">Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-steel-gray">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {charges.map(charge => {
              const normalizedStatus = normalizeChargeStatus(charge.status);

              return (
              <tr key={charge.id} className="hover:bg-white/4">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-soft-white">{charge.agreement?.name || '—'}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-steel-gray">{charge.agreement?.client?.email || '—'}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-soft-white">{formatCurrency(charge.amount, charge.currency)}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeColor(normalizedStatus)}`}>
                    {normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-steel-gray">
                  {formatDate(charge.createdAt)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {/* Verify Payment Button - for pending/failed charges */}
                    {(normalizedStatus === 'pending' || normalizedStatus === 'failed') && onVerifyCharge && (
                      <button
                        onClick={() => onVerifyCharge(charge.id)}
                        disabled={loadingChargeId === charge.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
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
                        className="inline-flex items-center gap-1 rounded-lg bg-electric-blue/10 px-2 py-1 text-xs font-medium text-electric-blue hover:bg-electric-blue/20 disabled:opacity-50"
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
