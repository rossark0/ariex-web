'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth/AuthStore';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { getClientDocuments, type ClientDocument } from '@/lib/api/client.api';
import { FileIcon } from '@phosphor-icons/react';
import { EmptyDocumentsIllustration } from '@/components/ui/empty-documents-illustration';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Handle future dates
  if (diffDays < 0) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

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

function groupDocumentsByDate(documents: ClientDocument[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; documents: ClientDocument[] }[] = [];

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
      {/* <p className="mt-4 text-sm text-zinc-500">Loading documents...</p> */}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ClientDocumentsPage() {
  useRoleRedirect('CLIENT');
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);

  // Load documents from API
  useEffect(() => {
    async function loadData() {
      try {
        const docs = await getClientDocuments();
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

  // Filter out contract documents
  const filteredDocs = documents.filter(d => d.category !== 'contract');

  // Sort by date descending
  const sortedDocuments = [...filteredDocs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="bg-white pb-24">
      <div className="mx-auto flex w-full max-w-[642px] flex-col py-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-medium text-zinc-900">Documents</h2>
          {!isLoading && filteredDocs.length > 0 && (
            <p className="text-sm text-zinc-500">
              {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Loading State */}
        {isLoading && <LoadingState />}

        {/* Empty State */}
        {!isLoading && filteredDocs.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center">
            <EmptyDocumentsIllustration />
            <p className="text-lg font-semibold text-zinc-800">No documents yet</p>
            <p className="text-sm text-zinc-400">Documents you upload will appear here</p>
          </div>
        )}

        {/* Documents List */}
        {!isLoading && sortedDocuments.length > 0 && (
          <div>
            {groupDocumentsByDate(sortedDocuments).map(group => (
              <div key={group.label} className="mb-6">
                <p className="mb-3 text-sm font-medium text-zinc-400">{group.label}</p>
                <div className="flex flex-col">
                  {group.documents.map(doc => (
                    <div key={doc.id} className="group relative">
                      <div className="flex items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-zinc-50">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                          <FileIcon className="h-5 w-5 text-zinc-400" />
                        </div>
                        <div className="flex flex-1 flex-col">
                          <span className="font-medium text-zinc-900">
                            {(doc.name || 'Untitled Document').replace(/\.[^/.]+$/, '')}
                          </span>
                          <span className="text-sm text-zinc-500">{doc.type || 'Document'}</span>
                        </div>
                        <span className="text-sm text-zinc-400">
                          {formatRelativeTime(new Date(doc.createdAt))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
