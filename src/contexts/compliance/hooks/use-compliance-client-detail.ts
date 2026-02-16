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

  // Fetch comments when strategy document is found
  useEffect(() => {
    if (strategyDocument?.id) {
      fetchComments(strategyDocument.id);
    }
  }, [strategyDocument?.id]);

  // Get strategy PDF URL when strategy document exists
  useEffect(() => {
    async function loadPdfUrl() {
      if (strategyDocument?.id) {
        const result = await getStrategyDocumentUrl(strategyDocument.id);
        if (result.success && result.url) {
          setStrategyPdfUrl(result.url);
        }
      }
    }
    loadPdfUrl();
  }, [strategyDocument?.id]);

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
        documentId: strategyDocument?.id,
        body,
      });
    },
    [strategistId, strategyDocument?.id]
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
