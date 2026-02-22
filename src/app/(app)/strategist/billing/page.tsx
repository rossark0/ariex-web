'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAllCharges } from '@/lib/api/strategist.api';
import { useBilling, type ChargeFilter } from '@/contexts/strategist-contexts/billing/BillingStore';
import { billingStore } from '@/contexts/strategist-contexts/billing/BillingStore';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { CreditCard } from '@phosphor-icons/react/dist/ssr';

// ============================================================================
// TYPES
// ============================================================================

type ChargeStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

function getStatusColor(status: ChargeStatus): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    case 'pending':
      return 'bg-amber-50 border-amber-200 text-amber-700';
    case 'failed':
      return 'bg-red-50 border-red-200 text-red-700';
    case 'cancelled':
      return 'bg-zinc-50 border-zinc-200 text-zinc-600';
    default:
      return 'bg-zinc-50 border-zinc-200 text-zinc-600';
  }
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

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

// ============================================================================
// SUMMARY CARD
// ============================================================================

function SummaryCard({
  title,
  amount,
  status,
}: {
  title: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
}) {
  const colors = {
    pending: 'bg-amber-50 border-amber-200',
    paid: 'bg-emerald-50 border-emerald-200',
    failed: 'bg-red-50 border-red-200',
  };

  const textColors = {
    pending: 'text-amber-700',
    paid: 'text-emerald-700',
    failed: 'text-red-700',
  };

  return (
    <div className={`rounded-lg border ${colors[status]} p-4`}>
      <p className="text-xs font-medium text-zinc-600">{title}</p>
      <p className={`mt-2 text-2xl font-semibold ${textColors[status]}`}>
        {formatCurrency(amount)}
      </p>
    </div>
  );
}

// ============================================================================
// FILTER TABS
// ============================================================================

function FilterTabs({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: ChargeFilter;
  onFilterChange: (filter: ChargeFilter) => void;
}) {
  const filters: { label: string; value: ChargeFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Paid', value: 'paid' },
    { label: 'Failed', value: 'failed' },
  ];

  return (
    <div className="mb-6 flex gap-2 border-b border-zinc-200">
      {filters.map(filter => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            activeFilter === filter.value
              ? 'border-b-2 border-zinc-900 text-zinc-900'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// CHARGES TABLE
// ============================================================================

function ChargesTable({ charges }: { charges: ReturnType<typeof billingStore.getState>['charges'] }) {
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
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {charges.map(charge => (
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
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeColor(charge.status as ChargeStatus)}`}>
                    {charge.status.charAt(0).toUpperCase() + charge.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-600">
                  {formatDate(charge.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// LOADING STATE
// ============================================================================

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse rounded-lg border border-zinc-200 bg-white p-4">
            <div className="mb-2 h-3 w-16 rounded bg-zinc-100" />
            <div className="h-8 w-32 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
      <div className="animate-pulse rounded-lg border border-zinc-200 bg-white py-12">
        <div className="h-8 w-full rounded bg-zinc-100" />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function StrategistBillingPage() {
  const [isLoading, setIsLoading] = useState(true);

  // Use billing store
  const charges = useBilling(state => state.charges);
  const chargeFilter = useBilling(state => state.chargeFilter);
  const searchQuery = useBilling(state => state.searchQuery);
  const chargesError = useBilling(state => state.chargesError);
  const getFilteredCharges = billingStore.getState().getFilteredCharges;
  const getTotalPending = billingStore.getState().getTotalPending;
  const getTotalPaid = billingStore.getState().getTotalPaid;
  const getTotalFailed = billingStore.getState().getTotalFailed;

  const filteredCharges = getFilteredCharges();

  const loadCharges = useCallback(async () => {
    setIsLoading(true);
    billingStore.setState({ chargesError: null });

    try {
      const data = await getAllCharges();
      billingStore.setState({ charges: data || [] });
    } catch (error) {
      console.error('Failed to load charges:', error);
      billingStore.setState({
        chargesError: error instanceof Error ? error.message : 'Failed to load charges',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCharges();
  }, [loadCharges]);

  const handleFilterChange = (filter: ChargeFilter) => {
    billingStore.setState({ chargeFilter: filter });
  };

  const handleSearchChange = (query: string) => {
    billingStore.setState({ searchQuery: query });
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1">
        <div className="shrink-0 bg-white pt-6 pb-6">
          <div className="mx-auto w-full max-w-[1200px] px-6">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="mb-2 text-2xl font-medium tracking-tight">Billing</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Track all charges and payment statuses across your clients
                </p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SummaryCard title="Pending" amount={getTotalPending()} status="pending" />
              <SummaryCard title="Paid" amount={getTotalPaid()} status="paid" />
              <SummaryCard title="Failed" amount={getTotalFailed()} status="failed" />
            </div>
          </div>
        </div>

        <div className="bg-zinc-50 px-6 py-8">
          <div className="mx-auto w-full max-w-[1200px]">
            {chargesError && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">{chargesError}</p>
              </div>
            )}

            {/* Search and Filters */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 sm:max-w-xs">
                <MagnifyingGlassIcon
                  weight="bold"
                  className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  placeholder="Search by agreement, client, or ID..."
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none"
                />
              </div>
              <button
                onClick={loadCharges}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Refresh
              </button>
            </div>

            {/* Tabs */}
            <FilterTabs activeFilter={chargeFilter} onFilterChange={handleFilterChange} />

            {/* Content */}
            {isLoading ? (
              <LoadingState />
            ) : (
              <ChargesTable charges={filteredCharges} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
