'use client';

import { create } from 'zustand';
import {
  createOrGetChat,
  getChatWithMessages,
  getChatsForUser,
  sendMessage as sendMessageApi,
  getChatMessages,
  type Chat,
  type ChatMessage,
} from '@/lib/api/chat.api';
import type { ConversationData } from '@/components/chat/chat-conversation-item';
import type { ChatMessageData } from '@/components/chat/chat-message';

// ============================================================================
// TYPES
// ============================================================================

interface ChatState {
  // Current user info (set when component mounts)
  currentUserId: string | null;
  currentUserRole: 'STRATEGIST' | 'CLIENT' | null;

  // All chats for current user
  chats: Chat[];
  isLoadingChats: boolean;

  // Active chat
  activeChat: Chat | null;
  activeChatId: string | null;
  messages: ChatMessageData[];
  isLoadingMessages: boolean;

  // Polling state
  pollingIntervalId: NodeJS.Timeout | null;
  lastPollAt: Date | null;

  // Sending state
  isSending: boolean;

  // Actions
  initialize: (userId: string, role: 'STRATEGIST' | 'CLIENT') => Promise<void>;
  fetchChats: () => Promise<void>;
  selectChat: (chatId: string) => Promise<void>;
  openChatWithUser: (otherUserId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  clearActiveChat: () => void;
  reset: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function apiMessageToLocal(msg: ChatMessage, currentUserId: string): ChatMessageData {
  // API returns authorId, not senderId or userId
  const senderId = (msg as any).authorId || msg.userId || msg.senderId || msg.sender?.id;
  const isMe = senderId === currentUserId;

  console.log('[ChatStore] Message mapping:', {
    messageId: msg.id,
    senderId,
    currentUserId,
    isMe,
    resultRole: isMe ? 'user' : 'assistant',
  });

  return {
    id: msg.id,
    role: isMe ? 'user' : 'assistant',
    content: msg.content,
    createdAt: new Date(msg.createdAt),
    senderName: msg.sender?.name || undefined,
  };
}

function chatToConversation(chat: Chat, currentUserId: string): ConversationData {
  // Find the other participant (not me)
  const otherParticipant = chat.participants?.find(p => p.id !== currentUserId);
  const title = otherParticipant?.name || otherParticipant?.email || 'Unknown';

  return {
    id: chat.id,
    title,
    lastMessage:
      chat.lastMessage?.content || chat.messages?.[chat.messages.length - 1]?.content || '',
    lastMessageAt: new Date(
      chat.lastMessage?.createdAt ||
        chat.messages?.[chat.messages.length - 1]?.createdAt ||
        chat.updatedAt ||
        chat.createdAt
    ),
    unreadCount: 0, // TODO: Track unread count
  };
}

// ============================================================================
// STORE
// ============================================================================

const POLLING_INTERVAL = 5000; // 5 seconds

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  currentUserId: null,
  currentUserRole: null,
  chats: [],
  isLoadingChats: false,
  activeChat: null,
  activeChatId: null,
  messages: [],
  isLoadingMessages: false,
  pollingIntervalId: null,
  lastPollAt: null,
  isSending: false,

  // Initialize store with current user
  initialize: async (userId: string, role: 'STRATEGIST' | 'CLIENT') => {
    console.log('[ChatStore] Initializing for user:', userId, 'role:', role);
    set({ currentUserId: userId, currentUserRole: role });
    await get().fetchChats();
  },

  // Fetch all chats for current user
  fetchChats: async () => {
    const { currentUserId } = get();
    if (!currentUserId) {
      console.warn('[ChatStore] Cannot fetch chats - no current user');
      return;
    }

    set({ isLoadingChats: true });
    try {
      const chats = await getChatsForUser(currentUserId);
      console.log('[ChatStore] Fetched', chats.length, 'chats');
      set({ chats, isLoadingChats: false, lastPollAt: new Date() });
    } catch (error) {
      console.error('[ChatStore] Failed to fetch chats:', error);
      set({ isLoadingChats: false });
    }
  },

  // Select and load a specific chat
  selectChat: async (chatId: string) => {
    const { currentUserId } = get();
    if (!currentUserId) return;

    console.log('[ChatStore] Selecting chat:', chatId);
    set({ activeChatId: chatId, isLoadingMessages: true });

    try {
      const chat = await getChatWithMessages(chatId);
      const messages = (chat.messages || []).map(msg => apiMessageToLocal(msg, currentUserId));

      set({
        activeChat: chat,
        messages,
        isLoadingMessages: false,
        lastPollAt: new Date(),
      });

      // Start polling for new messages
      get().startPolling();
    } catch (error) {
      console.error('[ChatStore] Failed to select chat:', error);
      set({ isLoadingMessages: false });
    }
  },

  // Open or create chat with a specific user
  openChatWithUser: async (otherUserId: string) => {
    const { currentUserId } = get();
    if (!currentUserId) {
      console.warn('[ChatStore] Cannot open chat - no current user');
      return;
    }

    console.log('[ChatStore] Opening chat with user:', otherUserId);
    set({ isLoadingMessages: true });

    try {
      // createOrGetChat expects: userId1, userId2, createdByUserId
      const chat = await createOrGetChat(currentUserId, otherUserId, currentUserId);
      console.log('[ChatStore] Got/created chat:', chat.id);

      const messages = (chat.messages || []).map(msg => apiMessageToLocal(msg, currentUserId));

      set({
        activeChat: chat,
        activeChatId: chat.id,
        messages,
        isLoadingMessages: false,
        lastPollAt: new Date(),
      });

      // Refresh chats list to include this chat
      get().fetchChats();

      // Start polling
      get().startPolling();
    } catch (error) {
      console.error('[ChatStore] Failed to open chat:', error);
      set({ isLoadingMessages: false });
    }
  },

  // Send a message in the active chat
  sendMessage: async (content: string) => {
    const { activeChatId, currentUserId, messages } = get();
    if (!activeChatId || !currentUserId || !content.trim()) return;

    // Optimistically add message
    const optimisticMessage: ChatMessageData = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      createdAt: new Date(),
    };
    set({ messages: [...messages, optimisticMessage], isSending: true });

    try {
      const sentMessage = await sendMessageApi(activeChatId, content.trim(), currentUserId);
      console.log('[ChatStore] Message sent:', sentMessage.id);

      // Replace optimistic message with real one
      set(state => ({
        messages: state.messages.map(m =>
          m.id === optimisticMessage.id ? apiMessageToLocal(sentMessage, currentUserId) : m
        ),
        isSending: false,
      }));

      // Refresh to get any new messages from other party
      const freshMessages = await getChatMessages(activeChatId);
      set({
        messages: freshMessages.map(msg => apiMessageToLocal(msg, currentUserId)),
        lastPollAt: new Date(),
      });
    } catch (error) {
      console.error('[ChatStore] Failed to send message:', error);
      // Mark message as error
      set(state => ({
        messages: state.messages.map(m =>
          m.id === optimisticMessage.id ? { ...m, isError: true } : m
        ),
        isSending: false,
      }));
    }
  },

  // Start polling for new messages
  startPolling: () => {
    const { pollingIntervalId, activeChatId, currentUserId } = get();

    // Clear existing interval
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
    }

    if (!activeChatId || !currentUserId) return;

    console.log('[ChatStore] Starting polling for chat:', activeChatId);

    const intervalId = setInterval(async () => {
      const { activeChatId: currentChatId, currentUserId: userId } = get();
      if (!currentChatId || !userId) {
        get().stopPolling();
        return;
      }

      try {
        const messages = await getChatMessages(currentChatId);
        set({
          messages: messages.map(msg => apiMessageToLocal(msg, userId)),
          lastPollAt: new Date(),
        });
      } catch (error) {
        console.error('[ChatStore] Polling error:', error);
      }
    }, POLLING_INTERVAL);

    set({ pollingIntervalId: intervalId });
  },

  // Stop polling
  stopPolling: () => {
    const { pollingIntervalId } = get();
    if (pollingIntervalId) {
      console.log('[ChatStore] Stopping polling');
      clearInterval(pollingIntervalId);
      set({ pollingIntervalId: null });
    }
  },

  // Clear active chat
  clearActiveChat: () => {
    get().stopPolling();
    set({
      activeChat: null,
      activeChatId: null,
      messages: [],
    });
  },

  // Reset entire store
  reset: () => {
    get().stopPolling();
    set({
      currentUserId: null,
      currentUserRole: null,
      chats: [],
      isLoadingChats: false,
      activeChat: null,
      activeChatId: null,
      messages: [],
      isLoadingMessages: false,
      pollingIntervalId: null,
      lastPollAt: null,
      isSending: false,
    });
  },
}));

// ============================================================================
// SELECTORS
// ============================================================================

export function useConversations(): ConversationData[] {
  const chats = useChatStore(state => state.chats);
  const currentUserId = useChatStore(state => state.currentUserId);

  if (!currentUserId) return [];

  return chats.map(chat => chatToConversation(chat, currentUserId));
}

// ============================================================================
// BACKWARD COMPATIBILITY (for legacy components in contexts/chat/components/)
// ============================================================================

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export const useChat = <T>(selector: (state: ChatState) => T) => useChatStore(selector);
