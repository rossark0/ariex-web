'use client';

import { useAuth } from '@/contexts/auth/AuthStore';
import { getFullUserProfile } from '@/contexts/auth/data/mock-users';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import type { FullStrategistMock, SignatureRequest } from '@/lib/mocks/strategist-full';
import { getFullClientById } from '@/lib/mocks/client-full';
import { EmptyDocumentsIllustration } from '@/components/ui/empty-documents-illustration';
import { AgreementCard } from '@/components/agreements/agreement-card';
import { useUiStore } from '@/contexts/ui/UiStore';
import { useState, useEffect } from 'react';
import type { SignatureStatus } from '@/types/document';

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

interface AgreementWithClient {
  id: string;
  documentName: string;
  clientName: string;
  clientId: string;
  status: SignatureStatus;
  createdAt: Date;
}

function mapSignatureRequestStatus(status: SignatureRequest['status']): SignatureStatus {
  switch (status) {
    case 'signed':
      return 'SIGNED';
    case 'sent':
    case 'viewed':
      return 'SENT';
    case 'declined':
      return 'DECLINED';
    case 'expired':
      return 'EXPIRED';
    default:
      return 'NOT_SENT';
  }
}

function groupAgreementsByDate(agreements: AgreementWithClient[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; agreements: AgreementWithClient[] }[] = [];

  const todayDocs = agreements.filter(d => {
    const docDate = new Date(d.createdAt);
    docDate.setHours(0, 0, 0, 0);
    return docDate.getTime() === today.getTime();
  });

  const yesterdayDocs = agreements.filter(d => {
    const docDate = new Date(d.createdAt);
    docDate.setHours(0, 0, 0, 0);
    return docDate.getTime() === yesterday.getTime();
  });

  const olderDocs = agreements.filter(d => {
    const docDate = new Date(d.createdAt);
    docDate.setHours(0, 0, 0, 0);
    return docDate.getTime() < yesterday.getTime();
  });

  if (todayDocs.length > 0) {
    groups.push({ label: 'Today', agreements: todayDocs });
  }
  if (yesterdayDocs.length > 0) {
    groups.push({ label: 'Yesterday', agreements: yesterdayDocs });
  }
  if (olderDocs.length > 0) {
    groups.push({ label: 'Earlier', agreements: olderDocs });
  }

  return groups;
}

export default function StrategistAgreementsPage() {
  useRoleRedirect(['STRATEGIST', 'COMPLIANCE', 'ADMIN']);
  const { user } = useAuth();
  const [selectedAgreements, setSelectedAgreements] = useState<Set<string>>(new Set());
  const setSelection = useUiStore(state => state.setSelection);

  // Sync selection state with UiStore for global AI floating chatbot
  useEffect(() => {
    setSelection(selectedAgreements.size, () => setSelectedAgreements(new Set()));
    return () => setSelection(0, null);
  }, [selectedAgreements.size, setSelection]);

  const toggleAgreementSelection = (docId: string) => {
    setSelectedAgreements(prev => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  // Get the current strategist data from auth
  if (!user) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900">Not authenticated</h1>
          <p className="text-zinc-500">Please sign in to view your agreements.</p>
        </div>
      </div>
    );
  }

  const strategistProfile = getFullUserProfile(user) as FullStrategistMock | null;

  if (!strategistProfile) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900">Profile not found</h1>
          <p className="text-zinc-500">Could not load your strategist profile.</p>
        </div>
      </div>
    );
  }

  // Gather all agreements from signature requests
  const allAgreements: AgreementWithClient[] = strategistProfile.signatureRequests.map(req => ({
    id: req.id,
    documentName: req.documentName,
    clientName: req.clientName,
    clientId: req.clientId,
    status: mapSignatureRequestStatus(req.status),
    createdAt: req.createdAt,
  }));

  // Sort by date descending
  const sortedAgreements = allAgreements.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  return (
    <div className="bg-white pb-24">
      <div className="mx-auto flex w-full max-w-160.5 flex-col py-6">
        <h2 className="mb-6 text-2xl font-medium text-zinc-900">Agreements</h2>
        
        {/* Empty State - No agreements yet */}
        {sortedAgreements.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center">
            <EmptyDocumentsIllustration />
            <p className="text-lg font-semibold text-zinc-800">No agreements yet</p>
            <p className="text-sm text-zinc-400">Agreements will appear here when available</p>
          </div>
        )}

        {/* Agreements List */}
        {sortedAgreements.length > 0 && (
          <div>
            {groupAgreementsByDate(sortedAgreements).map(group => (
              <div key={group.label} className="mb-6">
                {/* Date Group Label */}
                <p className="mb-3 text-sm font-medium text-zinc-400">{group.label}</p>

                {/* Agreement List */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.agreements.map(agreement => (
                    <AgreementCard
                      key={agreement.id}
                      title={agreement.documentName}
                      category={agreement.clientName}
                      timestamp={formatRelativeTime(agreement.createdAt)}
                      status={agreement.status}
                      isSelected={selectedAgreements.has(agreement.id)}
                      onToggleSelection={() => toggleAgreementSelection(agreement.id)}
                    />
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
