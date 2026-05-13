'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * localStorage-backed saved views for the strategist clients page.
 *
 * Each view is a serialized filter set + search query + view mode. They live
 * client-side until we add a server-backed table; the shape is stable enough
 * to migrate later (just swap the persist layer).
 */

const STORAGE_KEY = 'ariex.clients.savedViews';
const STORAGE_VERSION = 1;

export interface SavedView {
  id: string;
  name: string;
  /** Opaque filter payload owned by the consumer page. */
  filters: Record<string, unknown>;
  /** Free text search at save time. */
  searchQuery: string;
  /** 'cards' | 'matrix' */
  viewMode: string;
  createdAt: string;
}

interface PersistShape {
  version: number;
  views: SavedView[];
}

function readStorage(): SavedView[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistShape;
    if (!parsed || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.views)) {
      return [];
    }
    return parsed.views;
  } catch {
    return [];
  }
}

function writeStorage(views: SavedView[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistShape = { version: STORAGE_VERSION, views };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota / serialization errors are non-fatal — the in-memory state still works.
  }
}

interface UseSavedViewsApi {
  views: SavedView[];
  saveView: (payload: Omit<SavedView, 'id' | 'createdAt'>) => SavedView;
  removeView: (id: string) => void;
  renameView: (id: string, name: string) => void;
  clear: () => void;
}

export function useSavedViews(): UseSavedViewsApi {
  const [views, setViews] = useState<SavedView[]>([]);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setViews(readStorage());
  }, []);

  // Cross-tab sync: react to storage events from other tabs/windows
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setViews(readStorage());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persist = useCallback((next: SavedView[]) => {
    setViews(next);
    writeStorage(next);
  }, []);

  const saveView = useCallback<UseSavedViewsApi['saveView']>(
    (payload) => {
      const view: SavedView = {
        ...payload,
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `view_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
      };
      setViews(prev => {
        const next = [view, ...prev].slice(0, 24); // cap to avoid runaway lists
        writeStorage(next);
        return next;
      });
      return view;
    },
    []
  );

  const removeView = useCallback<UseSavedViewsApi['removeView']>(
    (id) => {
      setViews(prev => {
        const next = prev.filter(v => v.id !== id);
        writeStorage(next);
        return next;
      });
    },
    []
  );

  const renameView = useCallback<UseSavedViewsApi['renameView']>(
    (id, name) => {
      setViews(prev => {
        const next = prev.map(v => (v.id === id ? { ...v, name } : v));
        writeStorage(next);
        return next;
      });
    },
    []
  );

  const clear = useCallback(() => persist([]), [persist]);

  return { views, saveView, removeView, renameView, clear };
}
