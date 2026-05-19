'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/auth/AuthStore';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import {
  listDocuments,
  listClients,
  listAgreements,
  type ApiDocument,
  type ApiClient,
  type ApiAgreement,
} from '@/lib/api/strategist.api';
import {
  FileText,
  MagnifyingGlass,
  FunnelSimple,
  X,
  CaretDown,
  Check,
  CalendarBlank,
  ArrowUp,
  ArrowDown,
} from '@phosphor-icons/react';
import { EmptyDocumentsIllustration } from '@/components/ui/empty-documents-illustration';

// ============================================================================
// TYPES
// ============================================================================

type SortField = 'name' | 'type' | 'status' | 'client' | 'date';
type SortDirection = 'asc' | 'desc';

interface DocumentWithClient extends ApiDocument {
  clientName: string | null;
  clientEmail: string;
  clientId: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string | null | undefined): string {
  const colors = [
    'bg-amber-500/15 text-amber-300',
    'bg-emerald-500/15 text-emerald-300',
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
    'bg-orange-100 text-orange-700',
    'bg-teal-500/15 text-teal-300',
  ];
  if (!name) return colors[0];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusStyle(status: string): { bg: string; text: string; dot: string } {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
    case 'SIGNED':
      return { bg: 'bg-emerald-500/15', text: 'text-emerald-300', dot: 'bg-emerald-500' };
    case 'PENDING':
    case 'PROCESSING':
      return { bg: 'bg-amber-500/10', text: 'text-amber-300', dot: 'bg-amber-500' };
    case 'FAILED':
    case 'DECLINED':
    case 'EXPIRED':
      return { bg: 'bg-red-500/10', text: 'text-red-300', dot: 'bg-red-500' };
    default:
      return { bg: 'bg-surface', text: 'text-steel-gray', dot: 'bg-white/20' };
  }
}

function getDocumentTypeLabel(type: string | undefined): string {
  if (!type) return 'Document';
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

// ============================================================================
// FILTER CHIP COMPONENT
// ============================================================================

function FilterChip({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-surface px-2.5 py-1.5 text-sm">
      <CalendarBlank className="h-3.5 w-3.5 text-steel-gray" weight="bold" />
      <span className="font-medium text-soft-white">{label}</span>
      <span className="text-steel-gray/60">{value}</span>
      <button
        onClick={onRemove}
        className="ml-0.5 rounded p-0.5 text-steel-gray/60 hover:bg-white/12 hover:text-steel-gray"
      >
        <X className="h-3 w-3" weight="bold" />
      </button>
    </div>
  );
}

// ============================================================================
// CLIENT FILTER DROPDOWN
// ============================================================================

function ClientFilterDropdown({
  clients,
  selectedClientIds,
  onToggle,
}: {
  clients: ApiClient[];
  selectedClientIds: Set<string>;
  onToggle: (clientId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = clients.filter(c => {
    const term = search.toLowerCase();
    return (
      (c.name?.toLowerCase().includes(term) ?? false) ||
      c.email.toLowerCase().includes(term)
    );
  });

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md border border-dashed border-white/15 px-2.5 py-1.5 text-sm text-steel-gray transition-colors hover:border-white/25 hover:bg-surface"
      >
        <FunnelSimple className="h-3.5 w-3.5" weight="bold" />
        <span>Client</span>
        {selectedClientIds.size > 0 && (
          <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-electric-blue px-1 text-[10px] font-semibold text-white">
            {selectedClientIds.size}
          </span>
        )}
        <CaretDown className="h-3 w-3" weight="bold" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1.5 w-64 overflow-hidden rounded-lg border border-white/10 bg-deep-navy shadow-lg">
          <div className="border-b border-white/6 p-2">
            <div className="flex items-center gap-2 rounded-md bg-surface px-2.5 py-1.5">
              <MagnifyingGlass className="h-3.5 w-3.5 text-steel-gray/60" />
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-soft-white placeholder:text-steel-gray/60 focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-steel-gray/60">
                No clients found
              </div>
            ) : (
              filtered.map(client => {
                const isSelected = selectedClientIds.has(client.id);
                return (
                  <button
                    key={client.id}
                    onClick={() => onToggle(client.id)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-surface"
                  >
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${getAvatarColor(client.name)}`}
                    >
                      {getInitials(client.name)}
                    </div>
                    <span className="flex-1 truncate text-sm text-soft-white">
                      {client.name || client.email}
                    </span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-soft-white" weight="bold" />
                    )}
                  </button>
                );
              })
            )}
          </div>
          {selectedClientIds.size > 0 && (
            <div className="border-t border-white/6 p-1.5">
              <button
                onClick={() => {
                  selectedClientIds.forEach(id => onToggle(id));
                }}
                className="w-full rounded-md px-2.5 py-1.5 text-center text-xs font-medium text-steel-gray transition-colors hover:bg-surface hover:text-soft-white"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STATUS FILTER DROPDOWN
// ============================================================================

const DOCUMENT_STATUSES = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'SIGNED',
  'DECLINED',
  'EXPIRED',
];

function StatusFilterDropdown({
  selectedStatuses,
  onToggle,
}: {
  selectedStatuses: Set<string>;
  onToggle: (status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md border border-dashed border-white/15 px-2.5 py-1.5 text-sm text-steel-gray transition-colors hover:border-white/25 hover:bg-surface"
      >
        <FunnelSimple className="h-3.5 w-3.5" weight="bold" />
        <span>Status</span>
        {selectedStatuses.size > 0 && (
          <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-electric-blue px-1 text-[10px] font-semibold text-white">
            {selectedStatuses.size}
          </span>
        )}
        <CaretDown className="h-3 w-3" weight="bold" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1.5 w-48 overflow-hidden rounded-lg border border-white/10 bg-deep-navy shadow-lg">
          <div className="max-h-56 overflow-y-auto p-1">
            {DOCUMENT_STATUSES.map(status => {
              const isSelected = selectedStatuses.has(status);
              const style = getStatusStyle(status);
              return (
                <button
                  key={status}
                  onClick={() => onToggle(status)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-surface"
                >
                  <div className={`h-2 w-2 rounded-full ${style.dot}`} />
                  <span className="flex-1 text-sm capitalize text-soft-white">
                    {status.toLowerCase()}
                  </span>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-soft-white" weight="bold" />
                  )}
                </button>
              );
            })}
          </div>
          {selectedStatuses.size > 0 && (
            <div className="border-t border-white/6 p-1.5">
              <button
                onClick={() => {
                  selectedStatuses.forEach(s => onToggle(s));
                }}
                className="w-full rounded-md px-2.5 py-1.5 text-center text-xs font-medium text-steel-gray transition-colors hover:bg-surface hover:text-soft-white"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SORTABLE COLUMN HEADER
// ============================================================================

function SortableHeader({
  label,
  field,
  currentSort,
  currentDirection,
  onSort,
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentSort === field;

  return (
    <button
      onClick={() => onSort(field)}
      className="group/sort flex items-center gap-1 text-left"
    >
      <span>{label}</span>
      <span
        className={`transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover/sort:opacity-50'}`}
      >
        {isActive && currentDirection === 'desc' ? (
          <ArrowDown className="h-3 w-3" weight="bold" />
        ) : (
          <ArrowUp className="h-3 w-3" weight="bold" />
        )}
      </span>
    </button>
  );
}

// ============================================================================
// LOADING STATE
// ============================================================================

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StrategistDocumentsPage() {
  useRoleRedirect(['STRATEGIST', 'COMPLIANCE', 'ADMIN']);
  const { user } = useAuth();

  // Data state
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [clients, setClients] = useState<ApiClient[]>([]);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());

  // Sort state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Selection state
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  // Map: documentId -> clientId (built during loading)
  const [docClientMap, setDocClientMap] = useState<Map<string, string>>(new Map());

  // Load data: fetch documents, clients, and agreements in parallel,
  // then build document-to-client mapping through agreements
  useEffect(() => {
    async function loadData() {
      try {
        const [docs, clientsList, agreements] = await Promise.all([
          listDocuments(),
          listClients(),
          listAgreements(),
        ]);

        setDocuments(docs);
        setClients(clientsList);

        // Build document → client mapping from agreements
        // Two maps: one by document ID, one by todo ID (since doc.todoId links to todo.id)
        const docIdToClient = new Map<string, string>();
        const todoIdToClient = new Map<string, string>();

        for (const agreement of agreements) {
          const clientId = agreement.clientId;

          // Map contract document to client
          if (agreement.contractDocumentId) {
            docIdToClient.set(agreement.contractDocumentId, clientId);
          }

          // Map todo documents and todo IDs to client
          if (agreement.todoLists) {
            for (const todoList of agreement.todoLists) {
              const todoClientId = todoList.assignedToId || clientId;

              if (todoList.todos) {
                for (const todo of todoList.todos) {
                  // Map todo ID → client (documents link back via doc.todoId)
                  todoIdToClient.set(todo.id, todoClientId);

                  // Also map document ID if available
                  if (todo.document?.id) {
                    docIdToClient.set(todo.document.id, todoClientId);
                  }
                }
              }
            }
          }
        }

        // Merge both maps: for each document, resolve client via doc.id or doc.todoId
        const finalMapping = new Map<string, string>();
        for (const doc of docs) {
          const byDocId = docIdToClient.get(doc.id);
          const byTodoId = doc.todoId ? todoIdToClient.get(doc.todoId) : undefined;
          const resolved = byDocId || byTodoId;
          if (resolved) {
            finalMapping.set(doc.id, resolved);
          }
        }

        setDocClientMap(finalMapping);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Build client map
  const clientMap = useMemo(() => {
    const map = new Map<string, ApiClient>();
    clients.forEach(c => map.set(c.id, c));
    return map;
  }, [clients]);

  // Enrich documents with client data
  const enrichedDocuments: DocumentWithClient[] = useMemo(() => {
    return documents.map(doc => {
      const mappedClientId = docClientMap.get(doc.id);
      const client = mappedClientId ? clientMap.get(mappedClientId) : undefined;
      return {
        ...doc,
        clientName: client?.name ?? null,
        clientEmail: client?.email ?? '',
        clientId: mappedClientId ?? '',
      };
    });
  }, [documents, clientMap, docClientMap]);

  // Filter & sort
  const filteredDocuments = useMemo(() => {
    let result = [...enrichedDocuments];

    // Search filter
    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      result = result.filter(
        doc =>
          doc.name?.toLowerCase().includes(term) ||
          doc.type?.toLowerCase().includes(term) ||
          doc.clientName?.toLowerCase().includes(term) ||
          doc.clientEmail?.toLowerCase().includes(term)
      );
    }

    // Client filter
    if (selectedClientIds.size > 0) {
      result = result.filter(doc => selectedClientIds.has(doc.clientId));
    }

    // Status filter
    if (selectedStatuses.size > 0) {
      result = result.filter(doc => {
        const status = (doc.status || doc.signatureStatus || '').toUpperCase();
        return selectedStatuses.has(status);
      });
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = (a.name || '').localeCompare(b.name || '');
          break;
        case 'type':
          cmp = (a.type || '').localeCompare(b.type || '');
          break;
        case 'status':
          cmp = (a.status || '').localeCompare(b.status || '');
          break;
        case 'client':
          cmp = (a.clientName || a.clientEmail || '').localeCompare(
            b.clientName || b.clientEmail || ''
          );
          break;
        case 'date':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [enrichedDocuments, searchQuery, selectedClientIds, selectedStatuses, sortField, sortDirection]);

  // Handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleClientFilter = (clientId: string) => {
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const toggleStatusFilter = (status: string) => {
    setSelectedStatuses(prev => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedDocs.size === filteredDocuments.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filteredDocuments.map(d => d.id)));
    }
  };

  const hasActiveFilters = selectedClientIds.size > 0 || selectedStatuses.size > 0;

  if (!user) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-soft-white">Not authenticated</h1>
          <p className="text-steel-gray">Please sign in to view documents.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-deep-navy pb-24">
      <div className="mx-auto flex w-full max-w-2xl flex-col py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-soft-white">Documents</h2>
            <p className="mt-0.5 text-sm text-steel-gray">
              {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
              {hasActiveFilters ? ' (filtered)' : ''}
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {/* Active filter chips */}
          {Array.from(selectedClientIds).map(clientId => {
            const client = clientMap.get(clientId);
            return (
              <FilterChip
                key={`client-${clientId}`}
                label="Client"
                value={client?.name || client?.email || clientId}
                onRemove={() => toggleClientFilter(clientId)}
              />
            );
          })}

          {Array.from(selectedStatuses).map(status => (
            <FilterChip
              key={`status-${status}`}
              label="Status"
              value={status.toLowerCase()}
              onRemove={() => toggleStatusFilter(status)}
            />
          ))}

          {/* Filter dropdowns */}
          <ClientFilterDropdown
            clients={clients}
            selectedClientIds={selectedClientIds}
            onToggle={toggleClientFilter}
          />
          <StatusFilterDropdown
            selectedStatuses={selectedStatuses}
            onToggle={toggleStatusFilter}
          />

          {/* Search on the right */}
          <div className="ml-auto flex items-center gap-2 rounded-md border border-white/10 bg-deep-navy px-2.5 py-1.5">
            <MagnifyingGlass className="h-3.5 w-3.5 text-steel-gray/60" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-48 bg-transparent text-sm text-soft-white placeholder:text-steel-gray/60 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-steel-gray/60 hover:text-steel-gray"
              >
                <X className="h-3 w-3" weight="bold" />
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {isLoading && <LoadingState />}

        {/* Empty State */}
        {!isLoading && filteredDocuments.length === 0 && documents.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center">
            <EmptyDocumentsIllustration />
            <p className="text-lg font-semibold text-soft-white">No documents yet</p>
            <p className="text-sm text-steel-gray/60">
              Documents will appear here as they&apos;re added
            </p>
          </div>
        )}

        {/* No results from filter */}
        {!isLoading && filteredDocuments.length === 0 && documents.length > 0 && (
          <div className="flex flex-col items-center justify-center pt-16 pb-12 text-center">
            <MagnifyingGlass className="mb-3 h-10 w-10 text-steel-gray/40" />
            <p className="text-lg font-semibold text-soft-white">No matching documents</p>
            <p className="text-sm text-steel-gray/60">
              Try adjusting your filters or search query
            </p>
          </div>
        )}

        {/* Table */}
        {!isLoading && filteredDocuments.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-white/10">
            <table className="w-full">
              {/* Table Header */}
              <thead>
                <tr className="border-b border-white/6 bg-surface/60">
                  <th className="w-11 px-3 py-3">
                    <button
                      onClick={toggleSelectAll}
                      className={`flex h-4.5 w-4.5 items-center justify-center rounded border transition-colors ${
                        selectedDocs.size === filteredDocuments.length && filteredDocuments.length > 0
                          ? 'border-electric-blue bg-electric-blue'
                          : 'border-white/15 bg-deep-navy hover:border-white/25'
                      }`}
                    >
                      {selectedDocs.size === filteredDocuments.length && filteredDocuments.length > 0 && (
                        <Check className="h-3 w-3 text-white" weight="bold" />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold tracking-wide text-steel-gray uppercase">
                    <SortableHeader
                      label="Document"
                      field="name"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold tracking-wide text-steel-gray uppercase">
                    <SortableHeader
                      label="Type"
                      field="type"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold tracking-wide text-steel-gray uppercase">
                    <SortableHeader
                      label="Status"
                      field="status"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold tracking-wide text-steel-gray uppercase">
                    <SortableHeader
                      label="Client"
                      field="client"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold tracking-wide text-steel-gray uppercase">
                    <SortableHeader
                      label="Date"
                      field="date"
                      currentSort={sortField}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-zinc-100">
                {filteredDocuments.map(doc => {
                  const isSelected = selectedDocs.has(doc.id);
                  const statusStyle = getStatusStyle(doc.status || doc.signatureStatus || '');

                  return (
                    <tr
                      key={doc.id}
                      className={`group transition-colors ${
                        isSelected ? 'bg-surface' : 'hover:bg-surface/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="w-11 px-3 py-3">
                        <button
                          onClick={() => toggleDocSelection(doc.id)}
                          className={`flex h-4.5 w-4.5 items-center justify-center rounded border transition-colors ${
                            isSelected
                              ? 'border-electric-blue bg-electric-blue'
                              : 'border-white/15 bg-deep-navy hover:border-white/25'
                          }`}
                        >
                          {isSelected && (
                            <Check className="h-3 w-3 text-white" weight="bold" />
                          )}
                        </button>
                      </td>

                      {/* Document name */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/8">
                            <FileText className="h-4 w-4 text-steel-gray/60" />
                          </div>
                          <span className="max-w-50 truncate text-sm font-medium text-soft-white">
                            {doc.name || 'Untitled'}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-3 py-3">
                        <span className="text-sm text-steel-gray">
                          {getDocumentTypeLabel(doc.type)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                          <span className={`text-sm capitalize ${statusStyle.text}`}>
                            {(doc.status || doc.signatureStatus || 'unknown').toLowerCase()}
                          </span>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${getAvatarColor(doc.clientName)}`}
                          >
                            {getInitials(doc.clientName || doc.clientEmail)}
                          </div>
                          <span className="max-w-35 truncate text-sm text-soft-white">
                            {doc.clientName || doc.clientEmail || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-3 py-3">
                        <span className="text-sm text-steel-gray">
                          {formatDate(doc.createdAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
