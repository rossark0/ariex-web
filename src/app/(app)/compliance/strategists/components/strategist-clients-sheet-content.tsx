'use client';

import { useState } from 'react';
import {
  User,
  Envelope,
  CircleWavyCheckIcon,
  Target,
  UsersThree,
  UserCheck,
  Briefcase,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import { FullStrategistMock } from '@/lib/mocks/strategist-full';
import { getFullClientsByStrategist } from '@/lib/mocks/client-full';
import { DetailRow } from './detail-row';
import { StatusBadge } from './status-badge';
import { ClientItem } from './client-item';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface StrategistClientsSheetContentProps {
  strategist: FullStrategistMock;
}

export function StrategistClientsSheetContent({ strategist }: StrategistClientsSheetContentProps) {
  const clients = getFullClientsByStrategist(strategist.user.id);
  const [showMore, setShowMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClients = clients.filter(client => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      client.user.name?.toLowerCase().includes(query) ||
      client.user.email?.toLowerCase().includes(query) ||
      client.profile.businessName?.toLowerCase().includes(query)
    );
  });

  const isSearching = searchQuery.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Strategist Info - Fades out when searching */}
        <div
          className={`transition-all duration-300 ${
            isSearching ? 'pointer-events-none h-0 overflow-hidden opacity-0' : 'opacity-100'
          }`}
        >
          {/* Strategist Details Section */}
          <div className="flex items-center gap-2 px-6 pt-8 pb-4">
            <Avatar className="rounded-lg">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <h3 className="text-2xl font-medium">{strategist.user.name}</h3>
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
        </div>

        {/* Clients Section */}
        <div className={`px-6 py-4 ${isSearching ? 'pt-6' : ''}`}>
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              {isSearching ? `Search results` : 'Clients'}
            </h4>
            <span className="text-xs text-zinc-400">
              {isSearching ? `${filteredClients.length} found` : `${clients.length} total`}
            </span>
          </div>

          {(() => {
            if (filteredClients.length > 0) {
              return (
                <div className="flex flex-col">
                  {filteredClients.map(client => (
                    <ClientItem key={client.user.id} client={client} />
                  ))}
                </div>
              );
            }

            if (searchQuery && clients.length > 0) {
              return (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="mb-1 text-sm font-medium text-zinc-600">No results found</p>
                  <p className="text-xs text-zinc-400">Try a different search term</p>
                </div>
              );
            }

            return (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="mb-1 text-sm font-medium text-zinc-600">No clients</p>
                <p className="text-xs text-zinc-400">This strategist has no assigned clients</p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Fixed Bottom Search Input */}
      <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-white via-white to-transparent px-6 pt-8 pb-6">
        <div className="relative flex items-center rounded-full border border-zinc-200 bg-white shadow-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-zinc-300">
          <MagnifyingGlass
            weight="bold"
            className="absolute left-5 h-5 w-5 text-zinc-400"
          />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="min-h-[56px] flex-1 bg-transparent pl-14 pr-6 text-sm font-medium leading-relaxed tracking-normal text-black placeholder:text-zinc-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
