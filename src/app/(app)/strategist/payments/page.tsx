'use client';

import { useAuth } from '@/contexts/auth/AuthStore';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { listPayments, type ApiPayment } from '@/lib/api/strategist.api';
import { EmptyDocumentsIllustration } from '@/components/ui/empty-documents-illustration';
import { useState, useEffect } from 'react';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getPaymentStatusBadge(status: string): { label: string; className: string } {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'paid':
      return { label: 'Paid', className: 'bg-emerald-500/15 text-emerald-400' };
    case 'pending':
      return { label: 'Pending', className: 'bg-amber-500/15 text-amber-400' };
    case 'failed':
      return { label: 'Failed', className: 'bg-red-500/15 text-red-400' };
    default:
      return { label: status, className: 'bg-white/8 text-steel-gray' };
  }
}

// ============================================================================
// LOADING STATE
// ============================================================================

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-electric-blue border-t-transparent"></div>
      <p className="mt-4 text-sm text-steel-gray">Loading payments...</p>
    </div>
  );
}

// ============================================================================
// PAYMENT ROW
// ============================================================================

function PaymentRow({ payment }: { payment: ApiPayment }) {
  const statusBadge = getPaymentStatusBadge(payment.status);

  return (
    <div className="flex items-center justify-between border-b border-white/5 py-4 last:border-b-0">
      <div className="flex flex-col">
        <span className="font-medium text-soft-white">{payment.type || 'Payment'}</span>
        <span className="text-sm text-steel-gray">
          {payment.paidAt ? formatDate(payment.paidAt) : formatDate(payment.createdAt)}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge.className}`}>
          {statusBadge.label}
        </span>
        <span className="font-semibold text-soft-white">{formatCurrency(payment.amount)}</span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StrategistPaymentsPage() {
  useRoleRedirect(['STRATEGIST', 'COMPLIANCE', 'ADMIN']);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [payments, setPayments] = useState<ApiPayment[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await listPayments();
        setPayments(data);
      } catch (error) {
        console.error('Failed to load payments:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (!user) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-soft-white">Not authenticated</h1>
          <p className="text-steel-gray">Please sign in to view payments.</p>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalReceived = payments
    .filter(p => p.status.toLowerCase() === 'completed' || p.status.toLowerCase() === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payments
    .filter(p => p.status.toLowerCase() === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="pb-24">
      <div className="mx-auto flex w-full max-w-160.5 flex-col py-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-medium text-soft-white">Payments</h2>
          <p className="text-sm text-steel-gray">
            {payments.length > 0
              ? `${payments.length} payment${payments.length !== 1 ? 's' : ''}`
              : 'Track your client payments'}
          </p>
        </div>

        {/* Summary Cards */}
        {!isLoading && payments.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-surface p-4">
              <p className="text-sm text-steel-gray">Total Received</p>
              <p className="text-2xl font-semibold text-emerald-400">
                {formatCurrency(totalReceived)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-surface p-4">
              <p className="text-sm text-steel-gray">Pending</p>
              <p className="text-2xl font-semibold text-amber-400">
                {formatCurrency(totalPending)}
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && <LoadingState />}

        {/* Empty State */}
        {!isLoading && payments.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center">
            <EmptyDocumentsIllustration />
            <p className="text-lg font-semibold text-soft-white">No payments yet</p>
            <p className="text-sm text-steel-gray">Payments will appear here when clients pay</p>
          </div>
        )}

        {/* Payments List */}
        {!isLoading && payments.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-surface">
            <div className="px-4">
              {payments.map(payment => (
                <PaymentRow key={payment.id} payment={payment} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
