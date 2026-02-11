'use client';

import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import {
  Briefcase,
  Buildings,
  Calendar,
  Lock,
  Plus,
  User,
  X,
} from '@phosphor-icons/react/dist/ssr';
import { Check, ChevronDown, ChevronDownIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { listClients, listAgreements, createClient, type ApiClient, type ApiAgreement } from '@/lib/api/strategist.api';
import { useAuth } from '@/contexts/auth/AuthStore';
import { CLIENT_STATUS_CONFIG, type ClientStatusKey } from '@/lib/client-status';
import { computeClientStatus } from '@/contexts/strategist-contexts/client-management/utils/status-helpers';

// ============================================================================
// UTILITY FUNCTIONS
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

/** Derive status for a client based on their agreements */
function getClientStatusFromAgreements(
  client: ApiClient,
  allAgreements: ApiAgreement[]
): { key: ClientStatusKey; label: string; badgeColor: string; textClassName: string } {
  const clientAgreements = allAgreements.filter(a => a.clientId === client.id);
  const statusKey = computeClientStatus(client, clientAgreements);
  const config = CLIENT_STATUS_CONFIG[statusKey];
  return {
    key: statusKey,
    label: config.label,
    badgeColor: config.badgeColor,
    textClassName: config.textClassName,
  };
}

// ============================================================================
// CLIENT CARD COMPONENT
// ============================================================================

function ClientCard({ client, status }: { client: ApiClient; status: { key: ClientStatusKey; label: string; badgeColor: string; textClassName: string } }) {
  const router = useRouter();
  const initials = getInitials(client.name);

  const description =
    client.clientProfile?.city && client.clientProfile?.state
      ? `Based in ${client.clientProfile.city}, ${client.clientProfile.state}`
      : 'Client';

  return (
    <div
      onClick={() => router.push(`/strategist/clients/${client.id}`)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all hover:border-zinc-300 hover:shadow-md"
    >
      <div className="flex flex-1 flex-col items-start p-4">
        <span
          className={`mb-4 flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 pl-2 text-xs font-medium ${status.textClassName}`}
        >
          <div className={`h-1 w-1 rounded-full ${status.badgeColor}`} />
          {status.label}
        </span>
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-zinc-900 group-hover:text-zinc-700">
            {client.name || client.email}
          </h3>
        </div>
        <p className="mb-4 line-clamp-2 text-sm text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

// ============================================================================
// ADD CLIENT MODAL COMPONENT
// ============================================================================

type ClientType = 'individual' | 'business';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated?: () => void;
}

function AddClientModal({ isOpen, onClose, onClientCreated }: AddClientModalProps) {
  const {user} = useAuth()
  const [clientType, setClientType] = useState<ClientType>('individual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    address: '',
  });

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Create client via API
      await createClient({
        strategistId: user?.id || '',
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        businessName: formData.businessName || undefined,
        clientType,
      });

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        businessName: '',
        address: '',
      });

      onClientCreated?.();
      onClose();
    } catch (err) {
      console.error('Failed to create client:', err);
      setError(err instanceof Error ? err.message : 'Failed to create client. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex h-full w-full items-center justify-center bg-white">
        <div className="absolute top-0 left-0 flex h-14 w-full items-center gap-2 border-b border-zinc-200 pl-2">
          <button
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X weight="bold" className="h-4.5 w-4.5" />
          </button>
          <div className="h-4 w-0.5 bg-zinc-200" />
          <h1 className="rounded-lg bg-zinc-100 px-2 py-1 text-center text-sm font-semibold text-zinc-900">
            New Client
          </h1>
        </div>

        <div className="w-full max-w-md px-6">
          <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="h-full w-1 rounded-full bg-emerald-500" />
              <div>
                <p className="font-medium text-zinc-900">New Tax Strategy Client</p>
                <div className="mt-1 flex items-center gap-3 text-sm text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Calendar weight="fill" className="h-3.5 w-3.5" />
                    Onboarding
                  </span>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 p-1">
                <div className="flex rounded-lg bg-zinc-100 p-1">
                  <button
                    type="button"
                    onClick={() => setClientType('individual')}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                      clientType === 'individual'
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    <User
                      weight={clientType === 'individual' ? 'fill' : 'regular'}
                      className="h-4 w-4"
                    />
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientType('business')}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                      clientType === 'business'
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    <Buildings
                      weight={clientType === 'business' ? 'fill' : 'regular'}
                      className="h-4 w-4"
                    />
                    Business
                  </button>
                </div>
              </div>

              <div className="divide-y divide-zinc-100">
                <div className="flex items-center justify-between px-4 py-3">
                  <label className="text-sm font-medium text-zinc-500">Name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="First"
                      value={formData.firstName}
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-24 rounded-lg border border-zinc-200 px-3 py-1.5 text-right text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Last"
                      value={formData.lastName}
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-24 rounded-lg border border-zinc-200 px-3 py-1.5 text-right text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between px-4 py-3">
                  <label className="text-sm font-medium text-zinc-500">Email</label>
                  <input
                    type="email"
                    placeholder="client@email.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-48 rounded-lg border border-zinc-200 px-3 py-1.5 text-right text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex items-center justify-between px-4 py-3">
                  <label className="text-sm font-medium text-zinc-500">Phone</label>
                  <input
                    type="tel"
                    placeholder="(555) 000-0000"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-48 rounded-lg border border-zinc-200 px-3 py-1.5 text-right text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none"
                  />
                </div>

                {clientType === 'business' && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <label className="text-sm font-medium text-zinc-500">Business</label>
                    <input
                      type="text"
                      placeholder="Business name"
                      value={formData.businessName}
                      onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-48 rounded-lg border border-zinc-200 px-3 py-1.5 text-right text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between px-4 py-3">
                  <label className="text-sm font-medium text-zinc-500">Address</label>
                  <input
                    type="text"
                    placeholder="City, State"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-48 rounded-lg border border-zinc-200 px-3 py-1.5 text-right text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-zinc-900 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Client'}
            </button>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-zinc-400">
              <Lock weight="fill" className="h-3 w-3" />
              Client data is secure and encrypted
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LOADING & EMPTY STATES
// ============================================================================

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
      <p className="mt-4 text-sm text-zinc-500">Loading clients...</p>
    </div>
  );
}

function EmptyState({ onAddClient }: { onAddClient: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="mb-1 text-lg font-semibold text-zinc-800">No clients yet</p>
      <p className="mb-4 text-sm text-zinc-400">Add your first client to get started</p>
      <button
        onClick={onAddClient}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
      >
        <Plus weight="bold" className="h-4 w-4" />
        Add Client
      </button>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

type StatusFilterOption = 'all' | ClientStatusKey;

const STATUS_FILTER_OPTIONS: { key: StatusFilterOption; label: string; color: string }[] = [
  { key: 'all', label: 'All Clients', color: 'bg-zinc-500' },
  { key: 'awaiting_agreement', label: 'Pending Signature', color: 'bg-amber-500' },
  { key: 'awaiting_payment', label: 'Pending Payment', color: 'bg-amber-500' },
  { key: 'awaiting_documents', label: 'Pending Documents', color: 'bg-amber-500' },
  { key: 'ready_for_strategy', label: 'Ready for Strategy', color: 'bg-zinc-500' },
  { key: 'awaiting_compliance', label: 'Compliance Review', color: 'bg-amber-500' },
  { key: 'awaiting_approval', label: 'Client Approval', color: 'bg-teal-500' },
  { key: 'active', label: 'Active', color: 'bg-emerald-500' },
];

/** Ordered sections for grouped display */
const STATUS_SECTION_ORDER: ClientStatusKey[] = [
  'awaiting_agreement',
  'awaiting_payment',
  'awaiting_documents',
  'ready_for_strategy',
  'awaiting_compliance',
  'awaiting_approval',
  'active',
];

function groupClientsByStatus(
  clients: ApiClient[],
  allAgreements: ApiAgreement[]
): Record<string, ApiClient[]> {
  const groups: Record<string, ApiClient[]> = {};
  for (const client of clients) {
    const status = getClientStatusFromAgreements(client, allAgreements);
    if (!groups[status.key]) groups[status.key] = [];
    groups[status.key].push(client);
  }
  return groups;
}

export default function StrategistClientsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [agreements, setAgreements] = useState<ApiAgreement[]>([]);

  const loadClients = async () => {
    try {
      const [clientsData, agreementsData] = await Promise.all([
        listClients(),
        listAgreements(),
      ]);
      setClients(clientsData || []);
      setAgreements(agreementsData || []);
    } catch (error) {
      console.error('Failed to load clients:', error);
      setClients([]);
      setAgreements([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    if (isFilterOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterOpen]);

  const filteredClients = clients.filter(client => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || client.name?.toLowerCase().includes(q) || client.email?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || getClientStatusFromAgreements(client, agreements).key === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const groupedClients = groupClientsByStatus(filteredClients, agreements);
  const activeFilterLabel = STATUS_FILTER_OPTIONS.find(o => o.key === statusFilter);

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1">
        <div className="shrink-0 bg-white pt-6 pb-6">
          <div className="mx-auto w-full max-w-[642px]">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="mb-2 text-2xl font-medium tracking-tight">Clients</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  {clients.length > 0
                    ? `${clients.length} client${clients.length !== 1 ? 's' : ''}`
                    : 'Manage and view all your tax strategy clients'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
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
              <div className="flex items-center gap-2">
                {/* <button className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50">
                  <span>Folder</span>
                  <ChevronDown className="h-4 w-4" />
                </button> */}
                <div ref={filterRef} className="relative">
                  <button
                    onClick={() => setIsFilterOpen(prev => !prev)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-sm font-medium transition-colors ${
                      statusFilter !== 'all'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50'
                    }`}
                  >
                    {statusFilter !== 'all' && (
                      <div className={`h-1.5 w-1.5 rounded-full ${activeFilterLabel?.color}`} />
                    )}
                    <span>{statusFilter === 'all' ? 'Filter' : activeFilterLabel?.label}</span>
                    <ChevronDownIcon className={`h-4 w-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isFilterOpen && (
                    <div className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
                      {STATUS_FILTER_OPTIONS.map(option => (
                        <button
                          key={option.key}
                          onClick={() => {
                            setStatusFilter(option.key);
                            setIsFilterOpen(false);
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                        >
                          <div className={`h-2 w-2 rounded-full ${option.color}`} />
                          <span className="flex-1">{option.label}</span>
                          {statusFilter === option.key && (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setIsAddClientModalOpen(true)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-500 bg-emerald-500 px-2 py-1 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
                >
                  <Plus weight="bold" className="h-4 w-4" />
                  <span>Add Client</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white pb-42">
          <div className="mx-auto w-full max-w-[642px] py-6">
            {isLoading ? (
              <LoadingState />
            ) : clients.length === 0 ? (
              <EmptyState onAddClient={() => setIsAddClientModalOpen(true)} />
            ) : filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="mb-1 text-lg font-semibold text-zinc-800">No clients found</p>
                <p className="text-sm text-zinc-400">Try adjusting your search or filter</p>
              </div>
            ) : (
              <div className="space-y-8">
                {STATUS_SECTION_ORDER.map(statusKey => {
                  const group = groupedClients[statusKey];
                  if (!group || group.length === 0) return null;
                  const meta = STATUS_FILTER_OPTIONS.find(o => o.key === statusKey)!;
                  return (
                    <div key={statusKey}>
                      <div className="mb-3 flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${meta.color}`} />
                        <h2 className="text-sm font-semibold text-zinc-700">{meta.label}</h2>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                          {group.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {group.map(client => (
                          <ClientCard key={client.id} client={client} status={getClientStatusFromAgreements(client, agreements)} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <AddClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        onClientCreated={loadClients}
      />
    </div>
  );
}
