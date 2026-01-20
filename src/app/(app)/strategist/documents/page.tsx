'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth/AuthStore';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { listDocuments, type ApiDocument } from '@/lib/api/strategist.api';
import { FileIcon, Check as CheckIcon } from '@phosphor-icons/react';
import { EmptyDocumentsIllustration } from '@/components/ui/empty-documents-illustration';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/contexts/ui/UiStore';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupDocumentsByDate(documents: ApiDocument[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; documents: ApiDocument[] }[] = [];

  const todayDocs = documents.filter(d => {
    const docDate = new Date(d.createdAt);
    docDate.setHours(0, 0, 0, 0);
    return docDate.getTime() === today.getTime();
  });

  const yesterdayDocs = documents.filter(d => {
    const docDate = new Date(d.createdAt);
    docDate.setHours(0, 0, 0, 0);
    return docDate.getTime() === yesterday.getTime();
  });

  const olderDocs = documents.filter(d => {
    const docDate = new Date(d.createdAt);
    docDate.setHours(0, 0, 0, 0);
    return docDate.getTime() < yesterday.getTime();
  });

  if (todayDocs.length > 0) groups.push({ label: 'Today', documents: todayDocs });
  if (yesterdayDocs.length > 0) groups.push({ label: 'Yesterday', documents: yesterdayDocs });
  if (olderDocs.length > 0) groups.push({ label: 'Earlier', documents: olderDocs });

  return groups;
}

// ============================================================================
// LOADING STATE
// ============================================================================

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
      <p className="mt-4 text-sm text-zinc-500">Loading documents...</p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StrategistDocumentsPage() {
  useRoleRedirect(['STRATEGIST', 'COMPLIANCE', 'ADMIN']);
  const { user } = useAuth();
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const { setSelection } = useUiStore();
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<ApiDocument[]>([]);

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  // Sync selection state with UI store
  useEffect(() => {
    setSelection(selectedDocs.size, () => setSelectedDocs(new Set()));
  }, [selectedDocs.size, setSelection]);

  // Load documents from API
  useEffect(() => {
    async function loadData() {
      try {
        const docs = await listDocuments();
        setDocuments(docs);
      } catch (error) {
        console.error('Failed to load documents:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (!user) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900">Not authenticated</h1>
          <p className="text-zinc-500">Please sign in to view your documents.</p>
        </div>
      </div>
    );
  }

  // Sort by date descending
  const sortedDocuments = [...documents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="bg-white pb-24">
      <div className="mx-auto flex w-full max-w-160.5 flex-col py-6">
        {/* Header */}
        <div className="mb-6 flex w-full items-center justify-between">
          <div>
            <h2 className="text-2xl font-medium text-zinc-900">Documents</h2>
            <p className="text-sm text-zinc-500">
              {documents.length > 0
                ? `${documents.length} document${documents.length !== 1 ? 's' : ''}`
                : 'Manage your documents'}
            </p>
          </div>
          <Button variant="outline" size="sm">
            Add Document
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && <LoadingState />}

        {/* Empty State */}
        {!isLoading && documents.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center">
            <EmptyDocumentsIllustration />
            <p className="text-lg font-semibold text-zinc-800">No documents yet</p>
            <p className="text-sm text-zinc-400">Documents will appear here as they're added</p>
          </div>
        )}

        {/* Documents List */}
        {!isLoading && sortedDocuments.length > 0 && (
          <div>
            {groupDocumentsByDate(sortedDocuments).map(group => (
              <div key={group.label} className="mb-6">
                <p className="mb-3 text-sm font-medium text-zinc-400">{group.label}</p>
                <div className="flex flex-col">
                  {group.documents.map(doc => {
                    const isSelected = selectedDocs.has(doc.id);
                    return (
                      <div key={doc.id} className="group relative">
                        <div
                          className={`pointer-events-none absolute top-1/2 -left-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center transition-opacity ${
                            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          {isSelected ? (
                            <div className="flex h-4 w-4 items-center justify-center rounded bg-teal-600">
                              <CheckIcon weight="bold" className="h-3 w-3 text-white" />
                            </div>
                          ) : (
                            <div className="h-4 w-4 rounded border-2 border-zinc-300 bg-white transition-colors group-hover:border-teal-400" />
                          )}
                        </div>

                        <div
                          onClick={() => toggleDocSelection(doc.id)}
                          className={`flex cursor-pointer items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-zinc-50 ${
                            isSelected ? 'bg-zinc-50' : ''
                          }`}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                            <FileIcon className="h-5 w-5 text-zinc-400" />
                          </div>
                          <div className="flex flex-1 flex-col">
                            <span className="font-medium text-zinc-900">{doc.name}</span>
                            <span className="text-sm text-zinc-500">{doc.type || 'Document'}</span>
                          </div>
                          <span className="text-sm text-zinc-400">
                            {formatRelativeTime(new Date(doc.createdAt))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
