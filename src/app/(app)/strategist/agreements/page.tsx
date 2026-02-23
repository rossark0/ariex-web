'use client';

import { useAuth } from '@/contexts/auth/AuthStore';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { EmptyDocumentsIllustration } from '@/components/ui/empty-documents-illustration';
import { AgreementCard } from '@/components/agreements/agreement-card';
import { useUiStore } from '@/contexts/ui/UiStore';
import { useState, useEffect } from 'react';
import type { SignatureStatus } from '@/types/document';
import { listAgreements, type ApiAgreement } from '@/lib/api/strategist.api';
import { AgreementStatus } from '@/types/agreement';

// ============================================================================
// TYPES
// ============================================================================

interface Agreement {
  id: string;
  documentName: string;
  status: SignatureStatus;
  agreementStatus: AgreementStatus;
  clientId: string;
  createdAt: Date;
}

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

function mapAgreementStatusToSignatureStatus(
  status: AgreementStatus,
  signedStatus?: 'WAITING_SIGNED' | 'SIGNED'
): SignatureStatus {
  // If we have contract document info, use that
  if (signedStatus === 'SIGNED') return 'SIGNED';
  
  // Map agreement status to signature status
  switch (status) {
    case AgreementStatus.COMPLETED:
      return 'SIGNED';
    case AgreementStatus.PENDING_SIGNATURE:
      return 'SENT';
    case AgreementStatus.CANCELLED:
      return 'DECLINED';
    case AgreementStatus.DRAFT:
    default:
      return 'NOT_SENT';
  }
}

function groupAgreementsByDate(agreements: Agreement[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; agreements: Agreement[] }[] = [];

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

  if (todayDocs.length > 0) groups.push({ label: 'Today', agreements: todayDocs });
  if (yesterdayDocs.length > 0) groups.push({ label: 'Yesterday', agreements: yesterdayDocs });
  if (olderDocs.length > 0) groups.push({ label: 'Earlier', agreements: olderDocs });

  return groups;
}

// ============================================================================
// LOADING STATE
// ============================================================================

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
      <p className="mt-4 text-sm text-zinc-500">Loading agreements...</p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StrategistAgreementsPage() {
  useRoleRedirect(['STRATEGIST', 'COMPLIANCE', 'ADMIN']);
  const { user } = useAuth();
  const [selectedAgreements, setSelectedAgreements] = useState<Set<string>>(new Set());
  const setSelection = useUiStore(state => state.setSelection);
  const [isLoading, setIsLoading] = useState(true);
  const [agreements, setAgreements] = useState<Agreement[]>([]);

  // Sync selection state with UiStore
  useEffect(() => {
    setSelection(selectedAgreements.size, () => setSelectedAgreements(new Set()));
    return () => setSelection(0, null);
  }, [selectedAgreements.size, setSelection]);

  // Load agreements from API
  useEffect(() => {
    async function loadData() {
      try {
        const apiAgreements = await listAgreements();
        
        // Map API agreements to local Agreement interface
        const mappedAgreements = apiAgreements.map(a => ({
          id: a.id,
          documentName: a.name || a.title || 'Untitled Agreement',
          status: mapAgreementStatusToSignatureStatus(
            a.status,
            a.contractDocument?.signedStatus
          ),
          agreementStatus: a.status,
          clientId: a.clientId,
          createdAt: new Date(a.createdAt),
        }));
        
        setAgreements(mappedAgreements);
      } catch (error) {
        console.error('Failed to load agreements:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

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

  const sortedAgreements = [...agreements].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  return (
    <div className="bg-white pb-24">
      <div className="mx-auto flex w-full max-w-160.5 flex-col py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-medium text-zinc-900">Agreements</h2>
          <p className="text-sm text-zinc-500">
            {agreements.length > 0
              ? `${agreements.length} agreement${agreements.length !== 1 ? 's' : ''}`
              : 'Manage your client agreements'}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && <LoadingState />}

        {/* Empty State */}
        {!isLoading && agreements.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center">
            <EmptyDocumentsIllustration />
            <p className="text-lg font-semibold text-zinc-800">No agreements yet</p>
            <p className="text-sm text-zinc-400">Agreements will appear here when created</p>
          </div>
        )}

        {/* Agreements List */}
        {!isLoading && sortedAgreements.length > 0 && (
          <div>
            {groupAgreementsByDate(sortedAgreements).map(group => (
              <div key={group.label} className="mb-6">
                <p className="mb-3 text-sm font-medium text-zinc-400">{group.label}</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.agreements.map(agreement => (
                    <AgreementCard
                      key={agreement.id}
                      title={agreement.documentName}
                      category="Agreement"
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
