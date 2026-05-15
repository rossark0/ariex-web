'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { useComplianceStrategists } from '@/contexts/compliance/hooks/use-compliance-strategists';
import { acceptInvitation } from '@/contexts/compliance/services/compliance.service';
import { MagnifyingGlassIcon, LinkSimple } from '@phosphor-icons/react';
import { ChevronDown, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ComplianceStrategistView } from '@/contexts/compliance/models/compliance.model';

// ============================================================================
// Strategist Card (real data)
// ============================================================================

function StrategistCard({
  strategist,
  onClick,
}: {
  strategist: ComplianceStrategistView;
  onClick: () => void;
}) {
  const isActive = strategist.clientCount > 0;

  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-white/10 bg-deep-navy transition-all hover:border-white/20"
    >
      <div className="flex flex-1 flex-col items-start p-4">
        <span
          className={`mb-4 flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 pl-2 text-xs font-medium ${
            isActive ? 'text-emerald-400' : 'text-steel-gray'
          }`}
        >
          <div className={`h-1 w-1 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-steel-gray'}`} />
          {isActive ? 'Active' : 'Inactive'}
        </span>
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-soft-white group-hover:text-soft-white/80">
            {strategist.name}
          </h3>
        </div>
        <p className="mb-4 line-clamp-2 text-sm text-steel-gray">
          {strategist.email} · {strategist.clientCount} client
          {strategist.clientCount !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Token Acceptance Banner
// ============================================================================

function TokenBanner({
  status,
  message,
}: {
  status: 'loading' | 'success' | 'error';
  message: string;
}) {
  if (status === 'loading') {
    return (
      <div className="mx-auto mb-6 w-full max-w-[642px]">
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-deep-navy p-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-electric-blue border-t-transparent" />
          <p className="text-sm text-steel-gray">Accepting invitation...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="mx-auto mb-6 w-full max-w-[642px]">
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <CheckCircle className="h-5 w-5 text-emerald-400" />
          <p className="text-sm text-emerald-400">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mb-6 w-full max-w-[642px]">
      <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
        <AlertCircle className="h-5 w-5 text-red-400" />
        <p className="text-sm text-red-400">{message}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Manual Token Input Panel
// ============================================================================

function ManualTokenPanel({ onAccepted }: { onAccepted: () => void }) {
  const [tokenInput, setTokenInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const extractToken = (input: string): string => {
    // If they pasted a full URL, extract the token param
    try {
      const url = new URL(input);
      const t = url.searchParams.get('token');
      if (t) return t;
    } catch {
      // Not a URL, treat as raw token
    }
    return input.trim();
  };

  const handleSubmit = async () => {
    const token = extractToken(tokenInput);
    if (!token) return;

    setIsSubmitting(true);
    setStatus('idle');

    const success = await acceptInvitation(token);
    if (success) {
      setStatus('success');
      setStatusMessage('Linked successfully! The strategist now appears in your list.');
      setTokenInput('');
      onAccepted();
    } else {
      setStatus('error');
      setStatusMessage('Failed to link. Token may be expired, invalid, or already used.');
    }
    setIsSubmitting(false);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setTokenInput(text);
    } catch {
      // Clipboard permission denied — user has to paste manually
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-deep-navy p-4">
      <div className="mb-3 flex items-center gap-2">
        <LinkSimple weight="bold" className="h-4 w-4 text-electric-blue" />
        <p className="text-sm font-semibold text-soft-white">Link with Invitation Token</p>
      </div>
      <p className="mb-3 text-xs text-steel-gray">
        Paste the invitation token or the full acceptance URL you received from a strategist.
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Paste token or URL here..."
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full rounded-lg border border-white/10 bg-graphite px-3 py-2 pr-10 text-sm text-soft-white placeholder:text-steel-gray focus:border-electric-blue focus:ring-1 focus:ring-electric-blue/30 focus:outline-none"
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={handlePaste}
            title="Paste from clipboard"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-steel-gray hover:bg-white/8 hover:text-soft-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            </svg>
          </button>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !tokenInput.trim()}
          className="shrink-0 rounded-lg bg-electric-blue px-4 py-2 text-sm font-medium text-soft-white transition-colors hover:bg-electric-blue/80 disabled:opacity-50"
        >
          {isSubmitting ? 'Linking...' : 'Link'}
        </button>
      </div>

      {status === 'success' && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
          <p className="text-xs text-emerald-400">{statusMessage}</p>
        </div>
      )}
      {status === 'error' && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs text-red-400">{statusMessage}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingState() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="animate-pulse rounded-xl border border-white/10 p-4">
          <div className="mb-4 h-6 w-16 rounded-full bg-white/8" />
          <div className="mb-2 h-5 w-32 rounded bg-white/8" />
          <div className="h-4 w-48 rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function ComplianceStrategistsPage() {
  useRoleRedirect('COMPLIANCE');
  const router = useRouter();
  const searchParams = useSearchParams();

  const { strategists, isLoading, error, searchQuery, setSearchQuery, refresh } =
    useComplianceStrategists();

  // Token acceptance flow (URL param)
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [tokenMessage, setTokenMessage] = useState('');

  // Manual token panel visibility
  const [showTokenPanel, setShowTokenPanel] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token && tokenStatus === 'idle') {
      setTokenStatus('loading');
      acceptInvitation(token).then(success => {
        if (success) {
          setTokenStatus('success');
          setTokenMessage("Invitation accepted! You now have access to this strategist's clients.");
          refresh();
          window.history.replaceState({}, '', '/compliance/strategists');
        } else {
          setTokenStatus('error');
          setTokenMessage('Failed to accept invitation. The token may be expired or already used.');
        }
      });
    }
  }, [searchParams, tokenStatus, refresh]);

  const handleStrategistClick = (strategistId: string) => {
    router.push(`/compliance/strategists/${strategistId}`);
  };

  const handleTokenAccepted = () => {
    refresh();
    setShowTokenPanel(false);
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1">
        {/* Header Section */}
        <div className="shrink-0 pt-20 pb-6">
          <div className="mx-auto w-full max-w-[642px]">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="mb-2 text-2xl font-medium tracking-tight text-soft-white">Strategists</h1>
                <p className="mt-1 text-sm text-steel-gray">
                  Monitor all tax strategists and their clients
                </p>
              </div>
              <button
                onClick={() => setShowTokenPanel(prev => !prev)}
                className="flex items-center gap-1.5 rounded-lg bg-electric-blue px-3 py-1.5 text-sm font-medium text-soft-white transition-colors hover:bg-electric-blue/80"
              >
                <Plus className="h-4 w-4" />
                Link Strategist
              </button>
            </div>

            {/* Manual Token Panel (toggled) */}
            {showTokenPanel && (
              <div className="mb-6">
                <ManualTokenPanel onAccepted={handleTokenAccepted} />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative">
                <MagnifyingGlassIcon
                  weight="bold"
                  className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-steel-gray"
                />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-[30px] w-64 rounded-lg border border-white/10 bg-deep-navy pr-3 pl-7 text-sm font-medium text-soft-white placeholder:text-steel-gray hover:border-white/20 focus:border-electric-blue/30 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1 text-sm font-medium text-steel-gray transition-colors hover:bg-white/4">
                  <span>Filter</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Token Acceptance Banner (from URL) */}
        {tokenStatus !== 'idle' && (
          <div>
            <TokenBanner
              status={tokenStatus as 'loading' | 'success' | 'error'}
              message={tokenMessage}
            />
          </div>
        )}

        {/* Cards Grid Section */}
        <div className="pb-42">
          <div className="mx-auto w-full max-w-[642px] py-6">
            {isLoading ? (
              <LoadingState />
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="mb-1 text-lg font-semibold text-red-400">Error loading strategists</p>
                <p className="mb-4 text-sm text-steel-gray">{error}</p>
                <button
                  onClick={refresh}
                  className="rounded-lg bg-electric-blue px-4 py-2 text-sm font-medium text-soft-white hover:bg-electric-blue/80"
                >
                  Retry
                </button>
              </div>
            ) : strategists.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {strategists.map(strategist => (
                  <StrategistCard
                    key={strategist.id}
                    strategist={strategist}
                    onClick={() => handleStrategistClick(strategist.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/8">
                  <LinkSimple weight="bold" className="h-6 w-6 text-steel-gray" />
                </div>
                <p className="mb-1 text-lg font-semibold text-soft-white">No strategists linked</p>
                <p className="mb-6 max-w-sm text-sm text-steel-gray">
                  {searchQuery
                    ? 'Try adjusting your search'
                    : 'Paste your invitation token below to link with a strategist, or ask them to send you an invitation.'}
                </p>
                {!searchQuery && !showTokenPanel && (
                  <div className="w-full max-w-md">
                    <ManualTokenPanel onAccepted={handleTokenAccepted} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
