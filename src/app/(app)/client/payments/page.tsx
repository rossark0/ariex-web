'use client';

import { useAuth } from '@/contexts/auth/AuthStore';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { getAllChargesForClient, type ClientCharge } from '@/lib/api/client.api';
import { CaretUp, Info, FunnelSimple, CaretDown, ArrowSquareOut, DownloadSimple, Check as CheckIcon } from '@phosphor-icons/react';
import { EmptyDocumentsIllustration } from '@/components/ui/empty-documents-illustration';
import { Badge } from '@/components/ui/badge';
import { useUiStore } from '@/contexts/ui/UiStore';
import { useState, useEffect } from 'react';

// ============================================================================
// REAL CHARGE → PAYMENT-ROW ADAPTER
// ============================================================================

type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

interface PaymentRow {
  id: string;
  amount: number;
  status: PaymentStatus;
  createdAt: Date;
  description?: string;
  /** Live Stripe link — lets the client actually pay an open charge. */
  paymentLink?: string;
}

/** Map the real ClientCharge from the backend onto the row shape the
 *  table renders. No mock data — every field traces to a real charge. */
function chargeToPaymentRow(c: ClientCharge): PaymentRow {
  const status: PaymentStatus =
    c.status === 'paid'
      ? 'completed'
      : c.status === 'cancelled'
        ? 'refunded'
        : c.status === 'failed'
          ? 'failed'
          : 'pending';
  return {
    id: c.id,
    amount: c.amount,
    status,
    createdAt: new Date(c.createdAt),
    description: c.description,
    paymentLink: c.paymentLink,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDueDate(date: Date): { main: string; sub: string } {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const mainDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  let subText = '';
  if (diffDays < 0) {
    subText = `${Math.abs(diffDays)} days ago`;
  } else if (diffDays === 0) {
    subText = 'today';
  } else if (diffDays === 1) {
    subText = 'tomorrow';
  } else {
    subText = `in ${diffDays} days`;
  }

  return { main: mainDate, sub: subText };
}

export default function ClientPaymentsPage() {
  useRoleRedirect('CLIENT');
  const { user } = useAuth();
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const setSelection = useUiStore(state => state.setSelection);

  // Fetch the client's real charges from the backend (GET /charges).
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const loadCharges = async () => {
      try {
        const charges = await getAllChargesForClient();
        if (cancelled) return;
        setPayments(charges.map(chargeToPaymentRow));
      } catch (error) {
        console.error('Failed to load charges:', error);
        if (!cancelled) setPayments([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadCharges();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Sync selection state with UiStore for global AI floating chatbot
  useEffect(() => {
    setSelection(selectedPayments.size, () => setSelectedPayments(new Set()));
    return () => setSelection(0, null);
  }, [selectedPayments.size, setSelection]);

  // Get the current client data from auth
  if (!user) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-soft-white">Not authenticated</h1>
          <p className="text-steel-gray">Please sign in to view your payments.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-electric-blue" />
      </div>
    );
  }

  if (!payments) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-soft-white">Couldn&apos;t load payments</h1>
          <p className="text-steel-gray">Please refresh or try again shortly.</p>
        </div>
      </div>
    );
  }

  const togglePaymentSelection = (paymentId: string) => {
    const newSelected = new Set(selectedPayments);
    if (newSelected.has(paymentId)) {
      newSelected.delete(paymentId);
    } else {
      newSelected.add(paymentId);
    }
    setSelectedPayments(newSelected);
  };

  const toggleAllPayments = () => {
    if (selectedPayments.size === payments.length) {
      setSelectedPayments(new Set());
    } else {
      setSelectedPayments(new Set(payments.map(p => p.id)));
    }
  };

  const sortedPayments = [...payments].sort((a, b) => {
    const dateA = a.createdAt.getTime();
    const dateB = b.createdAt.getTime();
    return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // Payment statistics — all derived from real charges
  const totalOpen = payments
    .filter(p => p.status === 'pending' || p.status === 'failed')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalOpenCount = payments.filter(
    p => p.status === 'pending' || p.status === 'failed'
  ).length;

  // Real charges carry no separate due date — an unpaid charge is treated
  // as outstanding from its creation date.
  const overduePayments = payments.filter(
    p => p.status === 'pending' || p.status === 'failed'
  );
  const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0);

  const paidPayments = payments.filter(p => p.status === 'completed');
  const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="pb-24">
      <div className="mx-auto flex w-full max-w-160.5 flex-col py-6">
        {/* Header with Title and Buttons */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-medium text-soft-white">Payments</h2>
          
          <div className="flex items-center gap-2.5">
            {/* Filter Button */}
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 text-xs font-semibold text-steel-gray transition-colors hover:bg-white/8">
              <FunnelSimple className="h-3.5 w-3.5" weight="bold" />
              Filter Payments
            </button>
            
            {/* Request Payment Button */}
            {/* <button className="inline-flex items-center gap-1.5 rounded-lg bg-electric-blue px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-electric-blue/85">
              <Plus className="h-3.5 w-3.5" weight="bold" />
              Request Payment
            </button> */}
          </div>
        </div>
        
        {/* Payment Summary Cards */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Total Open Card */}
          <div className="rounded-xl border border-white/10 bg-surface px-4 py-6">
            <div className="mb-2 text-3xl font-semibold text-soft-white tabular-nums">
              {formatCurrency(totalOpen)}
            </div>
            <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-soft-white">
              Total open
              <Info className="h-4 w-4 text-steel-gray" weight="fill" />
            </div>
            <div className="text-sm text-steel-gray">
              {totalOpenCount} {totalOpenCount === 1 ? 'invoice' : 'invoices'}
            </div>
          </div>

          {/* Overdue Invoices Card */}
          <div className="rounded-xl border border-white/10 bg-surface px-4 py-6">
           <div className="mb-2 text-3xl font-semibold text-soft-white tabular-nums">
              {formatCurrency(totalOverdue)}
            </div>
            <div className="mb-1 text-sm font-medium text-soft-white">
              Overdue invoices
            </div>
            <div className="text-sm text-steel-gray">
              {overduePayments.length} {overduePayments.length === 1 ? 'invoice' : 'invoices'}
            </div>
          </div>

          {/* Paid Invoices Card */}
          <div className="rounded-xl border border-white/10 bg-surface px-4 py-6">
           <div className="mb-2 text-3xl font-semibold text-soft-white tabular-nums">
              {formatCurrency(totalPaid)}
            </div>
            <div className="mb-1 text-sm font-medium text-soft-white">
              Paid invoices
            </div>
            <div className="text-sm text-steel-gray">
              {paidPayments.length} {paidPayments.length === 1 ? 'invoice' : 'invoices'}
            </div>
          </div>
        </div>
        
        {/* Filter Bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Filters Button */}
            <button className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 text-xs font-semibold text-steel-gray transition-colors hover:bg-white/8">
              <FunnelSimple className="h-3.5 w-3.5" weight="bold" />
              Filters
            </button>
            
            {/* Status Dropdown */}
            <button className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 text-xs font-semibold text-steel-gray transition-colors hover:bg-white/8">
              Status
              <CaretDown className="h-3.5 w-3.5" weight="bold" />
            </button>
          </div>
          
          {/* Export Button */}
          <button className="inline-flex items-center gap-1.5 rounded-lg font-semibold cursor-pointer px-3 py-1.5 text-xs text-steel-gray transition-colors hover:bg-white/8">
            <DownloadSimple className="h-3.5 w-3.5" weight="bold" />
            Export
          </button>
        </div>
        
        {/* Empty State - No payments yet */}
        {payments.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center">
            <EmptyDocumentsIllustration />
            <p className="text-lg font-semibold text-soft-white">No payments yet</p>
            <p className="text-sm text-steel-gray">Payment history will appear here</p>
          </div>
        )}

        {/* Payments Table */}
        {payments.length > 0 && (
          <div className="overflow-hidden rounded-lg">
            <table className="w-full">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <div 
                        onClick={toggleAllPayments}
                        className="flex h-5 w-5 cursor-pointer items-center justify-center"
                      >
                        {selectedPayments.size === payments.length && payments.length > 0 ? (
                          <div className="flex h-4 w-4 items-center justify-center rounded bg-electric-blue">
                            <CheckIcon weight="bold" className="h-3 w-3 text-soft-white" />
                          </div>
                        ) : (
                          <div className="h-4 w-4 rounded border-2 border-white/20 bg-transparent transition-colors hover:border-electric-blue" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-steel-gray">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-steel-gray">
                      Due date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-steel-gray">
                      <button
                        onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-1 hover:text-soft-white"
                      >
                        Status
                        <CaretUp className={`h-3 w-3 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-steel-gray">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedPayments.map(payment => {
                    const dueDate = formatDueDate(payment.createdAt);
                    const isSelected = selectedPayments.has(payment.id);
                    const canPay =
                      (payment.status === 'pending' || payment.status === 'failed') &&
                      !!payment.paymentLink;
                    
                    return (
                      <tr
                        key={payment.id}
                        className={`group transition-colors hover:bg-white/4 ${isSelected ? 'bg-white/4' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePaymentSelection(payment.id);
                            }}
                            className={`flex h-5 w-5 cursor-pointer items-center justify-center transition-opacity ${
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
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-soft-white">
                              {payment.description || 'Payment'}
                            </span>
                            <span className="text-xs text-steel-gray">
                              {`#${payment.id.slice(-6).toUpperCase()}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-soft-white">{dueDate.main}</span>
                            <span className="text-xs text-steel-gray">{dueDate.sub}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge 
                            variant={
                              payment.status === 'completed' ? 'success' : 
                              payment.status === 'failed' ? 'destructive' : 
                              payment.status === 'pending' ? 'info' : 
                              'default'
                            }
                          >
                            {payment.status === 'completed' ? 'Paid' : 
                             payment.status === 'failed' ? 'Failed' : 
                             payment.status === 'pending' ? 'Pending' : 
                             payment.status === 'refunded' ? 'Refunded' :
                             payment.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {canPay && (
                              <a
                                href={payment.paymentLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-1 rounded-md bg-electric-blue px-2 py-1 text-xs font-medium text-soft-white transition-colors duration-150 ease-linear hover:bg-electric-blue/85"
                              >
                                Pay
                                <ArrowSquareOut weight="bold" className="h-3 w-3" />
                              </a>
                            )}
                            <span className="text-sm font-semibold text-soft-white">
                              {formatCurrency(payment.amount)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
          </div>
        )}
      </div>
    </div>
  );
}
