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
      return { label: 'Paid', className: 'bg-emerald-100 text-emerald-700' };
    case 'pending':
      return { label: 'Pending', className: 'bg-amber-100 text-amber-700' };
    case 'failed':
      return { label: 'Failed', className: 'bg-red-100 text-red-700' };
    default:
      return { label: status, className: 'bg-zinc-100 text-zinc-700' };
  }
}

// ============================================================================
// LOADING STATE
// ============================================================================

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
      <p className="mt-4 text-sm text-zinc-500">Loading payments...</p>
    </div>
  );
}

// ============================================================================
// PAYMENT ROW
// ============================================================================

function PaymentRow({ payment }: { payment: ApiPayment }) {
  const statusBadge = getPaymentStatusBadge(payment.status);

  return (
    <div className="flex items-center justify-between border-b border-zinc-100 py-4 last:border-b-0">
      <div className="flex flex-col">
        <span className="font-medium text-zinc-900">{payment.type || 'Payment'}</span>
        <span className="text-sm text-zinc-500">
          {payment.paidAt ? formatDate(payment.paidAt) : formatDate(payment.createdAt)}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge.className}`}>
          {statusBadge.label}
        </span>
        <span className="font-semibold text-zinc-900">{formatCurrency(payment.amount)}</span>
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
          <h1 className="text-xl font-semibold text-zinc-900">Not authenticated</h1>
          <p className="text-zinc-500">Please sign in to view payments.</p>
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
    <div className="bg-white pb-24">
      <div className="mx-auto flex w-full max-w-160.5 flex-col py-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-medium text-zinc-900">Payments</h2>
          <p className="text-sm text-zinc-500">
            {payments.length > 0
              ? `${payments.length} payment${payments.length !== 1 ? 's' : ''}`
              : 'Track your client payments'}
          </p>
        </div>

        {/* Summary Cards */}
        {!isLoading && payments.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-200 p-4">
              <p className="text-sm text-zinc-500">Total Received</p>
              <p className="text-2xl font-semibold text-emerald-600">
                {formatCurrency(totalReceived)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-4">
              <p className="text-sm text-zinc-500">Pending</p>
              <p className="text-2xl font-semibold text-amber-600">
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
            <p className="text-lg font-semibold text-zinc-800">No payments yet</p>
            <p className="text-sm text-zinc-400">Payments will appear here when clients pay</p>
          </div>
        )}

        {/* Payments List */}
        {!isLoading && payments.length > 0 && (
          <div className="rounded-xl border border-zinc-200">
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
