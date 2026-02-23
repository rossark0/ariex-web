'use client';

import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import {
  Briefcase,
  Buildings,
  Calendar,
  Lock,
  Plus,
  ShieldCheck,
  User,
  X,
} from '@phosphor-icons/react/dist/ssr';
import { Check, ChevronDown, ChevronDownIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listClients,
  listAgreements,
  createClient,
  inviteComplianceUser,
  type ApiClient,
  type ApiAgreement,
} from '@/lib/api/strategist.api';
import { useAuth } from '@/contexts/auth/AuthStore';
import { CLIENT_STATUS_CONFIG, type ClientStatusKey } from '@/lib/client-status';
import { computeClientStatus } from '@/contexts/strategist-contexts/client-management/utils/status-helpers';
import { AgreementStatus } from '@/types/agreement';

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

function ClientCard({
  client,
  status,
}: {
  client: ApiClient;
  status: { key: ClientStatusKey; label: string; badgeColor: string; textClassName: string };
}) {
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
  const { user } = useAuth();
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
// INVITE COMPLIANCE MODAL COMPONENT
// ============================================================================

interface InviteComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvited?: () => void;
}

function InviteComplianceModal({ isOpen, onClose, onInvited }: InviteComplianceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<Record<string, unknown> | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  // Client selection state
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // Fetch clients when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setError(null);
      setSuccess(null);
      setApiResponse(null);
      setCopied(null);
      setEmail('');
      setSelectedClientIds(new Set());

      // Fetch strategist's clients
      setIsLoadingClients(true);
      listClients()
        .then(fetchedClients => {
          setClients(fetchedClients);
          // Pre-select all clients by default
          setSelectedClientIds(new Set(fetchedClients.map(c => c.id)));
        })
        .finally(() => setIsLoadingClients(false));
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

  // Build acceptance URL from whatever token field exists in the response
  const token = apiResponse?.token || apiResponse?.invitationToken || apiResponse?.invitation_token;
  const acceptanceUrl = token
    ? `${window.location.origin}/compliance/strategists?token=${token}`
    : null;

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleClient = (clientId: string) => {
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedClientIds.size === clients.length) {
      setSelectedClientIds(new Set());
    } else {
      setSelectedClientIds(new Set(clients.map(c => c.id)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    setApiResponse(null);

    try {
      const clientIds = Array.from(selectedClientIds);
      const result = await inviteComplianceUser({ email, clientIds });
      console.log('[InviteCompliance] Full API response:', JSON.stringify(result, null, 2));
      setSuccess(result.message || 'Compliance user invited successfully.');
      setApiResponse(result as unknown as Record<string, unknown>);
      setEmail('');
      onInvited?.();
    } catch (err) {
      console.error('Failed to invite compliance user:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to invite compliance user. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white p-0 shadow-xl">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 px-4 py-3">
          <button
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X weight="bold" className="h-4.5 w-4.5" />
          </button>
          <div className="h-4 w-0.5 bg-zinc-200" />
          <h1 className="rounded-lg bg-zinc-100 px-2 py-1 text-center text-sm font-semibold text-zinc-900">
            Invite Compliance
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Info Banner — hide after success */}
          {!apiResponse && (
            <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="h-full w-1 rounded-full bg-teal-500" />
                <div>
                  <p className="font-medium text-zinc-900">Compliance Officer Invite</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    The invited user will receive an email with temporary credentials. They&apos;ll
                    be able to review and approve strategy documents for the selected clients.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email input — hide after success */}
            {!apiResponse && (
              <>
                <div className="mb-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  <div className="flex items-center justify-between px-4 py-3">
                    <label className="text-sm font-medium text-zinc-500">Email</label>
                    <input
                      type="email"
                      placeholder="compliance@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-56 rounded-lg border border-zinc-200 px-3 py-1.5 text-right text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Client Multi-Selector */}
                <div className="mb-6 rounded-xl border border-zinc-200 bg-white">
                  <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5">
                    <p className="text-sm font-medium text-zinc-700">
                      Clients to share
                      <span className="ml-1.5 text-xs font-normal text-zinc-400">
                        ({selectedClientIds.size} of {clients.length})
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="text-xs font-medium text-teal-600 hover:text-teal-700"
                    >
                      {selectedClientIds.size === clients.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="max-h-44 overflow-y-auto">
                    {isLoadingClients ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent" />
                        <span className="ml-2 text-xs text-zinc-400">Loading clients...</span>
                      </div>
                    ) : clients.length === 0 ? (
                      <div className="py-6 text-center text-xs text-zinc-400">
                        No clients found. Create a client first.
                      </div>
                    ) : (
                      clients.map(client => (
                        <label
                          key={client.id}
                          className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-50"
                        >
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                              selectedClientIds.has(client.id)
                                ? 'border-teal-600 bg-teal-600'
                                : 'border-zinc-300 bg-white'
                            }`}
                          >
                            {selectedClientIds.has(client.id) && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedClientIds.has(client.id)}
                            onChange={() => toggleClient(client.id)}
                            className="sr-only"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-800">
                              {client.name || client.email?.split('@')[0]}
                            </p>
                            <p className="truncate text-xs text-zinc-400">{client.email}</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                ✅ {success}
              </div>
            )}

            {/* ── Full API Response Display ── */}
            {apiResponse && (
              <div className="mb-4 space-y-3">
                {/* Acceptance URL (if token found) */}
                {acceptanceUrl && (
                  <div className="rounded-lg border border-teal-200 bg-teal-50 p-3">
                    <p className="mb-1.5 text-xs font-semibold text-teal-800">
                      Acceptance Link (share with compliance user)
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-md border border-teal-200 bg-white px-2 py-1.5 text-xs break-all text-zinc-700">
                        {acceptanceUrl}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(acceptanceUrl, 'url')}
                        className="shrink-0 rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                      >
                        {copied === 'url' ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Raw response fields */}
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-zinc-600">API Response</p>
                    <button
                      type="button"
                      onClick={() => handleCopy(JSON.stringify(apiResponse, null, 2), 'json')}
                      className="rounded bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-300"
                    >
                      {copied === 'json' ? '✓ Copied' : 'Copy JSON'}
                    </button>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(apiResponse).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2 text-xs">
                        <span className="min-w-[100px] shrink-0 font-medium text-zinc-500">
                          {key}:
                        </span>
                        <span className="font-mono break-all text-zinc-800">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!apiResponse ? (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-zinc-900 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                {isSubmitting ? 'Sending Invite...' : 'Send Invite'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-zinc-900 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
              >
                Done
              </button>
            )}

            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-zinc-400">
              <Lock weight="fill" className="h-3 w-3" />
              Invitation is secure and expires in 7 days
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

type WorkflowGroup =
  | 'action_required'
  | 'waiting_on_client'
  | 'waiting_on_compliance'
  | 'active_clients'
  | 'archived';

type FilterOption = 'all' | WorkflowGroup;

/**
 * Determine the workflow group for a client by looking at the RAW agreement
 * status — not just the computed ClientStatusKey — so we can correctly
 * distinguish who needs to act.
 *
 * Actor mapping:
 *  STRATEGIST (action_required):
 *    - No agreement / DRAFT / CANCELLED → create & send agreement
 *    - PENDING_STRATEGY               → create strategy
 *  CLIENT (waiting_on_client):
 *    - PENDING_SIGNATURE               → sign agreement
 *    - PENDING_PAYMENT                 → complete payment
 *    - PENDING_TODOS_COMPLETION        → upload documents
 *    - awaiting_approval               → approve strategy
 *  COMPLIANCE (waiting_on_compliance):
 *    - awaiting_compliance             → review strategy
 *  NONE (active_clients):
 *    - COMPLETED                       → all done
 */
function getWorkflowGroup(
  client: ApiClient,
  allAgreements: ApiAgreement[]
): WorkflowGroup {
  const clientAgreements = allAgreements.filter(a => a.clientId === client.id);

  // No agreements at all → strategist must create one
  if (clientAgreements.length === 0) return 'action_required';

  // Get most recent agreement
  const sorted = [...clientAgreements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const latest = sorted[0];

  switch (latest.status) {
    // ── Strategist must act ──
    case AgreementStatus.DRAFT:
    case AgreementStatus.CANCELLED:
    case AgreementStatus.PENDING_STRATEGY:
      return 'action_required';

    // ── Client must act ──
    case AgreementStatus.PENDING_SIGNATURE:
    case AgreementStatus.PENDING_PAYMENT:
    case AgreementStatus.PENDING_TODOS_COMPLETION:
      return 'waiting_on_client';

    // ── Strategy review: depends on sub-phase ──
    case AgreementStatus.PENDING_STRATEGY_REVIEW: {
      const statusKey = computeClientStatus(client, clientAgreements);
      if (statusKey === 'awaiting_compliance') return 'waiting_on_compliance';
      if (statusKey === 'awaiting_approval') return 'waiting_on_client';
      // Both approved → strategist must click "Finish Agreement"
      return 'action_required';
    }

    // ── Done ──
    case AgreementStatus.COMPLETED:
      return 'active_clients';

    default:
      return 'action_required';
  }
}

const WORKFLOW_SECTIONS: { key: WorkflowGroup; label: string; color: string; description: string }[] = [
  { key: 'action_required', label: 'Action Required', color: 'bg-violet-500', description: 'Clients that need your action to move forward' },
  { key: 'waiting_on_client', label: 'Waiting on Client', color: 'bg-amber-500', description: 'Pending client action — signature, payment, documents, or approval' },
  { key: 'waiting_on_compliance', label: 'Waiting on Compliance', color: 'bg-sky-500', description: 'Strategy submitted for compliance review' },
  { key: 'active_clients', label: 'Active Clients', color: 'bg-emerald-500', description: 'Strategy approved and active' },
  { key: 'archived', label: 'Archived', color: 'bg-zinc-400', description: 'Archived clients' },
];

const FILTER_OPTIONS: { key: FilterOption; label: string; color: string }[] = [
  { key: 'all', label: 'All Clients', color: 'bg-zinc-500' },
  ...WORKFLOW_SECTIONS.map(s => ({ key: s.key as FilterOption, label: s.label, color: s.color })),
];

function groupClientsByWorkflow(
  clients: ApiClient[],
  allAgreements: ApiAgreement[]
): Record<WorkflowGroup, ApiClient[]> {
  const groups: Record<WorkflowGroup, ApiClient[]> = {
    action_required: [],
    waiting_on_client: [],
    waiting_on_compliance: [],
    active_clients: [],
    archived: [],
  };
  for (const client of clients) {
    const workflow = getWorkflowGroup(client, allAgreements);
    groups[workflow].push(client);
  }
  return groups;
}

export default function StrategistClientsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterOption>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isInviteComplianceModalOpen, setIsInviteComplianceModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [agreements, setAgreements] = useState<ApiAgreement[]>([]);

  const loadClients = async () => {
    try {
      const [clientsData, agreementsData] = await Promise.all([listClients(), listAgreements()]);
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
    const matchesSearch =
      !searchQuery ||
      client.name?.toLowerCase().includes(q) ||
      client.email?.toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === 'all' ||
      getWorkflowGroup(client, agreements) === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const groupedClients = groupClientsByWorkflow(filteredClients, agreements);
  const activeFilterLabel = FILTER_OPTIONS.find(o => o.key === statusFilter);

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
                    <ChevronDownIcon
                      className={`h-4 w-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isFilterOpen && (
                    <div className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
                      {FILTER_OPTIONS.map(option => (
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
                  onClick={() => setIsInviteComplianceModalOpen(true)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  <ShieldCheck weight="bold" className="h-4 w-4" />
                  <span>Invite Compliance</span>
                </button>
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
              <div className="space-y-10">
                {WORKFLOW_SECTIONS.map(section => {
                  const group = groupedClients[section.key];
                  if (!group || group.length === 0) return null;
                  return (
                    <div key={section.key}>
                      <div className="mb-1 flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${section.color}`} />
                        <h2 className="text-sm font-semibold text-zinc-700">{section.label}</h2>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                          {group.length}
                        </span>
                      </div>
                      <p className="mb-3 text-xs text-zinc-400 pl-4">{section.description}</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {group.map(client => (
                          <ClientCard
                            key={client.id}
                            client={client}
                            status={getClientStatusFromAgreements(client, agreements)}
                          />
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

      <InviteComplianceModal
        isOpen={isInviteComplianceModalOpen}
        onClose={() => setIsInviteComplianceModalOpen(false)}
      />
    </div>
  );
}
