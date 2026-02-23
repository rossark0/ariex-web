'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAllChargesForClient } from '@/lib/api/client.api';
import { useClientBilling, type ChargeFilter } from '@/contexts/client/ClientBillingStore';
import { clientBillingStore } from '@/contexts/client/ClientBillingStore';
import {
  SummaryCard,
  FilterTabs,
  ChargesTable,
  LoadingState,
  BillingHeader,
  SearchBar,
  ErrorMessage,
} from '@/components/billing';

export default function ClientBillingPage() {
  const [isLoading, setIsLoading] = useState(true);

  // Use client billing store
  const charges = useClientBilling(state => state.charges);
  const chargeFilter = useClientBilling(state => state.chargeFilter);
  const searchQuery = useClientBilling(state => state.searchQuery);
  const chargesError = useClientBilling(state => state.chargesError);
  const getFilteredCharges = clientBillingStore.getState().getFilteredCharges;
  const getTotalPending = clientBillingStore.getState().getTotalPending;
  const getTotalPaid = clientBillingStore.getState().getTotalPaid;
  const getTotalFailed = clientBillingStore.getState().getTotalFailed;

  const filteredCharges = getFilteredCharges();

  const loadCharges = useCallback(async () => {
    setIsLoading(true);
    clientBillingStore.setState({ chargesError: null });

    try {
      const data = await getAllChargesForClient();
      clientBillingStore.setState({ charges: data || [] });
    } catch (error) {
      console.error('Failed to load charges:', error);
      clientBillingStore.setState({
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
    clientBillingStore.setState({ chargeFilter: filter });
  };

  const handleSearchChange = (query: string) => {
    clientBillingStore.setState({ searchQuery: query });
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1">
        <div className="shrink-0 bg-white pt-6 pb-6">
          <div className="mx-auto w-full max-w-[1200px] px-6">
            {/* Header without create payment link button */}
            <BillingHeader hideCreateButton={true} />

            {/* Summary Cards */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SummaryCard title="Pending" amount={getTotalPending()} status="pending" />
              <SummaryCard title="Paid" amount={getTotalPaid()} status="paid" />
              <SummaryCard title="Failed" amount={getTotalFailed()} status="failed" />
            </div>
          </div>
        </div>

        <div className="bg-zinc-50 px-6 py-8">
          <div className="mx-auto w-full max-w-[1200px]">
            {chargesError && <ErrorMessage message={chargesError} />}

            {/* Search and Filters */}
            <SearchBar value={searchQuery} onChange={handleSearchChange} onRefresh={loadCharges} />

            {/* Tabs */}
            <FilterTabs activeFilter={chargeFilter} onFilterChange={handleFilterChange} />

            {/* Content */}
            {isLoading ? <LoadingState /> : <ChargesTable charges={filteredCharges} />}
          </div>
        </div>
      </div>
    </div>
  );
}
