'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAllChargesForClient, verifyCharge, generatePaymentLink as generatePaymentLinkAPI } from '@/lib/api/client.api';
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
  const [loadingChargeId, setLoadingChargeId] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

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

  const handleVerifyCharge = async (chargeId: string) => {
    setLoadingChargeId(chargeId);
    try {
      await verifyCharge(chargeId);
      await loadCharges();
      clientBillingStore.setState({ chargesError: null });
    } catch (error) {
      console.error('Failed to verify charge:', error);
      clientBillingStore.setState({
        chargesError: error instanceof Error ? error.message : 'Failed to verify charge',
      });
    } finally {
      setLoadingChargeId(null);
    }
  };

  const handleGeneratePaymentLink = async (chargeId: string) => {
    setLoadingChargeId(chargeId);
    try {
      const link = await generatePaymentLinkAPI(chargeId);
      if (link) {
        setGeneratedLink(link);
        clientBillingStore.setState({ chargesError: null });
      }
    } catch (error) {
      console.error('Failed to generate payment link:', error);
      clientBillingStore.setState({
        chargesError: error instanceof Error ? error.message : 'Failed to generate payment link',
      });
    } finally {
      setLoadingChargeId(null);
    }
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

            {/* Generated Payment Link Success Message */}
            {generatedLink && (
              <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-emerald-900">Payment Link Generated</h3>
                    <p className="mt-1 text-sm text-emerald-700">Your payment link is ready to share:</p>
                    <div className="mt-3 flex items-center gap-2">
                      <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-xs text-zinc-600 break-all">
                        {generatedLink}
                      </code>
                      <button
                        onClick={handleCopyLink}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        {copySuccess ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseSuccessMessage}
                    className="text-emerald-400 hover:text-emerald-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Search and Filters */}
            <SearchBar value={searchQuery} onChange={handleSearchChange} onRefresh={loadCharges} />

            {/* Tabs */}
            <FilterTabs activeFilter={chargeFilter} onFilterChange={handleFilterChange} />

            {/* Content */}
            {isLoading ? (
              <LoadingState />
            ) : (
              <ChargesTable
                charges={filteredCharges}
                onVerifyCharge={handleVerifyCharge}
                onGeneratePaymentLink={handleGeneratePaymentLink}
                loadingChargeId={loadingChargeId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
