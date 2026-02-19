'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useUiStore } from '@/contexts/ui/UiStore';
import { getFullClientById, type FullClientMock } from '@/lib/mocks/client-full';
import {
  getClientById,
  type ApiClient,
  type ApiAgreement,
  type ApiDocument,
  listClientAgreements,
  listAgreementDocuments,
  getAgreementEnvelopeStatus,
  getDocumentById,
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
  getStrategyDocumentUrl,
} from '@/lib/api/strategies.actions';
import { getDocumentComments } from '@/lib/api/compliance.api';
import type { ReviewComment } from '@/components/strategy/strategy-sheet';
import {
  computeStep5State,
  parseStrategyMetadata,
  type Step5State,
  type StrategyMetadata as ModelStrategyMetadata,
} from '../models/strategy.model';
import type { AgreementSendData } from '@/components/agreements/agreement-sheet';
import type { StrategySendData } from '@/components/strategy/strategy-sheet';
import {
  AgreementStatus,
  isAgreementSigned,
  isAgreementPaid,
  logAgreements,
  logAgreementStatus,
} from '@/types/agreement';
import { AcceptanceStatus } from '@/types/document';
import { apiClientToMockFormat } from '../models/client.model';
import { type ClientStatusKey } from '@/lib/client-status';

// ─── Types ────────────────────────────────────────────────────────────────

/**
 * @deprecated Use StrategyMetadata from strategy.model.ts instead.
 * Kept for backward compat with ActivityTimelineProps.
 */
export interface StrategyMetadata {
  sentAt?: string;
  /** @deprecated */
  strategyCeremonyUrl?: string;
  /** @deprecated */
  strategyEnvelopeId?: string;
  strategyDocumentId?: string;
}

export interface ClientDetailData {
  // Core data
  isLoading: boolean;
  client: FullClientMock | null;
  apiClient: ApiClient | null;
  agreements: ApiAgreement[];
  clientDocuments: ApiDocument[];

  // Agreement state
  activeAgreement: ApiAgreement | undefined;
  signedAgreement: ApiAgreement | null;
  isLoadingAgreements: boolean;
  isAgreementModalOpen: boolean;
  agreementError: string | null;
  setIsAgreementModalOpen: (open: boolean) => void;

  // Payment state
  existingCharge: { id: string; paymentLink?: string; status: string; amount?: number } | null;
  isLoadingCharges: boolean;
  isPaymentModalOpen: boolean;
  isSendingPayment: boolean;
  paymentError: string | null;
  paymentAmount: number;
  setPaymentAmount: (amount: number) => void;
  setIsPaymentModalOpen: (open: boolean) => void;

  // Document state
  selectedDocs: Set<string>;
  isLoadingDocuments: boolean;
  viewingDocId: string | null;
  setViewingDocId: (id: string | null) => void;
  isRequestDocsModalOpen: boolean;
  setIsRequestDocsModalOpen: (open: boolean) => void;

  // Delete todo
  todoToDelete: { id: string; title: string } | null;
  setTodoToDelete: (todo: { id: string; title: string } | null) => void;
  deletingTodoId: string | null;

  // Strategy
  isStrategySheetOpen: boolean;
  setIsStrategySheetOpen: (open: boolean) => void;
  isCompletingAgreement: boolean;

  // Computed timeline states
  hasAgreementSent: boolean;
  hasAgreementSigned: boolean;
  step3Sent: boolean;
  step3Complete: boolean;
  hasDocumentsRequested: boolean;
  hasAllDocumentsUploaded: boolean;
  hasAllDocumentsAccepted: boolean;
  documentTodos: any[];
  uploadedDocCount: number;
  totalDocTodos: number;
  acceptedDocCount: number;
  step5Sent: boolean | string | undefined;
  /** @deprecated Always false — signing removed. Use step5State instead. */
  step5Signed: boolean;
  step5Complete: boolean | string;
  step5State: Step5State;
  strategyMetadata: StrategyMetadata | null;
  strategyDocumentId: string | null;
  strategyDoc: {
    signedAt?: Date;
    createdAt: Date;
    originalName: string;
    signatureStatus?: string;
  } | null;
  statusKey: ClientStatusKey;
  todoTitles: Map<string, string>;

  // Handlers
  toggleDocSelection: (docId: string) => void;
  handleSendAgreement: (data: AgreementSendData) => Promise<void>;
  handleAcceptDocument: (documentId: string) => Promise<void>;
  handleDeclineDocument: (documentId: string) => Promise<void>;
  handleAdvanceToStrategy: () => Promise<void>;
  handleSendStrategy: (data: StrategySendData) => Promise<void>;
  handleCompleteAgreement: () => Promise<void>;
  handleOpenPaymentModal: () => void;
  handleSendPaymentLink: () => Promise<void>;
  handleSendPaymentReminder: () => Promise<void>;
  handleDownloadSignedStrategy: () => Promise<void>;
  handleViewStrategyDocument: () => Promise<void>;
  handleDeleteTodo: () => Promise<void>;
  handleViewDocument: (docId: string) => Promise<void>;
  refreshAgreements: () => Promise<void>;

  // Strategy review (compliance comments)
  strategyReviewPdfUrl: string | null;
  strategyComments: ReviewComment[];
  isLoadingStrategyComments: boolean;
  isStrategyReviewOpen: boolean;
  setIsStrategyReviewOpen: (open: boolean) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useClientDetailData(clientId: string): ClientDetailData {
  // ─── Core State ──────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [apiClient, setApiClient] = useState<ApiClient | null>(null);
  const [client, setClient] = useState<FullClientMock | null>(null);
  const { setSelection, setDownloadingSelection } = useUiStore();

  // ─── Agreement State ─────────────────────────────────────────
  const [agreements, setAgreements] = useState<ApiAgreement[]>([]);
  const [isLoadingAgreements, setIsLoadingAgreements] = useState(true);
  const [agreementError, setAgreementError] = useState<string | null>(null);
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);

  // ─── Payment State ───────────────────────────────────────────
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

  // ─── Document State ──────────────────────────────────────────
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [clientDocuments, setClientDocuments] = useState<ApiDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [isRequestDocsModalOpen, setIsRequestDocsModalOpen] = useState(false);

  // ─── Todo Delete State ───────────────────────────────────────
  const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);
  const [todoToDelete, setTodoToDelete] = useState<{ id: string; title: string } | null>(null);

  // ─── Strategy State ──────────────────────────────────────────
  const [isStrategySheetOpen, setIsStrategySheetOpen] = useState(false);
  const [isCompletingAgreement, setIsCompletingAgreement] = useState(false);
  const [isAdvancingToStrategy, setIsAdvancingToStrategy] = useState(false);

  // ─── Envelope Sync State ─────────────────────────────────────
  const [envelopeStatuses, setEnvelopeStatuses] = useState<Record<string, string>>({});
  const hasSyncedEnvelopesRef = useRef(false);

  // ─── Helpers ─────────────────────────────────────────────────

  const refreshAgreements = useCallback(async () => {
    const data = await listClientAgreements(clientId);
    setAgreements(data);
  }, [clientId]);

  // ─── Data Loading Effects ────────────────────────────────────

  useEffect(() => {
    async function loadClient() {
      setIsLoading(true);
      try {
        const data = await getClientById(clientId);
        if (data) {
          setApiClient(data);
          setClient(apiClientToMockFormat(data));
        } else {
          const mockClient = getFullClientById(clientId);
          if (mockClient) setClient(mockClient);
        }
      } catch (error) {
        console.error('Failed to load client:', error);
        const mockClient = getFullClientById(clientId);
        if (mockClient) setClient(mockClient);
      } finally {
        setIsLoading(false);
      }
    }
    loadClient();
  }, [clientId]);

  useEffect(() => {
    async function loadAgreements() {
      setIsLoadingAgreements(true);
      try {
        const data = await listClientAgreements(clientId);
        logAgreements(
          'strategist',
          data.map(a => ({ id: a.id, status: a.status as AgreementStatus, name: a.name })),
          `Client ${clientId}`
        );
        setAgreements(data);
      } catch (error) {
        console.error('[Hook] Failed to load agreements:', error);
      } finally {
        setIsLoadingAgreements(false);
      }
    }
    if (clientId) loadAgreements();
  }, [clientId]);

  useEffect(() => {
    async function loadDocuments() {
      const first = agreements[0];
      if (!first) {
        setIsLoadingDocuments(false);
        return;
      }
      setIsLoadingDocuments(true);
      try {
        const docs = await listAgreementDocuments(first.id);

        // Ensure the agreement's contract document is included
        // (it may be missing if the agreementId linkage failed during creation)
        if (first.contractDocumentId) {
          const alreadyIncluded = docs.some(d => d.id === first.contractDocumentId);
          if (!alreadyIncluded) {
            try {
              const contractDoc = await getDocumentById(first.contractDocumentId);
              if (contractDoc) docs.unshift(contractDoc);
            } catch {
              // Contract doc fetch failed — continue with what we have
            }
          }
        }

        setClientDocuments(docs);
      } catch (error) {
        console.error('[Hook] Failed to load documents:', error);
      } finally {
        setIsLoadingDocuments(false);
      }
    }
    if (agreements.length > 0) loadDocuments();
  }, [agreements]);

  useEffect(() => {
    async function syncEnvelopeStatuses() {
      if (hasSyncedEnvelopesRef.current || agreements.length === 0) return;
      hasSyncedEnvelopesRef.current = true;
      const statuses: Record<string, string> = {};
      for (const agreement of agreements) {
        const envelopeId = agreement.signatureEnvelopeId;
        if (envelopeId) {
          try {
            const result = await getAgreementEnvelopeStatus(agreement.id, envelopeId);
            if (result.status) {
              statuses[agreement.id] = result.status;
              logAgreementStatus(
                'strategist',
                agreement.id,
                agreement.status as AgreementStatus,
                `Envelope: ${result.status}`
              );
            }
          } catch (e) {
            console.error('[Hook] Failed to get envelope status:', e);
          }
        }
      }
      if (Object.keys(statuses).length > 0) {
        setEnvelopeStatuses(statuses);
        if (Object.values(statuses).some(s => s === 'completed')) {
          await refreshAgreements();
        }
      }
    }
    syncEnvelopeStatuses();
  }, [agreements, refreshAgreements]);

  useEffect(() => {
    async function fetchCharges() {
      setIsLoadingCharges(true);
      const signed = agreements.find(a => isAgreementSigned(a.status));
      if (!signed) {
        setExistingCharge(null);
        setIsLoadingCharges(false);
        return;
      }
      try {
        const charges = await getChargesForAgreement(signed.id);
        const pendingCharge = charges.find(c => c.status === 'pending') || charges[0];
        setExistingCharge(pendingCharge || null);
      } catch (error) {
        console.error('[Hook] Failed to fetch charges:', error);
        setExistingCharge(null);
      } finally {
        setIsLoadingCharges(false);
      }
    }
    fetchCharges();
  }, [agreements]);

  // ─── Doc Selection Sync ──────────────────────────────────────

  const toggleDocSelection = useCallback((docId: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  }, []);

  const handleDownloadSelected = useCallback(async () => {
    setDownloadingSelection(true);
    try {
      for (const docId of selectedDocs) {
        try {
          const url = await getDownloadUrl(docId);
          if (url) window.open(url, '_blank');
        } catch (error) {
          console.error('Failed to download document:', docId, error);
        }
      }
    } finally {
      setDownloadingSelection(false);
    }
  }, [selectedDocs, setDownloadingSelection]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedDocs.size === 0) return;
    const msg =
      selectedDocs.size === 1
        ? 'Are you sure you want to delete this document?'
        : `Are you sure you want to delete ${selectedDocs.size} documents?`;
    if (!window.confirm(msg)) return;
    let deletedCount = 0;
    for (const docId of selectedDocs) {
      try {
        const success = await deleteDocument(docId);
        if (success) deletedCount++;
      } catch (error) {
        console.error('Failed to delete document:', docId, error);
      }
    }
    setSelectedDocs(new Set());
    if (deletedCount > 0) await refreshAgreements();
  }, [selectedDocs, refreshAgreements]);

  useEffect(() => {
    setSelection(
      selectedDocs.size,
      () => setSelectedDocs(new Set()),
      selectedDocs.size > 0 ? handleDownloadSelected : null,
      selectedDocs.size > 0 ? handleDeleteSelected : null
    );
  }, [selectedDocs.size, setSelection, handleDownloadSelected, handleDeleteSelected]);

  // ─── Computed State ──────────────────────────────────────────

  const sortedAgreements = [...agreements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const activeAgreement = sortedAgreements[0];
  const allTodos = activeAgreement?.todoLists?.flatMap(list => list.todos || []) || [];

  const hasAgreementSent = agreements.some(
    a => a.status !== AgreementStatus.DRAFT && a.status !== AgreementStatus.CANCELLED
  );
  const envelopeIsCompleted =
    activeAgreement && envelopeStatuses[activeAgreement.id] === 'completed';
  const hasAgreementSigned =
    agreements.some(a => isAgreementSigned(a.status)) || !!envelopeIsCompleted;
  const signedAgreement =
    agreements.find(a => isAgreementSigned(a.status)) ||
    (hasAgreementSigned ? activeAgreement : null) ||
    null;

  const hasPaymentSent = !!existingCharge;
  const hasPaymentReceived = !!(signedAgreement && isAgreementPaid(signedAgreement.status));

  const documentTodos = allTodos.filter(
    todo => !todo.title.toLowerCase().includes('sign') && todo.title.toLowerCase() !== 'pay'
  );
  const uploadedDocCount = documentTodos.filter(
    todo => todo.status === 'completed' || todo.document?.uploadStatus === 'FILE_UPLOADED'
  ).length;
  const acceptedDocCount = documentTodos.filter(
    todo => todo.document?.acceptanceStatus === AcceptanceStatus.ACCEPTED_BY_STRATEGIST
  ).length;
  const totalDocTodos = documentTodos.length;
  const hasDocumentsRequested = totalDocTodos > 0;
  const hasAllDocumentsUploaded = totalDocTodos > 0 && uploadedDocCount >= totalDocTodos;
  const hasAllDocumentsAccepted = totalDocTodos > 0 && acceptedDocCount >= totalDocTodos;

  const todoTitles = new Map<string, string>();
  for (const todo of allTodos) todoTitles.set(todo.id, todo.title);

  // Timeline steps
  const step3Sent = hasAgreementSigned && (hasPaymentSent || hasPaymentReceived);
  const step3Complete = hasPaymentReceived;

  // ─── Step 5: Strategy Compliance → Client Approval ──────────

  // Parse strategy metadata from agreement description
  const strategyMetadata = parseStrategyMetadata(signedAgreement?.description) as
    | (StrategyMetadata & ModelStrategyMetadata)
    | null;
  const strategyDocumentId = strategyMetadata?.strategyDocumentId ?? null;

  // Find the strategy document from loaded documents (for acceptanceStatus)
  const strategyApiDoc = strategyDocumentId
    ? (clientDocuments.find(d => d.id === strategyDocumentId) ?? null)
    : null;

  // Compute Step 5 state machine
  const step5State = computeStep5State(
    activeAgreement?.status ?? '',
    strategyApiDoc?.acceptanceStatus ?? null
  );

  // Backward-compat derived fields (Phase 4 will remove these)
  const step5Sent: boolean | string | undefined = step5State.strategySent;
  const step5Signed = false; // DEPRECATED: signing removed, use step5State
  const step5Complete: boolean | string = step5State.isComplete;

  // Keep old strategyDoc shape for backward compat (from mock client docs)
  const strategyDoc =
    client?.documents.find(
      d => d.category === 'contract' && d.originalName.toLowerCase().includes('strategy')
    ) || null;

  // Status key — now uses step5State for strategy sub-phases
  let statusKey: ClientStatusKey;
  if (!hasAgreementSigned) statusKey = 'awaiting_agreement';
  else if (!step3Complete) statusKey = 'awaiting_payment';
  else if (!hasAllDocumentsAccepted) statusKey = 'awaiting_documents';
  else if (step5State.isComplete) statusKey = 'active';
  else if (step5State.phase === 'client_review') statusKey = 'awaiting_approval';
  else if (step5State.phase === 'compliance_review') statusKey = 'awaiting_compliance';
  else if (step5State.strategySent) statusKey = 'awaiting_compliance';
  else statusKey = 'ready_for_strategy';

  // ─── Handlers ────────────────────────────────────────────────

  const handleSendAgreement = async (data: AgreementSendData) => {
    setAgreementError(null);
    try {
      const result = await sendAgreementToClient({
        clientId,
        customTitle: data.title,
        description: data.description,
        price: data.price,
        todos: data.todos,
        markdownContent: data.markdownContent,
        pages: data.pages,
        pdfBase64: data.pdfBase64,
        totalPages: data.totalPages,
      });
      if (result.success) {
        if (result.agreementId) {
          logAgreementStatus(
            'strategist',
            result.agreementId,
            AgreementStatus.PENDING_SIGNATURE,
            'Agreement sent'
          );
        }
        if (result.agreementId && result.ceremonyUrl) {
          const urls = JSON.parse(localStorage.getItem('ariex_ceremony_urls') || '{}');
          urls[result.agreementId] = result.ceremonyUrl;
          localStorage.setItem('ariex_ceremony_urls', JSON.stringify(urls));
        }
        try {
          const freshData = await listClientAgreements(clientId);
          const enriched = freshData.map(a => {
            const stored = JSON.parse(localStorage.getItem('ariex_ceremony_urls') || '{}');
            return { ...a, signatureCeremonyUrl: a.signatureCeremonyUrl || stored[a.id] };
          });
          setAgreements(enriched);
        } catch {
          setAgreements([
            {
              id: result.agreementId || 'temp',
              name: data.title,
              description: data.description,
              price: data.price,
              status: AgreementStatus.PENDING_SIGNATURE,
              clientId,
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
    }
  };

  const handleAcceptDocument = async (documentId: string) => {
    try {
      const success = await updateDocumentAcceptance(
        documentId,
        AcceptanceStatus.ACCEPTED_BY_STRATEGIST
      );
      if (success) await refreshAgreements();
    } catch (error) {
      console.error('Failed to accept document:', error);
    }
  };

  const handleDeclineDocument = async (documentId: string) => {
    try {
      const success = await updateDocumentAcceptance(
        documentId,
        AcceptanceStatus.REJECTED_BY_STRATEGIST
      );
      if (success) await refreshAgreements();
    } catch (error) {
      console.error('Failed to decline document:', error);
    }
  };

  const handleAdvanceToStrategy = async () => {
    if (!signedAgreement) return;
    setIsAdvancingToStrategy(true);
    try {
      const success = await updateAgreementStatus(
        signedAgreement.id,
        AgreementStatus.PENDING_STRATEGY
      );
      if (success) {
        logAgreementStatus(
          'strategist',
          signedAgreement.id,
          AgreementStatus.PENDING_STRATEGY,
          'Ready for strategy'
        );
        await refreshAgreements();
      }
    } catch (error) {
      console.error('Failed to advance to strategy:', error);
    } finally {
      setIsAdvancingToStrategy(false);
    }
  };

  const handleSendStrategy = async (data: StrategySendData) => {
    if (!signedAgreement || !apiClient) return;
    try {
      const result = await sendStrategyToClient({
        agreementId: signedAgreement.id,
        clientId: apiClient.id,
        clientName: apiClient.name || apiClient.fullName || apiClient.email.split('@')[0],
        clientEmail: apiClient.email,
        strategistName: 'Ariex Tax Strategist',
        data,
      });
      if (result.success) {
        logAgreementStatus(
          'strategist',
          signedAgreement.id,
          AgreementStatus.PENDING_STRATEGY_REVIEW,
          'Strategy sent'
        );
        setIsStrategySheetOpen(false);
        await refreshAgreements();
      }
    } catch (error) {
      console.error('Failed to send strategy:', error);
    }
  };

  const handleCompleteAgreement = async () => {
    if (!signedAgreement) return;
    setIsCompletingAgreement(true);
    try {
      const result = await completeAgreement(signedAgreement.id);
      if (result.success) {
        logAgreementStatus(
          'strategist',
          signedAgreement.id,
          AgreementStatus.COMPLETED,
          'Agreement completed'
        );
        await refreshAgreements();
      }
    } catch (error) {
      console.error('Failed to complete agreement:', error);
    } finally {
      setIsCompletingAgreement(false);
    }
  };

  const handleOpenPaymentModal = () => {
    if (!signedAgreement) return;
    let amount = 499;
    const match = signedAgreement.description?.match(/__SIGNATURE_METADATA__:([\s\S]+)$/);
    if (match) {
      try {
        const m = JSON.parse(match[1]);
        if (m.price) amount = m.price;
      } catch {
        /* default */
      }
    }
    setPaymentAmount(amount);
    setPaymentError(null);
    setIsPaymentModalOpen(true);
  };

  const handleSendPaymentLink = async () => {
    if (isSendingPayment || !signedAgreement) return;
    setIsSendingPayment(true);
    setPaymentError(null);
    try {
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

      let link: string | null = null;
      try {
        link = await generatePaymentLink(newCharge.id);
      } catch (e) {
        setPaymentError(
          `Failed to generate payment link: ${e instanceof Error ? e.message : 'Unknown error'}`
        );
        return;
      }
      if (!link) {
        setPaymentError('Failed to generate payment link');
        return;
      }

      const success = await attachPayment(signedAgreement.id, {
        amount: paymentAmount,
        paymentLink: link,
      });
      if (success) {
        logAgreementStatus(
          'strategist',
          signedAgreement.id,
          AgreementStatus.PENDING_PAYMENT,
          'Payment link sent'
        );
        setExistingCharge({ ...newCharge, paymentLink: link });
        setIsPaymentModalOpen(false);
        await refreshAgreements();
      } else {
        setPaymentError('Failed to attach payment link');
      }
    } catch (error) {
      console.error('Failed to send payment link:', error);
      setPaymentError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSendingPayment(false);
    }
  };

  const handleSendPaymentReminder = async () => {
    if (isSendingPayment || !signedAgreement || !existingCharge) return;
    setIsSendingPayment(true);
    setPaymentError(null);
    try {
      let link: string | null = null;
      try {
        link = await generatePaymentLink(existingCharge.id);
      } catch (e) {
        setPaymentError(
          `Failed to generate payment link: ${e instanceof Error ? e.message : 'Unknown error'}`
        );
        return;
      }
      if (!link) {
        setPaymentError('Failed to generate payment link');
        return;
      }

      const success = await attachPayment(signedAgreement.id, {
        amount: typeof existingCharge.amount === 'number' ? existingCharge.amount : paymentAmount,
        paymentLink: link,
      });
      if (success) {
        logAgreementStatus(
          'strategist',
          signedAgreement.id,
          AgreementStatus.PENDING_PAYMENT,
          'Reminder sent'
        );
        setExistingCharge({ ...existingCharge, paymentLink: link });
        await refreshAgreements();
      } else {
        setPaymentError('Failed to update payment link');
      }
    } catch (error) {
      console.error('Failed to send payment reminder:', error);
      setPaymentError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSendingPayment(false);
    }
  };

  // ─── Strategy Review Sheet (with compliance comments) ─────
  const [strategyReviewPdfUrl, setStrategyReviewPdfUrl] = useState<string | null>(null);
  const [strategyComments, setStrategyComments] = useState<ReviewComment[]>([]);
  const [isLoadingStrategyComments, setIsLoadingStrategyComments] = useState(false);
  const [isStrategyReviewOpen, setIsStrategyReviewOpen] = useState(false);

  useEffect(() => {
    if (!strategyDocumentId) return;
    let cancelled = false;
    (async () => {
      const result = await getStrategyDocumentUrl(strategyDocumentId);
      if (!cancelled && result.success && result.url) {
        setStrategyReviewPdfUrl(result.url);
      }
    })();
    return () => { cancelled = true; };
  }, [strategyDocumentId]);

  useEffect(() => {
    if (!strategyDocumentId) return;
    let cancelled = false;
    setIsLoadingStrategyComments(true);
    (async () => {
      try {
        const comments = await getDocumentComments(strategyDocumentId);
        if (!cancelled) {
          setStrategyComments(
            comments.map(c => ({
              id: c.id,
              body: c.body,
              createdAt: c.createdAt,
              userName: undefined,
            }))
          );
        }
      } catch {
        // Non-critical
      } finally {
        if (!cancelled) setIsLoadingStrategyComments(false);
      }
    })();
    return () => { cancelled = true; };
  }, [strategyDocumentId]);

  const handleViewStrategyDocument = async () => {
    if (strategyReviewPdfUrl) {
      setIsStrategyReviewOpen(true);
    } else if (strategyDocumentId) {
      const result = await getStrategyDocumentUrl(strategyDocumentId);
      if (result.success && result.url) {
        setStrategyReviewPdfUrl(result.url);
        setIsStrategyReviewOpen(true);
      } else {
        alert('Strategy document not yet available. Please try again in a moment.');
      }
    }
  };

  // Backward compat alias (Phase 4 will remove)
  const handleDownloadSignedStrategy = handleViewStrategyDocument;

  const handleDeleteTodo = async () => {
    if (!todoToDelete) return;
    setDeletingTodoId(todoToDelete.id);
    const success = await deleteTodo(todoToDelete.id);
    if (success) await refreshAgreements();
    setDeletingTodoId(null);
    setTodoToDelete(null);
  };

  const handleViewDocument = async (docId: string) => {
    setViewingDocId(docId);
    try {
      const url = await getDownloadUrl(docId);
      if (url) window.open(url, '_blank');
    } catch (err) {
      console.error('[UI] Error getting download URL:', err);
    } finally {
      setViewingDocId(null);
    }
  };

  // ─── Return ──────────────────────────────────────────────────

  return {
    isLoading,
    client,
    apiClient,
    agreements,
    clientDocuments,
    activeAgreement,
    signedAgreement,
    isLoadingAgreements,
    isAgreementModalOpen,
    agreementError,
    setIsAgreementModalOpen,
    existingCharge,
    isLoadingCharges,
    isPaymentModalOpen,
    isSendingPayment,
    paymentError,
    paymentAmount,
    setPaymentAmount,
    setIsPaymentModalOpen,
    selectedDocs,
    isLoadingDocuments,
    viewingDocId,
    setViewingDocId,
    isRequestDocsModalOpen,
    setIsRequestDocsModalOpen,
    todoToDelete,
    setTodoToDelete,
    deletingTodoId,
    isStrategySheetOpen,
    setIsStrategySheetOpen,
    isCompletingAgreement,
    hasAgreementSent,
    hasAgreementSigned,
    step3Sent,
    step3Complete,
    hasDocumentsRequested,
    hasAllDocumentsUploaded,
    hasAllDocumentsAccepted,
    documentTodos,
    uploadedDocCount,
    totalDocTodos,
    acceptedDocCount,
    step5Sent,
    step5Signed: !!step5Signed,
    step5Complete,
    step5State,
    strategyMetadata,
    strategyDocumentId,
    strategyDoc: strategyDoc
      ? {
          signedAt: strategyDoc.signedAt ?? undefined,
          createdAt: strategyDoc.createdAt,
          originalName: strategyDoc.originalName,
          signatureStatus: strategyDoc.signatureStatus,
        }
      : null,
    statusKey,
    todoTitles,
    toggleDocSelection,
    handleSendAgreement,
    handleAcceptDocument,
    handleDeclineDocument,
    handleAdvanceToStrategy,
    handleSendStrategy,
    handleCompleteAgreement,
    handleOpenPaymentModal,
    handleSendPaymentLink,
    handleSendPaymentReminder,
    handleDownloadSignedStrategy,
    handleViewStrategyDocument,
    handleDeleteTodo,
    handleViewDocument,
    refreshAgreements,
    strategyReviewPdfUrl,
    strategyComments,
    isLoadingStrategyComments,
    isStrategyReviewOpen,
    setIsStrategyReviewOpen,
  };
}
