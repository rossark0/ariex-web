'use client';

import { useEffect, useState } from 'react';
import { useUiStore } from '@/contexts/ui/UiStore';
import { StrategySheet } from '@/components/strategy/strategy-sheet';
import { Button } from '@/components/ui/button';
import { getFullClientById, FullClientMock } from '@/lib/mocks/client-full';
import {
  getClientById,
  type ApiClient,
  type ApiAgreement,
  listClientAgreements,
} from '@/lib/api/strategist.api';
import { sendAgreementToClient } from '@/lib/api/agreements.actions';
import { AgreementModal, type AgreementFormData } from '@/components/agreements/agreement-modal';
import {
  getClientTimelineAndStatus,
  CLIENT_STATUS_CONFIG,
  type ClientStatusKey,
} from '@/lib/client-status';
import {
  ArrowLeftIcon,
  BuildingsIcon,
  EnvelopeIcon,
  FileIcon,
  FileArrowDown as FileArrowDownIcon,
  FolderPlusIcon,
  PhoneIcon,
  Check as CheckIcon,
  StarFourIcon,
  SpinnerGap,
} from '@phosphor-icons/react';
import {
  Check,
  Clock,
  Strategy,
  Warning,
  Envelope,
  Phone,
  Globe,
  Buildings,
} from '@phosphor-icons/react/dist/ssr';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

interface Props {
  params: { clientId: string };
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getInitials(name: string | null): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

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

// Loading spinner component
function LoadingState() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <SpinnerGap className="h-8 w-8 animate-spin text-zinc-400" />
      <p className="text-sm text-zinc-500">Loading client details...</p>
    </div>
  );
}

// Convert API client to mock format for timeline and other features
function apiClientToMockFormat(apiClient: ApiClient): FullClientMock {
  const now = new Date();
  return {
    user: {
      id: apiClient.id,
      email: apiClient.email,
      name: apiClient.name || apiClient.fullName || null,
      role: 'CLIENT',
      createdAt: new Date(apiClient.createdAt),
      updatedAt: new Date(apiClient.updatedAt),
    },
    profile: {
      id: apiClient.clientProfile?.id || `profile-${apiClient.id}`,
      userId: apiClient.id,
      phoneNumber: apiClient.clientProfile?.phoneNumber || apiClient.clientProfile?.phone || null,
      address: apiClient.clientProfile?.address || null,
      city: apiClient.clientProfile?.city || null,
      state: apiClient.clientProfile?.state || null,
      zipCode: apiClient.clientProfile?.zipCode || null,
      taxId: apiClient.clientProfile?.taxId || null,
      businessName: apiClient.clientProfile?.businessName || null,
      onboardingComplete: apiClient.clientProfile?.onboardingComplete || false,
      filingStatus: apiClient.clientProfile?.filingStatus || null,
      dependents: apiClient.clientProfile?.dependents || null,
      estimatedIncome: apiClient.clientProfile?.estimatedIncome || null,
      businessType: apiClient.clientProfile?.businessType || null,
      createdAt: apiClient.clientProfile?.createdAt
        ? new Date(apiClient.clientProfile.createdAt)
        : now,
      updatedAt: apiClient.clientProfile?.updatedAt
        ? new Date(apiClient.clientProfile.updatedAt)
        : now,
    },
    strategistId: apiClient.strategists?.[0] || '',
    isOnboardingComplete: apiClient.clientProfile?.onboardingComplete || false,
    // Empty arrays for features not yet implemented in API
    onboardingTasks: [],
    documents: [],
    payments: [],
    conversations: [],
    todos: [],
  };
}

export default function StrategistClientDetailPage({ params }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [apiClient, setApiClient] = useState<ApiClient | null>(null);
  const [client, setClient] = useState<FullClientMock | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isStrategySheetOpen, setIsStrategySheetOpen] = useState(false);
  const { setSelection } = useUiStore();

  // Agreement state
  const [agreements, setAgreements] = useState<ApiAgreement[]>([]);
  const [isSendingAgreement, setIsSendingAgreement] = useState(false);
  const [agreementError, setAgreementError] = useState<string | null>(null);
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);

  // Payment state
  const [isSendingPayment, setIsSendingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Load client data from API
  useEffect(() => {
    async function loadClient() {
      setIsLoading(true);
      try {
        const data = await getClientById(params.clientId);
        if (data) {
          setApiClient(data);
          setClient(apiClientToMockFormat(data));
        } else {
          // If API returns null, try mock data as fallback
          const mockClient = getFullClientById(params.clientId);
          if (mockClient) {
            setClient(mockClient);
          }
        }
      } catch (error) {
        console.error('Failed to load client:', error);
        // Fallback to mock data
        const mockClient = getFullClientById(params.clientId);
        if (mockClient) {
          setClient(mockClient);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadClient();
  }, [params.clientId]);

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

  // Load agreements from backend
  useEffect(() => {
    async function loadAgreements() {
      try {
        const data = await listClientAgreements(params.clientId);
        console.log('[Page] Loaded agreements:', data);
        console.log(
          '[Page] TodoLists:',
          data.flatMap(a => a.todoLists || [])
        );
        console.log(
          '[Page] Todos:',
          data.flatMap(a => a.todoLists?.flatMap(tl => tl.todos || []) || [])
        );
        setAgreements(data);
      } catch (error) {
        console.error('[Page] Failed to load agreements:', error);
      }
    }
    if (params.clientId) loadAgreements();
  }, [params.clientId]);

  // Handler for sending agreement from modal
  const handleSendAgreement = async (formData: AgreementFormData) => {
    setIsSendingAgreement(true);
    setAgreementError(null);

    try {
      const result = await sendAgreementToClient({
        clientId: params.clientId,
        customTitle: formData.title,
        description: formData.description,
        price: formData.price,
        todos: formData.todos,
      });

      if (result.success) {
        // Store ceremony URL in localStorage for client to retrieve
        // (Backend doesn't store this field yet)
        if (result.agreementId && result.ceremonyUrl) {
          const ceremonyUrls = JSON.parse(localStorage.getItem('ariex_ceremony_urls') || '{}');
          ceremonyUrls[result.agreementId] = result.ceremonyUrl;
          localStorage.setItem('ariex_ceremony_urls', JSON.stringify(ceremonyUrls));
        }

        // Reload agreements from backend to get the real data
        try {
          const data = await listClientAgreements(params.clientId);
          // Enrich with stored ceremony URLs
          const enrichedData = data.map(a => {
            const storedUrls = JSON.parse(localStorage.getItem('ariex_ceremony_urls') || '{}');
            return {
              ...a,
              signatureCeremonyUrl: a.signatureCeremonyUrl || storedUrls[a.id],
            };
          });
          setAgreements(enrichedData);
        } catch {
          // Fallback: add temp agreement with new status
          setAgreements([
            {
              id: result.agreementId || 'temp',
              name: formData.title,
              description: formData.description,
              price: formData.price,
              status: 'DRAFT',
              clientId: params.clientId,
              strategistId: '',
              signatureCeremonyUrl: result.ceremonyUrl,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              todoLists: [],
            },
          ]);
        }
        setIsAgreementModalOpen(false);
      } else {
        setAgreementError(result.error || 'Failed to send agreement');
      }
    } catch (error) {
      console.error('Failed to send agreement:', error);
      setAgreementError('An unexpected error occurred');
    } finally {
      setIsSendingAgreement(false);
    }
  };

  // Get the active agreement (most recent)
  const activeAgreement = agreements[0];

  // Compute agreement status from real data
  // Status: DRAFT (created) -> ACTIVE (signed) -> COMPLETED
  const hasAgreementSent = agreements.some(
    a => a.status === 'DRAFT' || a.status === 'ACTIVE' || a.status === 'COMPLETED'
  );
  const hasAgreementSigned = agreements.some(
    a => a.status === 'ACTIVE' || a.status === 'COMPLETED'
  );

  // Get the signed agreement for payment
  const signedAgreement = agreements.find(
    a => a.status === 'ACTIVE' || a.status === 'COMPLETED'
  );
  const hasPaymentSent =
    signedAgreement?.paymentStatus === 'pending' || signedAgreement?.paymentLink;
  const hasPaymentReceived = signedAgreement?.paymentStatus === 'paid';

  // Compute document todos from agreement (excluding the signing todo)
  const allTodos =
    activeAgreement?.todoLists?.flatMap(list => list.todos || []) || [];
  const documentTodos = allTodos.filter(
    todo => !todo.title.toLowerCase().includes('sign')
  );
  const completedDocTodos = documentTodos.filter(
    todo =>
      todo.status === 'completed' ||
      todo.document?.uploadStatus === 'FILE_UPLOADED'
  );
  const totalDocTodos = documentTodos.length;
  const completedDocCount = completedDocTodos.length;
  const hasDocumentsRequested = totalDocTodos > 0;
  const hasAllDocumentsUploaded = totalDocTodos > 0 && completedDocCount >= totalDocTodos;

  // Handler for sending payment link
  const handleSendPaymentLink = async () => {
    if (isSendingPayment || !signedAgreement) return;

    setIsSendingPayment(true);
    setPaymentError(null);

    try {
      // For now, we'll attach a payment amount to the agreement
      // In production, this would create a Stripe payment link
      const { attachPayment } = await import('@/lib/api/strategist.api');

      const success = await attachPayment(signedAgreement.id, {
        amount: 499, // Default onboarding fee
        paymentLink: `https://buy.stripe.com/test_example?client=${params.clientId}`, // Placeholder
      });

      if (success) {
        // Reload agreements
        const data = await listClientAgreements(params.clientId);
        setAgreements(data);
      } else {
        setPaymentError('Failed to send payment link');
      }
    } catch (error) {
      console.error('Failed to send payment link:', error);
      setPaymentError('An unexpected error occurred');
    } finally {
      setIsSendingPayment(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Show not found state
  if (!client) {
    return (
      <section className="flex flex-col items-center justify-center gap-4 p-12">
        <Warning className="h-12 w-12 text-amber-500" weight="duotone" />
        <h1 className="text-xl font-semibold text-zinc-900">Client Not Found</h1>
        <p className="text-zinc-500">
          The client with ID &quot;{params.clientId}&quot; does not exist.
        </p>
        <Button onClick={() => router.push('/strategist/dashboard')}>Back to Dashboard</Button>
      </section>
    );
  }

  const completedOnboardingTasks = client.onboardingTasks.filter(
    t => t.status === 'completed'
  ).length;
  const totalOnboardingTasks = client.onboardingTasks.length;
  const pendingPayments = client.payments.filter(p => p.status === 'pending');
  const pendingSignatures = client.documents.filter(d => d.signatureStatus === 'SENT');
  const activeTodos = client.todos.filter(
    t => t.status === 'pending' || t.status === 'in_progress'
  );
  const recentDocuments = client.documents
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 3);

  // ============================================================================
  // 5-STEP TIMELINE COMPLETION STATES (from shared module)
  // ============================================================================
  const timeline = getClientTimelineAndStatus(client);
  const {
    step1Complete,
    step2Complete,
    step3Complete,
    step4Complete,
    step5Complete,
    step2Sent,
    step3Sent,
    step4Sent,
    step5Sent,
    statusKey,
    statusConfig,
  } = timeline;

  // Additional data for timeline display
  const agreementTask = client.onboardingTasks.find(t => t.type === 'sign_agreement');
  const docsTask = client.onboardingTasks.find(t => t.type === 'upload_documents');
  const payment = client.payments[0];
  const strategyDoc = client.documents.find(
    d => d.category === 'contract' && d.originalName.toLowerCase().includes('strategy')
  );

  // Icon mapping for status badge
  const statusIconMap: Record<ClientStatusKey, typeof Clock> = {
    awaiting_agreement: Clock,
    awaiting_payment: Clock,
    awaiting_documents: Clock,
    ready_for_strategy: Strategy,
    awaiting_signature: Clock,
    active: Check,
  };
  const PlanIcon = statusIconMap[statusKey];

  return (
    <div className="flex min-h-full flex-col bg-white">
      {/* Main scrollable content */}
      <div className="relative flex-1">
        {/* Back Button */}
        <div className="absolute top-4 left-4 mb-4 flex items-center gap-2">
          <div
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-700"
            onClick={() => router.back()}
          >
            <ArrowLeftIcon weight="bold" className="h-4 w-4" />
          </div>
        </div>
        <div className="relative z-40 mx-auto w-full max-w-2xl px-4 pt-22">
          {/* Banner color */}
          <div className="absolute top-0 left-0 -z-10 h-24 w-full bg-zinc-50" />

          {/* Header Section */}
          <div className="flex flex-col gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-2xl font-medium text-white">
              {getInitials(client.user.name)}
            </div>
            <h1 className="z-20 text-2xl font-semibold">{client.user.name}</h1>

            {/* Action Buttons */}
            <div className="mb-6 flex w-full items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* Strategy Plan Status */}
                <div
                  className={`flex items-center gap-1.5 rounded-lg border border-dashed ${statusConfig.borderClassName} px-2 py-1 text-sm font-medium ${statusConfig.textClassName}`}
                >
                  <PlanIcon className="h-4 w-4" />
                  <span>{statusConfig.label}</span>
                </div>

                {/* Add to Folder Button */}
                <button className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
                  <span>Add to folder</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              <button
                disabled={!step4Complete}
                onClick={() => step4Complete && setIsStrategySheetOpen(true)}
                className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-sm font-medium transition-colors ${
                  step4Complete
                    ? 'cursor-pointer border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400'
                }`}
              >
                <StarFourIcon weight="fill" className="h-4 w-4" />
                <span>Strategy</span>
              </button>
            </div>

            {/* About Section */}
            <div className="mb-4 rounded-xl bg-zinc-50 p-5">
              {/* Header */}
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm text-zinc-500">About</span>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-white">
                  {getInitials(client.user.name)}
                </div>
                <span className="text-sm font-medium text-zinc-500">{client.user.name}</span>
              </div>

              {/* Bio/Description */}
              <p className="mb-5 text-[15px] leading-relaxed text-zinc-700">
                {client.user.name} is the owner of {client.profile.businessName || 'a business'},
                {client.profile.businessType ? ` a ${client.profile.businessType}` : ''} based in{' '}
                {client.profile.city}, {client.profile.state}.
                {client.profile.estimatedIncome
                  ? ` Estimated annual income of ${formatCurrency(client.profile.estimatedIncome)}.`
                  : ''}
                {client.profile.filingStatus
                  ? ` Filing status: ${client.profile.filingStatus.replace('_', ' ')}.`
                  : ''}
              </p>

              {/* Contact Links */}
              <div className="flex flex-col gap-2.5">
                <a
                  href={`mailto:${client.user.email}`}
                  className="flex items-center gap-2.5 text-sm text-zinc-600 hover:text-zinc-900"
                >
                  <EnvelopeIcon weight="fill" className="h-4 w-4 text-zinc-400" />
                  <span className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500">
                    {client.user.email}
                  </span>
                </a>

                {client.profile.phoneNumber && (
                  <a
                    href={`tel:${client.profile.phoneNumber}`}
                    className="flex items-center gap-2.5 text-sm text-zinc-600 hover:text-zinc-900"
                  >
                    <PhoneIcon weight="fill" className="h-4 w-4 text-zinc-400" />
                    <span className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500">
                      {client.profile.phoneNumber}
                    </span>
                  </a>
                )}

                {client.profile.businessName && (
                  <div className="flex items-center gap-2.5 text-sm text-zinc-600">
                    <BuildingsIcon weight="fill" className="h-4 w-4 text-zinc-400" />
                    <span>{client.profile.businessName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Timeline
                ═══════════════════════════════════════════════════════════════
                TIMELINE PATTERN (applies to ALL clients):
                
                1. ACCOUNT CREATED - When strategist creates the client account
                2. AGREEMENT PHASE - Service agreement sent → signed
                3. PAYMENT PHASE - Payment link sent → payment received  
                4. DOCUMENTS PHASE - Initial documents requested → uploaded
                5. STRATEGY PHASE - Strategy created → sent for signature → signed
                
                BUTTON RULES:
                - Buttons only show if PREVIOUS step is completed
                - Emerald button = primary action needed (strategist hasn't acted)
                - Zinc button = follow-up action (strategist already acted, waiting on client)
                ═══════════════════════════════════════════════════════════════
            */}
            {(() => {
              // Uses step variables computed at component level (step2Complete, step3Complete, etc.)
              // Step 1 is always complete
              const step1Complete = true;
              const uploadedCount = client.documents.filter(d => d.category !== 'contract').length;

              return (
                <div className="mb-6">
                  <h2 className="mb-4 text-base font-medium text-zinc-900">Activity</h2>
                  <div className="relative pl-6">
                    <div className="flex flex-col gap-0">
                      {/* Step 1: Account Created - Always complete */}
                      <div className="relative flex gap-4 pb-6">
                        <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        </div>
                        {/* Line to next step - emerald if step 1 complete (always) */}
                        <div className="absolute top-5 bottom-2 -left-[19px] w-[2px] bg-emerald-200" />
                        <div className="flex flex-1 flex-col">
                          <span className="font-medium text-zinc-900">
                            Account created for {client.profile.businessName || client.user.name}
                          </span>
                          <span className="text-sm text-zinc-500">
                            Client onboarding initiated by strategist
                          </span>
                          <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                            {formatDate(client.user.createdAt)} · Created by Alex Morgan
                          </span>
                        </div>
                      </div>

                      {/* Step 2: Agreement Phase */}
                      <div className="relative flex gap-4 pb-6">
                        <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                          <div
                            className={`h-2 w-2 rounded-full ${hasAgreementSent || hasAgreementSigned ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                          />
                        </div>
                        {/* Line to next step - emerald only if step 2 complete */}
                        <div
                          className={`absolute top-5 bottom-2 -left-[19px] w-[2px] ${hasAgreementSigned ? 'bg-emerald-200' : 'bg-zinc-200'}`}
                        />
                        <div className="flex flex-1 flex-col">
                          <span className="font-medium text-zinc-900">
                            {hasAgreementSigned
                              ? 'Service agreement signed'
                              : hasAgreementSent
                                ? 'Agreement sent for signature'
                                : 'Agreement pending'}
                          </span>
                          <span className="text-sm text-zinc-500">
                            {hasAgreementSigned
                              ? 'Ariex Service Agreement 2024 was signed '
                              : hasAgreementSent
                                ? 'Waiting for client to review and sign'
                                : 'Send service agreement to client'}
                          </span>
                          <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                            {formatDate(agreementTask?.updatedAt || client.user.createdAt)}
                          </span>
                          {/* Button: emerald if strategist needs to act, zinc if already acted (resend) */}
                          {step1Complete && !hasAgreementSigned && (
                            <button
                              onClick={() => setIsAgreementModalOpen(true)}
                              className={`mt-2 flex w-fit items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${
                                hasAgreementSent
                                  ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {hasAgreementSent ? 'Resend agreement' : 'Send agreement'}
                            </button>
                          )}
                          {agreementError && (
                            <span className="mt-1 text-xs text-red-500">{agreementError}</span>
                          )}
                        </div>
                      </div>

                      {/* Step 3: Payment Phase */}
                      <div className="relative flex gap-4 pb-6">
                        <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                          <div
                            className={`h-2 w-2 rounded-full ${step3Sent || step3Complete ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                          />
                        </div>
                        {/* Line to next step - emerald only if step 3 complete */}
                        <div
                          className={`absolute top-5 bottom-2 -left-[19px] w-[2px] ${step3Complete ? 'bg-emerald-200' : 'bg-zinc-200'}`}
                        />
                        <div className="flex flex-1 flex-col">
                          <span className="font-medium text-zinc-900">
                            {step3Complete
                              ? `Payment received · ${formatCurrency(payment?.amount || 499)}`
                              : step3Sent
                                ? `Payment pending · ${formatCurrency(payment?.amount || 499)}`
                                : 'Payment link pending'}
                          </span>
                          <span className="text-sm text-zinc-500">
                            {step3Complete
                              ? `${payment?.description || 'Onboarding Fee'} via ${payment?.paymentMethod || 'Stripe'}`
                              : step3Sent
                                ? 'Awaiting payment via Stripe link'
                                : 'Send payment link to client'}
                          </span>
                          <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                            {payment?.paidAt
                              ? formatDate(payment.paidAt)
                              : payment?.dueDate
                                ? `Due ${formatDate(payment.dueDate)}`
                                : formatDate(client.user.createdAt)}
                          </span>
                          {/* Button: emerald if strategist needs to act, zinc if already acted (reminder) */}
                          {step2Complete && !step3Complete && (
                            <button
                              className={`mt-2 w-fit rounded px-2 py-1 text-xs font-semibold ${
                                step3Sent
                                  ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {step3Sent ? 'Send reminder' : 'Send payment link'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Step 4: Documents Phase (driven by agreement todos) */}
                      <div className="relative flex gap-4 pb-6">
                        <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                          <div
                            className={`h-2 w-2 rounded-full ${hasDocumentsRequested || hasAllDocumentsUploaded ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                          />
                        </div>
                        {/* Line to next step - emerald only if all docs uploaded */}
                        <div
                          className={`absolute top-5 bottom-2 -left-[19px] w-[2px] ${hasAllDocumentsUploaded ? 'bg-emerald-200' : 'bg-zinc-200'}`}
                        />
                        <div className="flex flex-1 flex-col">
                          <span className="font-medium text-zinc-900">
                            {hasAllDocumentsUploaded
                              ? `Documents uploaded · ${completedDocCount}/${totalDocTodos} complete`
                              : hasDocumentsRequested
                                ? `Documents pending · ${completedDocCount}/${totalDocTodos} uploaded`
                                : 'Documents'}
                          </span>
                          <span className="text-sm text-zinc-500">
                            {hasAllDocumentsUploaded
                              ? 'All requested documents have been received'
                              : hasDocumentsRequested
                                ? 'Waiting for client to upload requested documents'
                                : 'Request documents from client'}
                          </span>
                          {/* Show individual todo items */}
                          {hasDocumentsRequested && documentTodos.length > 0 && (
                            <div className="mt-2 flex flex-col gap-1.5">
                              {documentTodos.map(todo => {
                                const isCompleted =
                                  todo.status === 'completed' ||
                                  todo.document?.uploadStatus === 'FILE_UPLOADED';
                                const uploadedFile = todo.document?.files?.[0];

                                return (
                                  <div
                                    key={todo.id}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    {isCompleted ? (
                                      <CheckIcon
                                        weight="bold"
                                        className="h-3.5 w-3.5 shrink-0 text-emerald-500"
                                      />
                                    ) : (
                                      <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-zinc-300" />
                                    )}
                                    <div className="flex flex-1 flex-col">
                                      <span
                                        className={
                                          isCompleted
                                            ? 'text-zinc-600 line-through'
                                            : 'text-zinc-600'
                                        }
                                      >
                                        {todo.title}
                                      </span>
                                      {uploadedFile && (
                                        <a
                                          href={uploadedFile.downloadUrl || '#'}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="mt-0.5 flex items-center gap-1 text-emerald-600 hover:text-emerald-700 hover:underline"
                                        >
                                          <FileArrowDownIcon
                                            weight="fill"
                                            className="h-3 w-3"
                                          />
                                          <span className="truncate max-w-[180px]">
                                            {uploadedFile.originalName}
                                          </span>
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <span className="mt-2 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                            {formatDate(docsTask?.updatedAt || client.user.createdAt)}
                          </span>
                          {/* Button only shows if agreement is signed (step3 complete) */}
                          {hasAgreementSigned && !hasAllDocumentsUploaded && (
                            <button
                              className={`mt-2 w-fit rounded px-2 py-1 text-xs font-semibold ${
                                hasDocumentsRequested
                                  ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {hasDocumentsRequested ? 'Send reminder' : 'Request documents'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Step 5: Strategy Phase */}
                      <div className="relative flex gap-4">
                        <div className="absolute top-1.5 -left-6 flex h-3 w-3 items-center justify-center">
                          <div
                            className={`h-2 w-2 rounded-full ${step5Sent || step5Complete ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                          />
                        </div>
                        <div className="flex flex-1 flex-col">
                          <span className="font-medium text-zinc-900">
                            {step5Complete
                              ? 'Tax strategy approved & signed'
                              : step5Sent
                                ? 'Strategy sent for approval'
                                : 'Tax strategy pending'}
                          </span>
                          <span className="text-sm text-zinc-500">
                            {step5Complete
                              ? strategyDoc?.originalName.replace(/\.[^/.]+$/, '') ||
                                'Tax Strategy Plan'
                              : step5Sent
                                ? 'Awaiting client signature on tax strategy document'
                                : 'Ready to create personalized tax strategy'}
                          </span>
                          <span className="mt-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
                            {strategyDoc?.signedAt
                              ? formatDate(strategyDoc.signedAt)
                              : strategyDoc?.createdAt
                                ? formatDate(strategyDoc.createdAt)
                                : 'Not started'}
                          </span>
                          {/* Button: emerald if strategist needs to act, zinc if already acted (resend) */}
                          {step4Complete && !step5Complete && (
                            <button
                              className={`mt-2 w-fit rounded px-2 py-1 text-xs font-semibold ${
                                step5Sent
                                  ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {step5Sent ? 'Resend strategy' : 'Create strategy'}
                            </button>
                          )}
                          {step5Complete && (
                            <button className="mt-2 w-fit rounded bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-200">
                              View strategy
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div>
              <div className="flex w-full items-center justify-between">
                <h2 className="mb-8 text-base font-medium text-zinc-900">Documents</h2>
                <Button variant="outline" size="sm">
                  Add Document
                </Button>
              </div>

              {/* Empty State */}
              {client.documents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  {/* Stacked Documents Icon */}
                  <div className="relative mb-6 h-28 w-28">
                    {/* Back document (rotated left) */}
                    <div className="absolute top-2 left-2 h-20 w-16 -rotate-6 rounded-lg border border-zinc-200 bg-white shadow-sm">
                      <div className="mt-4 space-y-1.5 px-2.5">
                        <div className="h-1.5 w-full rounded-full bg-zinc-200" />
                        <div className="h-1.5 w-3/4 rounded-full bg-zinc-200" />
                        <div className="h-1.5 w-full rounded-full bg-zinc-200" />
                      </div>
                    </div>
                    {/* Front document (rotated right) */}
                    <div className="absolute top-0 right-2 h-20 w-16 rotate-6 rounded-lg border border-zinc-200 bg-white shadow-sm">
                      <div className="mt-4 space-y-1.5 px-2.5">
                        <div className="h-1.5 w-full rounded-full bg-zinc-200" />
                        <div className="h-1.5 w-2/3 rounded-full bg-zinc-200" />
                        <div className="h-1.5 w-full rounded-full bg-zinc-200" />
                        <div className="h-1.5 w-1/2 rounded-full bg-zinc-200" />
                      </div>
                      {/* Small watermark */}
                      <div className="absolute right-2 bottom-1 text-xs font-medium text-zinc-300">
                        ariex
                      </div>
                    </div>
                  </div>
                  <p className="mb-1.5 text-lg font-semibold text-zinc-800">No documents yet</p>
                  <p className="text-sm text-zinc-400">
                    When this client uploads a document, it will show up here
                  </p>
                </div>
              )}

              {/* Documents List */}
              {client.documents.length > 0 && (
                <div className="">
                  {groupDocumentsByDate(
                    [...client.documents].sort(
                      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
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

                              {/* Document Row - clickable area */}
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
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* View All Button */}
                  <div className="mt-2 flex justify-center pb-8">
                    <Button
                      variant="outline"
                      onClick={() =>
                        router.push(`/strategist/clients/${params.clientId}/documents`)
                      }
                    >
                      View all {client.documents.length} documents
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Sheet */}
      <StrategySheet
        client={client}
        isOpen={isStrategySheetOpen}
        onClose={() => setIsStrategySheetOpen(false)}
      />

      {/* Agreement Modal */}
      <AgreementModal
        isOpen={isAgreementModalOpen}
        onClose={() => setIsAgreementModalOpen(false)}
        onSubmit={handleSendAgreement}
        clientName={client.user.name || client.user.email || 'Client'}
        isLoading={isSendingAgreement}
        error={agreementError}
      />
    </div>
  );
}
