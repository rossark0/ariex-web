'use client';

import { Button } from '@/components/ui/button';
import { AgreementSheet } from '@/components/agreements/agreement-sheet';
import { StrategySheet } from '@/components/strategy/strategy-sheet';
import { RequestDocumentsModal } from '@/components/documents/request-documents-modal';
import { ClientFloatingChat } from '@/components/chat/client-floating-chat';
import { AgreementStatus } from '@/types/agreement';
import { Warning } from '@phosphor-icons/react/dist/ssr';
import { useRouter } from 'next/navigation';

import {
  LoadingState,
  ClientHeader,
  ClientInfoCard,
  ActivityTimeline,
  DocumentsList,
  PaymentModal,
  DeleteTodoDialog,
} from '@/contexts/strategist-contexts/client-management/components';

import { useClientDetailData } from '@/contexts/strategist-contexts/client-management/hooks/use-client-detail-data';

interface Props {
  params: { clientId: string };
}

export default function StrategistClientDetailPage({ params }: Props) {
  const router = useRouter();
  const data = useClientDetailData(params.clientId);

  // ─── Loading / Not Found ────────────────────────────────────

  if (data.isLoading) return <LoadingState />;

  if (!data.client) {
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
          clientName={data.client.user.name}
          statusKey={data.statusKey}
          canSendStrategy={data.signedAgreement?.status === AgreementStatus.PENDING_STRATEGY}
          onStrategyClick={() => data.setIsStrategySheetOpen(true)}
        />

        <div className="relative z-40 mx-auto w-full max-w-2xl px-4">
          <ClientInfoCard
            clientName={data.client.user.name}
            email={data.client.user.email}
            phoneNumber={data.client.profile.phoneNumber}
            businessName={data.client.profile.businessName}
            businessType={data.client.profile.businessType}
            city={data.client.profile.city}
            state={data.client.profile.state}
            estimatedIncome={data.client.profile.estimatedIncome}
            filingStatus={data.client.profile.filingStatus}
          />

          <ActivityTimeline
            client={data.client}
            agreements={data.agreements}
            existingCharge={data.existingCharge}
            signedAgreement={data.signedAgreement}
            isLoadingAgreements={data.isLoadingAgreements}
            isLoadingCharges={data.isLoadingCharges}
            isSendingPayment={data.isSendingPayment}
            isCompletingAgreement={data.isCompletingAgreement}
            paymentError={data.paymentError}
            agreementError={data.agreementError}
            hasAgreementSent={data.hasAgreementSent}
            hasAgreementSigned={data.hasAgreementSigned}
            step3Sent={data.step3Sent}
            step3Complete={data.step3Complete}
            hasDocumentsRequested={data.hasDocumentsRequested}
            hasAllDocumentsUploaded={data.hasAllDocumentsUploaded}
            hasAllDocumentsAccepted={data.hasAllDocumentsAccepted}
            documentTodos={data.documentTodos}
            uploadedDocCount={data.uploadedDocCount}
            totalDocTodos={data.totalDocTodos}
            acceptedDocCount={data.acceptedDocCount}
            step5Sent={data.step5Sent}
            step5Signed={data.step5Signed}
            step5Complete={data.step5Complete}
            strategyMetadata={data.strategyMetadata}
            strategyDoc={data.strategyDoc}
            onOpenAgreementModal={() => data.setIsAgreementModalOpen(true)}
            onOpenPaymentModal={data.handleOpenPaymentModal}
            onSendPaymentReminder={data.handleSendPaymentReminder}
            onOpenRequestDocsModal={() => data.setIsRequestDocsModalOpen(true)}
            onOpenStrategySheet={() => data.setIsStrategySheetOpen(true)}
            onAdvanceToStrategy={data.handleAdvanceToStrategy}
            onCompleteAgreement={data.handleCompleteAgreement}
            onDownloadSignedStrategy={data.handleDownloadSignedStrategy}
            onAcceptDocument={data.handleAcceptDocument}
            onDeclineDocument={data.handleDeclineDocument}
            onDeleteTodoRequest={todo => data.setTodoToDelete(todo)}
          />

          <DocumentsList
            documents={data.clientDocuments}
            isLoading={data.isLoadingDocuments}
            selectedDocs={data.selectedDocs}
            viewingDocId={data.viewingDocId}
            todoTitles={data.todoTitles}
            onToggleSelection={data.toggleDocSelection}
            onViewDocument={data.handleViewDocument}
          />
        </div>
      </div>

      {/* Strategy Sheet */}
      {data.signedAgreement && (
        <StrategySheet
          client={data.client}
          agreementId={data.signedAgreement.id}
          isOpen={data.isStrategySheetOpen}
          onClose={() => data.setIsStrategySheetOpen(false)}
          onSend={data.handleSendStrategy}
        />
      )}

      {/* Agreement Sheet */}
      <AgreementSheet
        clientId={params.clientId}
        clientName={data.client.user.name || data.client.user.email || 'Client'}
        clientEmail={data.client.user.email || ''}
        isOpen={data.isAgreementModalOpen}
        onClose={() => data.setIsAgreementModalOpen(false)}
        onSend={data.handleSendAgreement}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={data.isPaymentModalOpen}
        clientName={data.client.user.name}
        agreementName={data.signedAgreement?.name || 'Service Agreement'}
        paymentAmount={data.paymentAmount}
        isSending={data.isSendingPayment}
        error={data.paymentError}
        onAmountChange={data.setPaymentAmount}
        onSend={data.handleSendPaymentLink}
        onClose={() => data.setIsPaymentModalOpen(false)}
      />

      {/* Request Documents Modal */}
      {data.activeAgreement && (
        <RequestDocumentsModal
          isOpen={data.isRequestDocsModalOpen}
          onClose={() => data.setIsRequestDocsModalOpen(false)}
          agreementId={data.activeAgreement.id}
          clientId={params.clientId}
          clientName={data.client?.user.name || 'Client'}
          onSuccess={data.refreshAgreements}
        />
      )}

      {/* Delete Todo Dialog */}
      {data.todoToDelete && (
        <DeleteTodoDialog
          todo={data.todoToDelete}
          isDeleting={!!data.deletingTodoId}
          onConfirm={data.handleDeleteTodo}
          onCancel={() => data.setTodoToDelete(null)}
        />
      )}

      {/* Floating Chat */}
      {data.apiClient && (
        <ClientFloatingChat
          client={{
            id: data.apiClient.id,
            user: {
              id: data.apiClient.id,
              name: data.apiClient.name,
              email: data.apiClient.email,
            },
          }}
        />
      )}
    </div>
  );
}
