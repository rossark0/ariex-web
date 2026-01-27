'use client';

import { useAuth } from '@/contexts/auth/AuthStore';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { FileIcon, SpinnerGap, PenNib, CheckCircle, Clock, Warning } from '@phosphor-icons/react';
import { EmptyDocumentsIllustration } from '@/components/ui/empty-documents-illustration';
import { Badge } from '@/components/ui/badge';
import { useUiStore } from '@/contexts/ui/UiStore';
import { useState, useEffect } from 'react';
import { getClientAgreements, type ClientAgreement } from '@/lib/api/client.api';
import { AgreementStatus, isAgreementSigned } from '@/types/agreement';

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

export default function ClientAgreementsPage() {
  useRoleRedirect('CLIENT');
  const { user } = useAuth();
  const [agreements, setAgreements] = useState<ClientAgreement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const setSelection = useUiStore(state => state.setSelection);

  // Load agreements from API
  useEffect(() => {
    async function loadAgreements() {
      setIsLoading(true);
      try {
        const data = await getClientAgreements();
        setAgreements(data);
      } catch (error) {
        console.error('Failed to load agreements:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadAgreements();
  }, []);

  // Get the current client data from auth
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

  // Group agreements by status for display
  const pendingAgreements = agreements.filter(a => a.status === AgreementStatus.PENDING_SIGNATURE);
  const signedAgreements = agreements.filter(a => isAgreementSigned(a.status));
  const otherAgreements = agreements.filter(a => a.status === AgreementStatus.DRAFT || a.status === AgreementStatus.CANCELLED);

  return (
    <div className="bg-white pb-24">
      <div className="mx-auto flex w-full max-w-[642px] flex-col py-6">
        <h2 className="mb-6 text-2xl font-medium text-zinc-900">Agreements</h2>
        
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24">
            <SpinnerGap className="h-8 w-8 animate-spin text-zinc-400" />
            <p className="mt-4 text-sm text-zinc-500">Loading agreements...</p>
          </div>
        )}

        {/* Empty State - No agreements yet */}
        {!isLoading && agreements.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center">
            <EmptyDocumentsIllustration />
            <p className="text-lg font-semibold text-zinc-800">No agreements yet</p>
            <p className="text-sm text-zinc-400">Agreements will appear here when your strategist sends them</p>
          </div>
        )}

        {/* Pending Agreements - Action Required */}
        {!isLoading && pendingAgreements.length > 0 && (
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" weight="fill" />
              <h3 className="text-sm font-semibold text-zinc-700">Action Required</h3>
              <Badge variant="warning" className="text-xs">{pendingAgreements.length}</Badge>
            </div>
            <div className="flex flex-col gap-4">
              {pendingAgreements.map(agreement => (
                <AgreementItem 
                  key={agreement.id} 
                  agreement={agreement} 
                />
              ))}
            </div>
          </div>
        )}

        {/* Signed Agreements */}
        {!isLoading && signedAgreements.length > 0 && (
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" weight="fill" />
              <h3 className="text-sm font-semibold text-zinc-700">Signed</h3>
            </div>
            <div className="flex flex-col gap-4">
              {signedAgreements.map(agreement => (
                <AgreementItem 
                  key={agreement.id} 
                  agreement={agreement} 
                />
              ))}
            </div>
          </div>
        )}

        {/* Other Agreements (draft, expired, cancelled) */}
        {!isLoading && otherAgreements.length > 0 && (
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <FileIcon className="h-5 w-5 text-zinc-400" weight="fill" />
              <h3 className="text-sm font-semibold text-zinc-700">Other</h3>
            </div>
            <div className="flex flex-col gap-4">
              {otherAgreements.map(agreement => (
                <AgreementItem 
                  key={agreement.id} 
                  agreement={agreement} 
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Agreement Item Component
// ============================================================================

function AgreementItem({ agreement }: { agreement: ClientAgreement }) {
  const statusConfig: Record<string, { label: string; badge: 'success' | 'warning' | 'destructive' | 'default'; icon: typeof CheckCircle }> = {
    signed: { label: 'Signed', badge: 'success', icon: CheckCircle },
    completed: { label: 'Completed', badge: 'success', icon: CheckCircle },
    pending: { label: 'Pending Signature', badge: 'warning', icon: Clock },
    sent: { label: 'Pending Signature', badge: 'warning', icon: Clock },
    draft: { label: 'Draft', badge: 'default', icon: FileIcon },
    expired: { label: 'Expired', badge: 'destructive', icon: Warning },
    declined: { label: 'Declined', badge: 'destructive', icon: Warning },
    cancelled: { label: 'Cancelled', badge: 'default', icon: Warning },
  };

  const config = statusConfig[agreement.status] || statusConfig.draft;
  const StatusIcon = config.icon;

  const handleSign = () => {
    // If there's a ceremony URL, open it
    if (agreement.signatureCeremonyUrl) {
      window.open(agreement.signatureCeremonyUrl, '_blank');
    } else {
      console.log('[AgreementItem] No ceremony URL available for agreement:', agreement.id);
      alert('Signing link not available yet. Please check back shortly or contact your strategist.');
    }
  };

  // Check if this agreement needs signing
  const needsSignature = agreement.status === AgreementStatus.PENDING_SIGNATURE;
  const hasCeremonyUrl = !!agreement.signatureCeremonyUrl;

  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
          <FileIcon className="h-5 w-5 text-zinc-500" weight="fill" />
        </div>
        <div className="flex flex-col">
          <h4 className="font-medium text-zinc-900">{agreement.title}</h4>
          {agreement.description && (
            <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{agreement.description}</p>
          )}
          {agreement.price && (
            <p className="mt-1 text-sm font-medium text-zinc-700">
              ${typeof agreement.price === 'string' ? parseFloat(agreement.price).toLocaleString() : agreement.price.toLocaleString()}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={config.badge} className="text-xs">
              {config.label}
            </Badge>
            <span className="text-xs text-zinc-400">
              {formatRelativeTime(new Date(agreement.createdAt))}
            </span>
          </div>
        </div>
      </div>

      {/* Sign Button - show for pending agreements */}
      {needsSignature && (
        <button
          onClick={handleSign}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            hasCeremonyUrl
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'border border-zinc-300 bg-zinc-100 text-zinc-500 cursor-not-allowed'
          }`}
          disabled={!hasCeremonyUrl}
        >
          <PenNib className="h-4 w-4" weight="bold" />
          {hasCeremonyUrl ? 'Sign Now' : 'Awaiting Link'}
        </button>
      )}

      {/* View signed document */}
      {isAgreementSigned(agreement.status) && (
        <button className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
          <FileIcon className="h-4 w-4" weight="bold" />
          View
        </button>
      )}
    </div>
  );
}
