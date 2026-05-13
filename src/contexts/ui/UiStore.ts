'use client';

import { create } from 'zustand';
import { useAiPageContextStore } from '@/contexts/ai/AiPageContextStore';
import { sanitizePageContext } from '@/lib/ai/sanitize-pii';

// ─── Chat history persistence (per-device fallback) ───────────────────────
// Single-device persistence so a refresh doesn't wipe the conversation.
// Replace with server-backed sessions when /me/ai-sessions ships.

const CHAT_STORAGE_KEY = 'ariex.aiChat.history';
const CHAT_STORAGE_VERSION = 1;
const CHAT_MAX_PERSISTED = 100; // cap to avoid quota issues

interface PersistedChatShape {
  version: number;
  messages: AiMessage[];
}

function loadPersistedMessages(): AiMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedChatShape;
    if (!parsed || parsed.version !== CHAT_STORAGE_VERSION || !Array.isArray(parsed.messages)) {
      return [];
    }
    // Revive Date objects (JSON stringifies them as strings)
    return parsed.messages.map(m => ({
      ...m,
      timestamp: typeof m.timestamp === 'string' ? new Date(m.timestamp) : m.timestamp,
    }));
  } catch {
    return [];
  }
}

function savePersistedMessages(messages: AiMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = messages.slice(-CHAT_MAX_PERSISTED);
    const payload: PersistedChatShape = { version: CHAT_STORAGE_VERSION, messages: trimmed };
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota / serialization errors are non-fatal — in-memory still works.
  }
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    type: string;
    count: number;
  };
}

interface UiState {
  isChatSidebarCollapsed: boolean;
  isSidebarCollapsed: boolean;
  toggleChatSidebar: () => void;
  toggleSidebar: () => void;
  setChatSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  // Selection state for AI floating chatbot
  selectedCount: number;
  onClearSelection: (() => void) | null;
  onDownloadSelection: (() => void) | null;
  onDeleteSelection: (() => void) | null;
  isDownloadingSelection: boolean;
  isDeletingSelection: boolean;
  setSelection: (
    count: number,
    onClear: (() => void) | null,
    onDownload?: (() => void) | null,
    onDelete?: (() => void) | null
  ) => void;
  setDownloadingSelection: (isDownloading: boolean) => void;
  setDeletingSelection: (isDeleting: boolean) => void;
  clearSelection: () => void;
  // AI chat state
  aiMessages: AiMessage[];
  isAiChatOpen: boolean;
  isAiLoading: boolean;
  aiAbortController: AbortController | null;
  setAiChatOpen: (open: boolean) => void;
  addAiMessage: (message: Omit<AiMessage, 'id' | 'timestamp'>) => void;
  updateLastAiMessage: (content: string) => void;
  clearAiMessages: () => void;
  sendAiMessage: (userMessage: string) => Promise<void>;
  askAriexWithContext: (contextType: string, count: number) => void;
  stopAiGeneration: () => void;
  /** Hydrate the chat history from localStorage. Idempotent and safe to call
   *  multiple times; only loads once per session. */
  hydrateAiMessages: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  isChatSidebarCollapsed: false,
  isSidebarCollapsed: false,
  toggleChatSidebar: () =>
    set(state => ({ isChatSidebarCollapsed: !state.isChatSidebarCollapsed })),
  toggleSidebar: () => set(state => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setChatSidebarCollapsed: (collapsed: boolean) => set({ isChatSidebarCollapsed: collapsed }),
  setSidebarCollapsed: (collapsed: boolean) => set({ isSidebarCollapsed: collapsed }),
  // Selection state
  selectedCount: 0,
  onClearSelection: null,
  onDownloadSelection: null,
  onDeleteSelection: null,
  isDownloadingSelection: false,
  isDeletingSelection: false,
  setSelection: (count, onClear, onDownload = null, onDelete = null) =>
    set({
      selectedCount: count,
      onClearSelection: onClear,
      onDownloadSelection: onDownload,
      onDeleteSelection: onDelete,
    }),
  setDownloadingSelection: isDownloading => set({ isDownloadingSelection: isDownloading }),
  setDeletingSelection: isDeleting => set({ isDeletingSelection: isDeleting }),
  clearSelection: () =>
    set({
      selectedCount: 0,
      onClearSelection: null,
      onDownloadSelection: null,
      onDeleteSelection: null,
      isDownloadingSelection: false,
      isDeletingSelection: false,
    }),
  // AI chat state
  aiMessages: [],
  isAiChatOpen: false,
  isAiLoading: false,
  aiAbortController: null,
  setAiChatOpen: open => set({ isAiChatOpen: open }),
  addAiMessage: message =>
    set(state => {
      const next = [
        ...state.aiMessages,
        {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        },
      ];
      savePersistedMessages(next);
      return { aiMessages: next };
    }),
  updateLastAiMessage: (content: string) =>
    set(state => {
      const msgs = [...state.aiMessages];
      const lastIdx = msgs.length - 1;
      if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
        msgs[lastIdx] = { ...msgs[lastIdx], content };
      }
      savePersistedMessages(msgs);
      return { aiMessages: msgs };
    }),
  clearAiMessages: () => {
    savePersistedMessages([]);
    set({ aiMessages: [] });
  },
  hydrateAiMessages: () => {
    const current = get().aiMessages;
    // Avoid clobbering if already populated (e.g., mid-conversation reload)
    if (current.length > 0) return;
    const loaded = loadPersistedMessages();
    if (loaded.length > 0) set({ aiMessages: loaded });
  },

  stopAiGeneration: () => {
    const { aiAbortController } = get();
    if (aiAbortController) {
      aiAbortController.abort();
      set({ aiAbortController: null, isAiLoading: false });
    }
  },

  sendAiMessage: async (userMessage: string) => {
    const { addAiMessage, updateLastAiMessage, aiMessages } = get();

    // Add user message
    addAiMessage({ role: 'user', content: userMessage });

    // Create abort controller for this request
    const abortController = new AbortController();
    set({ isAiLoading: true, aiAbortController: abortController });

    // Prepare messages history (use current + new user message)
    const messagesForApi = [
      ...aiMessages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userMessage },
    ];

    // Get page context from the AI context store and sanitize PII out of it
    // before the prompt leaves the browser.
    const rawPageContext = useAiPageContextStore.getState().pageContext;
    const pageContext = rawPageContext ? sanitizePageContext(rawPageContext) : null;

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesForApi, pageContext }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Request failed (${response.status})`);
      }

      // Add empty assistant message to stream into
      addAiMessage({ role: 'assistant', content: '' });

      // Stream the response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulated += decoder.decode(value, { stream: true });
        updateLastAiMessage(accumulated);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // User cancelled — don't add error message
        return;
      }
      console.error('[AI Chat] Stream error:', error);
      addAiMessage({
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message || 'Please try again.'}`,
      });
    } finally {
      set({ isAiLoading: false, aiAbortController: null });
    }
  },

  askAriexWithContext: (contextType, count) => {
    const { sendAiMessage, setAiChatOpen, onClearSelection, addAiMessage } = get();

    // Build a contextual user message
    const userMessage = `Analyze my ${count} selected ${contextType}${count > 1 ? 's' : ''} and provide insights, recommendations, and any action items.`;

    // Add user message with visual context indicator
    addAiMessage({
      role: 'user',
      content: userMessage,
      context: { type: contextType, count },
    });

    // Open the chat
    setAiChatOpen(true);

    // Create abort controller for this request
    const abortController = new AbortController();
    set({ isAiLoading: true, aiAbortController: abortController });

    // Prepare messages for API (just this one user message for a fresh analysis)
    const messagesForApi = [{ role: 'user' as const, content: userMessage }];

    // Get page context
    const pageContext = useAiPageContextStore.getState().pageContext;

    // Fire the streaming request
    (async () => {
      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messagesForApi,
            pageContext,
            selectedItems: { type: contextType, count },
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || `Request failed (${response.status})`);
        }

        addAiMessage({ role: 'assistant', content: '' });

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          get().updateLastAiMessage(accumulated);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error('[AI Chat] Stream error:', error);
        addAiMessage({
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error.message || 'Please try again.'}`,
        });
      } finally {
        set({ isAiLoading: false, aiAbortController: null });
      }
    })();

    // Clear selection after asking
    if (onClearSelection) {
      onClearSelection();
    }
  },
}));
