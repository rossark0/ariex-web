'use client';

import { useAuth } from '@/contexts/auth/AuthStore';
import { getFullUserProfile } from '@/contexts/auth/data/mock-users';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import type { FullClientMock } from '@/lib/mocks/client-full';
import { CaretUp, Info, FunnelSimple, CaretDown, DownloadSimple, Check as CheckIcon } from '@phosphor-icons/react';
import { EmptyDocumentsIllustration } from '@/components/ui/empty-documents-illustration';
import { Badge } from '@/components/ui/badge';
import { useUiStore } from '@/contexts/ui/UiStore';
import { useState, useEffect } from 'react';

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
  const user = useAuth(state => state.user);
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const setSelection = useUiStore(state => state.setSelection);

  const clientProfile = user ? getFullUserProfile(user) as FullClientMock | null : null;

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
          <h1 className="text-xl font-semibold text-zinc-900">Not authenticated</h1>
          <p className="text-zinc-500">Please sign in to view your payments.</p>
        </div>
      </div>
    );
  }

  if (!clientProfile) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900">Profile not found</h1>
          <p className="text-zinc-500">Could not load your client profile.</p>
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
    if (selectedPayments.size === clientProfile.payments.length) {
      setSelectedPayments(new Set());
    } else {
      setSelectedPayments(new Set(clientProfile.payments.map(p => p.id)));
    }
  };

  const sortedPayments = [...clientProfile.payments].sort((a, b) => {
    const dateA = a.dueDate?.getTime() || a.createdAt.getTime();
    const dateB = b.dueDate?.getTime() || b.createdAt.getTime();
    return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // Calculate payment statistics
  const now = new Date();
  const totalOpen = clientProfile.payments
    .filter(p => p.status === 'pending' || p.status === 'failed')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalOpenCount = clientProfile.payments.filter(
    p => p.status === 'pending' || p.status === 'failed'
  ).length;

  const overduePayments = clientProfile.payments.filter(p => {
    const dueDate = p.dueDate || p.createdAt;
    return (p.status === 'pending' || p.status === 'failed') && dueDate < now;
  });
  const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0);

  const paidPayments = clientProfile.payments.filter(p => p.status === 'completed');
  const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="bg-white pb-24">
      <div className="mx-auto flex w-full max-w-160.5 flex-col py-6">
        {/* Header with Title and Buttons */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-medium text-zinc-900">Payments</h2>
          
          <div className="flex items-center gap-2.5">
            {/* Filter Button */}
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-500 shadow transition-colors hover:bg-zinc-100">
              <FunnelSimple className="h-3.5 w-3.5" weight="bold" />
              Filter Payments
            </button>
            
            {/* Request Payment Button */}
            {/* <button className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800">
              <Plus className="h-3.5 w-3.5" weight="bold" />
              Request Payment
            </button> */}
          </div>
        </div>
        
        {/* Payment Summary Cards */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Total Open Card */}
          <div className="rounded-xl border border-zinc-100 bg-white px-4 py-6 shadow">
            <div className="mb-2 text-3xl font-semibold text-zinc-500 tabular-nums">
              {formatCurrency(totalOpen)}
            </div>
            <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-zinc-700">
              Total open
              <Info className="h-4 w-4 text-zinc-400" weight="fill" />
            </div>
            <div className="text-sm text-zinc-500">
              {totalOpenCount} {totalOpenCount === 1 ? 'invoice' : 'invoices'}
            </div>
          </div>

          {/* Overdue Invoices Card */}
          <div className="rounded-xl border border-zinc-100 bg-white px-4 py-6 shadow">
           <div className="mb-2 text-3xl font-semibold text-zinc-500 tabular-nums">
              {formatCurrency(totalOverdue)}
            </div>
            <div className="mb-1 text-sm font-medium text-zinc-700">
              Overdue invoices
            </div>
            <div className="text-sm text-zinc-500">
              {overduePayments.length} {overduePayments.length === 1 ? 'invoice' : 'invoices'}
            </div>
          </div>

          {/* Paid Invoices Card */}
          <div className="rounded-xl border border-zinc-100 bg-white px-4 py-6 shadow">
           <div className="mb-2 text-3xl font-semibold text-zinc-500 tabular-nums">
              {formatCurrency(totalPaid)}
            </div>
            <div className="mb-1 text-sm font-medium text-zinc-700">
              Paid invoices
            </div>
            <div className="text-sm text-zinc-500">
              {paidPayments.length} {paidPayments.length === 1 ? 'invoice' : 'invoices'}
            </div>
          </div>
        </div>
        
        {/* Filter Bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Filters Button */}
            <button className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-500 shadow transition-colors hover:bg-zinc-100">
              <FunnelSimple className="h-3.5 w-3.5" weight="bold" />
              Filters
            </button>
            
            {/* Status Dropdown */}
            <button className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-500 shadow transition-colors hover:bg-zinc-100">
              Status
              <CaretDown className="h-3.5 w-3.5" weight="bold" />
            </button>
          </div>
          
          {/* Export Button */}
          <button className="inline-flex items-center gap-1.5 rounded-lg font-semibold cursor-pointer px-3 py-1.5 text-xs text-zinc-700 transition-colors hover:bg-zinc-100">
            <DownloadSimple className="h-3.5 w-3.5" weight="bold" />
            Export
          </button>
        </div>
        
        {/* Empty State - No payments yet */}
        {clientProfile.payments.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center">
            <EmptyDocumentsIllustration />
            <p className="text-lg font-semibold text-zinc-800">No payments yet</p>
            <p className="text-sm text-zinc-400">Payment history will appear here</p>
          </div>
        )}

        {/* Payments Table */}
        {clientProfile.payments.length > 0 && (
          <div className="overflow-hidden rounded-lg">
            <table className="w-full">
                <thead className="bg-white border-b border-zinc-200">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <div 
                        onClick={toggleAllPayments}
                        className="flex h-5 w-5 cursor-pointer items-center justify-center"
                      >
                        {selectedPayments.size === clientProfile.payments.length && clientProfile.payments.length > 0 ? (
                          <div className="flex h-4 w-4 items-center justify-center rounded bg-teal-600">
                            <CheckIcon weight="bold" className="h-3 w-3 text-white" />
                          </div>
                        ) : (
                          <div className="h-4 w-4 rounded border-2 border-zinc-300 bg-white transition-colors hover:border-teal-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                      Due date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                      <button
                        onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-1 hover:text-zinc-700"
                      >
                        Status
                        <CaretUp className={`h-3 w-3 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {sortedPayments.map(payment => {
                    const dueDate = formatDueDate(payment.dueDate || payment.createdAt);
                    const isSelected = selectedPayments.has(payment.id);
                    
                    return (
                      <tr
                        key={payment.id}
                        className={`group transition-colors hover:bg-zinc-50 ${isSelected ? 'bg-zinc-50' : 'bg-white'}`}
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
                              <div className="flex h-4 w-4 items-center justify-center rounded bg-teal-600">
                                <CheckIcon weight="bold" className="h-3 w-3 text-white" />
                              </div>
                            ) : (
                              <div className="h-4 w-4 rounded border-2 border-zinc-300 bg-white transition-colors group-hover:border-teal-400" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-zinc-900">
                              {payment.description || (
                                payment.type === 'onboarding' ? 'Onboarding Fee' : 
                                payment.type === 'invoice' ? 'Invoice Payment' : 
                                payment.type === 'subscription' ? 'Monthly Subscription' : 
                                'Payment'
                              )}
                            </span>
                            <span className="text-xs text-zinc-400">
                              {payment.invoiceNumber || `#${payment.id.slice(-6).toUpperCase()}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-zinc-900">{dueDate.main}</span>
                            <span className="text-xs text-zinc-400">{dueDate.sub}</span>
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
                          <span className="text-sm font-semibold text-zinc-900">
                            {formatCurrency(payment.amount)}
                          </span>
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
