'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Envelope,
  CircleWavyCheckIcon,
  UsersThree,
  UserCheck,
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
import { useComplianceStrategistDetail } from '@/contexts/compliance/hooks/use-compliance-strategist-detail';
import { CLIENT_STATUS_CONFIG, type ClientStatusKey } from '@/lib/client-status';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DetailRow, StatusBadge } from '../components';
import type { ComplianceClientView } from '@/contexts/compliance/models/compliance.model';

interface Props {
  params: { strategistId: string };
}

// ============================================================================
// Client Item (real data)
// ============================================================================

function ClientItemReal({
  client,
  strategistId,
}: {
  client: ComplianceClientView;
  strategistId: string;
}) {
  const router = useRouter();
  const status = CLIENT_STATUS_CONFIG[client.statusKey];

  function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const description = client.businessName
    ? `${client.businessName}${client.city && client.state ? ` · ${client.city}, ${client.state}` : ''}`
    : client.city && client.state
      ? `Based in ${client.city}, ${client.state}`
      : client.email;

  return (
    <div className="group relative">
      <div
        onClick={() => router.push(`/compliance/clients/${client.id}?strategistId=${strategistId}`)}
        className="flex cursor-pointer items-center gap-4 rounded-none py-4 transition-colors hover:bg-zinc-50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
          <User className="h-5 w-5 text-zinc-400" />
        </div>
        <div className="flex flex-1 flex-col">
          <span className="font-medium text-zinc-900">{client.name}</span>
          <span className="text-sm text-zinc-500">{description}</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.textClassName}`}
          >
            <div className={`h-1.5 w-1.5 rounded-full ${status.badgeColor}`} />
            {status.label.split(' ')[0]}
          </span>
          <span className="text-xs text-zinc-400">{formatRelativeTime(client.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingState() {
  return (
    <div className="flex flex-col gap-4 py-8">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex animate-pulse items-center gap-4 py-4">
          <div className="h-10 w-10 rounded-lg bg-zinc-100" />
          <div className="flex-1">
            <div className="mb-2 h-4 w-32 rounded bg-zinc-100" />
            <div className="h-3 w-48 rounded bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function ComplianceStrategistDetailPage({ params }: Props) {
  useRoleRedirect('COMPLIANCE');
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);
  const { setSidebarCollapsed, isSidebarCollapsed } = useUiStore();

  const {
    strategist,
    isLoadingStrategist,
    clients,
    groupedClients,
    isLoadingClients,
    searchQuery,
    setSearchQuery,
  } = useComplianceStrategistDetail(params.strategistId);

  useEffect(() => {
    setSidebarCollapsed(true);
    return () => {
      setSidebarCollapsed(false);
    };
  }, [setSidebarCollapsed]);

  if (!isLoadingStrategist && !strategist) {
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

  const strategistName = strategist?.fullName || strategist?.name || strategist?.email || 'Loading...';
  const strategistEmail = strategist?.email || '';
  const clientCount = clients.length;
  const isActive = clientCount > 0;

  return (
    <div className="relative flex min-h-full flex-col bg-white">
      {/* Breadcrumb */}
      <div
        className={`fixed top-4 z-50 pl-2 pt-3.75 pb-2 transition-all duration-300 ${isSidebarCollapsed ? 'left-14' : 'left-56'}`}
      >
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/compliance/strategists">Strategists</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{strategistName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pt-10 pb-8">
        <div className="mx-auto w-full max-w-[642px]">
          {/* Strategist Details Section */}
          <div className="flex items-center gap-2 px-6 pt-8 pb-4">
            <Avatar className="rounded-lg">
              <AvatarFallback>
                {strategistName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-2xl font-medium">{strategistName}</h3>
          </div>

          {/* About Section */}
          <div className="border-b border-zinc-100 px-6 py-4">
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">About</h4>
            <p className="text-sm leading-relaxed text-zinc-700">
              {strategistName} is a tax strategist currently managing {clientCount} client
              {clientCount !== 1 ? 's' : ''}.
            </p>
          </div>

          {/* Details Section */}
          <div className="flex flex-col justify-start px-6 py-4">
            <DetailRow
              label="Name"
              icon={<User className="h-4 w-4" />}
              value={strategistName}
            />
            <DetailRow
              label="Email"
              icon={<Envelope className="h-4 w-4" />}
              value={strategistEmail}
            />
            <DetailRow
              label="Status"
              icon={<CircleWavyCheckIcon className="h-4 w-4" />}
              value={
                <StatusBadge variant={isActive ? 'success' : 'default'}>
                  {isActive ? 'Active' : 'Inactive'}
                </StatusBadge>
              }
            />
            <DetailRow
              label="Total Clients"
              icon={<UsersThree className="h-4 w-4" />}
              value={<StatusBadge>{clientCount}</StatusBadge>}
            />
            {showMore && (
              <DetailRow
                label="Active Clients"
                icon={<UserCheck className="h-4 w-4" />}
                value={<StatusBadge variant="success">{clientCount}</StatusBadge>}
              />
            )}
            <button
              onClick={() => setShowMore(!showMore)}
              className="mt-2 text-sm text-zinc-500 hover:text-zinc-700"
            >
              {showMore ? 'See less' : 'See more'} ↓
            </button>
          </div>

          <div className="w-full px-6">
            <div className="h-px bg-zinc-200" />
          </div>

          {/* Clients Section */}
          <div className="px-6 py-4">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                {clientCount} Client{clientCount !== 1 ? 's' : ''}
              </h4>
            </div>

            {/* Filter Bar */}
            <div className="mb-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
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
                <button className="inline-flex h-[32px] cursor-pointer items-center gap-1.5 rounded-lg bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-500 shadow transition-colors hover:bg-zinc-100">
                  Status
                  <CaretDown className="h-3.5 w-3.5" weight="bold" />
                </button>
              </div>
              <button className="inline-flex h-[32px] cursor-pointer items-center gap-1.5 rounded-lg bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-500 shadow transition-colors hover:bg-zinc-100">
                <FunnelSimple className="h-3.5 w-3.5" weight="bold" />
                Filters
              </button>
            </div>

            {isLoadingClients ? (
              <LoadingState />
            ) : clients.length > 0 ? (
              <div className="flex flex-col gap-6">
                {/* Awaiting Compliance */}
                {groupedClients.awaitingCompliance.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <h5 className="text-xs font-semibold uppercase text-zinc-500">
                        Awaiting Compliance Review
                      </h5>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {groupedClients.awaitingCompliance.length}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      {groupedClients.awaitingCompliance.map(client => (
                        <ClientItemReal
                          key={client.id}
                          client={client}
                          strategistId={params.strategistId}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Awaiting Client Approval */}
                {groupedClients.awaitingApproval.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <h5 className="text-xs font-semibold uppercase text-zinc-500">
                        Pending Client Approval
                      </h5>
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                        {groupedClients.awaitingApproval.length}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      {groupedClients.awaitingApproval.map(client => (
                        <ClientItemReal
                          key={client.id}
                          client={client}
                          strategistId={params.strategistId}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Ready for Strategy */}
                {groupedClients.readyForStrategy.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <h5 className="text-xs font-semibold uppercase text-zinc-500">
                        Ready for Strategy
                      </h5>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                        {groupedClients.readyForStrategy.length}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      {groupedClients.readyForStrategy.map(client => (
                        <ClientItemReal
                          key={client.id}
                          client={client}
                          strategistId={params.strategistId}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Active */}
                {groupedClients.active.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <h5 className="text-xs font-semibold uppercase text-zinc-500">Active</h5>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {groupedClients.active.length}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      {groupedClients.active.map(client => (
                        <ClientItemReal
                          key={client.id}
                          client={client}
                          strategistId={params.strategistId}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* In Progress (other statuses) */}
                {groupedClients.inProgress.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <h5 className="text-xs font-semibold uppercase text-zinc-500">
                        In Progress
                      </h5>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                        {groupedClients.inProgress.length}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      {groupedClients.inProgress.map(client => (
                        <ClientItemReal
                          key={client.id}
                          client={client}
                          strategistId={params.strategistId}
                        />
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
                  {searchQuery
                    ? 'Try a different search term'
                    : 'This strategist has no assigned clients'}
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
