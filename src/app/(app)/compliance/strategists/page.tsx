'use client';

import { AiFloatingChatbot } from '@/components/ai/ai-floating-chatbot';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { getAllStrategists } from '@/lib/mocks/strategist-full';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { StrategistCard } from './components';

// Get all strategists
const strategists = getAllStrategists();

export default function ComplianceStrategistsPage() {
  useRoleRedirect('COMPLIANCE');
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleStrategistClick = (strategistId: string) => {
    router.push(`/compliance/strategists/${strategistId}`);
  };

  // Filter strategists based on search
  const filteredStrategists = strategists.filter(strategist => {
    const matchesSearch =
      !searchQuery ||
      strategist.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      strategist.user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      strategist.profile.title?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1">
        {/* Header Section */}
        <div className="shrink-0 bg-white pt-20 pb-6">
          <div className="mx-auto w-full max-w-[642px]">
            {/* Title Row */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="mb-2 text-2xl font-medium tracking-tight">Strategists</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Monitor all tax strategists and their clients
                </p>
              </div>
            </div>

            {/* Search Row */}
            <div className="flex flex-wrap items-center justify-between gap-4">
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
                  className="h-[30px] w-64 rounded-lg border border-zinc-200 bg-white pr-3 pl-7 text-sm font-medium text-zinc-900 shadow placeholder:text-zinc-400 hover:bg-zinc-100 focus:border-zinc-300 focus:outline-none"
                />
              </div>
              {/* Filter Button */}
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50">
                  <span>Filter</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cards Grid Section */}
        <div className="bg-white pb-42">
          <div className="mx-auto w-full max-w-[642px] py-6">
            {/* Cards Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredStrategists.map(strategist => (
                <StrategistCard
                  key={strategist.user.id}
                  strategist={strategist}
                  onClick={() => handleStrategistClick(strategist.user.id)}
                />
              ))}
            </div>

            {/* Empty State */}
            {filteredStrategists.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="mb-1 text-lg font-semibold text-zinc-800">No strategists found</p>
                <p className="text-sm text-zinc-400">
                  {searchQuery ? 'Try adjusting your search' : 'No strategists available'}
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
