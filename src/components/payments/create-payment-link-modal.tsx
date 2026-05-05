'use client';

import { useState, useEffect, useMemo } from 'react';
import { XIcon, SpinnerGap, CreditCard, MagnifyingGlassIcon } from '@phosphor-icons/react';
import {
  listClients,
  listAgreements,
  createCharge,
  generatePaymentLink,
  type ApiClient,
  type ApiAgreement,
} from '@/lib/api/strategist.api';
import { billingStore } from '@/contexts/strategist-contexts/billing/BillingStore';

interface CreatePaymentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (paymentLink: string) => void;
}

export function CreatePaymentLinkModal({
  isOpen,
  onClose,
  onSuccess,
}: CreatePaymentLinkModalProps) {
  const [step, setStep] = useState<'client' | 'agreement' | 'details'>('client');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [agreements, setAgreements] = useState<ApiAgreement[]>([]);

  // Search
  const [clientSearch, setClientSearch] = useState('');
  const [agreementSearch, setAgreementSearch] = useState('');

  // Selected values
  const [selectedClient, setSelectedClient] = useState<ApiClient | null>(null);
  const [selectedAgreement, setSelectedAgreement] = useState<ApiAgreement | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // Load clients when modal opens
  useEffect(() => {
    if (isOpen) {
      loadClients();
      loadAgreements();
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('client');
      setSelectedClient(null);
      setSelectedAgreement(null);
      setAmount('');
      setDescription('');
      setClientSearch('');
      setAgreementSearch('');
      setError(null);
    }
  }, [isOpen]);

  const loadClients = async () => {
    try {
      const data = await listClients();
      setClients(data);
    } catch (err) {
      console.error('Failed to load clients:', err);
      setError('Failed to load clients');
    }
  };

  const loadAgreements = async () => {
    try {
      const data = await listAgreements();
      setAgreements(data);
    } catch (err) {
      console.error('Failed to load agreements:', err);
      setError('Failed to load agreements');
    }
  };

  // Filter clients by search
  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    const query = clientSearch.toLowerCase();
    return clients.filter(
      client =>
        client.name?.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query)
    );
  }, [clients, clientSearch]);

  // Filter agreements by selected client and search
  const filteredAgreements = useMemo(() => {
    let filtered = agreements;

    // Filter by selected client if we're in "search by client" flow
    if (selectedClient && step === 'agreement') {
      filtered = filtered.filter(a => a.clientId === selectedClient.id);
    }

    // Filter by search query
    if (agreementSearch) {
      const query = agreementSearch.toLowerCase();
      filtered = filtered.filter(
        a =>
          a.name?.toLowerCase().includes(query) ||
          a.description?.toLowerCase().includes(query) ||
          a.id?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [agreements, selectedClient, agreementSearch, step]);

  const handleClientSelect = (client: ApiClient) => {
    setSelectedClient(client);
    setStep('agreement');
    setError(null);
  };

  const handleAgreementSelect = (agreement: ApiAgreement) => {
    setSelectedAgreement(agreement);
    // Pre-fill amount from agreement if available
    if (agreement.price) {
      const priceNum = typeof agreement.price === 'string' 
        ? parseFloat(agreement.price) 
        : agreement.price;
      setAmount(priceNum.toString());
    }
    // Pre-fill description
    setDescription(`Payment for ${agreement.name}`);
    setStep('details');
    setError(null);
  };

  const handleCreatePaymentLink = async () => {
    if (!selectedAgreement || !amount) {
      setError('Please fill in all required fields');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Create charge
      const charge = await createCharge({
        agreementId: selectedAgreement.id,
        amount: amountNum,
        currency: 'usd',
        description: description || `Payment for ${selectedAgreement.name}`,
      });

      if (!charge) {
        throw new Error('Failed to create charge');
      }

      const { successUrl, cancelUrl } = billingStore.getState().getPaymentRedirectUrls();

      // Step 2: Generate payment link
      const link = await generatePaymentLink(charge.id, {
        customerEmail: selectedClient?.email,
        successUrl,
        cancelUrl,
      });

      if (!link) {
        throw new Error('Failed to generate payment link');
      }

      // Success!
      onSuccess?.(link);
      onClose();
    } catch (err) {
      console.error('Failed to create payment link:', err);
      setError(err instanceof Error ? err.message : 'Failed to create payment link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('agreement');
      setSelectedAgreement(null);
      setAmount('');
      setDescription('');
    } else if (step === 'agreement') {
      setStep('client');
      setSelectedClient(null);
    }
    setError(null);
  };

  const handleSearchDirectly = () => {
    setSelectedClient(null);
    setStep('agreement');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-deep-navy shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-electric-blue/15">
              <CreditCard className="h-5 w-5 text-electric-blue" weight="duotone" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-soft-white">Create Payment Link</h2>
              <p className="text-sm text-steel-gray">
                {step === 'client' && 'Select a client'}
                {step === 'agreement' && 'Select an agreement'}
                {step === 'details' && 'Enter payment details'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-steel-gray hover:bg-white/8 hover:text-soft-white"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[600px] overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Step 1: Client Selection */}
          {step === 'client' && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-soft-white">
                  Search by Client
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon
                    weight="bold"
                    className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-steel-gray"
                  />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-graphite py-2 pl-10 pr-3 text-sm text-soft-white placeholder:text-steel-gray focus:border-electric-blue/50 focus:outline-none focus:ring-1 focus:ring-electric-blue/30"
                  />
                </div>
              </div>

              <div className="max-h-[300px] space-y-2 overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <p className="py-8 text-center text-sm text-steel-gray">No clients found</p>
                ) : (
                  filteredClients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => handleClientSelect(client)}
                      className="w-full rounded-lg border border-white/10 bg-deep-navy p-4 text-left transition-colors hover:border-electric-blue/30 hover:bg-electric-blue/5"
                    >
                      <p className="font-medium text-soft-white">{client.name || 'Unnamed Client'}</p>
                      <p className="text-sm text-steel-gray">{client.email}</p>
                    </button>
                  ))
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-deep-navy px-2 text-steel-gray">or</span>
                </div>
              </div>

              <button
                onClick={handleSearchDirectly}
                className="w-full rounded-lg border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-soft-white duration-150 ease-linear transition-colors hover:bg-white/8"
              >
                Search agreements directly
              </button>
            </div>
          )}

          {/* Step 2: Agreement Selection */}
          {step === 'agreement' && (
            <div className="space-y-4">
              {selectedClient && (
                <div className="rounded-lg border border-electric-blue/30 bg-electric-blue/10 p-3">
                  <p className="text-sm text-electric-blue">
                    <span className="font-medium">Selected client:</span> {selectedClient.name} (
                    {selectedClient.email})
                  </p>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-soft-white">
                  Search Agreement
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon
                    weight="bold"
                    className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-steel-gray"
                  />
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={agreementSearch}
                    onChange={e => setAgreementSearch(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-graphite py-2 pl-10 pr-3 text-sm text-soft-white placeholder:text-steel-gray focus:border-electric-blue/50 focus:outline-none focus:ring-1 focus:ring-electric-blue/30"
                  />
                </div>
              </div>

              <div className="max-h-[300px] space-y-2 overflow-y-auto">
                {filteredAgreements.length === 0 ? (
                  <p className="py-8 text-center text-sm text-steel-gray">No agreements found</p>
                ) : (
                  filteredAgreements.map(agreement => (
                    <button
                      key={agreement.id}
                      onClick={() => handleAgreementSelect(agreement)}
                      className="w-full rounded-lg border border-white/10 bg-deep-navy p-4 text-left transition-colors hover:border-electric-blue/30 hover:bg-electric-blue/5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-soft-white">{agreement.name}</p>
                          {agreement.description && (
                            <p className="mt-1 text-sm text-steel-gray line-clamp-2">
                              {agreement.description}
                            </p>
                          )}
                        </div>
                        {agreement.price && (
                          <p className="ml-4 font-medium text-electric-blue">
                            ${typeof agreement.price === 'string' 
                              ? agreement.price 
                              : agreement.price.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 3: Payment Details */}
          {step === 'details' && (
            <div className="space-y-4">
              {selectedAgreement && (
                <div className="rounded-lg border border-electric-blue/30 bg-electric-blue/10 p-3">
                  <p className="text-sm text-electric-blue">
                    <span className="font-medium">Agreement:</span> {selectedAgreement.name}
                  </p>
                  {selectedClient && (
                    <p className="mt-1 text-sm text-electric-blue">
                      <span className="font-medium">Client:</span> {selectedClient.name} (
                      {selectedClient.email})
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-soft-white">
                  Amount (USD) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="499.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-graphite px-3 py-2 text-sm text-soft-white placeholder:text-steel-gray focus:border-electric-blue/50 focus:outline-none focus:ring-1 focus:ring-electric-blue/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-soft-white">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Payment for services..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-graphite px-3 py-2 text-sm text-soft-white placeholder:text-steel-gray focus:border-electric-blue/50 focus:outline-none focus:ring-1 focus:ring-electric-blue/30"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/8 p-6">
          <button
            onClick={step === 'client' ? onClose : handleBack}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-soft-white duration-150 ease-linear transition-colors hover:bg-white/8"
          >
            {step === 'client' ? 'Cancel' : 'Back'}
          </button>

          {step === 'details' && (
            <button
              onClick={handleCreatePaymentLink}
              disabled={isLoading || !amount}
              className="flex items-center gap-2 rounded-lg bg-electric-blue px-4 py-2 text-sm font-medium text-soft-white duration-150 ease-linear transition-colors hover:bg-electric-blue/80 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <SpinnerGap className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Create Payment Link
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
