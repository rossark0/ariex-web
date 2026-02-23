/**
 * useComplianceStrategistDetail
 *
 * Hook for the compliance strategist detail page.
 * Fetches strategist + their clients, provides search/grouping.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { complianceStore } from '../ComplianceStore';
import { fetchStrategistDetail, fetchClients } from '../services/compliance.service';
import type { ComplianceClientView } from '../models/compliance.model';
import { CLIENT_STATUS_CONFIG, type ClientStatusKey } from '@/lib/client-status';

export function useComplianceStrategistDetail(strategistId: string) {
  const [searchQuery, setSearchQuery] = useState('');

  const selectedStrategist = useStore(complianceStore, s => s.selectedStrategist);
  const isLoadingStrategist = useStore(complianceStore, s => s.isLoadingStrategistDetail);
  const clientViews = useStore(complianceStore, s => s.clientViews);
  const isLoadingClients = useStore(complianceStore, s => s.isLoadingClients);
  const clientError = useStore(complianceStore, s => s.clientError);

  useEffect(() => {
    fetchStrategistDetail(strategistId);
    fetchClients(strategistId);
  }, [strategistId]);

  // Filter clients by search
  const filteredClients = useMemo(() => {
    if (!searchQuery) return clientViews;
    const q = searchQuery.toLowerCase();
    return clientViews.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.businessName?.toLowerCase().includes(q)
    );
  }, [clientViews, searchQuery]);

  // Group clients by status category
  const groupedClients = useMemo(() => {
    const groups = {
      awaitingCompliance: [] as ComplianceClientView[],
      awaitingApproval: [] as ComplianceClientView[],
      readyForStrategy: [] as ComplianceClientView[],
      active: [] as ComplianceClientView[],
      inProgress: [] as ComplianceClientView[],
    };

    filteredClients.forEach(client => {
      switch (client.statusKey) {
        case 'awaiting_compliance':
          groups.awaitingCompliance.push(client);
          break;
        case 'awaiting_approval':
          groups.awaitingApproval.push(client);
          break;
        case 'ready_for_strategy':
          groups.readyForStrategy.push(client);
          break;
        case 'active':
          groups.active.push(client);
          break;
        default:
          groups.inProgress.push(client);
          break;
      }
    });

    return groups;
  }, [filteredClients]);

  return {
    strategist: selectedStrategist,
    isLoadingStrategist,
    clients: filteredClients,
    allClients: clientViews,
    groupedClients,
    isLoadingClients,
    clientError,
    searchQuery,
    setSearchQuery,
    refresh: () => {
      fetchStrategistDetail(strategistId);
      fetchClients(strategistId);
    },
  };
}
