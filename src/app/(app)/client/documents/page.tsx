'use client';

import { useAuth } from '@/contexts/auth/AuthStore';
import { getFullUserProfile } from '@/contexts/auth/data/mock-users';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import type { FullClientMock } from '@/lib/mocks/client-full';
import { FileIcon } from '@phosphor-icons/react';
import { EmptyDocumentsIllustration } from '@/components/ui/empty-documents-illustration';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // If today, show time
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // If yesterday
  if (diffDays === 1) {
    return 'Yesterday';
  }

  // If within a week
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  // Otherwise show date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function groupDocumentsByDate(
  documents: (typeof import('@/lib/mocks/client-full').fullClientMocks)[0]['documents']
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; documents: typeof documents }[] = [];

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

  if (todayDocs.length > 0) {
    groups.push({ label: 'Today', documents: todayDocs });
  }
  if (yesterdayDocs.length > 0) {
    groups.push({ label: 'Yesterday', documents: yesterdayDocs });
  }
  if (olderDocs.length > 0) {
    groups.push({ label: 'Earlier', documents: olderDocs });
  }

  return groups;
}

export default function ClientDocumentsPage() {
  useRoleRedirect('CLIENT');
  const user = useAuth(state => state.user);

  // Get the current client data from auth
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

  const clientProfile = getFullUserProfile(user) as FullClientMock | null;

  if (!clientProfile) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900">Profile not found</h1>
          <p className="text-zinc-500">Could not load your client profile.</p>
        </div>
      </div>
    );
  }

  const currentClient = clientProfile;

  return (
    <div className="bg-white pb-24">
      <div className="mx-auto flex w-full max-w-[642px] flex-col py-6">
        <h2 className="mb-6 text-2xl font-medium text-zinc-900">Documents</h2>
        
        {/* Empty State - No documents yet */}
        {currentClient.documents.filter(d => d.category !== 'contract').length === 0 && (
          <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center">
            <EmptyDocumentsIllustration />
            <p className="text-lg font-semibold text-zinc-800">No documents yet</p>
            <p className="text-sm text-zinc-400">Documents you upload will appear here</p>
          </div>
        )}

        {/* Documents List */}
        {currentClient.documents.filter(d => d.category !== 'contract').length > 0 && (
          <div>
            {groupDocumentsByDate(
              [...currentClient.documents]
                .filter(d => d.category !== 'contract')
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            ).map(group => (
              <div key={group.label} className="mb-6">
                {/* Date Group Label */}
                <p className="mb-3 text-sm font-medium text-zinc-400">{group.label}</p>

                {/* Document List */}
                <div className="flex flex-col">
                  {group.documents.map(doc => (
                    <div key={doc.id} className="group relative">
                      {/* Document Row */}
                      <div className="flex items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-zinc-50">
                        {/* Document Icon */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                          <FileIcon className="h-5 w-5 text-zinc-400" />
                        </div>

                        {/* Document Info */}
                        <div className="flex flex-1 flex-col">
                          <span className="font-medium text-zinc-900">
                            {doc.originalName.replace(/\.[^/.]+$/, '')}
                          </span>
                          <span className="text-sm text-zinc-500">Me</span>
                        </div>

                        {/* Timestamp */}
                        <span className="text-sm text-zinc-400">
                          {formatRelativeTime(doc.createdAt)}
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
