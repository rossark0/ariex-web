/**
 * useComplianceClientDetail
 *
 * Hook for the compliance client detail page.
 * Fetches full client data, agreement, documents, todos, strategy state.
 * Provides approve/reject actions.
 * Uses chat API for strategy review messaging (not comments).
 */

'use client';

import { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { useStore } from 'zustand';
import { complianceStore } from '../ComplianceStore';
import { fetchClientDetail, approveStrategy, rejectStrategy, selectComplianceAgreement } from '../services/compliance.service';
import {
  computeTimelineState,
  computeClientStatusKey,
  type RealTimelineState,
} from '../models/compliance.model';
import { parseStrategyMetadata } from '@/contexts/strategist-contexts/client-management/models/strategy.model';
import { CLIENT_STATUS_CONFIG, type ClientStatusKey } from '@/lib/client-status';
import { getStrategyDocumentUrl } from '@/lib/api/strategies.actions';
import { getComplianceDocumentUrl } from '@/lib/api/compliance.api';
import { createOrGetChat } from '@/lib/api/chat.api';
import { useAuth } from '@/contexts/auth/AuthStore';

export function useComplianceClientDetail(clientId: string, strategistId: string) {
  const { user: authUser } = useAuth();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [strategyPdfUrl, setStrategyPdfUrl] = useState<string | null>(null);

  // Store selectors
  const selectedClient = useStore(complianceStore, s => s.selectedClient);
  const clientAgreements = useStore(complianceStore, s => s.clientAgreements);
  const selectedAgreementId = useStore(complianceStore, s => s.selectedAgreementId);
  const selectedAgreement = useStore(complianceStore, s => s.selectedAgreement);
  const clientDocuments = useStore(complianceStore, s => s.clientDocuments);
  const clientFiles = useStore(complianceStore, s => s.clientFiles);
  const clientTodoLists = useStore(complianceStore, s => s.clientTodoLists);
  const clientTodos = useStore(complianceStore, s => s.clientTodos);
  const strategyDocument = useStore(complianceStore, s => s.strategyDocument);
  const isLoading = useStore(complianceStore, s => s.isLoadingClientDetail);
  const error = useStore(complianceStore, s => s.clientDetailError);

  // Fetch on mount
  useEffect(() => {
    fetchClientDetail(clientId, strategistId);
  }, [clientId, strategistId]);

  // Reset strategyPdfUrl when agreement changes
  useEffect(() => {
    setStrategyPdfUrl(null);
  }, [selectedAgreementId]);

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
  const resolvedStrategyDocId =
    strategyDocument?.id ?? strategyMetadata?.strategyDocumentId ?? null;

  // Initialize chat with strategist
  useEffect(() => {
    if (!authUser?.id || !strategistId) return;
    let cancelled = false;
    (async () => {
      try {
        await createOrGetChat(authUser.id, strategistId, authUser.id);
      } catch {
        // Non-critical
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser?.id, strategistId]);

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
      const url = await getComplianceDocumentUrl(resolvedStrategyDocId, selectedAgreement?.id);
      if (!cancelled && url) {
        setStrategyPdfUrl(url);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resolvedStrategyDocId, clientDocuments, clientFiles, selectedAgreement?.id]);

  // Status config for badge display
  const statusConfig = useMemo(
    () => CLIENT_STATUS_CONFIG[timeline.statusKey],
    [timeline.statusKey]
  );

  // Client profile helpers
  const clientProfile = selectedClient?.clientProfile;
  const clientName =
    selectedClient?.fullName || selectedClient?.name || selectedClient?.email || '';

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
        const success = await rejectStrategy(selectedAgreement.id, strategyDocument.id, reason);
        return success;
      } finally {
        setIsRejecting(false);
      }
    },
    [selectedAgreement?.id, strategyDocument?.id]
  );

  const handleSelectAgreement = useCallback(
    async (id: string) => {
      await selectComplianceAgreement(id);
    },
    []
  );

  return {
    // Data
    client: selectedClient,
    clientName,
    clientProfile,
    clientAgreements,
    selectedAgreementId,
    agreement: selectedAgreement,
    documents: clientDocuments,
    files: clientFiles,
    todoLists: clientTodoLists,
    todos: clientTodos,
    strategyDocument,
    strategyMetadata,
    strategyPdfUrl,

    // Timeline / status
    timeline,
    statusKey: timeline.statusKey,
    statusConfig,

    // Loading states
    isLoading,
    isApproving,
    isRejecting,
    error,

    // Actions
    handleApproveStrategy,
    handleRejectStrategy,
    handleSelectAgreement,

    // Refresh
    refresh: () => fetchClientDetail(clientId, strategistId),
  };
}
