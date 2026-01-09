'use client';

import { getClientStatus } from '@/lib/client-status';
import { FullClientMock, getFullClientsByStrategist } from '@/lib/mocks/client-full';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import {
  Briefcase,
  Buildings,
  Calendar,
  CheckCircle,
  Envelope,
  Folder,
  Funnel,
  Globe,
  Lock,
  MapPin,
  Phone,
  Plus,
  Star,
  User,
  X,
} from '@phosphor-icons/react/dist/ssr';
import { ChevronDown, ChevronDownIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Current logged-in strategist
const CURRENT_STRATEGIST_ID = 'strategist-001';
const clients = getFullClientsByStrategist(CURRENT_STRATEGIST_ID);

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

function getClientDescription(client: FullClientMock): string {
  const parts: string[] = [];

  if (client.profile.businessName) {
    parts.push(`Owner of ${client.profile.businessName}`);
  }
  if (client.profile.businessType) {
    parts.push(client.profile.businessType);
  }
  if (client.profile.city && client.profile.state) {
    parts.push(`based in ${client.profile.city}, ${client.profile.state}`);
  }

  if (parts.length === 0) {
    return 'Tax strategy client';
  }

  return parts.join(' · ');
}

// ============================================================================
// CLIENT CARD COMPONENT
// ============================================================================

function ClientCard({ client }: { client: FullClientMock }) {
  const router = useRouter();
  const initials = getInitials(client.user.name);
  const documentCount = client.documents.length;
  const status = getClientStatus(client);

  // Generate a consistent gradient based on client name
  const gradients = [
    'from-violet-100 via-purple-50 to-fuchsia-100',
    'from-emerald-100 via-teal-50 to-cyan-100',
    'from-amber-100 via-orange-50 to-yellow-100',
    'from-rose-100 via-pink-50 to-red-100',
    'from-blue-100 via-indigo-50 to-violet-100',
    'from-lime-100 via-green-50 to-emerald-100',
  ];
  const gradientIndex = (client.user.name?.charCodeAt(0) || 0) % gradients.length;
  const gradient = gradients[gradientIndex];

  return (
    <div
      onClick={() => router.push(`/strategist/clients/${client.user.id}`)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all hover:border-zinc-300 hover:shadow-md"
    >
      {/* Icon Area with Gradient */}
      {/* <div className={`flex h-24 items-start justify-start bg-linear-to-br ${gradient} p-4`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/80 shadow-sm backdrop-blur-sm">
          <span className="text-sm font-semibold text-zinc-700">{initials}</span>
        </div>
      </div> */}

      {/* Content */}
      <div className="flex flex-1 flex-col items-start p-4">
        {/* Status Badge */}
        <span
          className={`mb-4 flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 pl-2 text-xs font-medium ${status.textClassName}`}
        >
          <div className={`h-1 w-1 rounded-full ${status.badgeColor}`} />
          {status.label.split(' ')[0]}
        </span>
        {/* Title & Status */}
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-zinc-900 group-hover:text-zinc-700">
            {client.user.name}
          </h3>
        </div>

        {/* Description */}
        <p className="mb-4 line-clamp-2 text-sm text-zinc-500">{getClientDescription(client)}</p>
      </div>
    </div>
  );
}

// ============================================================================
// TAB BUTTON COMPONENT (matching client details style)
// ============================================================================

type TabId = 'all' | 'active' | 'folders';

function TabButton({
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: typeof Globe;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-zinc-900 text-white'
          : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
      }`}
    >
      <Icon weight={isActive ? 'fill' : 'regular'} className="h-4 w-4" />
      {label}
    </button>
  );
}

// ============================================================================
// ADD CLIENT MODAL COMPONENT
// ============================================================================

type ClientType = 'individual' | 'business';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function AddClientModal({ isOpen, onClose }: AddClientModalProps) {
  const [clientType, setClientType] = useState<ClientType>('individual');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    businessType: '',
    city: '',
    state: '',
  });

  // Prevent body scroll when modal is open
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

  // Handle escape key
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Handle client creation
    console.log('Creating client:', { clientType, ...formData });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex h-full w-full items-center justify-center bg-white">
        <div className="absolute pl-2 top-0 left-0 flex h-14 w-full items-center gap-2 border-b border-zinc-200">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X weight="bold" className="h-4.5 w-4.5" />
          </button>

          <div className="h-4 w-0.5 bg-zinc-200" />

          <h1 className="bg-zinc-100 px-2 py-1 rounded-lg text-center text-sm font-semibold text-zinc-900">New Client</h1>
        </div>

        {/* Modal Content */}
        <div className="w-full max-w-md px-6">
          {/* Title */}
          {/* <h2 className="mb-8 text-center text-xl font-semibold text-zinc-900">New Client</h2> */}

          {/* Service Info Card - like the image */}
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

          {/* Details Form Card */}
          <form onSubmit={handleSubmit}>
            <div className="mb-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
              {/* Client Type Tabs */}
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

              {/* Form Fields */}
              <div className="divide-y divide-zinc-100">
                {/* Name Row */}
                <div className="flex items-center justify-between px-4 py-3">
                  <label className="text-sm font-medium text-zinc-500">Name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="First"
                      value={formData.firstName}
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-24 rounded-lg border border-zinc-200 px-3 py-1.5 text-right text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Last"
                      value={formData.lastName}
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-24 rounded-lg border border-zinc-200 px-3 py-1.5 text-right text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Email Row */}
                <div className="flex items-center justify-between px-4 py-3">
                  <label className="text-sm font-medium text-zinc-500">Email</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      placeholder="client@email.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-48 rounded-lg border border-zinc-200 px-3 py-1.5 text-right text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Phone Row */}
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

                {/* Business Name Row (only for business type) */}
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

                {/* Location Row */}
                <div className="flex items-center justify-between px-4 py-3">
                  <label className="text-sm font-medium text-zinc-500">Location</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="City"
                      value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                      className="w-24 rounded-lg border border-zinc-200 px-3 py-1.5 text-right text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={formData.state}
                      onChange={e => setFormData({ ...formData, state: e.target.value })}
                      className="w-20 rounded-lg border border-zinc-200 px-3 py-1.5 text-right text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Plan Selection Card */}
            <div className="mb-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
              {/* Card Header with gradient */}
              <div className="relative h-16 bg-linear-to-br from-emerald-100 via-teal-50 to-cyan-100">
                <div className="absolute top-3 left-3 flex h-6 w-6 items-center justify-center rounded-full border-2 border-emerald-500 bg-white">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
              </div>

              {/* Card Content */}
              <div className="p-4">
                <h3 className="font-medium text-zinc-900">Tax Strategy Plan</h3>
                <p className="mt-0.5 text-sm text-zinc-500">
                  <span className="font-semibold text-zinc-900">$2,500</span> one-time setup
                </p>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-zinc-500">
                      <Briefcase weight="fill" className="h-4 w-4 text-zinc-400" />
                      Includes
                    </span>
                    <span className="text-zinc-700">Full Strategy Review</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-zinc-500">
                      <Calendar weight="fill" className="h-4 w-4 text-zinc-400" />
                      Timeline
                    </span>
                    <span className="text-zinc-700">2-4 weeks</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full rounded-xl bg-zinc-900 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
            >
              Create Client
            </button>

            {/* Security Note */}
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
// MAIN PAGE COMPONENT
// ============================================================================

export default function StrategistClientsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);

  // Filter clients based on search and tab
  const filteredClients = clients.filter(client => {
    const matchesSearch =
      !searchQuery ||
      client.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.profile.businessName?.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'active') {
      const status = getClientStatus(client);
      return matchesSearch && status.key === 'active';
    }

    return matchesSearch;
  });

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1">
        {/* Header Section - matching home page zinc-50 style */}
        <div className="shrink-0 bg-white pt-6 pb-6">
          <div className="mx-auto w-full max-w-[642px]">
            {/* Title Row */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="mb-2 text-2xl font-medium tracking-tight"> Clients</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Manage and view all your tax strategy clients
                </p>
              </div>
            </div>

            {/* Tabs & Search Row */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Tabs */}
              {/* <div className="flex items-center gap-2">
                <TabButton
                  label="All Clients"
                  icon={Globe}
                  isActive={activeTab === 'all'}
                  onClick={() => setActiveTab('all')}
                />
                <TabButton
                  label="Active"
                  icon={CheckCircle}
                  isActive={activeTab === 'active'}
                  onClick={() => setActiveTab('active')}
                />
                <TabButton
                  label="Folders"
                  icon={Folder}
                  isActive={activeTab === 'folders'}
                  onClick={() => setActiveTab('folders')}
                />
              </div> */}

              {/* Search Input */}
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
                  className="h-[30px] w-64 rounded-lg bg-white border border-zinc-200 shadow pr-3 pl-7 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 hover:bg-zinc-100 focus:border-zinc-300 focus:outline-none"
                />
              </div>
              {/* Filter Button */}
              <div className="flex items-center gap-2">
                {/* Add to Folder Button */}
                <button className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50">
                  <span>Folder</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button className="flex items-center gap-1.5 rounded-lg bg-white border border-zinc-200 px-3 py-1 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50">
                  <span>Filter</span>

                  <ChevronDownIcon className="h-4 w-4" />
                </button>
                {/* Add Client Button - matching client details primary button style */}
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

        {/* Cards Grid Section - white background matching home page */}
        <div className="bg-white pb-42">
          <div className="mx-auto w-full max-w-[642px] py-6">
            {/* Cards Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredClients.map(client => (
                <ClientCard key={client.user.id} client={client} />
              ))}
            </div>

            {/* Empty State */}
            {filteredClients.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="mb-1 text-lg font-semibold text-zinc-800">No clients found</p>
                <p className="text-sm text-zinc-400">
                  {searchQuery
                    ? 'Try adjusting your search'
                    : 'Add your first client to get started'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
      />
    </div>
  );
}
