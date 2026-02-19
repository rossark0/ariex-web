/**
 * useComplianceClientDetail
 *
 * Hook for the compliance client detail page.
 * Fetches full client data, agreement, documents, todos, strategy state.
 * Provides approve/reject actions.
 */

'use client';

import { useEffect, useMemo, useCallback, useState } from 'react';
import { useStore } from 'zustand';
import { complianceStore } from '../ComplianceStore';
import {
  fetchClientDetail,
  approveStrategy,
  rejectStrategy,
  fetchComments,
  addComment,
} from '../services/compliance.service';
import {
  computeTimelineState,
  computeClientStatusKey,
  type RealTimelineState,
} from '../models/compliance.model';
import { parseStrategyMetadata } from '@/contexts/strategist-contexts/client-management/models/strategy.model';
import { CLIENT_STATUS_CONFIG, type ClientStatusKey } from '@/lib/client-status';
import { getStrategyDocumentUrl } from '@/lib/api/strategies.actions';
import { getComplianceDocumentUrl } from '@/lib/api/compliance.api';

export function useComplianceClientDetail(clientId: string, strategistId: string) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [strategyPdfUrl, setStrategyPdfUrl] = useState<string | null>(null);

  // Store selectors
  const selectedClient = useStore(complianceStore, s => s.selectedClient);
  const selectedAgreement = useStore(complianceStore, s => s.selectedAgreement);
  const clientDocuments = useStore(complianceStore, s => s.clientDocuments);
  const clientFiles = useStore(complianceStore, s => s.clientFiles);
  const clientTodoLists = useStore(complianceStore, s => s.clientTodoLists);
  const clientTodos = useStore(complianceStore, s => s.clientTodos);
  const strategyDocument = useStore(complianceStore, s => s.strategyDocument);
  const isLoading = useStore(complianceStore, s => s.isLoadingClientDetail);
  const error = useStore(complianceStore, s => s.clientDetailError);
  const comments = useStore(complianceStore, s => s.comments);
  const isLoadingComments = useStore(complianceStore, s => s.isLoadingComments);

  // Fetch on mount
  useEffect(() => {
    fetchClientDetail(clientId, strategistId);
  }, [clientId, strategistId]);

  // Compute timeline state from real data
  const timeline: RealTimelineState = useMemo(
    () => computeTimelineState(selectedAgreement, strategyDocument),
    [selectedAgreement, strategyDocument]
  );

  // Strategy metadata (rejection reason, etc.)
  const strategyMetadata = useMemo(
    () => parseStrategyMetadata(selectedAgreement?.description ?? null),
    [selectedAgreement?.description]
  );

  // Resolve the strategy document ID: prefer the document found in the
  // compliance documents list; fall back to the ID stored in agreement metadata.
  const resolvedStrategyDocId = strategyDocument?.id ?? strategyMetadata?.strategyDocumentId ?? null;

  // Fetch comments when strategy document is identified
  useEffect(() => {
    if (resolvedStrategyDocId) {
      fetchComments(resolvedStrategyDocId);
    }
  }, [resolvedStrategyDocId]);

  // Get strategy PDF URL via compliance-scoped endpoints
  // (the generic /documents/{id} returns 403 for compliance users).
  useEffect(() => {
    if (!resolvedStrategyDocId) return;
    let cancelled = false;

    // Fast path: look up downloadUrl from the already-loaded files list
    const stratDoc = clientDocuments.find(d => d.id === resolvedStrategyDocId);
    if (stratDoc?.fileId) {
      const matchingFile = clientFiles.find(f => f.id === stratDoc.fileId);
      if (matchingFile?.downloadUrl) {
        setStrategyPdfUrl(matchingFile.downloadUrl);
        return;
      }
    }

    // Otherwise fetch via the compliance-specific API helper
    (async () => {
      const url = await getComplianceDocumentUrl(
        resolvedStrategyDocId,
        selectedAgreement?.id
      );
      if (!cancelled && url) {
        setStrategyPdfUrl(url);
      }
    })();

    return () => { cancelled = true; };
  }, [resolvedStrategyDocId, clientDocuments, clientFiles, selectedAgreement?.id]);

  // Status config for badge display
  const statusConfig = useMemo(
    () => CLIENT_STATUS_CONFIG[timeline.statusKey],
    [timeline.statusKey]
  );

  // Client profile helpers
  const clientProfile = selectedClient?.clientProfile;
  const clientName = selectedClient?.fullName || selectedClient?.name || selectedClient?.email || '';

  // ─── Actions ──────────────────────────────────────────────────────────

  const handleApproveStrategy = useCallback(async (): Promise<boolean> => {
    if (!strategyDocument?.id) return false;
    setIsApproving(true);
    try {
      const success = await approveStrategy(strategyDocument.id);
      return success;
    } finally {
      setIsApproving(false);
    }
  }, [strategyDocument?.id]);

  const handleRejectStrategy = useCallback(
    async (reason: string): Promise<boolean> => {
      if (!selectedAgreement?.id || !strategyDocument?.id) return false;
      setIsRejecting(true);
      try {
        const success = await rejectStrategy(
          selectedAgreement.id,
          strategyDocument.id,
          reason
        );
        return success;
      } finally {
        setIsRejecting(false);
      }
    },
    [selectedAgreement?.id, strategyDocument?.id]
  );

  const handleAddComment = useCallback(
    async (body: string): Promise<boolean> => {
      return addComment({
        strategistUserId: strategistId,
        documentId: resolvedStrategyDocId ?? undefined,
        body,
      });
    },
    [strategistId, resolvedStrategyDocId]
  );

  return {
    // Data
    client: selectedClient,
    clientName,
    clientProfile,
    agreement: selectedAgreement,
    documents: clientDocuments,
    files: clientFiles,
    todoLists: clientTodoLists,
    todos: clientTodos,
    strategyDocument,
    strategyMetadata,
    strategyPdfUrl,
    comments,

    // Timeline / status
    timeline,
    statusKey: timeline.statusKey,
    statusConfig,

    // Loading states
    isLoading,
    isLoadingComments,
    isApproving,
    isRejecting,
    error,

    // Actions
    handleApproveStrategy,
    handleRejectStrategy,
    handleAddComment,

    // Refresh
    refresh: () => fetchClientDetail(clientId, strategistId),
  };
}
