'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useUiStore } from '@/contexts/ui/UiStore';
import { Button } from '@/components/ui/button';
import { getFullClientById, FullClientMock } from '@/lib/mocks/client-full';
import {
  getClientById,
  type ApiClient,
  type ApiAgreement,
  type ApiDocument,
  listClientAgreements,
  listAgreementDocuments,
  getAgreementEnvelopeStatus,
  getDownloadUrl,
  createCharge,
  generatePaymentLink,
  attachPayment,
  getChargesForAgreement,
  deleteTodo,
  updateDocumentAcceptance,
  updateAgreementStatus,
  deleteDocument,
} from '@/lib/api/strategist.api';
import { sendAgreementToClient } from '@/lib/api/agreements.actions';
import {
  sendStrategyToClient,
  completeAgreement,
  getSignedStrategyUrl,
} from '@/lib/api/strategies.actions';
import { AgreementSheet, type AgreementSendData } from '@/components/agreements/agreement-sheet';
import { StrategySheet, type StrategySendData } from '@/components/strategy/strategy-sheet';
import { RequestDocumentsModal } from '@/components/documents/request-documents-modal';
import { EmptyDocumentsIllustration } from '@/components/ui/empty-documents-illustration';
import { ClientFloatingChat } from '@/components/chat/client-floating-chat';
import { CLIENT_STATUS_CONFIG, type ClientStatusKey } from '@/lib/client-status';
import {
  AgreementStatus,
  isAgreementSigned,
  isAgreementPaid,
  areTodosCompleted,
  logAgreements,
  logAgreementStatus,
} from '@/types/agreement';
import { AcceptanceStatus } from '@/types/document';
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
  X as XIcon,
  CreditCard,
  CurrencyDollar,
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
import { ChevronDown, Loader2 } from 'lucide-react';

interface Props {
  params: { clientId: string };
}

import {
  formatCurrency,
  formatDate,
  getInitials,
  formatRelativeTime,
  groupDocumentsByDate,
} from '@/contexts/strategist-contexts/client-management/utils/formatters';

// Loading spinner component
function LoadingState() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
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

  // 🔵 Debug: Log page mount
  useEffect(() => {
    console.log('\n🔵🔵🔵 STRATEGIST PAGE LOADED 🔵🔵🔵');
    console.log('🔵 [STRATEGIST] Client ID:', params.clientId);
  }, [params.clientId]);
  const [client, setClient] = useState<FullClientMock | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isStrategySheetOpen, setIsStrategySheetOpen] = useState(false);
  const { setSelection, setDownloadingSelection } = useUiStore();

  // Agreement state
  const [agreements, setAgreements] = useState<ApiAgreement[]>([]);
  const [isLoadingAgreements, setIsLoadingAgreements] = useState(true);
  const [isSendingAgreement, setIsSendingAgreement] = useState(false);
  const [agreementError, setAgreementError] = useState<string | null>(null);
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);

  // Payment state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSendingPayment, setIsSendingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(499);
  const [existingCharge, setExistingCharge] = useState<{
    id: string;
    paymentLink?: string;
    status: string;
    amount?: number;
  } | null>(null);
  const [isLoadingCharges, setIsLoadingCharges] = useState(true);

  // Document request state
  const [isRequestDocsModalOpen, setIsRequestDocsModalOpen] = useState(false);

  // Delete todo state
  const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);
  const [todoToDelete, setTodoToDelete] = useState<{ id: string; title: string } | null>(null);

  // Document acceptance state
  const [acceptingDocId, setAcceptingDocId] = useState<string | null>(null);
  const [decliningDocId, setDecliningDocId] = useState<string | null>(null);

  // Client documents from API
  const [clientDocuments, setClientDocuments] = useState<ApiDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [isDownloadingSelected, setIsDownloadingSelected] = useState(false);

  // Advance to strategy state
  const [isAdvancingToStrategy, setIsAdvancingToStrategy] = useState(false);

  // Strategy sending state
  const [isSendingStrategy, setIsSendingStrategy] = useState(false);
  const [strategyError, setStrategyError] = useState<string | null>(null);

  // Complete agreement state
  const [isCompletingAgreement, setIsCompletingAgreement] = useState(false);

  // SignatureAPI sync state - tracks actual envelope status from SignatureAPI
  const [envelopeStatuses, setEnvelopeStatuses] = useState<Record<string, string>>({});
  const hasSyncedEnvelopesRef = useRef(false);

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

  // Handle downloading selected documents
  const handleDownloadSelected = useCallback(async () => {
    console.log('[UI] Downloading selected documents:', Array.from(selectedDocs));
    setIsDownloadingSelected(true);
    setDownloadingSelection(true);
    try {
      for (const docId of selectedDocs) {
        try {
          console.log('[UI] Fetching download URL for:', docId);
          const url = await getDownloadUrl(docId);
          console.log('[UI] Got URL:', url);
          if (url) {
            // Open download in new tab
            window.open(url, '_blank');
          } else {
            console.error('[UI] No download URL returned for:', docId);
          }
        } catch (error) {
          console.error('Failed to download document:', docId, error);
        }
      }
    } finally {
      setIsDownloadingSelected(false);
      setDownloadingSelection(false);
    }
  }, [selectedDocs, setDownloadingSelection]);

  // Handle deleting selected documents
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const handleDeleteSelected = useCallback(async () => {
    if (selectedDocs.size === 0) return;

    const confirmMessage =
      selectedDocs.size === 1
        ? 'Are you sure you want to delete this document?'
        : `Are you sure you want to delete ${selectedDocs.size} documents?`;

    if (!window.confirm(confirmMessage)) return;

    console.log('[UI] Deleting selected documents:', Array.from(selectedDocs));
    setIsDeletingSelected(true);

    let deletedCount = 0;
    for (const docId of selectedDocs) {
      try {
        const success = await deleteDocument(docId);
        if (success) {
          deletedCount++;
        }
      } catch (error) {
        console.error('Failed to delete document:', docId, error);
      }
    }

    // Clear selection and refresh data
    setSelectedDocs(new Set());
    setIsDeletingSelected(false);

    // Refresh client data to reflect deletions
    if (deletedCount > 0) {
      console.log(`[UI] Deleted ${deletedCount} documents, refreshing data...`);
      // Reload agreements to get updated document list
      const data = await listClientAgreements(params.clientId);
      setAgreements(data);
    }
  }, [selectedDocs, params.clientId]);

  // Sync selection state with UI store
  useEffect(() => {
    setSelection(
      selectedDocs.size,
      () => setSelectedDocs(new Set()),
      selectedDocs.size > 0 ? handleDownloadSelected : null,
      selectedDocs.size > 0 ? handleDeleteSelected : null
    );
  }, [selectedDocs.size, setSelection, handleDownloadSelected, handleDeleteSelected]);

  // Load agreements from backend
  useEffect(() => {
    async function loadAgreements() {
      setIsLoadingAgreements(true);
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

        // 🔵 Debug: Log agreements for strategist
        logAgreements(
          'strategist',
          data.map(a => ({
            id: a.id,
            status: a.status as AgreementStatus,
            name: a.name,
          })),
          `Client ${params.clientId}`
        );

        // 🔵 Debug: Log each agreement status individually
        data.forEach(a => {
          console.log(`🔵 [STRATEGIST] Agreement "${a.name}" status: ${a.status}`);
        });

        setAgreements(data);
      } catch (error) {
        console.error('[Page] Failed to load agreements:', error);
      } finally {
        setIsLoadingAgreements(false);
      }
    }
    if (params.clientId) loadAgreements();
  }, [params.clientId]);

  // Load documents for the first/active agreement
  useEffect(() => {
    async function loadDocuments() {
      // Find the first agreement to load documents for
      const activeAgreement = agreements[0];
      if (!activeAgreement) {
        setIsLoadingDocuments(false);
        return;
      }

      setIsLoadingDocuments(true);
      try {
        const docs = await listAgreementDocuments(activeAgreement.id);
        setClientDocuments(docs);
      } catch (error) {
        console.error('[Page] Failed to load documents:', error);
      } finally {
        setIsLoadingDocuments(false);
      }
    }
    if (agreements.length > 0) {
      loadDocuments();
    }
  }, [agreements]);

  // Sync envelope statuses from SignatureAPI (the SOURCE OF TRUTH for signatures)
  // This is needed because the webhook may fail to update the backend
  useEffect(() => {
    async function syncEnvelopeStatuses() {
      if (hasSyncedEnvelopesRef.current || agreements.length === 0) return;
      hasSyncedEnvelopesRef.current = true;

      const statuses: Record<string, string> = {};

      for (const agreement of agreements) {
        // Get envelope ID from agreement
        const envelopeId = agreement.signatureEnvelopeId;

        if (envelopeId) {
          console.log('[Page] Checking envelope status via server action:', envelopeId);
          try {
            const result = await getAgreementEnvelopeStatus(agreement.id, envelopeId);
            if (result.status) {
              statuses[agreement.id] = result.status;
              console.log('[Page] Envelope', envelopeId, 'status:', result.status);

              // 🔵 Debug: Log envelope status
              logAgreementStatus(
                'strategist',
                agreement.id,
                agreement.status as AgreementStatus,
                `Envelope: ${result.status}`
              );

              // If completed, reload agreements to get updated backend status
              if (result.status === 'completed') {
                console.log('[Page] Envelope completed - will reload agreements');
              }
            }
          } catch (e) {
            console.error('[Page] Failed to get envelope status:', e);
          }
        }
      }

      if (Object.keys(statuses).length > 0) {
        setEnvelopeStatuses(statuses);

        // Reload agreements if any envelope was completed (backend might have been updated)
        if (Object.values(statuses).some(s => s === 'completed')) {
          const data = await listClientAgreements(params.clientId);
          setAgreements(data);
        }
      }
    }

    syncEnvelopeStatuses();
  }, [agreements, params.clientId]);

  // Fetch charges for the signed agreement (to check if payment link exists)
  useEffect(() => {
    async function fetchCharges() {
      setIsLoadingCharges(true);

      // Find signed agreement
      const signed = agreements.find(a => isAgreementSigned(a.status));
      if (!signed) {
        setExistingCharge(null);
        setIsLoadingCharges(false);
        return;
      }

      try {
        const charges = await getChargesForAgreement(signed.id);
        console.log('🔵 [STRATEGIST] Fetched charges for agreement:', signed.id, charges);

        // Get pending charge or most recent
        const pendingCharge = charges.find(c => c.status === 'pending') || charges[0];
        setExistingCharge(pendingCharge || null);
      } catch (error) {
        console.error('[Page] Failed to fetch charges:', error);
        setExistingCharge(null);
      } finally {
        setIsLoadingCharges(false);
      }
    }

    fetchCharges();
  }, [agreements]);

  // Handler for sending agreement from Agreement Sheet
  const handleSendAgreement = async (data: AgreementSendData) => {
    setIsSendingAgreement(true);
    setAgreementError(null);

    try {
      const result = await sendAgreementToClient({
        clientId: params.clientId,
        customTitle: data.title,
        description: data.description,
        price: data.price,
        todos: data.todos,
        markdownContent: data.markdownContent,
        pages: data.pages, // Legacy: editor pages with content
        pdfBase64: data.pdfBase64, // New: client-side generated PDF as base64
        totalPages: data.totalPages, // New: total page count for signature positioning
      });

      if (result.success) {
        // 🔵 Debug: Log agreement sent
        if (result.agreementId) {
          logAgreementStatus(
            'strategist',
            result.agreementId,
            AgreementStatus.PENDING_SIGNATURE,
            'Agreement sent to client'
          );
        }

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
              name: data.title,
              description: data.description,
              price: data.price,
              status: AgreementStatus.PENDING_SIGNATURE,
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

  // Handler for accepting a document
  const handleAcceptDocument = async (documentId: string) => {
    setAcceptingDocId(documentId);
    try {
      const success = await updateDocumentAcceptance(
        documentId,
        AcceptanceStatus.ACCEPTED_BY_STRATEGIST
      );
      if (success) {
        // Reload agreements to get updated state
        const data = await listClientAgreements(params.clientId);
        setAgreements(data);
      }
    } catch (error) {
      console.error('Failed to accept document:', error);
    } finally {
      setAcceptingDocId(null);
    }
  };

  // Handler for declining a document
  const handleDeclineDocument = async (documentId: string) => {
    setDecliningDocId(documentId);
    try {
      const success = await updateDocumentAcceptance(
        documentId,
        AcceptanceStatus.REJECTED_BY_STRATEGIST
      );
      if (success) {
        // Reload agreements to get updated state
        const data = await listClientAgreements(params.clientId);
        setAgreements(data);
      }
    } catch (error) {
      console.error('Failed to decline document:', error);
    } finally {
      setDecliningDocId(null);
    }
  };

  // Get the most recent agreement (by createdAt date)
  const sortedAgreements = [...agreements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const activeAgreement = sortedAgreements[0];

  // Debug: Log which agreement is active
  if (activeAgreement) {
    const todoCount = activeAgreement.todoLists?.flatMap(l => l.todos || []).length || 0;
    console.log(
      '[StrategistClient] Active agreement:',
      activeAgreement.id,
      'status:',
      activeAgreement.status,
      'created:',
      activeAgreement.createdAt,
      'total todos:',
      todoCount
    );
  }

  // Compute all todos from agreement first (needed for status checks)
  const allTodos = activeAgreement?.todoLists?.flatMap(list => list.todos || []) || [];

  // Compute agreement status from real data using new AgreementStatus enum
  //
  // Status Flow:
  // DRAFT -> PENDING_SIGNATURE -> PENDING_PAYMENT -> PENDING_TODOS_COMPLETION -> PENDING_STRATEGY -> COMPLETED
  //
  const hasAgreementSent = agreements.some(
    a => a.status !== AgreementStatus.DRAFT && a.status !== AgreementStatus.CANCELLED
  );

  // Check SignatureAPI envelope status (the REAL source of truth for signature)
  const envelopeIsCompleted =
    activeAgreement && envelopeStatuses[activeAgreement.id] === 'completed';

  // Agreement is signed if status is beyond PENDING_SIGNATURE
  const hasAgreementSigned =
    agreements.some(a => isAgreementSigned(a.status)) || envelopeIsCompleted;

  // Get the active agreement for payment (signed or in payment flow)
  const signedAgreement =
    agreements.find(a => isAgreementSigned(a.status)) ||
    (hasAgreementSigned ? activeAgreement : null);

  // Handler for advancing agreement to PENDING_STRATEGY status
  const handleAdvanceToStrategy = async () => {
    if (!signedAgreement) return;

    setIsAdvancingToStrategy(true);
    try {
      console.log('🔵 [STRATEGIST] Advancing agreement to PENDING_STRATEGY:', signedAgreement.id);
      const success = await updateAgreementStatus(
        signedAgreement.id,
        AgreementStatus.PENDING_STRATEGY
      );

      if (success) {
        console.log('🔵 [STRATEGIST] Agreement advanced to PENDING_STRATEGY');
        logAgreementStatus(
          'strategist',
          signedAgreement.id,
          AgreementStatus.PENDING_STRATEGY,
          'All documents accepted - ready for strategy'
        );

        // Reload agreements to get updated state
        const data = await listClientAgreements(params.clientId);
        setAgreements(data);
      } else {
        console.error('🔵 [STRATEGIST] Failed to advance agreement to PENDING_STRATEGY');
      }
    } catch (error) {
      console.error('Failed to advance to strategy:', error);
    } finally {
      setIsAdvancingToStrategy(false);
    }
  };

  // Handler for sending strategy to client for signature
  const handleSendStrategy = async (data: StrategySendData) => {
    if (!signedAgreement || !apiClient) return;

    setIsSendingStrategy(true);
    setStrategyError(null);

    try {
      console.log('🔵 [STRATEGIST] Sending strategy to client:', signedAgreement.id);

      const result = await sendStrategyToClient({
        agreementId: signedAgreement.id,
        clientId: apiClient.id,
        clientName: apiClient.name || apiClient.fullName || apiClient.email.split('@')[0],
        clientEmail: apiClient.email,
        strategistName: 'Ariex Tax Strategist', // Server will override with actual user
        data,
      });

      if (result.success) {
        console.log('🔵 [STRATEGIST] Strategy sent successfully');
        logAgreementStatus(
          'strategist',
          signedAgreement.id,
          AgreementStatus.PENDING_STRATEGY_REVIEW,
          'Strategy sent to client for signature'
        );

        // Close the strategy sheet
        setIsStrategySheetOpen(false);

        // Reload agreements to get updated state
        const updatedAgreements = await listClientAgreements(params.clientId);
        setAgreements(updatedAgreements);
      } else {
        console.error('🔵 [STRATEGIST] Failed to send strategy:', result.error);
        setStrategyError(result.error || 'Failed to send strategy');
      }
    } catch (error) {
      console.error('Failed to send strategy:', error);
      setStrategyError(error instanceof Error ? error.message : 'Failed to send strategy');
    } finally {
      setIsSendingStrategy(false);
    }
  };

  // Handler for completing agreement after strategy is signed
  const handleCompleteAgreement = async () => {
    if (!signedAgreement) return;

    setIsCompletingAgreement(true);

    try {
      console.log('🔵 [STRATEGIST] Completing agreement:', signedAgreement.id);

      const result = await completeAgreement(signedAgreement.id);

      if (result.success) {
        console.log('🔵 [STRATEGIST] Agreement completed successfully');
        logAgreementStatus(
          'strategist',
          signedAgreement.id,
          AgreementStatus.COMPLETED,
          'Agreement completed - all steps finished'
        );

        // Reload agreements to get updated state
        const updatedAgreements = await listClientAgreements(params.clientId);
        setAgreements(updatedAgreements);
      } else {
        console.error('🔵 [STRATEGIST] Failed to complete agreement:', result.error);
      }
    } catch (error) {
      console.error('Failed to complete agreement:', error);
    } finally {
      setIsCompletingAgreement(false);
    }
  };

  // Payment status - check from API (source of truth)
  // hasPaymentSent = charge exists (fetched from /charges/agreement/{id})
  // If a charge exists, payment link was already sent
  const hasPaymentSent = !!existingCharge;
  const hasPaymentReceived = signedAgreement && isAgreementPaid(signedAgreement.status);

  // Document todos from agreement (excluding the signing and payment todos)
  const documentTodos = allTodos.filter(
    todo => !todo.title.toLowerCase().includes('sign') && todo.title.toLowerCase() !== 'pay'
  );
  const uploadedDocTodos = documentTodos.filter(
    todo => todo.status === 'completed' || todo.document?.uploadStatus === 'FILE_UPLOADED'
  );
  const acceptedDocTodos = documentTodos.filter(
    todo => todo.document?.acceptanceStatus === AcceptanceStatus.ACCEPTED_BY_STRATEGIST
  );
  const totalDocTodos = documentTodos.length;
  const uploadedDocCount = uploadedDocTodos.length;
  const acceptedDocCount = acceptedDocTodos.length;
  const hasDocumentsRequested = totalDocTodos > 0;
  const hasAllDocumentsUploaded = totalDocTodos > 0 && uploadedDocCount >= totalDocTodos;
  const hasAllDocumentsAccepted = totalDocTodos > 0 && acceptedDocCount >= totalDocTodos;

  // Build a map of todoId -> todo title for matching documents to their request names
  const todoTitles = new Map<string, string>();
  for (const todo of allTodos) {
    todoTitles.set(todo.id, todo.title);
  }

  // Initialize payment amount from agreement metadata when modal opens
  const handleOpenPaymentModal = () => {
    if (!signedAgreement) return;

    // Get agreement price from description metadata or use default
    let agreementAmount = 499;
    const metadataMatch = signedAgreement.description?.match(/__SIGNATURE_METADATA__:([\s\S]+)$/);
    if (metadataMatch) {
      try {
        const metadata = JSON.parse(metadataMatch[1]);
        if (metadata.price) agreementAmount = metadata.price;
      } catch {
        // Use default
      }
    }

    setPaymentAmount(agreementAmount);
    setPaymentError(null);
    setIsPaymentModalOpen(true);
  };

  // Handler for sending payment link (called from modal) - creates charge + payment link
  const handleSendPaymentLink = async () => {
    if (isSendingPayment || !signedAgreement) return;

    setIsSendingPayment(true);
    setPaymentError(null);

    try {
      // Step 1: Create charge (use paymentAmount from modal)
      console.log('[Payment] Creating charge for agreement:', signedAgreement.id);
      const newCharge = await createCharge({
        agreementId: signedAgreement.id,
        amount: paymentAmount,
        currency: 'usd',
        description: `Onboarding Fee - ${signedAgreement.name}`,
      });

      if (!newCharge) {
        setPaymentError('Failed to create payment charge');
        return;
      }
      console.log('[Payment] Charge created:', newCharge.id);

      // Step 2: Generate Stripe checkout URL
      console.log('[Payment] Generating payment link for charge:', newCharge.id);
      let generatedPaymentLink: string | null = null;
      try {
        generatedPaymentLink = await generatePaymentLink(newCharge.id);
      } catch (linkError) {
        console.error('[Payment] Error generating payment link:', linkError);
        setPaymentError(
          `Failed to generate payment link: ${linkError instanceof Error ? linkError.message : 'Unknown error'}`
        );
        return;
      }

      if (!generatedPaymentLink) {
        console.error('[Payment] Payment link is null');
        setPaymentError('Failed to generate payment link - no URL returned');
        return;
      }
      console.log('[Payment] Payment link generated:', generatedPaymentLink);

      // Step 3: Attach payment info to agreement
      const success = await attachPayment(signedAgreement.id, {
        amount: paymentAmount,
        paymentLink: generatedPaymentLink,
      });

      if (success) {
        console.log('[Payment] Payment link attached to agreement');
        logAgreementStatus(
          'strategist',
          signedAgreement.id,
          AgreementStatus.PENDING_PAYMENT,
          'Payment link sent'
        );

        // Update existing charge state with the new payment link
        setExistingCharge({ ...newCharge, paymentLink: generatedPaymentLink });

        // Close modal and reload agreements
        setIsPaymentModalOpen(false);
        const data = await listClientAgreements(params.clientId);
        setAgreements(data);
      } else {
        setPaymentError('Failed to attach payment link to agreement');
      }
    } catch (error) {
      console.error('Failed to send payment link:', error);
      setPaymentError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSendingPayment(false);
    }
  };

  // Handler for sending payment reminder - only regenerates payment link for existing charge
  const handleSendPaymentReminder = async () => {
    if (isSendingPayment || !signedAgreement || !existingCharge) return;

    setIsSendingPayment(true);
    setPaymentError(null);

    try {
      // Generate new Stripe checkout URL for existing charge
      console.log(
        '[Payment Reminder] Generating new payment link for existing charge:',
        existingCharge.id
      );
      let generatedPaymentLink: string | null = null;
      try {
        generatedPaymentLink = await generatePaymentLink(existingCharge.id);
      } catch (linkError) {
        console.error('[Payment Reminder] Error generating payment link:', linkError);
        setPaymentError(
          `Failed to generate payment link: ${linkError instanceof Error ? linkError.message : 'Unknown error'}`
        );
        return;
      }

      if (!generatedPaymentLink) {
        console.error('[Payment Reminder] Payment link is null');
        setPaymentError('Failed to generate payment link - no URL returned');
        return;
      }
      console.log('[Payment Reminder] Payment link generated:', generatedPaymentLink);

      // Update payment link on agreement
      const success = await attachPayment(signedAgreement.id, {
        amount: typeof existingCharge.amount === 'number' ? existingCharge.amount : paymentAmount,
        paymentLink: generatedPaymentLink,
      });

      if (success) {
        console.log('[Payment Reminder] Payment link updated on agreement');
        logAgreementStatus(
          'strategist',
          signedAgreement.id,
          AgreementStatus.PENDING_PAYMENT,
          'Payment reminder sent'
        );

        // Update existing charge state with the new payment link
        setExistingCharge({ ...existingCharge, paymentLink: generatedPaymentLink });

        // Reload agreements
        const data = await listClientAgreements(params.clientId);
        setAgreements(data);
      } else {
        setPaymentError('Failed to update payment link on agreement');
      }
    } catch (error) {
      console.error('Failed to send payment reminder:', error);
      setPaymentError(error instanceof Error ? error.message : 'An unexpected error occurred');
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
  // 5-STEP TIMELINE COMPLETION STATES (computed from REAL API data)
  // ============================================================================

  // Step 1: Account always created
  const step1Complete = true;

  // Step 2: Agreement - Use REAL agreement status from API
  // Backend statuses: DRAFT (sent but not signed), ACTIVE (signed), COMPLETED
  const step2Sent = hasAgreementSent; // Agreement has been sent (DRAFT, ACTIVE, or COMPLETED)
  const step2Complete = hasAgreementSigned; // Agreement has been signed (ACTIVE or COMPLETED)

  // Step 3: Payment - Use REAL payment status from API
  const step3Sent = step2Complete && (hasPaymentSent || hasPaymentReceived);
  const step3Complete = hasPaymentReceived;

  // Step 4: Documents - Use REAL document acceptance status from API
  // Documents are "complete" only when ALL are ACCEPTED by strategist
  const step4Sent = step3Complete || hasDocumentsRequested;
  const step4Complete = hasAllDocumentsAccepted;

  // Step 5: Strategy - Check if strategy document exists and is signed
  // OR if agreement status is PENDING_STRATEGY_REVIEW (strategy sent, awaiting signature)
  const strategyDoc = client.documents.find(
    d => d.category === 'contract' && d.originalName.toLowerCase().includes('strategy')
  );

  // Parse strategy metadata from agreement description
  let strategyMetadata: {
    sentAt?: string;
    strategyCeremonyUrl?: string;
    strategyEnvelopeId?: string;
  } | null = null;
  const strategyMetadataMatch = signedAgreement?.description?.match(
    /__STRATEGY_METADATA__:([\s\S]+)$/
  );
  if (strategyMetadataMatch) {
    try {
      strategyMetadata = JSON.parse(strategyMetadataMatch[1]);
    } catch {
      // Ignore parse errors
    }
  }

  const step5Sent =
    step4Complete &&
    (strategyDoc?.signatureStatus === 'SENT' ||
      strategyDoc?.signatureStatus === 'SIGNED' ||
      strategyMetadata?.sentAt); // Strategy was sent if metadata exists

  // Strategy is signed when status is PENDING_STRATEGY_REVIEW (client signed, awaiting strategist review)
  const step5Signed = signedAgreement?.status === AgreementStatus.PENDING_STRATEGY_REVIEW;

  const step5Complete =
    strategyDoc?.signatureStatus === 'SIGNED' ||
    signedAgreement?.status === AgreementStatus.COMPLETED;

  // Compute status key from real data
  type StatusKey =
    | 'awaiting_agreement'
    | 'awaiting_payment'
    | 'awaiting_documents'
    | 'ready_for_strategy'
    | 'awaiting_signature'
    | 'active';
  let statusKey: StatusKey;
  if (!step2Complete) statusKey = 'awaiting_agreement';
  else if (!step3Complete) statusKey = 'awaiting_payment';
  else if (!step4Complete) statusKey = 'awaiting_documents';
  else if (step5Complete) statusKey = 'active';
  else if (step5Sent) statusKey = 'awaiting_signature';
  else statusKey = 'ready_for_strategy';

  const statusConfig = CLIENT_STATUS_CONFIG[statusKey];

  // Additional data for timeline display
  const agreementTask = client.onboardingTasks.find(t => t.type === 'sign_agreement');
  const docsTask = client.onboardingTasks.find(t => t.type === 'upload_documents');
  const payment = client.payments[0];

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
                disabled={signedAgreement?.status !== AgreementStatus.PENDING_STRATEGY}
                onClick={() =>
                  signedAgreement?.status === AgreementStatus.PENDING_STRATEGY &&
                  setIsStrategySheetOpen(true)
                }
                className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-sm font-medium transition-colors ${
                  signedAgreement?.status === AgreementStatus.PENDING_STRATEGY
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
            {/* Loading state for Activity */}
            {isLoadingAgreements || isLoadingCharges ? (
              <div className="mb-6">
                <h2 className="mb-4 text-base font-medium text-zinc-900">Activity</h2>
                <div className="flex items-center justify-center py-12">
                  <SpinnerGap className="h-6 w-6 animate-spin text-emerald-500" />
                </div>
              </div>
            ) : (
              (() => {
                // Uses step variables computed at component level (step2Complete, step3Complete, etc.)
                // Step 1 is always complete
                const step1Complete = true;
                const uploadedCount = client.documents.filter(
                  d => d.category !== 'contract'
                ).length;

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
                            {/* Button: emerald if strategist needs to act (send payment link), zinc if reminder */}
                            {step2Complete && !step3Complete && (
                              <button
                                onClick={
                                  step3Sent ? handleSendPaymentReminder : handleOpenPaymentModal
                                }
                                disabled={isSendingPayment}
                                className={`mt-2 flex w-fit items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${
                                  step3Sent
                                    ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                } ${isSendingPayment ? 'cursor-not-allowed opacity-50' : ''}`}
                              >
                                {isSendingPayment ? (
                                  <>
                                    <SpinnerGap className="h-3 w-3 animate-spin" />
                                    Sending...
                                  </>
                                ) : step3Sent ? (
                                  'Send reminder'
                                ) : (
                                  'Send payment link'
                                )}
                              </button>
                            )}
                            {paymentError && (
                              <span className="mt-1 text-xs text-red-500">{paymentError}</span>
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
                            className={`absolute top-5 bottom-2 -left-[19px] w-[2px] ${hasAllDocumentsAccepted ? 'bg-emerald-200' : 'bg-zinc-200'}`}
                          />
                          <div className="flex flex-1 flex-col">
                            <span className="font-medium text-zinc-900">
                              {hasAllDocumentsAccepted
                                ? `Documents accepted · ${acceptedDocCount}/${totalDocTodos} complete`
                                : hasAllDocumentsUploaded
                                  ? `Documents uploaded · ${uploadedDocCount}/${totalDocTodos} (review required)`
                                  : hasDocumentsRequested
                                    ? `Documents pending · ${uploadedDocCount}/${totalDocTodos} uploaded`
                                    : 'Documents'}
                            </span>
                            <span className="text-sm text-zinc-500">
                              {hasAllDocumentsAccepted
                                ? 'All documents have been reviewed and accepted'
                                : hasAllDocumentsUploaded
                                  ? 'Review and accept uploaded documents to proceed'
                                  : hasDocumentsRequested
                                    ? 'Waiting for client to upload requested documents'
                                    : 'Request documents from client'}
                            </span>
                            {/* Show individual todo items */}
                            {hasDocumentsRequested && documentTodos.length > 0 && (
                              <div className="mt-2 flex flex-col gap-2">
                                {documentTodos.map(todo => {
                                  const isUploaded =
                                    todo.document?.uploadStatus === 'FILE_UPLOADED';
                                  const isAccepted =
                                    todo.document?.acceptanceStatus ===
                                    AcceptanceStatus.ACCEPTED_BY_STRATEGIST;
                                  const isRejected =
                                    todo.document?.acceptanceStatus ===
                                    AcceptanceStatus.REJECTED_BY_STRATEGIST;
                                  const isPendingReview = isUploaded && !isAccepted && !isRejected;
                                  const isCompleted = todo.status === 'completed' || isAccepted;
                                  const uploadedFile = todo.document?.files?.[0];
                                  const documentId = todo.document?.id;

                                  return (
                                    <div
                                      key={todo.id}
                                      className={`group rounded-lg border p-2.5 ${
                                        isRejected
                                          ? 'border-red-200 bg-red-50'
                                          : isAccepted
                                            ? 'border-emerald-200 bg-emerald-50'
                                            : 'border-zinc-200 bg-zinc-50'
                                      }`}
                                    >
                                      <div className="flex items-start gap-2">
                                        {isAccepted ? (
                                          <CheckIcon
                                            weight="bold"
                                            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                                          />
                                        ) : isRejected ? (
                                          <XIcon
                                            weight="bold"
                                            className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                                          />
                                        ) : isPendingReview ? (
                                          <Clock
                                            weight="bold"
                                            className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500"
                                          />
                                        ) : (
                                          <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-zinc-300" />
                                        )}
                                        <div className="flex min-w-0 flex-1 flex-col">
                                          <div className="flex items-center gap-2">
                                            <span
                                              className={`text-sm font-medium ${
                                                isAccepted
                                                  ? 'text-emerald-700'
                                                  : isRejected
                                                    ? 'text-red-700'
                                                    : 'text-zinc-700'
                                              }`}
                                            >
                                              {todo.title}
                                            </span>
                                            {isPendingReview && (
                                              <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-medium text-zinc-600">
                                                Pending review
                                              </span>
                                            )}
                                            {isAccepted && (
                                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-600">
                                                Accepted
                                              </span>
                                            )}
                                            {isRejected && (
                                              <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-600">
                                                Declined
                                              </span>
                                            )}
                                          </div>
                                          {uploadedFile && (
                                            <a
                                              href={uploadedFile.downloadUrl || '#'}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-600 hover:bg-zinc-200"
                                            >
                                              <FileArrowDownIcon
                                                weight="fill"
                                                className="h-3.5 w-3.5"
                                              />
                                              <span className="max-w-[200px] truncate">
                                                {uploadedFile.originalName}
                                              </span>
                                            </a>
                                          )}
                                          {/* Accept/Decline buttons for pending review */}
                                          {isPendingReview && documentId && (
                                            <div className="mt-2 flex items-center gap-2">
                                              <button
                                                onClick={() => handleAcceptDocument(documentId)}
                                                disabled={
                                                  acceptingDocId === documentId ||
                                                  decliningDocId === documentId
                                                }
                                                className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                                              >
                                                {acceptingDocId === documentId ? (
                                                  <SpinnerGap className="h-3 w-3 animate-spin" />
                                                ) : (
                                                  <CheckIcon weight="bold" className="h-3 w-3" />
                                                )}
                                                Accept
                                              </button>
                                              <button
                                                onClick={() => handleDeclineDocument(documentId)}
                                                disabled={
                                                  acceptingDocId === documentId ||
                                                  decliningDocId === documentId
                                                }
                                                className="flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-200 disabled:opacity-50"
                                              >
                                                {decliningDocId === documentId ? (
                                                  <SpinnerGap className="h-3 w-3 animate-spin" />
                                                ) : (
                                                  <XIcon weight="bold" className="h-3 w-3" />
                                                )}
                                                Decline
                                              </button>
                                            </div>
                                          )}
                                          {/* Re-upload message for rejected */}
                                          {isRejected && (
                                            <p className="mt-1 text-xs text-red-600">
                                              Client needs to re-upload this document
                                            </p>
                                          )}
                                        </div>
                                        {/* Decline button on hover for accepted docs (strategist can change mind) */}
                                        {isAccepted && documentId && (
                                          <button
                                            onClick={() => handleDeclineDocument(documentId)}
                                            disabled={decliningDocId === documentId}
                                            className="rounded p-1 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                                            title="Decline document"
                                          >
                                            {decliningDocId === documentId ? (
                                              <SpinnerGap className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <XIcon weight="bold" className="h-3 w-3" />
                                            )}
                                          </button>
                                        )}
                                        {/* Delete button - only show if not uploaded */}
                                        {!isUploaded && (
                                          <button
                                            onClick={() =>
                                              setTodoToDelete({ id: todo.id, title: todo.title })
                                            }
                                            disabled={deletingTodoId === todo.id}
                                            className="rounded p-1 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                                            title="Delete request"
                                          >
                                            {deletingTodoId === todo.id ? (
                                              <SpinnerGap className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <XIcon weight="bold" className="h-3 w-3" />
                                            )}
                                          </button>
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

                            <div className="flex items-center gap-2">
                              {/* Button: Request documents or Add more - always visible after agreement signed */}
                              {hasAgreementSigned && (
                                <button
                                  onClick={() => setIsRequestDocsModalOpen(true)}
                                  className="mt-2 w-fit rounded bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-200"
                                >
                                  {hasDocumentsRequested
                                    ? 'Ask more documents'
                                    : 'Request documents'}
                                </button>
                              )}
                              {/* Advance to Strategy button - only shows when all docs are accepted and not yet in PENDING_STRATEGY */}
                              {hasAllDocumentsAccepted &&
                                hasDocumentsRequested &&
                                signedAgreement?.status ===
                                  AgreementStatus.PENDING_TODOS_COMPLETION && (
                                  <button
                                    onClick={handleAdvanceToStrategy}
                                    disabled={isAdvancingToStrategy}
                                    className="mt-2 flex w-fit items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    {isAdvancingToStrategy ? (
                                      <>
                                        <SpinnerGap className="h-3 w-3 animate-spin" />
                                        Advancing...
                                      </>
                                    ) : (
                                      'Advance to strategy'
                                    )}
                                  </button>
                                )}
                            </div>
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
                                  : strategyMetadata?.sentAt
                                    ? formatDate(new Date(strategyMetadata.sentAt))
                                    : step5Sent
                                      ? 'Sent'
                                      : 'Not started'}
                            </span>
                            {/* Create/Resend strategy button - shows when agreement is in PENDING_STRATEGY and not yet signed */}
                            {signedAgreement?.status === AgreementStatus.PENDING_STRATEGY &&
                              !step5Signed &&
                              !step5Complete && (
                                <button
                                  onClick={() => setIsStrategySheetOpen(true)}
                                  className={`mt-2 w-fit rounded px-2 py-1 text-xs font-semibold ${
                                    step5Sent
                                      ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  }`}
                                >
                                  {step5Sent ? 'Resend strategy' : 'Create strategy'}
                                </button>
                              )}
                            {/* Client signed - show Download and Finish buttons */}
                            {step5Signed && !step5Complete && (
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  onClick={async () => {
                                    if (strategyMetadata?.strategyEnvelopeId) {
                                      console.log(
                                        '[UI] Downloading signed strategy for envelope:',
                                        strategyMetadata.strategyEnvelopeId
                                      );
                                      const result = await getSignedStrategyUrl(
                                        strategyMetadata.strategyEnvelopeId
                                      );
                                      if (result.success && result.url) {
                                        window.open(result.url, '_blank');
                                      } else {
                                        console.error(
                                          '[UI] Failed to get signed document:',
                                          result.error
                                        );
                                        alert(
                                          'Signed document not yet available. Please try again in a moment.'
                                        );
                                      }
                                    }
                                  }}
                                  disabled={!strategyMetadata?.strategyEnvelopeId}
                                  className="w-fit rounded bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-200 disabled:opacity-50"
                                >
                                  Download signed document
                                </button>
                                <button
                                  onClick={handleCompleteAgreement}
                                  disabled={isCompletingAgreement}
                                  className="w-fit rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-400"
                                >
                                  {isCompletingAgreement ? (
                                    <span className="flex items-center gap-1">
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Completing...
                                    </span>
                                  ) : (
                                    'Finish Agreement'
                                  )}
                                </button>
                              </div>
                            )}
                            {step5Complete && (
                              <div className="mt-2 flex items-center gap-2">
                                <button className="w-fit rounded bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-200">
                                  View strategy
                                </button>
                                {signedAgreement?.status !== AgreementStatus.COMPLETED && (
                                  <button
                                    onClick={handleCompleteAgreement}
                                    disabled={isCompletingAgreement}
                                    className="w-fit rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-400"
                                  >
                                    {isCompletingAgreement ? (
                                      <span className="flex items-center gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Completing...
                                      </span>
                                    ) : (
                                      'Finish Agreement'
                                    )}
                                  </button>
                                )}
                                {signedAgreement?.status === AgreementStatus.COMPLETED && (
                                  <span className="w-fit rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                                    ✓ Completed
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}

            <div>
              <div className="flex w-full items-center justify-between">
                <div>
                  <h2 className="text-base font-medium text-zinc-900">Documents</h2>
                  {!isLoadingDocuments && clientDocuments.length > 0 && (
                    <p className="text-sm text-zinc-500">
                      {clientDocuments.length} document{clientDocuments.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>

              {/* Loading State */}
              {isLoadingDocuments && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
                  {/* <p className="mt-4 text-sm text-zinc-500">Loading documents...</p> */}
                </div>
              )}

              {/* Empty State */}
              {!isLoadingDocuments && clientDocuments.length === 0 && (
                <div className="flex flex-col items-center justify-center pt-12 pb-8 text-center">
                  <EmptyDocumentsIllustration />
                  <p className="text-lg font-semibold text-zinc-800">No documents yet</p>
                  <p className="text-sm text-zinc-400">
                    When this client uploads a document, it will show up here
                  </p>
                </div>
              )}

              {/* Documents List */}
              {!isLoadingDocuments && clientDocuments.length > 0 && (
                <div className="mt-6">
                  {groupDocumentsByDate(
                    [...clientDocuments].sort(
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
                                <div className="flex flex-1 flex-col gap-0.5">
                                  <span className="font-medium text-zinc-900">{doc.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-zinc-500">
                                      {/* Show todo title if document is linked to a todo */}
                                      {doc.todoId && todoTitles.get(doc.todoId)
                                        ? todoTitles.get(doc.todoId)
                                        : doc.type || 'Document'}
                                    </span>
                                    {doc.uploadedByName && (
                                      <>
                                        <span className="text-zinc-300">·</span>
                                        <span className="text-sm text-zinc-500">
                                          Uploaded by {doc.uploadedByName}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  {doc.description && (
                                    <p className="mt-0.5 line-clamp-1 text-sm text-zinc-400">
                                      {doc.description}
                                    </p>
                                  )}
                                </div>

                                {/* See document button - appears on hover */}
                                <button
                                  onClick={async e => {
                                    e.stopPropagation();
                                    console.log('[UI] See document clicked for:', doc.id);
                                    setViewingDocId(doc.id);
                                    try {
                                      const url = await getDownloadUrl(doc.id);
                                      console.log('[UI] Got download URL:', url);
                                      if (url) {
                                        window.open(url, '_blank');
                                      } else {
                                        console.error('[UI] No download URL returned');
                                      }
                                    } catch (err) {
                                      console.error('[UI] Error getting download URL:', err);
                                    } finally {
                                      setViewingDocId(null);
                                    }
                                  }}
                                  disabled={viewingDocId === doc.id}
                                  className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 opacity-0 transition-all group-hover:opacity-100 hover:bg-zinc-50 disabled:opacity-100"
                                >
                                  {viewingDocId === doc.id ? (
                                    <span className="flex items-center gap-1.5">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      Loading...
                                    </span>
                                  ) : (
                                    'See document'
                                  )}
                                </button>

                                {/* Timestamp */}
                                <span className="shrink-0 text-sm text-zinc-400">
                                  {formatRelativeTime(new Date(doc.createdAt))}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* View All Button */}
                  {/* <div className="mt-2 flex justify-center pb-8">
                    <Button
                      variant="outline"
                      onClick={() =>
                        router.push(`/strategist/clients/${params.clientId}/documents`)
                      }
                    >
                      View all {clientDocuments.length} documents
                    </Button>
                  </div> */}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Sheet */}
      {signedAgreement && (
        <StrategySheet
          client={client}
          agreementId={signedAgreement.id}
          isOpen={isStrategySheetOpen}
          onClose={() => setIsStrategySheetOpen(false)}
          onSend={handleSendStrategy}
        />
      )}

      {/* Agreement Sheet (full-screen editor) */}
      <AgreementSheet
        clientId={params.clientId}
        clientName={client.user.name || client.user.email || 'Client'}
        clientEmail={client.user.email || ''}
        isOpen={isAgreementModalOpen}
        onClose={() => setIsAgreementModalOpen(false)}
        onSend={handleSendAgreement}
      />

      {/* Payment Link Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsPaymentModalOpen(false)}
          />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
                  <CreditCard className="h-5 w-5 text-zinc-600" weight="duotone" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Send Payment Link</h2>
                  <p className="text-sm text-zinc-500">
                    Create a Stripe checkout for {client.user.name || 'client'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Agreement Info */}
            <div className="mb-4 rounded-lg bg-zinc-50 p-4">
              <p className="text-sm font-medium text-zinc-700">Agreement</p>
              <p className="text-sm text-zinc-600">
                {signedAgreement?.name || 'Service Agreement'}
              </p>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-zinc-700">Payment Amount</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <CurrencyDollar className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-300 py-2.5 pr-4 pl-10 text-zinc-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  placeholder="499"
                  min={1}
                />
              </div>
              <p className="mt-1.5 text-xs text-zinc-500">
                The client will receive a Stripe checkout link via email
              </p>
            </div>

            {/* Error Message */}
            {paymentError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {paymentError}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendPaymentLink}
                disabled={isSendingPayment || paymentAmount <= 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSendingPayment ? (
                  <>
                    <SpinnerGap className="h-4 w-4 animate-spin" />
                    Creating link...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Send Payment Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Documents Modal */}
      {activeAgreement && (
        <RequestDocumentsModal
          isOpen={isRequestDocsModalOpen}
          onClose={() => setIsRequestDocsModalOpen(false)}
          agreementId={activeAgreement.id}
          clientId={params.clientId}
          clientName={client?.user.name || 'Client'}
          onSuccess={async () => {
            // Reload agreements to get updated todos
            const data = await listClientAgreements(params.clientId);
            setAgreements(data);
          }}
        />
      )}

      {/* Delete Todo Confirmation Dialog */}
      {todoToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop */}
          <div
            onClick={() => !deletingTodoId && setTodoToDelete(null)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          {/* Dialog */}
          <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900">Delete Document Request</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Are you sure you want to delete the request for{' '}
              <strong>&quot;{todoToDelete.title}&quot;</strong>? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setTodoToDelete(null)}
                disabled={!!deletingTodoId}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeletingTodoId(todoToDelete.id);
                  const success = await deleteTodo(todoToDelete.id);
                  if (success) {
                    // Refresh agreements
                    const data = await listClientAgreements(params.clientId);
                    setAgreements(data);
                  }
                  setDeletingTodoId(null);
                  setTodoToDelete(null);
                }}
                disabled={!!deletingTodoId}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingTodoId ? (
                  <>
                    <SpinnerGap className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat */}
      {apiClient && (
        <ClientFloatingChat
          client={{
            id: apiClient.id,
            user: {
              id: apiClient.id,
              name: apiClient.name,
              email: apiClient.email,
            },
          }}
        />
      )}
    </div>
  );
}
