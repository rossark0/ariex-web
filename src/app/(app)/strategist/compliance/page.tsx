'use client';

import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { Plus, ShieldCheck, Trash, User, X } from '@phosphor-icons/react/dist/ssr';
import { Check } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  deleteComplianceClient,
  getLinkedComplianceUsers,
  listClients,
  type ApiClient,
} from '@/lib/api/strategist.api';
import { addClientToScope } from '@/lib/api/compliance.api';

// ============================================================================
// TYPES
// ============================================================================

interface LinkedClient {
  id: string;
  email: string;
  name?: string | null;
}

interface ComplianceUser {
  id: string;
  complianceUserId: string;
  name: string;
  email: string;
  clients: LinkedClient[];
}

// ============================================================================
// UTILITY
// ============================================================================

function getInitials(name: string | null): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ============================================================================
// COMPLIANCE USER CARD
// ============================================================================

function ComplianceCard({
  complianceUser,
  onAddClient,
  onDeleteClient,
}: {
  complianceUser: ComplianceUser;
  onAddClient: (complianceUser: ComplianceUser) => void;
  onDeleteClient: (complianceUserId: string, clientId: string, clientEmail: string) => void;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all hover:border-zinc-300 hover:shadow-md">
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-xs font-semibold text-emerald-700">
          {getInitials(complianceUser.name || complianceUser.email)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-zinc-900">
            {complianceUser.name || complianceUser.email.split('@')[0]}
          </h3>
          <p className="truncate text-xs text-zinc-500">{complianceUser.email}</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          <ShieldCheck weight="fill" className="h-3 w-3" />
          Compliance
        </span>
      </div>

      {/* Linked Clients List */}
      {complianceUser.clients && complianceUser.clients.length > 0 && (
        <div className="border-t border-zinc-100 px-4 py-3">
          <p className="mb-2 text-xs font-medium text-zinc-600">Linked Clients</p>
          <div className="space-y-2">
            {complianceUser.clients.map(client => (
              <div
                key={client.id}
                className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2"
              >
                <p className="text-xs text-zinc-700">{client.email}</p>
                <button
                  onClick={() => onDeleteClient(complianceUser.complianceUserId, client.id, client.email)}
                  className="flex items-center justify-center text-red-500 transition-colors hover:text-red-700"
                  title="Remove client"
                >
                  <Trash weight="fill" className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => onAddClient(complianceUser)}
        className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-t border-zinc-100 py-2.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
      >
        <Plus weight="bold" className="h-3.5 w-3.5" />
        Add Client
      </button>
    </div>
  );
}

// ============================================================================
// ADD CLIENT TO COMPLIANCE MODAL
// ============================================================================

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  complianceUser: ComplianceUser | null;
  allClients: ApiClient[];
  onClientAdded: () => void;
}

function AddClientToComplianceModal({
  isOpen,
  onClose,
  complianceUser,
  allClients,
  onClientAdded,
}: AddClientModalProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClients = allClients.filter(client => {
    const q = searchQuery.toLowerCase();
    return (
      !searchQuery ||
      client.name?.toLowerCase().includes(q) ||
      client.email?.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedClientId(null);
      setError(null);
      setSearchQuery('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !complianceUser) return null;

  const complianceName = complianceUser.name || complianceUser.email.split('@')[0];

  const handleSubmit = async () => {
    if (!selectedClientId || !complianceUser) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Second call: Add client to compliance scope for additional linking
      try {
        await addClientToScope({
          complianceUserId: complianceUser.id,
          clientUserId: selectedClientId,
        });
      } catch (scopeErr) {
        console.warn('addClientToScope supplementary call:', scopeErr);
        // Non-fatal: main update already succeeded
      }

      onClientAdded();
      onClose();
    } catch (err) {
      console.error('Failed to add client to compliance:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to add client to compliance scope. Please try again.';
      setError(errorMessage);
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex h-full w-full items-center justify-center bg-white">
        {/* Top bar */}
        <div className="absolute top-0 left-0 flex h-14 w-full items-center gap-2 border-b border-zinc-200 pl-2">
          <button
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X weight="bold" className="h-4.5 w-4.5" />
          </button>
          <div className="h-4 w-0.5 bg-zinc-200" />
          <h1 className="rounded-lg bg-zinc-100 px-2 py-1 text-center text-sm font-semibold text-zinc-900">
            Add Client to Compliance
          </h1>
        </div>

        <div className="w-full max-w-md px-6">
          {/* Info banner */}
          <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="h-full w-1 rounded-full bg-emerald-500" />
              <div>
                <p className="font-medium text-zinc-900">
                  Add client to {complianceName}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Select a client below to grant this compliance user review access.
                </p>
              </div>
            </div>
          </div>

          {/* Client list */}
          <div className="mb-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {/* Search */}
            <div className="border-b border-zinc-100 px-3 py-2.5">
              <div className="relative">
                <MagnifyingGlassIcon
                  weight="bold"
                  className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 py-1.5 pr-3 pl-7 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto">
              {allClients.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <User weight="fill" className="mb-2 h-5 w-5 text-zinc-300" />
                  <p className="text-sm font-medium text-zinc-500">No clients yet</p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Create clients first from the Clients page.
                  </p>
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-zinc-400">No clients match your search</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {filteredClients.map(client => {
                    const isSelected = selectedClientId === client.id;
                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() =>
                          setSelectedClientId(isSelected ? null : client.id)
                        }
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isSelected
                            ? 'bg-emerald-50'
                            : 'hover:bg-zinc-50'
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                            isSelected
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          {getInitials(client.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-900">
                            {client.name || client.email}
                          </p>
                          <p className="truncate text-xs text-zinc-500">{client.email}</p>
                        </div>
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500'
                              : 'border-zinc-300'
                          }`}
                        >
                          {isSelected && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedClientId}
            className="w-full rounded-xl bg-zinc-900 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Add Client'}
          </button>
        </div>
      </div>

      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        errorMessage={error}
      />
    </div>
  );
}

// ============================================================================
// DELETE CLIENT CONFIRMATION MODAL
// ============================================================================

interface DeleteClientConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientEmail: string | null;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeleteClientConfirmationModal({
  isOpen,
  onClose,
  clientEmail,
  onConfirm,
  isDeleting,
}: DeleteClientConfirmationModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-lg">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-zinc-900">Remove Client</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Are you sure you want to remove <span className="font-medium">{clientEmail}</span> from this compliance user&apos;s access?
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ERROR MODAL
// ============================================================================

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorMessage: string | null;
}

function ErrorModal({ isOpen, onClose, errorMessage }: ErrorModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !errorMessage) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-red-200 bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100">
            <X weight="bold" className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Error</h2>
            <p className="mt-2 text-sm text-zinc-600">{errorMessage}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// LOADING STATE
// ============================================================================

function LoadingState() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {[1, 2].map(i => (
        <div key={i} className="animate-pulse rounded-xl border border-zinc-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-zinc-100" />
            <div className="flex-1">
              <div className="mb-1 h-4 w-24 rounded bg-zinc-100" />
              <div className="h-3 w-32 rounded bg-zinc-100" />
            </div>
          </div>
          <div className="mt-3 border-t border-zinc-100 pt-3">
            <div className="mb-2 h-3 w-16 rounded bg-zinc-100" />
            <div className="space-y-2">
              <div className="h-8 rounded-lg bg-zinc-50" />
              <div className="h-8 rounded-lg bg-zinc-50" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
        <ShieldCheck weight="fill" className="h-6 w-6 text-zinc-400" />
      </div>
      <p className="mb-1 text-lg font-semibold text-zinc-800">No compliance users</p>
      <p className="text-sm text-zinc-400">
        Invite a compliance user from the Clients page to get started
      </p>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function StrategistCompliancePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [complianceUsers, setComplianceUsers] = useState<ComplianceUser[]>([]);
  const [allClients, setAllClients] = useState<ApiClient[]>([]);
  const [addClientModal, setAddClientModal] = useState<{
    isOpen: boolean;
    complianceUser: ComplianceUser | null;
  }>({ isOpen: false, complianceUser: null });
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    complianceUserId: string | null;
    clientId: string | null;
    clientEmail: string | null;
    isDeleting: boolean;
  }>({ isOpen: false, complianceUserId: null, clientId: null, clientEmail: null, isDeleting: false });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [complianceData, clientsData] = await Promise.all([
        getLinkedComplianceUsers(true),
        listClients(),
      ]);

      setAllClients(clientsData || []);

      const users: ComplianceUser[] = (complianceData || []).map((cu: any) => ({
        id: cu.id,
        complianceUserId: cu.id,
        name: cu.name || cu.fullName || cu.email?.split('@')[0] || '',
        email: cu.email || '',
        clients: (cu.clients || []).map((client: any) => ({
          id: client.id,
          email: client.email,
          name: client.name || client.fullName || client.email?.split('@')[0],
        })),
      }));

      setComplianceUsers(users);
    } catch (error) {
      console.error('Failed to load compliance data:', error);
      setComplianceUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDeleteClient = useCallback(
    (complianceUserId: string, clientId: string, clientEmail: string) => {
      setDeleteConfirmation({
        isOpen: true,
        complianceUserId,
        clientId,
        clientEmail,
        isDeleting: false,
      });
    },
    []
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirmation.complianceUserId || !deleteConfirmation.clientId) return;

    setDeleteConfirmation(prev => ({ ...prev, isDeleting: true }));

    try {
      const success = await deleteComplianceClient(
        deleteConfirmation.complianceUserId,
        deleteConfirmation.clientId
      );
      if (success) {
        // Refresh data after successful deletion
        loadData();
        setDeleteConfirmation({ isOpen: false, complianceUserId: null, clientId: null, clientEmail: null, isDeleting: false });
      }
    } catch (error) {
      console.error('Failed to delete client from compliance:', error);
      setDeleteConfirmation(prev => ({ ...prev, isDeleting: false }));
    }
  }, [deleteConfirmation.complianceUserId, deleteConfirmation.clientId, loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredUsers = complianceUsers.filter(cu => {
    const q = searchQuery.toLowerCase();
    return (
      !searchQuery ||
      cu.name.toLowerCase().includes(q) ||
      cu.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1">
        <div className="shrink-0 bg-white pt-6 pb-6">
          <div className="mx-auto w-full max-w-[642px]">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="mb-2 text-2xl font-medium tracking-tight">Compliance</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  {complianceUsers.length > 0
                    ? `${complianceUsers.length} compliance user${complianceUsers.length !== 1 ? 's' : ''}`
                    : 'Manage your compliance team and client access'}
                </p>
              </div>
            </div>

            <div className="relative">
              <MagnifyingGlassIcon
                weight="bold"
                className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-[30px] w-64 rounded-lg border border-zinc-200 bg-white pr-3 pl-7 text-sm font-medium text-zinc-900 shadow placeholder:text-zinc-400 hover:bg-zinc-100 focus:border-zinc-300 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white pb-42">
          <div className="mx-auto w-full max-w-[642px] py-6">
            {isLoading ? (
              <LoadingState />
            ) : complianceUsers.length === 0 ? (
              <EmptyState />
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="mb-1 text-lg font-semibold text-zinc-800">No results found</p>
                <p className="text-sm text-zinc-400">Try adjusting your search</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filteredUsers.map(cu => (
                  <ComplianceCard
                    key={cu.id}
                    complianceUser={cu}
                    onAddClient={cu => setAddClientModal({ isOpen: true, complianceUser: cu })}
                    onDeleteClient={handleDeleteClient}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AddClientToComplianceModal
        isOpen={addClientModal.isOpen}
        onClose={() => setAddClientModal({ isOpen: false, complianceUser: null })}
        complianceUser={addClientModal.complianceUser}
        allClients={allClients}
        onClientAdded={loadData}
      />

      <DeleteClientConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, complianceUserId: null, clientId: null, clientEmail: null, isDeleting: false })}
        clientEmail={deleteConfirmation.clientEmail}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteConfirmation.isDeleting}
      />
    </div>
  );
}
