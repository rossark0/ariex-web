/**
 * useComplianceStrategists
 *
 * Hook for the compliance strategists list page.
 * Fetches strategists on mount and provides search/filter.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { complianceStore } from '../ComplianceStore';
import { fetchStrategists } from '../services/compliance.service';
import type { ComplianceStrategistView } from '../models/compliance.model';

export function useComplianceStrategists() {
  const [searchQuery, setSearchQuery] = useState('');

  const strategistViews = useStore(complianceStore, s => s.strategistViews);
  const isLoading = useStore(complianceStore, s => s.isLoadingStrategists);
  const error = useStore(complianceStore, s => s.strategistError);

  useEffect(() => {
    fetchStrategists();
  }, []);

  const filteredStrategists = useMemo(() => {
    if (!searchQuery) return strategistViews;
    const q = searchQuery.toLowerCase();
    return strategistViews.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    );
  }, [strategistViews, searchQuery]);

  return {
    strategists: filteredStrategists,
    allStrategists: strategistViews,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    refresh: fetchStrategists,
  };
}
