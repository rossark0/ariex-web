'use client';

import { useEffect, useRef, useState } from 'react';
import { CaretDown, MagnifyingGlass, SpinnerGap, User, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { listClients, type ApiClient } from '@/lib/api/strategist.api';

interface ScenarioClientPickerProps {
  selectedClientId: string | undefined;
  onSelect: (clientId: string | undefined, clientName: string | undefined) => void;
}

// Module-level cache so multiple picker instances share one fetch within the
// same page lifecycle. Refreshes when the page reloads.
let cachedClients: ApiClient[] | null = null;
let inflight: Promise<ApiClient[]> | null = null;

async function loadStrategistClients(force = false): Promise<ApiClient[]> {
  if (!force && cachedClients) return cachedClients;
  if (!force && inflight) return inflight;
  inflight = listClients()
    .then(list => {
      cachedClients = list;
      return list;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * Compact strategist↔client picker shown in the scenario workspace header.
 * Lets the strategist tag a scenario with the client it's being built for.
 *
 * Uses a plain async fetch (the existing listClients server action). The
 * earlier react-query implementation failed silently on some setups; a
 * direct call mirrors the pattern already proven in /strategist/clients.
 */
export function ScenarioClientPicker({ selectedClientId, onSelect }: ScenarioClientPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<ApiClient[] | null>(cachedClients);
  const [isLoading, setIsLoading] = useState(cachedClients === null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    if (cachedClients) {
      setClients(cachedClients);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    loadStrategistClients()
      .then(list => {
        if (cancelled) return;
        setClients(list);
        setIsLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[ClientPicker] Failed to load clients:', err);
        setError(err instanceof Error ? err.message : 'Failed to load clients');
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectedClient = clients?.find(c => c.id === selectedClientId);
  const filtered = clients?.filter(c => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          'flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors duration-150 ease-linear',
          selectedClient
            ? 'border-electric-blue/40 bg-electric-blue/10 text-electric-blue hover:bg-electric-blue/15'
            : 'border-white/10 bg-deep-navy text-steel-gray hover:bg-white/5'
        )}
      >
        <User weight="fill" className="h-3 w-3" />
        <span className="max-w-[180px] truncate">
          {selectedClient ? selectedClient.name || selectedClient.email : 'Link to client'}
        </span>
        <CaretDown
          weight="bold"
          className={cn(
            'h-3 w-3 transition-transform duration-150 ease-linear',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-40 mt-1 w-72 overflow-hidden rounded-lg border border-white/10 bg-deep-navy shadow-xl">
          <div className="border-b border-white/8 p-2">
            <div className="relative">
              <MagnifyingGlass
                weight="bold"
                className="absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-steel-gray"
              />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search clients..."
                className="w-full rounded-md border border-white/10 bg-deep-navy py-1 pr-2 pl-7 text-xs text-soft-white placeholder:text-steel-gray/60 focus:border-electric-blue focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {selectedClient && (
              <button
                type="button"
                onClick={() => {
                  onSelect(undefined, undefined);
                  setOpen(false);
                  setQuery('');
                }}
                className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-steel-gray transition-colors duration-150 ease-linear hover:bg-white/5 hover:text-soft-white"
              >
                <X weight="bold" className="h-3 w-3" />
                Unlink client
              </button>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center gap-1.5 px-3 py-4 text-xs text-steel-gray">
                <SpinnerGap weight="bold" className="h-3 w-3 animate-spin" />
                Loading clients…
              </div>
            ) : error ? (
              <div className="px-3 py-3 text-center text-xs text-red-300">
                {error}
              </div>
            ) : (clients?.length ?? 0) === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-steel-gray">
                No clients yet. Invite one from /strategist/clients.
              </div>
            ) : filtered?.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-steel-gray">No matches</div>
            ) : (
              filtered?.map(client => {
                const active = client.id === selectedClientId;
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      onSelect(client.id, client.name || client.email);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs transition-colors duration-150 ease-linear',
                      active
                        ? 'bg-electric-blue/10 text-electric-blue'
                        : 'text-soft-white hover:bg-white/5'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{client.name || client.email}</p>
                      {client.name && (
                        <p className="truncate text-[10px] text-steel-gray">{client.email}</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
