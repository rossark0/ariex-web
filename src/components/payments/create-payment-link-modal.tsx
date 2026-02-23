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

      // Step 2: Generate payment link
      const link = await generatePaymentLink(charge.id, {
        customerEmail: selectedClient?.email,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
              <CreditCard className="h-5 w-5 text-emerald-600" weight="duotone" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Create Payment Link</h2>
              <p className="text-sm text-zinc-500">
                {step === 'client' && 'Select a client'}
                {step === 'agreement' && 'Select an agreement'}
                {step === 'details' && 'Enter payment details'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[600px] overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Step 1: Client Selection */}
          {step === 'client' && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Search by Client
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon
                    weight="bold"
                    className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 py-2 pl-10 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="max-h-[300px] space-y-2 overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <p className="py-8 text-center text-sm text-zinc-500">No clients found</p>
                ) : (
                  filteredClients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => handleClientSelect(client)}
                      className="w-full rounded-lg border border-zinc-200 bg-white p-4 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      <p className="font-medium text-zinc-900">{client.name || 'Unnamed Client'}</p>
                      <p className="text-sm text-zinc-500">{client.email}</p>
                    </button>
                  ))
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-zinc-500">or</span>
                </div>
              </div>

              <button
                onClick={handleSearchDirectly}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Search agreements directly
              </button>
            </div>
          )}

          {/* Step 2: Agreement Selection */}
          {step === 'agreement' && (
            <div className="space-y-4">
              {selectedClient && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-sm text-emerald-700">
                    <span className="font-medium">Selected client:</span> {selectedClient.name} (
                    {selectedClient.email})
                  </p>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Search Agreement
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon
                    weight="bold"
                    className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={agreementSearch}
                    onChange={e => setAgreementSearch(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 py-2 pl-10 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="max-h-[300px] space-y-2 overflow-y-auto">
                {filteredAgreements.length === 0 ? (
                  <p className="py-8 text-center text-sm text-zinc-500">No agreements found</p>
                ) : (
                  filteredAgreements.map(agreement => (
                    <button
                      key={agreement.id}
                      onClick={() => handleAgreementSelect(agreement)}
                      className="w-full rounded-lg border border-zinc-200 bg-white p-4 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-zinc-900">{agreement.name}</p>
                          {agreement.description && (
                            <p className="mt-1 text-sm text-zinc-500 line-clamp-2">
                              {agreement.description}
                            </p>
                          )}
                        </div>
                        {agreement.price && (
                          <p className="ml-4 font-medium text-emerald-600">
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
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-sm text-emerald-700">
                    <span className="font-medium">Agreement:</span> {selectedAgreement.name}
                  </p>
                  {selectedClient && (
                    <p className="mt-1 text-sm text-emerald-700">
                      <span className="font-medium">Client:</span> {selectedClient.name} (
                      {selectedClient.email})
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Amount (USD) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="499.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Payment for services..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 p-6">
          <button
            onClick={step === 'client' ? onClose : handleBack}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            {step === 'client' ? 'Cancel' : 'Back'}
          </button>

          {step === 'details' && (
            <button
              onClick={handleCreatePaymentLink}
              disabled={isLoading || !amount}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
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
