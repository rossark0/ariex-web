'use client';

import { useAuth } from '@/contexts/auth/AuthStore';
import { useRoleRedirect } from '@/hooks/use-role-redirect';
import { useRouter } from 'next/navigation';
import { FileIcon, Check, SpinnerGap, Check as CheckIcon } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { EmptyDocumentsIllustration } from '@/components/ui/empty-documents-illustration';
import { TodoUploadItem } from '@/components/documents/todo-upload-item';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useUiStore } from '@/contexts/ui/UiStore';
import {
  getClientDashboardData,
  getDocumentDownloadUrl,
  getChargesForAgreement,
  type ClientDashboardData,
  type ClientAgreement,
  type ClientDocument,
} from '@/lib/api/client.api';
import {
  approveStrategyAsClient,
  declineStrategyAsClient,
  getStrategyDocumentUrl,
} from '@/lib/api/strategies.actions';
import { computeStep5State, parseStrategyMetadata } from '@/contexts/strategist-contexts/client-management/models/strategy.model';
import {
  AgreementStatus,
  isAgreementSigned,
  isAgreementPaid,
} from '@/types/agreement';
import { useAiPageContext } from '@/contexts/ai/hooks/use-ai-page-context';
import type { AiDocumentContext, AiAgreementContext } from '@/contexts/ai/AiPageContextStore';

// ============================================================================
// ANIMATED DOTS COMPONENT
// ============================================================================

function AnimatedDots() {
  return (
    <span className="inline-flex gap-0.5 pl-1">
      <span
        className="animate-[bounce_1.4s_ease-in-out_infinite]"
        style={{ animationDelay: '0ms' }}
      >
        .
      </span>
      <span
        className="animate-[bounce_1.4s_ease-in-out_infinite]"
        style={{ animationDelay: '200ms' }}
      >
        .
      </span>
      <span
        className="animate-[bounce_1.4s_ease-in-out_infinite]"
        style={{ animationDelay: '400ms' }}
      >
        .
      </span>
    </span>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Handle future dates
  if (diffDays < 0) {
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  // If today, show time
  if (diffDays === 0) {
    return dateObj.toLocaleTimeString('en-US', {
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
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
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

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function ClientDashboardPage() {
  useRoleRedirect('CLIENT');
  const router = useRouter();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<ClientDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const { setSelection, setDownloadingSelection } = useUiStore();

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

  // Handle downloading selected documents
  const handleDownloadSelected = useCallback(async () => {
    console.log('[UI] Downloading selected documents:', Array.from(selectedDocs));
    setDownloadingSelection(true);
    try {
      for (const docId of selectedDocs) {
        try {
          console.log('[UI] Fetching download URL for:', docId);
          const url = await getDocumentDownloadUrl(docId);
          console.log('[UI] Got URL:', url);
          if (url) {
            window.open(url, '_blank');
          } else {
            console.error('[UI] No download URL returned for:', docId);
          }
        } catch (error) {
          console.error('Failed to download document:', docId, error);
        }
      }
    } finally {
      setDownloadingSelection(false);
    }
  }, [selectedDocs, setDownloadingSelection]);

  // Sync selection state with UI store
  useEffect(() => {
    setSelection(
      selectedDocs.size,
      () => setSelectedDocs(new Set()),
      selectedDocs.size > 0 ? handleDownloadSelected : null
    );
  }, [selectedDocs.size, setSelection, handleDownloadSelected]);

  // Charge amount fetched from the real Charges API (in dollars)
  const [chargeAmount, setChargeAmount] = useState<number | null>(null);

  // SignatureAPI sync state - holds the REAL envelope statuses
  const [envelopeStatuses, setEnvelopeStatuses] = useState<Record<string, string>>({});
  const hasSyncedRef = useRef(false);

  // Strategy approve/decline loading states
  const [isApprovingStrategy, setIsApprovingStrategy] = useState(false);
  const [isDecliningStrategy, setIsDecliningStrategy] = useState(false);
  const [strategyActionError, setStrategyActionError] = useState<string | null>(null);

  // ─── AI Page Context (must be before any early returns) ────────────────
  useAiPageContext({
    pageTitle: 'Client Dashboard',
    userRole: 'CLIENT',
    client: dashboardData
      ? {
          id: dashboardData.user.id,
          name: dashboardData.user.fullName || dashboardData.user.name || null,
          email: dashboardData.user.email,
          phoneNumber: dashboardData.profile?.phoneNumber,
          businessName: dashboardData.profile?.businessName,
          businessType: dashboardData.profile?.businessType,
          city: dashboardData.profile?.city,
          state: dashboardData.profile?.state,
          estimatedIncome: dashboardData.profile?.estimatedIncome,
          filingStatus: dashboardData.profile?.filingStatus,
          dependents: dashboardData.profile?.dependents,
        }
      : null,
    documents: dashboardData?.documents?.map(
      (d): AiDocumentContext => ({
        id: d.id,
        name: d.name || 'Document',
        type: d.type || d.category || 'unknown',
        status: d.status,
        category: d.category,
        createdAt: typeof d.createdAt === 'string' ? d.createdAt : new Date(d.createdAt).toISOString(),
      })
    ),
    agreements: dashboardData?.agreements?.map(
      (a): AiAgreementContext => ({
        id: a.id,
        name: a.name || a.title || 'Agreement',
        status: a.status,
        price: typeof a.price === 'string' ? parseFloat(a.price) : a.price,
        createdAt: typeof a.createdAt === 'string' ? a.createdAt : new Date(a.createdAt).toISOString(),
      })
    ),
    extra: dashboardData
      ? {
          strategistName: dashboardData.strategist?.name || dashboardData.strategist?.email,
          todoCount: dashboardData.todos?.length ?? 0,
        }
      : undefined,
  });

  // Fetch dashboard data from API
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const data = await getClientDashboardData();
        setDashboardData(data);

        // If no agreements exist, redirect to onboarding
        const hasAgreements = data?.agreements && data.agreements.length > 0;

        if (!hasAgreements) {
          console.log('[ClientDashboard] No agreements found, redirecting to onboarding');
          router.replace('/client/onboarding');
          return;
        }

        // DISABLED: Signature sync - uncomment when needed
        // Sync signature status from SignatureAPI for ALL agreements
        // This is needed because the webhook may fail to update the backend
        let syncedStatuses: Record<string, string> = {};

        // if (hasAgreements && !hasSyncedRef.current) {
        //   hasSyncedRef.current = true;
        //
        //   const statuses: Record<string, string> = {};
        //   let needsRefresh = false;
        //
        //   // Check ALL agreements, not just the first one
        //   for (const agreement of data.agreements) {
        //     if (agreement?.signatureEnvelopeId) {
        //       console.log('[ClientDashboard] Checking envelope status for agreement:', agreement.id);
        //
        //       const syncResult = await syncAgreementSignatureStatus(agreement.id);
        //       console.log('[ClientDashboard] Sync result:', syncResult);
        //
        //       if (syncResult.status) {
        //         // Store status - 'signed' means completed
        //         statuses[agreement.id] = syncResult.status === 'signed' ? 'completed' : syncResult.status;
        //
        //         if (syncResult.status === 'signed') {
        //           needsRefresh = true;
        //         }
        //       }
        //     }
        //   }
        //
        //   if (Object.keys(statuses).length > 0) {
        //     setEnvelopeStatuses(statuses);
        //     syncedStatuses = statuses;
        //   }
        //
        //   // Refresh data if any agreement was synced as signed
        //   if (needsRefresh) {
        //     console.log('[ClientDashboard] Agreement synced as signed - refreshing data');
        //     const refreshedData = await getClientDashboardData();
        //     if (refreshedData) {
        //       setDashboardData(refreshedData);
        //       // Use refreshed data for access check below
        //       data.agreements = refreshedData.agreements;
        //     }
        //   }
        // }

        // ============================================================================
        // ACCESS CONTROL: Client must have signed agreement AND paid to access /home
        // ============================================================================
        const serviceAgreement =
          data.agreements.length > 0
            ? data.agreements.find(
                a => isAgreementSigned(a.status) || syncedStatuses[a.id] === 'completed'
              ) || data.agreements[0]
            : null;

        // Check if agreement is signed (using helper)
        const envelopeIsCompleted =
          serviceAgreement && syncedStatuses[serviceAgreement.id] === 'completed';
        const backendSaysSignedOrComplete =
          serviceAgreement && isAgreementSigned(serviceAgreement.status);
        const agreementSigned =
          envelopeIsCompleted || backendSaysSignedOrComplete || !!serviceAgreement?.signedAt;

        // Check if payment is completed (using helper)
        const paymentCompleted = serviceAgreement && isAgreementPaid(serviceAgreement.status);

        // Redirect to onboarding if agreement not signed OR payment not completed
        if (!agreementSigned || !paymentCompleted) {
          console.log(
            '[ClientDashboard] Access denied - Agreement signed:',
            agreementSigned,
            'Payment completed:',
            paymentCompleted
          );
          console.log('[ClientDashboard] Redirecting to onboarding');
          router.replace('/client/onboarding');
          return;
        }

        console.log('[ClientDashboard] Access granted - Agreement signed and payment completed');

        // Fetch real charge amount for the signed agreement
        if (serviceAgreement) {
          try {
            const charges = await getChargesForAgreement(serviceAgreement.id);
            const charge = charges.find(c => c.status === 'paid') || charges[0];
            if (charge?.amount && charge.amount > 0) {
              setChargeAmount(charge.amount);
            }
          } catch (e) {
            console.error('[ClientDashboard] Failed to fetch charges:', e);
          }
        }

        setError(null);
      } catch (err) {
        console.error('[ClientDashboard] Failed to fetch data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      fetchData();
    }
  }, [user, router]);

  // Refresh dashboard data (used after document upload)
  const refreshDashboard = useCallback(async () => {
    try {
      const data = await getClientDashboardData();
      if (data) {
        setDashboardData(data);
        // Debug: Log the todos after refresh
        const todos = data.agreements?.[0]?.todoLists?.flatMap(list => list.todos || []) || [];
        console.log(
          '[ClientDashboard] Dashboard refreshed - todos:',
          JSON.stringify(todos, null, 2)
        );
      }
    } catch (err) {
      console.error('[ClientDashboard] Failed to refresh:', err);
    }
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center">
        <SpinnerGap className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="mt-4 text-sm text-zinc-500">Loading your dashboard...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900">Not authenticated</h1>
          <p className="text-zinc-500">Please sign in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  // Error state or no data
  if (error || !dashboardData) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900">Welcome to Ariex!</h1>
          <p className="mt-2 text-zinc-500">
            {error || 'Your dashboard is being set up. Please check back shortly.'}
          </p>
          <p className="mt-4 text-sm text-zinc-400">
            Your tax strategist will reach out soon to get started.
          </p>
        </div>
      </div>
    );
  }

  const { user: clientUser, profile, strategist, agreements, documents, todos } = dashboardData;
  const clientName = clientUser.fullName || clientUser.name || clientUser.email.split('@')[0];
  const businessName = profile?.businessName;
  const createdAt = new Date(clientUser.createdAt);

  // Status priority order (most advanced first)
  const STATUS_PRIORITY: Record<string, number> = {
    [AgreementStatus.COMPLETED]: 7,
    [AgreementStatus.PENDING_STRATEGY_REVIEW]: 6,
    [AgreementStatus.PENDING_STRATEGY]: 5,
    [AgreementStatus.PENDING_TODOS_COMPLETION]: 4,
    [AgreementStatus.PENDING_PAYMENT]: 3,
    [AgreementStatus.PENDING_SIGNATURE]: 2,
    [AgreementStatus.DRAFT]: 1,
    [AgreementStatus.CANCELLED]: 0,
  };

  // Find the most ADVANCED agreement by status (not just newest by date)
  // This ensures we show the agreement that's furthest along in the flow
  const sortedAgreements = [...agreements].sort((a, b) => {
    const priorityA = STATUS_PRIORITY[a.status] ?? 0;
    const priorityB = STATUS_PRIORITY[b.status] ?? 0;
    // Sort by status priority first (descending), then by date (descending)
    if (priorityB !== priorityA) return priorityB - priorityA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const serviceAgreement = sortedAgreements[0] || null;

  // Extract ALL todos from agreement
  const agreementTodos = serviceAgreement?.todoLists?.flatMap(list => list.todos || []) || [];

  // Separate signing todos from document/other todos
  const signingTodos = agreementTodos.filter(todo => todo.title.toLowerCase().includes('sign'));
  // Document todos = exclude sign and pay todos
  const documentTodos = agreementTodos.filter(
    todo => !todo.title.toLowerCase().includes('sign') && !todo.title.toLowerCase().includes('pay')
  );
  const completedDocTodos = documentTodos.filter(
    todo => todo.status === 'completed' || todo.document?.uploadStatus === 'FILE_UPLOADED'
  );
  const hasDocTodos = documentTodos.length > 0;

  // Find strategy document
  // (strategyDoc already computed above via computeStep5State block)

  // Uploaded documents (excluding agreements/strategies)
  const uploadedDocs = documents.filter(
    d => d.type !== 'agreement' && d.type !== 'strategy' && d.category !== 'contract'
  );

  // Build a map of todoId -> todo title for matching documents to their request names
  const todoTitles = new Map<string, string>();
  for (const todo of agreementTodos) {
    todoTitles.set(todo.id, todo.title);
  }

  // Calculate step completion states based on agreement status
  // Using AgreementStatus enum for proper status checks
  //
  // SOURCE OF TRUTH: SignatureAPI envelope status
  // The backend may not be updated if the webhook failed, so we check SignatureAPI directly
  //

  // Check SignatureAPI envelope status (the REAL source of truth)
  const envelopeIsCompleted =
    serviceAgreement && envelopeStatuses[serviceAgreement.id] === 'completed';

  // Also check backend signals as backup
  const backendSaysSignedOrComplete = serviceAgreement
    ? isAgreementSigned(serviceAgreement.status)
    : false;
  const documentSaysSigned = signingTodos.some(todo => todo.status === 'completed');

  const step1Complete = true; // Account always created
  const step2Sent =
    serviceAgreement?.status === AgreementStatus.PENDING_SIGNATURE || backendSaysSignedOrComplete;

  // Agreement is signed if SignatureAPI says so OR backend says so
  const step2Complete = envelopeIsCompleted || backendSaysSignedOrComplete || documentSaysSigned;

  // Payment: use AgreementStatus - PENDING_PAYMENT means payment was sent
  // Also check paymentLink exists as a secondary indicator
  const step3Sent =
    step2Complete &&
    (serviceAgreement?.status === AgreementStatus.PENDING_PAYMENT ||
      isAgreementPaid(serviceAgreement?.status as AgreementStatus) ||
      !!serviceAgreement?.paymentLink);
  const step3Complete =
    isAgreementPaid(serviceAgreement?.status as AgreementStatus) ||
    serviceAgreement?.paymentStatus === 'paid';

  // Documents: show based on PENDING_TODOS_COMPLETION status or if there are document todos
  // Only consider complete if there are todos AND they're all done
  const step4Sent =
    step3Complete ||
    serviceAgreement?.status === AgreementStatus.PENDING_TODOS_COMPLETION ||
    hasDocTodos;
  const step4Complete = hasDocTodos && completedDocTodos.length >= documentTodos.length;

  // Strategy: Use computeStep5State for compliance → client approval flow
  // Find strategy document by metadata ID or by category
  const strategyMetadata = parseStrategyMetadata(serviceAgreement?.description);
  const strategyDocumentId = strategyMetadata?.strategyDocumentId ?? null;

  // Find the actual strategy document to get its acceptanceStatus
  const strategyDoc = strategyDocumentId
    ? documents.find(d => d.id === strategyDocumentId) ?? null
    : documents.find(d => d.type === 'strategy' || d.category === 'strategy') ?? null;

  const step5State = computeStep5State(
    serviceAgreement?.status ?? '',
    strategyDoc?.acceptanceStatus ?? null
  );

  const step5Sent = step5State.strategySent;
  const step5Complete = step5State.isComplete;

  // Client can see the strategy and approve/decline only after compliance approved
  const step5ClientCanAct = step5State.phase === 'client_review';

  // Pending document todos = not yet uploaded (for showing in documents section & timeline)
  const pendingDocTodos = documentTodos.filter(
    todo => todo.status !== 'completed' && todo.document?.uploadStatus !== 'FILE_UPLOADED'
  );
  // Agreement has moved past the documents step but still has pending uploads
  const isPastDocumentsStep =
    serviceAgreement?.status === AgreementStatus.PENDING_STRATEGY ||
    serviceAgreement?.status === AgreementStatus.PENDING_STRATEGY_REVIEW ||
    serviceAgreement?.status === AgreementStatus.COMPLETED;
  const hasLateDocRequests = isPastDocumentsStep && pendingDocTodos.length > 0;

  // Resolve the display price from real charge data first, then agreement fields.
  const paymentAmount = (() => {
    // 1. Prefer the real charge amount (fetched from Charges API, already in dollars)
    if (chargeAmount && chargeAmount > 0) return chargeAmount;
    // 2. Fall back to agreement fields
    const raw = serviceAgreement?.paymentAmount ?? serviceAgreement?.price;
    if (raw == null) return 499;
    const n = typeof raw === 'string' ? parseFloat(raw) : raw;
    return isNaN(n) || n <= 0 ? 499 : n;
  })();

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(paymentAmount);

  // Check if there's a pending action
  const hasPendingAgreement =
    step2Sent && !step2Complete && !!serviceAgreement?.signatureCeremonyUrl;

  function formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1">
        {/* Action Banner - Shows when there's a pending agreement to sign */}
        {/* {hasPendingAgreement && (
          <div className="bg-amber-50 border-b border-amber-200">
            <div className="mx-auto max-w-[642px] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                  <FileIcon className="h-4 w-4 text-amber-600" weight="fill" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-900">Action Required</p>
                  <p className="text-xs text-amber-700">Please sign your service agreement to continue</p>
                </div>
              </div>
              <button
                onClick={() => window.open(serviceAgreement?.signatureCeremonyUrl, '_blank')}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
              >
                Sign Now
              </button>
            </div>
          </div>
        )} */}

        {/* Top Section - Onboarding Activity Timeline */}
        <div className="shrink-0 bg-zinc-50/90 pt-8 pb-6">
          <div className="mx-auto w-full max-w-[642px]">
            <h2 className="mb-6 text-2xl font-medium text-zinc-900">Your to-dos</h2>
            <div className="relative pl-6">
              <div className="flex flex-col gap-0">
                {/* Step 1: Account Created - Always complete */}
                <div className="relative flex gap-4 pb-6">
                  <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                    <Check weight="bold" className="h-3 w-3 text-emerald-500" />
                  </div>
                  {/* Line to next step */}
                  <div className="absolute top-5 bottom-2 -left-[19px] w-0.5 bg-emerald-200" />
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium text-zinc-900">
                      Account created for {businessName || clientName}
                    </span>
                    <span className="text-sm text-zinc-500">
                      Onboarding initiated by your tax strategist
                    </span>
                    <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                      {formatDate(createdAt)}
                      {strategist && ` · Created by ${strategist.name}`}
                    </span>
                  </div>
                </div>

                {/* Step 2: Agreement Phase */}
                <div className="relative flex gap-4 pb-6">
                  <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                    {step2Complete ? (
                      <Check weight="bold" className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <div
                        className={`h-2 w-2 rounded-full ${step2Sent ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                      />
                    )}
                  </div>
                  {/* Line to next step */}
                  <div
                    className={`absolute top-5 bottom-2 -left-[19px] w-0.5 ${step2Complete ? 'bg-emerald-200' : 'bg-zinc-200'}`}
                  />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900">
                        {step2Complete
                          ? 'Service agreement signed'
                          : step2Sent
                            ? 'Agreement sent for signature'
                            : 'Agreement pending'}
                      </span>
                    </div>
                    <span className="text-sm text-zinc-500">
                      {step2Complete
                        ? 'Ariex Service Agreement 2024 was signed '
                        : step2Sent
                          ? 'Please review and sign the service agreement'
                          : 'Your strategist will send the agreement shortly'}
                    </span>
                    <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                      {formatDate(serviceAgreement?.updatedAt || createdAt)}
                    </span>
                    {step1Complete && !step2Complete && (
                      <Badge variant={step2Sent ? 'warning' : 'warning'} className="mt-2 w-fit">
                        {step2Sent ? (
                          'Action required'
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                            </span>
                            Tax strategist action required
                          </span>
                        )}
                      </Badge>
                    )}
                    {/* Show button only if previous step complete AND current step not complete */}
                    {step1Complete && step2Sent && !step2Complete && serviceAgreement && (
                      <button
                        onClick={() => {
                          if (serviceAgreement.signatureCeremonyUrl) {
                            window.open(serviceAgreement.signatureCeremonyUrl, '_blank');
                          } else {
                            // Navigate to agreements page if no direct URL
                            window.location.href = '/client/agreements';
                          }
                        }}
                        className="mt-2 w-fit rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        {serviceAgreement.signatureCeremonyUrl
                          ? 'Sign agreement'
                          : 'View agreements'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Step 3: Payment Phase */}
                <div className="relative flex gap-4 pb-6">
                  <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                    {step3Complete ? (
                      <Check weight="bold" className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <div
                        className={`h-2 w-2 rounded-full ${step3Sent ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                      />
                    )}
                  </div>
                  {/* Line to next step */}
                  <div
                    className={`absolute top-5 bottom-2 -left-[19px] w-0.5 ${step3Complete ? 'bg-emerald-200' : 'bg-zinc-200'}`}
                  />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900">
                        {step3Complete
                          ? `Payment completed · ${formattedPrice}`
                          : step3Sent
                            ? `Payment pending · ${formattedPrice}`
                            : 'Payment link pending'}
                      </span>
                    </div>
                    <span className="text-sm text-zinc-500">
                      {step3Complete
                        ? 'Onboarding Fee - Tax Strategy Setup'
                        : step3Sent
                          ? 'Complete payment to activate your account'
                          : 'Payment link will be sent after agreement is signed'}
                    </span>
                    <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                      {formatDate(serviceAgreement?.updatedAt || createdAt)}
                    </span>
                    {step2Complete && !step3Complete && (
                      <Badge variant={step3Sent ? 'warning' : 'warning'} className="mt-2 w-fit">
                        {step3Sent ? (
                          'Action required'
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                            </span>
                            Tax strategist action required
                          </span>
                        )}
                      </Badge>
                    )}
                    {/* Show button only if step 2 complete AND current step not complete */}
                    {step2Complete && step3Sent && !step3Complete && serviceAgreement && (
                      <button
                        onClick={() => {
                          if (serviceAgreement.paymentLink) {
                            window.open(serviceAgreement.paymentLink, '_blank');
                          } else {
                            alert(
                              'Payment link not available yet. Your strategist will send it shortly.'
                            );
                          }
                        }}
                        className="mt-2 w-fit rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Complete payment
                      </button>
                    )}
                  </div>
                </div>

                {/* Step 4: Documents Phase */}
                <div className="relative flex gap-4 pb-6">
                  <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                    {step4Complete ? (
                      <Check weight="bold" className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <div
                        className={`h-2 w-2 rounded-full ${step4Sent ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                      />
                    )}
                  </div>
                  {/* Line to next step */}
                  <div
                    className={`absolute top-5 bottom-2 -left-[19px] w-0.5 ${step4Complete ? 'bg-emerald-200' : 'bg-zinc-200'}`}
                  />
                  <div className="flex flex-1 flex-col items-start">
                    {/* Action required badge at top */}
                    {step3Complete && !step4Complete && (
                      <Badge variant="warning" className="mb-2 w-fit">
                        Action required
                      </Badge>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900">
                        {step4Complete
                          ? `Documents uploaded · ${completedDocTodos.length}/${documentTodos.length}`
                          : hasDocTodos
                            ? `Documents pending · ${completedDocTodos.length}/${documentTodos.length} uploaded`
                            : step4Sent
                              ? 'Waiting for document requests'
                              : 'Documents'}
                      </span>
                    </div>
                    <span className="text-sm text-zinc-500">
                      {step4Complete
                        ? 'All requested documents have been received'
                        : hasDocTodos
                          ? 'Please upload the requested documents'
                          : step4Sent
                            ? 'Your strategist will request documents when needed'
                            : 'You will be notified when documents are needed'}
                    </span>
                    <span className="mt-2 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                      {formatDate(createdAt)}
                    </span>
                    {/* Show document todos from agreement with upload functionality */}
                    {hasDocTodos && documentTodos.length > 0 && serviceAgreement && (
                      <div className="mt-3 flex w-full flex-col gap-2">
                        <span className="mb-1 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                          Requested documents ({completedDocTodos.length}/{documentTodos.length})
                        </span>
                        {documentTodos.map(todo => (
                          <TodoUploadItem
                            key={todo.id}
                            todo={todo}
                            agreementId={serviceAgreement.id}
                            strategistId={strategist?.id || serviceAgreement.strategistId || ''}
                            onUploadComplete={refreshDashboard}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Late Document Requests — shown when agreement passed step 4 but new docs were requested */}
                {hasLateDocRequests && serviceAgreement && (
                  <div className="relative flex gap-4 pb-6">
                    <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                    </div>
                    <div
                      className={`absolute top-5 bottom-2 -left-[19px] w-0.5 bg-zinc-200`}
                    />
                    <div className="flex flex-1 flex-col items-start">
                      <Badge variant="warning" className="mb-2 w-fit">
                        Action required
                      </Badge>
                      <span className="font-medium text-zinc-900">
                        Additional documents requested · {pendingDocTodos.length} pending
                      </span>
                      <span className="text-sm text-zinc-500">
                        Your strategist has requested additional documents
                      </span>
                      <div className="mt-3 flex w-full flex-col gap-2">
                        {pendingDocTodos.map(todo => (
                          <TodoUploadItem
                            key={todo.id}
                            todo={todo}
                            agreementId={serviceAgreement.id}
                            strategistId={strategist?.id || serviceAgreement.strategistId || ''}
                            onUploadComplete={refreshDashboard}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Strategy Phase (Compliance → Client Approval) */}
                <div className="relative flex gap-4">
                  <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                    {step5Complete ? (
                      <Check weight="bold" className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <div
                        className={`h-2 w-2 rounded-full ${step5Sent ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900">
                        {step5Complete
                          ? 'Tax strategy approved'
                          : step5ClientCanAct
                            ? 'Strategy ready for your review'
                          : step5State.phase === 'client_declined'
                            ? 'Strategy declined — revision in progress'
                          : step5State.phase === 'compliance_review'
                            ? 'Strategy under review'
                          : step5State.phase === 'compliance_rejected'
                            ? 'Strategy being revised'
                          : step5Sent
                            ? 'Strategy under review'
                            : 'Tax strategy pending'}
                      </span>
                    </div>
                    <span className="text-sm text-zinc-500">
                      {step5Complete
                        ? 'Your tax strategy has been approved and finalized'
                        : step5ClientCanAct
                          ? 'Please review and approve or decline your tax strategy'
                        : step5State.phase === 'client_declined'
                          ? 'Your strategist is revising the strategy based on your feedback'
                        : step5State.phase === 'compliance_review'
                          ? 'Your strategy is being reviewed by our compliance team'
                        : step5State.phase === 'compliance_rejected'
                          ? 'Your strategist is revising the strategy'
                        : step5Sent
                          ? 'Your strategy is being reviewed'
                          : 'Your strategist will create your personalized tax strategy after documents are reviewed'}
                    </span>
                    <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                      {strategyMetadata?.sentAt
                        ? formatDate(new Date(strategyMetadata.sentAt))
                        : formatDate(createdAt)}
                    </span>

                    {/* Action required badge — only when client needs to act */}
                    {step5ClientCanAct && !step5Complete && (
                      <Badge variant="warning" className="mt-2 w-fit">
                        Action required
                      </Badge>
                    )}

                    {/* Waiting badges — strategy submitted but not yet client's turn */}
                    {step5Sent && !step5ClientCanAct && !step5Complete && !step5State.clientDeclined && !step5State.complianceRejected && (
                      <Badge variant="warning" className="mt-2 w-fit">
                        <span className="flex items-center gap-1.5">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                          </span>
                          Under review
                        </span>
                      </Badge>
                    )}

                    {/* Not yet sent — strategist action required */}
                    {step4Complete && !step5Sent && !step5Complete && (
                      <Badge variant="warning" className="mt-2 w-fit">
                        <span className="flex items-center gap-1.5">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                          </span>
                          Tax strategist action required
                        </span>
                      </Badge>
                    )}

                    {/* Client action buttons: View + Approve + Decline (only when compliance approved) */}
                    {step5ClientCanAct && !step5Complete && serviceAgreement && (
                      <div className="mt-3 flex flex-col gap-2">
                        {/* View strategy document */}
                        {strategyDocumentId && (
                          <button
                            onClick={async () => {
                              const result = await getStrategyDocumentUrl(strategyDocumentId!);
                              if (result.success && result.url) window.open(result.url, '_blank');
                            }}
                            className="w-fit rounded bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-200"
                          >
                            View strategy
                          </button>
                        )}
                        {/* Approve / Decline buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              if (!strategyDocumentId) return;
                              setIsApprovingStrategy(true);
                              setStrategyActionError(null);
                              try {
                                const result = await approveStrategyAsClient(
                                  serviceAgreement.id,
                                  strategyDocumentId
                                );
                                if (result.success) {
                                  await refreshDashboard();
                                } else {
                                  setStrategyActionError(result.error || 'Failed to approve');
                                }
                              } catch {
                                setStrategyActionError('An unexpected error occurred');
                              } finally {
                                setIsApprovingStrategy(false);
                              }
                            }}
                            disabled={isApprovingStrategy || isDecliningStrategy || !strategyDocumentId}
                            className="flex w-fit items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {isApprovingStrategy ? (
                              <>
                                <SpinnerGap className="h-3 w-3 animate-spin" />
                                Approving...
                              </>
                            ) : (
                              <>
                                <Check weight="bold" className="h-3 w-3" />
                                Approve strategy
                              </>
                            )}
                          </button>
                          <button
                            onClick={async () => {
                              if (!strategyDocumentId) return;
                              const reason = window.prompt('Why are you declining? (optional)');
                              setIsDecliningStrategy(true);
                              setStrategyActionError(null);
                              try {
                                const result = await declineStrategyAsClient(
                                  serviceAgreement.id,
                                  strategyDocumentId,
                                  reason || undefined
                                );
                                if (result.success) {
                                  await refreshDashboard();
                                } else {
                                  setStrategyActionError(result.error || 'Failed to decline');
                                }
                              } catch {
                                setStrategyActionError('An unexpected error occurred');
                              } finally {
                                setIsDecliningStrategy(false);
                              }
                            }}
                            disabled={isApprovingStrategy || isDecliningStrategy || !strategyDocumentId}
                            className="flex w-fit items-center gap-1 rounded bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-200 disabled:opacity-50"
                          >
                            {isDecliningStrategy ? (
                              <>
                                <SpinnerGap className="h-3 w-3 animate-spin" />
                                Declining...
                              </>
                            ) : (
                              'Decline'
                            )}
                          </button>
                        </div>
                        {strategyActionError && (
                          <span className="text-xs text-red-500">{strategyActionError}</span>
                        )}
                      </div>
                    )}

                    {/* Completed state */}
                    {step5Complete && (
                      <div className="mt-2">
                        <Badge variant="default" className="bg-emerald-100 text-emerald-700">
                          ✓ Strategy approved — Agreement completed
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Recent Documents */}
        <div className="bg-white pb-42">
          <div className="mx-auto flex w-full max-w-[642px] flex-col py-6">
            <h2 className="mb-4 text-lg font-medium text-zinc-900">Documents</h2>

            {/* Pending document requests */}
            {pendingDocTodos.length > 0 && serviceAgreement && (
              <div className="mb-6">
                <p className="mb-3 text-sm font-medium text-amber-600">
                  Pending requests · {pendingDocTodos.length} document{pendingDocTodos.length !== 1 ? 's' : ''} needed
                </p>
                <div className="flex flex-col gap-2">
                  {pendingDocTodos.map(todo => (
                    <TodoUploadItem
                      key={todo.id}
                      todo={todo}
                      agreementId={serviceAgreement.id}
                      strategistId={strategist?.id || serviceAgreement.strategistId || ''}
                      onUploadComplete={refreshDashboard}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State - No documents yet */}
            {uploadedDocs.length === 0 && pendingDocTodos.length === 0 && (
              <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center">
                {/* Empty */}
                <EmptyDocumentsIllustration />
                <p className="text-lg font-semibold text-zinc-800">No documents yet</p>
                <p className="text-sm text-zinc-400">Documents you upload will appear here</p>
              </div>
            )}

            {/* Documents List */}
            {uploadedDocs.length > 0 && (
              <div className="">
                {groupDocumentsByDate(
                  [...uploadedDocs]
                    .filter(d => d.category !== 'contract')
                    .sort(
                      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )
                ).map(group => (
                  <div key={group.label} className="mb-6">
                    {/* Date Group Label */}
                    <p className="mb-3 text-sm font-medium text-zinc-400">{group.label}</p>

                    {/* Document List */}
                    <div className="flex flex-col">
                      {group.documents.map(doc => {
                        const isSelected = selectedDocs.has(doc.id);
                        return (
                          <div key={doc.id} className="group relative">
                            {/* Checkbox - positioned in left gutter */}
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

                            {/* Document Row - clickable */}
                            <div
                              onClick={() => toggleDocSelection(doc.id)}
                              className={`flex cursor-pointer items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-zinc-50 ${
                                isSelected ? 'bg-zinc-50' : ''
                              }`}
                            >
                              {/* Document Icon */}
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                                <FileIcon className="h-5 w-5 text-zinc-400" />
                              </div>

                              {/* Document Info */}
                              <div className="flex flex-1 flex-col">
                                <span className="font-medium text-zinc-900">
                                  {doc.todoId && todoTitles.get(doc.todoId)
                                    ? todoTitles.get(doc.todoId)
                                    : 'Agreement Document'}
                                </span>
                              </div>

                              {/* Timestamp */}
                              <span className="text-sm text-zinc-400">
                                {formatRelativeTime(doc.createdAt)}
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
      </div>
    </div>
  );
}
