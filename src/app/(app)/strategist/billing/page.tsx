'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAllCharges } from '@/lib/api/strategist.api';
import { useBilling, type ChargeFilter } from '@/contexts/strategist-contexts/billing/BillingStore';
import { billingStore } from '@/contexts/strategist-contexts/billing/BillingStore';
import { CreatePaymentLinkModal } from '@/components/payments/create-payment-link-modal';
import {
  SummaryCard,
  FilterTabs,
  ChargesTable,
  LoadingState,
  BillingHeader,
  SearchBar,
  PaymentLinkSuccess,
  ErrorMessage,
} from '@/components/billing';

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function StrategistBillingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

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

  const handlePaymentLinkSuccess = (link: string) => {
    setGeneratedLink(link);
    loadCharges(); // Refresh to show the new charge
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCloseSuccessMessage = () => {
    setGeneratedLink(null);
    setCopySuccess(false);
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1">
        <div className="shrink-0 bg-white pt-6 pb-6">
          <div className="mx-auto w-full max-w-[1200px] px-6">
            <BillingHeader onCreatePaymentLink={() => setIsModalOpen(true)} />

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

            {generatedLink && (
              <PaymentLinkSuccess
                link={generatedLink}
                onCopy={handleCopyLink}
                onClose={handleCloseSuccessMessage}
                copySuccess={copySuccess}
              />
            )}

            {/* Search and Filters */}
            <SearchBar value={searchQuery} onChange={handleSearchChange} onRefresh={loadCharges} />

            {/* Tabs */}
            <FilterTabs activeFilter={chargeFilter} onFilterChange={handleFilterChange} />

            {/* Content */}
            {isLoading ? <LoadingState /> : <ChargesTable charges={filteredCharges} />}
          </div>
        </div>
      </div>

      {/* Payment Link Modal */}
      <CreatePaymentLinkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handlePaymentLinkSuccess}
      />
    </div>
  );
}
