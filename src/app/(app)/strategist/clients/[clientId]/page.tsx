'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { AgreementStatus } from '@/types/agreement';
import { Warning } from '@phosphor-icons/react/dist/ssr';
import { useRouter, useSearchParams } from 'next/navigation';

// Lazy-load heavy modal/sheet components (TipTap, jsPDF, html2canvas stay out of HMR graph)
const AgreementSheet = dynamic(
  () =>
    import('@/components/agreements/agreement-sheet').then(m => ({ default: m.AgreementSheet })),
  { ssr: false }
);

const StrategySheet = dynamic(
  () => import('@/components/strategy/strategy-sheet').then(m => ({ default: m.StrategySheet })),
  { ssr: false }
);

const StrategyReviewSheet = dynamic(
  () =>
    import('@/components/compliance/strategy-review-sheet').then(m => ({
      default: m.StrategyReviewSheet,
    })),
  { ssr: false }
);

const RequestDocumentsModal = dynamic(
  () =>
    import('@/components/documents/request-documents-modal').then(m => ({
      default: m.RequestDocumentsModal,
    })),
  { ssr: false }
);

const ClientFloatingChat = dynamic(
  () =>
    import('@/components/chat/client-floating-chat').then(m => ({
      default: m.ClientFloatingChat,
    })),
  { ssr: false }
);

import { LoadingState } from '@/contexts/strategist-contexts/client-management/components/shared/loading-state';
import { ClientHeader } from '@/contexts/strategist-contexts/client-management/components/detail/client-header';
import { ClientInfoCard } from '@/contexts/strategist-contexts/client-management/components/detail/client-info-card';
import { ActivityTimeline } from '@/contexts/strategist-contexts/client-management/components/detail/activity-timeline';
import { AgreementSelector } from '@/contexts/strategist-contexts/client-management/components/detail/agreement-selector';
import { DocumentsList } from '@/contexts/strategist-contexts/client-management/components/detail/documents-list';
import { PaymentModal } from '@/contexts/strategist-contexts/client-management/components/detail/payment-modal';
import { DeleteTodoDialog } from '@/contexts/strategist-contexts/client-management/components/detail/delete-todo-dialog';

import {
  useClientDetailStore,
  selectActiveAgreement,
  selectSignedAgreement,
  selectStatusKey,
  selectHasAgreementSent,
  selectHasAgreementSigned,
  selectStep3Sent,
  selectStep3Complete,
  selectHasDocumentsRequested,
  selectHasAllDocumentsUploaded,
  selectHasAllDocumentsAccepted,
  selectDocumentTodos,
  selectUploadedDocCount,
  selectTotalDocTodos,
  selectAcceptedDocCount,
  selectStep5Sent,
  selectStep5Complete,
  selectStep5State,
  selectStrategyMetadata,
  selectStrategyDoc,
  selectTodoTitles,
  selectHasPaymentReceived,
} from '@/contexts/strategist-contexts/client-management/ClientDetailStore';

import { useAiPageContext } from '@/contexts/ai/hooks/use-ai-page-context';
import type { AiDocumentContext, AiAgreementContext } from '@/contexts/ai/AiPageContextStore';

interface Props {
  params: { clientId: string };
}

export default function StrategistClientDetailPage({ params }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didInitFromUrl = useRef(false);

  // ─── Store Initialization ───────────────────────────────────
  const init = useClientDetailStore(s => s.init);
  const reset = useClientDetailStore(s => s.reset);

  useEffect(() => {
    const urlAgreementId = searchParams.get('agreementId');
    if (urlAgreementId) {
      didInitFromUrl.current = true;
    }
    init(params.clientId, urlAgreementId ?? undefined);
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.clientId, init, reset]);

  // ─── Read Store State ───────────────────────────────────────
  const isLoading = useClientDetailStore(s => s.isLoading);
  const clientInfo = useClientDetailStore(s => s.clientInfo);
  const apiClient = useClientDetailStore(s => s.apiClient);
  const agreements = useClientDetailStore(s => s.agreements);
  const clientDocuments = useClientDetailStore(s => s.clientDocuments);
  const selectedAgreementId = useClientDetailStore(s => s.selectedAgreementId);

  // ─── Sync selectedAgreementId → URL query param ─────────────
  useEffect(() => {
    if (!selectedAgreementId) return;
    const current = searchParams.get('agreementId');
    if (current === selectedAgreementId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('agreementId', selectedAgreementId);
    window.history.replaceState(window.history.state, '', url.toString());
  }, [selectedAgreementId, searchParams]);
  const isLoadingAgreements = useClientDetailStore(s => s.isLoadingAgreements);
  const isAgreementModalOpen = useClientDetailStore(s => s.isAgreementModalOpen);
  const agreementError = useClientDetailStore(s => s.agreementError);
  const existingCharge = useClientDetailStore(s => s.existingCharge);
  const isLoadingCharges = useClientDetailStore(s => s.isLoadingCharges);
  const isPaymentModalOpen = useClientDetailStore(s => s.isPaymentModalOpen);
  const isSendingPayment = useClientDetailStore(s => s.isSendingPayment);
  const paymentError = useClientDetailStore(s => s.paymentError);
  const paymentAmount = useClientDetailStore(s => s.paymentAmount);
  const selectedDocs = useClientDetailStore(s => s.selectedDocs);
  const isLoadingDocuments = useClientDetailStore(s => s.isLoadingDocuments);
  const viewingDocId = useClientDetailStore(s => s.viewingDocId);
  const isRequestDocsModalOpen = useClientDetailStore(s => s.isRequestDocsModalOpen);
  const todoToDelete = useClientDetailStore(s => s.todoToDelete);
  const deletingTodoId = useClientDetailStore(s => s.deletingTodoId);
  const isStrategySheetOpen = useClientDetailStore(s => s.isStrategySheetOpen);
  const isCompletingAgreement = useClientDetailStore(s => s.isCompletingAgreement);
  const strategistCeremonyUrl = useClientDetailStore(s => s.strategistCeremonyUrl);
  const strategistHasSigned = useClientDetailStore(s => s.strategistHasSigned);
  const clientHasSigned = useClientDetailStore(s => s.clientHasSigned);
  const signedAgreementDocUrl = useClientDetailStore(s => s.signedAgreementDocUrl);
  const strategyReviewPdfUrl = useClientDetailStore(s => s.strategyReviewPdfUrl);
  const complianceUserId = useClientDetailStore(s => s.complianceUserId);
  const complianceUsers = useClientDetailStore(s => s.complianceUsers);
  const isStrategyReviewOpen = useClientDetailStore(s => s.isStrategyReviewOpen);
  const refreshSigningInfo = useClientDetailStore(s => s.refreshSigningInfo);

  // ─── Auto-detect signing status on tab focus ────────────────
  const needsSigningPoll = !!(selectedAgreementId && !(strategistHasSigned && clientHasSigned));

  useEffect(() => {
    if (!needsSigningPoll) return;

    // Poll when user returns to the tab (e.g. after signing in another tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSigningInfo();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also poll every 15s while the agreement is pending signatures
    const interval = setInterval(() => {
      refreshSigningInfo();
    }, 15_000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [needsSigningPoll, refreshSigningInfo]);

  // ─── Computed Selectors ─────────────────────────────────────
  const activeAgreement = useClientDetailStore(selectActiveAgreement);
  const signedAgreement = useClientDetailStore(selectSignedAgreement);
  const statusKey = useClientDetailStore(selectStatusKey);
  const hasAgreementSent = useClientDetailStore(selectHasAgreementSent);
  const hasAgreementSigned = useClientDetailStore(selectHasAgreementSigned);
  const step3Sent = useClientDetailStore(selectStep3Sent);
  const step3Complete = useClientDetailStore(selectStep3Complete);
  const hasDocumentsRequested = useClientDetailStore(selectHasDocumentsRequested);
  const hasAllDocumentsUploaded = useClientDetailStore(selectHasAllDocumentsUploaded);
  const hasAllDocumentsAccepted = useClientDetailStore(selectHasAllDocumentsAccepted);
  const documentTodos = useClientDetailStore(selectDocumentTodos);
  const uploadedDocCount = useClientDetailStore(selectUploadedDocCount);
  const totalDocTodos = useClientDetailStore(selectTotalDocTodos);
  const acceptedDocCount = useClientDetailStore(selectAcceptedDocCount);
  const step5Sent = useClientDetailStore(selectStep5Sent);
  const step5Complete = useClientDetailStore(selectStep5Complete);
  const step5State = useClientDetailStore(selectStep5State);
  const strategyMetadata = useClientDetailStore(selectStrategyMetadata);
  const strategyDoc = useClientDetailStore(selectStrategyDoc);
  const todoTitles = useClientDetailStore(selectTodoTitles);

  // ─── Store Actions ──────────────────────────────────────────
  const setSelectedAgreementId = useClientDetailStore(s => s.setSelectedAgreementId);
  const setIsAgreementModalOpen = useClientDetailStore(s => s.setIsAgreementModalOpen);
  const setIsPaymentModalOpen = useClientDetailStore(s => s.setIsPaymentModalOpen);
  const setPaymentAmount = useClientDetailStore(s => s.setPaymentAmount);
  const setIsRequestDocsModalOpen = useClientDetailStore(s => s.setIsRequestDocsModalOpen);
  const setTodoToDelete = useClientDetailStore(s => s.setTodoToDelete);
  const setIsStrategySheetOpen = useClientDetailStore(s => s.setIsStrategySheetOpen);
  const setIsStrategyReviewOpen = useClientDetailStore(s => s.setIsStrategyReviewOpen);
  const toggleDocSelection = useClientDetailStore(s => s.toggleDocSelection);
  const refreshAgreements = useClientDetailStore(s => s.refreshAgreements);

  const sendAgreement = useClientDetailStore(s => s.sendAgreement);
  const acceptDocument = useClientDetailStore(s => s.acceptDocument);
  const declineDocument = useClientDetailStore(s => s.declineDocument);
  const advanceToStrategy = useClientDetailStore(s => s.advanceToStrategy);
  const sendStrategy = useClientDetailStore(s => s.sendStrategy);
  const completeAgreementAction = useClientDetailStore(s => s.completeAgreementAction);
  const openPaymentModal = useClientDetailStore(s => s.openPaymentModal);
  const sendPaymentLink = useClientDetailStore(s => s.sendPaymentLink);
  const sendPaymentReminder = useClientDetailStore(s => s.sendPaymentReminder);
  const downloadSignedStrategy = useClientDetailStore(s => s.downloadSignedStrategy);
  const viewStrategyDocument = useClientDetailStore(s => s.viewStrategyDocument);
  const sendRevisedStrategy = useClientDetailStore(s => s.sendRevisedStrategy);
  const deleteTodoAction = useClientDetailStore(s => s.deleteTodoAction);
  const viewDocument = useClientDetailStore(s => s.viewDocument);
  const strategistSign = useClientDetailStore(s => s.strategistSign);

  // ─── AI Page Context ────────────────────────────────────────

  useAiPageContext({
    pageTitle: clientInfo
      ? `Client: ${clientInfo.user.name || clientInfo.user.email}`
      : 'Client Detail',
    userRole: 'STRATEGIST',
    client: clientInfo
      ? {
          id: clientInfo.user.id,
          name: clientInfo.user.name,
          email: clientInfo.user.email,
          phoneNumber: clientInfo.profile.phoneNumber,
          businessName: clientInfo.profile.businessName,
          businessType: clientInfo.profile.businessType,
          city: clientInfo.profile.city,
          state: clientInfo.profile.state,
          estimatedIncome: clientInfo.profile.estimatedIncome,
          filingStatus: clientInfo.profile.filingStatus,
          dependents: clientInfo.profile.dependents,
          statusKey,
        }
      : null,
    documents: clientDocuments.map(
      (d): AiDocumentContext => ({
        id: d.id,
        name: d.name,
        type: d.type,
        status: d.status,
        category: d.category,
        acceptanceStatus: d.acceptanceStatus,
        uploadedBy: d.uploadedByName || d.uploadedBy,
        createdAt: d.createdAt,
      })
    ),
    agreements: agreements.map(
      (a): AiAgreementContext => ({
        id: a.id,
        name: a.name,
        status: a.status,
        price: typeof a.price === 'string' ? parseFloat(a.price) : a.price,
        createdAt: a.createdAt,
      })
    ),
    strategy: step5State
      ? {
          sent: !!step5State.strategySent,
          phase: step5State.phase,
          isComplete: !!step5State.isComplete,
        }
      : null,
    extra: {
      hasAgreementSigned,
      hasPaymentReceived: !!existingCharge && existingCharge.status === 'paid',
      hasAllDocumentsAccepted,
      uploadedDocCount,
      totalDocTodos,
      acceptedDocCount,
    },
  });

  // ─── Loading / Not Found ────────────────────────────────────

  if (isLoading) return <LoadingState />;

  if (!clientInfo) {
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

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="flex min-h-full flex-col bg-white">
      <div className="relative flex-1">
        <ClientHeader
          clientName={clientInfo.user.name}
          statusKey={statusKey}
          canSendStrategy={signedAgreement?.status === AgreementStatus.PENDING_STRATEGY}
          onStrategyClick={() => setIsStrategySheetOpen(true)}
        />

        <div className="relative z-40 mx-auto w-full max-w-2xl px-4">
          <ClientInfoCard
            clientName={clientInfo.user.name}
            email={clientInfo.user.email}
            phoneNumber={clientInfo.profile.phoneNumber}
            businessName={clientInfo.profile.businessName}
            businessType={clientInfo.profile.businessType}
            city={clientInfo.profile.city}
            state={clientInfo.profile.state}
            estimatedIncome={clientInfo.profile.estimatedIncome}
            filingStatus={clientInfo.profile.filingStatus}
          />

          <AgreementSelector
            agreements={agreements}
            selectedAgreementId={selectedAgreementId}
            onSelect={setSelectedAgreementId}
            onCreateNew={() => setIsAgreementModalOpen(true)}
            isLoading={isLoadingAgreements}
          />

          <ActivityTimeline
            client={clientInfo}
            agreements={agreements}
            existingCharge={existingCharge}
            signedAgreement={signedAgreement}
            isLoadingAgreements={isLoadingAgreements}
            isLoadingCharges={isLoadingCharges}
            isSendingPayment={isSendingPayment}
            isCompletingAgreement={isCompletingAgreement}
            paymentError={paymentError}
            agreementError={agreementError}
            hasAgreementSent={hasAgreementSent}
            hasAgreementSigned={hasAgreementSigned}
            step3Sent={step3Sent}
            step3Complete={step3Complete}
            hasDocumentsRequested={hasDocumentsRequested}
            hasAllDocumentsUploaded={hasAllDocumentsUploaded}
            hasAllDocumentsAccepted={hasAllDocumentsAccepted}
            documentTodos={documentTodos}
            uploadedDocCount={uploadedDocCount}
            totalDocTodos={totalDocTodos}
            acceptedDocCount={acceptedDocCount}
            step5Sent={step5Sent}
            step5Signed={false}
            step5Complete={step5Complete}
            step5State={step5State}
            strategyMetadata={strategyMetadata}
            strategyDoc={strategyDoc}
            strategistCeremonyUrl={strategistCeremonyUrl}
            strategistHasSigned={strategistHasSigned}
            clientHasSigned={clientHasSigned}
            signedAgreementDocUrl={signedAgreementDocUrl}
            onStrategistSign={strategistSign}
            onOpenAgreementModal={() => setIsAgreementModalOpen(true)}
            onOpenPaymentModal={openPaymentModal}
            onSendPaymentReminder={sendPaymentReminder}
            onOpenRequestDocsModal={() => setIsRequestDocsModalOpen(true)}
            onOpenStrategySheet={() => setIsStrategySheetOpen(true)}
            onAdvanceToStrategy={advanceToStrategy}
            onCompleteAgreement={completeAgreementAction}
            onDownloadSignedStrategy={downloadSignedStrategy}
            onViewStrategyDocument={viewStrategyDocument}
            onAcceptDocument={acceptDocument}
            onDeclineDocument={declineDocument}
            onDeleteTodoRequest={todo => setTodoToDelete(todo)}
          />

          <DocumentsList
            documents={clientDocuments}
            isLoading={isLoadingDocuments}
            selectedDocs={selectedDocs}
            viewingDocId={viewingDocId}
            todoTitles={todoTitles}
            documentTodos={documentTodos}
            signedDocumentUrl={signedAgreementDocUrl}
            contractDocumentId={signedAgreement?.contractDocumentId}
            onToggleSelection={toggleDocSelection}
            onViewDocument={viewDocument}
            onRequestDocuments={() => setIsRequestDocsModalOpen(true)}
          />
        </div>
      </div>

      {/* Strategy Sheet (edit mode) */}
      {signedAgreement && (
        <StrategySheet
          client={clientInfo}
          agreementId={signedAgreement.id}
          isOpen={isStrategySheetOpen}
          onClose={() => setIsStrategySheetOpen(false)}
          onSend={sendStrategy}
          rejectedPdfUrl={strategyReviewPdfUrl}
          complianceUserId={complianceUserId}
          complianceUsers={complianceUsers}
        />
      )}

      {/* Strategy Review Sheet (edit + chat with compliance) */}
      {signedAgreement && clientInfo && (
        <StrategyReviewSheet
          role="strategist"
          isOpen={isStrategyReviewOpen}
          onClose={() => setIsStrategyReviewOpen(false)}
          client={clientInfo}
          agreementId={signedAgreement.id}
          documentTitle={
            strategyDoc?.originalName?.replace(/\.[^/.]+$/, '') || 'Tax Strategy Plan'
          }
          otherUserId={complianceUserId}
          complianceUsers={complianceUsers}
          onSend={sendRevisedStrategy}
        />
      )}

      {/* Agreement Sheet */}
      <AgreementSheet
        clientId={params.clientId}
        clientName={clientInfo.user.name || clientInfo.user.email || 'Client'}
        clientEmail={clientInfo.user.email || ''}
        isOpen={isAgreementModalOpen}
        onClose={() => setIsAgreementModalOpen(false)}
        onSend={sendAgreement}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        clientName={clientInfo.user.name}
        agreementName={signedAgreement?.name || 'Service Agreement'}
        paymentAmount={paymentAmount}
        isSending={isSendingPayment}
        error={paymentError}
        onAmountChange={setPaymentAmount}
        onSend={sendPaymentLink}
        onClose={() => setIsPaymentModalOpen(false)}
      />

      {/* Request Documents Modal */}
      {activeAgreement && (
        <RequestDocumentsModal
          isOpen={isRequestDocsModalOpen}
          onClose={() => setIsRequestDocsModalOpen(false)}
          agreementId={activeAgreement.id}
          clientId={params.clientId}
          clientName={clientInfo?.user.name || 'Client'}
          onSuccess={refreshAgreements}
        />
      )}

      {/* Delete Todo Dialog */}
      {todoToDelete && (
        <DeleteTodoDialog
          todo={todoToDelete}
          isDeleting={!!deletingTodoId}
          onConfirm={deleteTodoAction}
          onCancel={() => setTodoToDelete(null)}
        />
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
