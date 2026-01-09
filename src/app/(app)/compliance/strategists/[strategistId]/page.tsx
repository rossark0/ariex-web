'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Envelope,
  CircleWavyCheckIcon,
  Target,
  UsersThree,
  UserCheck,
  Briefcase,
  FunnelSimple,
  CaretDown,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import { AiFloatingChatbot } from '@/components/ai/ai-floating-chatbot';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { useUiStore } from '@/contexts/ui/UiStore';
import { getFullClientsByStrategist, FullClientMock } from '@/lib/mocks/client-full';
import { getStrategistById } from '@/lib/mocks/strategist-full';
import { getClientStatus, ClientStatusKey } from '@/lib/client-status';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DetailRow, StatusBadge, ClientItem } from '../components';

interface Props {
  params: { strategistId: string };
}

export default function ComplianceStrategistDetailPage({ params }: Props) {
  useRoleRedirect('COMPLIANCE');
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { setSidebarCollapsed, isSidebarCollapsed } = useUiStore();

  // Collapse sidebar when entering this page
  useEffect(() => {
    setSidebarCollapsed(true);
    return () => {
      setSidebarCollapsed(false);
    };
  }, [setSidebarCollapsed]);

  // Get strategist data
  const strategist = getStrategistById(params.strategistId);
  const clients = getFullClientsByStrategist(params.strategistId);

  // Filter clients based on search query
  const filteredClients = clients.filter(client => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      client.user.name?.toLowerCase().includes(query) ||
      client.user.email?.toLowerCase().includes(query) ||
      client.profile.businessName?.toLowerCase().includes(query)
    );
  });

  // Group clients by status
  const groupedClients = filteredClients.reduce(
    (acc, client) => {
      const status = getClientStatus(client);
      if (status.key === 'ready_for_strategy') {
        acc.availableForComments.push(client);
      } else if (status.key === 'awaiting_signature') {
        acc.pendingStrategy.push(client);
      } else if (status.key === 'awaiting_agreement') {
        acc.pendingAgreement.push(client);
      } else {
        acc.other.push(client);
      }
      return acc;
    },
    {
      availableForComments: [] as FullClientMock[],
      pendingStrategy: [] as FullClientMock[],
      pendingAgreement: [] as FullClientMock[],
      other: [] as FullClientMock[],
    }
  );

  if (!strategist) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center">
        <p className="text-zinc-500">Strategist not found</p>
        <Link
          href="/compliance/strategists"
          className="mt-4 text-sm text-zinc-600 hover:text-zinc-900"
        >
          Back to Strategists
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-full flex-col bg-white">
        {/* Breadcrumb */}
        <div className={`fixed top-4 z-50 pl-2 pt-3.75 pb-2 transition-all duration-300 ${isSidebarCollapsed ? 'left-14' : 'left-56'}`}>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/compliance/strategists">Strategists</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{strategist.user.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pt-10 pb-8">
          {/* Strategist Info */}
          <div className="mx-auto w-full max-w-[642px]">
            {/* Strategist Details Section */}
            <div className="flex items-center gap-2 px-6 pt-8 pb-4">
            <Avatar className="rounded-lg">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <h3 className="text-2xl font-medium">{strategist.user.name}</h3>
          </div>

           {/* About Section */}
          <div className="border-b border-zinc-100 px-6 py-4">
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">About</h4>
            <p className="text-sm leading-relaxed text-zinc-700">
              {strategist.profile.title
                ? `${strategist.user.name} is a ${strategist.profile.title}`
                : strategist.user.name}
              {strategist.profile.specializations?.length > 0
                ? ` specializing in ${strategist.profile.specializations.join(', ')}.`
                : '.'}{' '}
              Currently managing {strategist.metrics.totalClients} client
              {strategist.metrics.totalClients !== 1 ? 's' : ''} with {strategist.metrics.activeClients}{' '}
              active engagement{strategist.metrics.activeClients !== 1 ? 's' : ''}.
            </p>
          </div>

          {/* Details Section */}
          <div className="flex flex-col justify-start px-6 py-4">
            <DetailRow label="Name" icon={<User className="h-4 w-4" />} value={strategist.user.name} />
            <DetailRow
              label="Email"
              icon={<Envelope className="h-4 w-4" />}
              value={strategist.user.email}
            />
            <DetailRow
              label="Status"
              icon={<CircleWavyCheckIcon className="h-4 w-4" />}
              value={
                <StatusBadge variant={strategist.metrics.activeClients > 0 ? 'success' : 'default'}>
                  {strategist.metrics.activeClients > 0 ? 'Active' : 'Inactive'}
                </StatusBadge>
              }
            />
            <DetailRow
              label="Specialization"
              icon={<Target className="h-4 w-4" />}
              value={
                strategist.profile.specializations?.length > 0 ? (
                  <StatusBadge>{strategist.profile.specializations[0]}</StatusBadge>
                ) : (
                  <span className="text-zinc-400">Not set</span>
                )
              }
            />
            <DetailRow
              label="Total Clients"
              icon={<UsersThree className="h-4 w-4" />}
              value={<StatusBadge>{strategist.metrics.totalClients}</StatusBadge>}
            />
            <DetailRow
              label="Active Clients"
              icon={<UserCheck className="h-4 w-4" />}
              value={<StatusBadge variant="success">{strategist.metrics.activeClients}</StatusBadge>}
            />
            {showMore && (
              <>
                <DetailRow
                  label="Title"
                  icon={<Briefcase className="h-4 w-4" />}
                  value={strategist.profile.title || <span className="text-zinc-400">Not set</span>}
                />
              </>
            )}
            <button
              onClick={() => setShowMore(!showMore)}
              className="mt-2 text-sm text-zinc-500 hover:text-zinc-700"
            >
              {showMore ? 'See less' : 'See more'} ↓
            </button>
          </div>

          <div className="w-full px-6">
            <div className="h-px bg-zinc-200"></div>
          </div>

          {/* Clients Section */}
          <div className="py-4 px-6">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-400"> {clients.length} Clients</h4>
          </div>

          {/* Filter Bar */}
          <div className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Search Input */}
              <div className="relative">
                <MagnifyingGlass
                  weight="bold"
                  className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-[32px] w-64 rounded-lg bg-zinc-100 pr-2 pl-7 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 hover:bg-zinc-50 focus:border-zinc-300 focus:outline-none"
                />
              </div>

              {/* Status Dropdown */}
              <button className="inline-flex h-[32px] cursor-pointer items-center gap-1.5 rounded-lg bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-500 shadow transition-colors hover:bg-zinc-100">
                Status
                <CaretDown className="h-3.5 w-3.5" weight="bold" />
              </button>
            </div>

            {/* Filters Button */}
            <button className="inline-flex h-[32px] cursor-pointer items-center gap-1.5 rounded-lg bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-500 shadow transition-colors hover:bg-zinc-100">
              <FunnelSimple className="h-3.5 w-3.5" weight="bold" />
              Filters
            </button>
          </div>

          {filteredClients.length > 0 ? (
            <div className="flex flex-col gap-6">
              {/* Available for Comments */}
              {groupedClients.availableForComments.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <h5 className="text-xs font-semibold uppercase text-zinc-500">
                      Available for comments</h5>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                      {groupedClients.availableForComments.length}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    {groupedClients.availableForComments.map(client => (
                      <ClientItem key={client.user.id} client={client} />
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Strategy */}
              {groupedClients.pendingStrategy.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <h5 className="text-xs font-semibold uppercase text-zinc-500">Pending Strategy</h5>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                      {groupedClients.pendingStrategy.length}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    {groupedClients.pendingStrategy.map(client => (
                      <ClientItem key={client.user.id} client={client} />
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Agreement */}
              {groupedClients.pendingAgreement.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <h5 className="text-xs font-semibold uppercase text-zinc-500">Pending Agreement</h5>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                      {groupedClients.pendingAgreement.length}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    {groupedClients.pendingAgreement.map(client => (
                      <ClientItem key={client.user.id} client={client} />
                    ))}
                  </div>
                </div>
              )}

              {/* Other statuses */}
              {groupedClients.other.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <h5 className="text-xs font-semibold uppercase text-zinc-500">Other</h5>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                      {groupedClients.other.length}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    {groupedClients.other.map(client => (
                      <ClientItem key={client.user.id} client={client} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="mb-1 text-sm font-medium text-zinc-600">
                {searchQuery ? 'No results found' : 'No clients'}
              </p>
              <p className="text-xs text-zinc-400">
                {searchQuery ? 'Try a different search term' : 'This strategist has no assigned clients'}
              </p>
            </div>
          )}
          </div>
          </div>
        </div>

        <AiFloatingChatbot />
    </div>
  );
}
