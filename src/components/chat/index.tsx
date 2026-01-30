'use client';

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChatHeader } from './chat-header';
import { ChatInput } from './chat-input';
import { ChatMessagesList } from './chat-messages-list';
import { ChatConversationsList } from './chat-conversations-list';
import { useChatStore } from '@/contexts/chat/ChatStore';
import { useAuth } from '@/contexts/auth/AuthStore';
import { listClients } from '@/lib/api/strategist.api';
import type { ChatMessageData } from './chat-message';
import type { ConversationData } from './chat-conversation-item';

// ============================================================================
// TYPES
// ============================================================================

type ChatMode = 'single' | 'multi';

interface ChatProps {
  /** 'single' for direct chat with one client, 'multi' for conversations list */
  mode?: ChatMode;
  /** Client name for display */
  clientName?: string;
  /** Other user ID for single mode (required to open direct chat) */
  otherUserId?: string;
  title?: string;
  subtitle?: string;
  avatarUrl?: string;
  isOnline?: boolean;
  showHeader?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  placeholder?: string;
  emptyStateTitle?: string;
  emptyStateSubtitle?: string;
  listTitle?: string;
  showSearch?: boolean;
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Chat({
  mode = 'single',
  clientName,
  otherUserId,
  title,
  subtitle,
  avatarUrl,
  isOnline = true,
  showHeader = true,
  showBackButton = false,
  onBack,
  placeholder,
  emptyStateTitle,
  emptyStateSubtitle,
  listTitle = 'Messages',
  showSearch = true,
  className,
}: ChatProps) {
  // Auth state
  const user = useAuth(state => state.user);

  // Chat store state
  const {
    currentUserId,
    activeChat,
    messages,
    isLoadingMessages,
    isSending,
    initialize,
    openChatWithUser,
    sendMessage,
    clearActiveChat,
    stopPolling,
  } = useChatStore();

  // Clients for strategist mode
  const [clients, setClients] = useState<ConversationData[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // Local state for selected conversation display
  const [selectedConversation, setSelectedConversation] = useState<ConversationData | null>(null);

  // Initialize chat store when user is available
  useEffect(() => {
    if (user?.id && !currentUserId) {
      const role = user.role === 'STRATEGIST' ? 'STRATEGIST' : 'CLIENT';
      initialize(user.id, role);
    }
  }, [user?.id, user?.role, currentUserId, initialize]);

  // For strategists in multi mode, fetch all clients AND their existing chats
  useEffect(() => {
    async function fetchClientsWithChats() {
      if (mode === 'multi' && user?.role === 'STRATEGIST' && user?.id) {
        setIsLoadingClients(true);
        try {
          // First, fetch just the clients and show them with loading spinners
          const clientList = await listClients();

          // Show clients immediately with loading state
          const initialConversations: ConversationData[] = clientList.map(client => ({
            id: client.id,
            title: client.name || client.email || 'Unknown',
            lastMessage: '',
            lastMessageAt: new Date(client.createdAt || Date.now()),
            isLoading: true, // Show spinner while we fetch chats
          }));
          setClients(initialConversations);
          setIsLoadingClients(false);

          // Now fetch existing chats in the background
          const existingChats = await import('@/lib/api/chat.api').then(m =>
            m.getChatsForUser(user.id)
          );

          console.log('[Chat] Existing chats:', existingChats);

          // Create a map of client ID to their chat data
          const chatsByClientId = new Map<string, { lastMessage: string; lastMessageAt: Date }>();

          for (const chat of existingChats) {
            // Find the client participant (not the current user)
            const clientParticipant = chat.participants?.find(p => p.id !== user.id);
            if (clientParticipant) {
              const lastMsg = chat.lastMessage || chat.messages?.[chat.messages.length - 1];
              if (lastMsg) {
                chatsByClientId.set(clientParticipant.id, {
                  lastMessage: lastMsg.content,
                  lastMessageAt: new Date(lastMsg.createdAt),
                });
              }
            }
          }

          // Update clients with their chat data (remove loading state)
          const updatedConversations: ConversationData[] = clientList.map(client => {
            const chatData = chatsByClientId.get(client.id);
            return {
              id: client.id,
              title: client.name || client.email || 'Unknown',
              lastMessage: chatData?.lastMessage || 'No messages yet',
              lastMessageAt: chatData?.lastMessageAt || new Date(client.createdAt || Date.now()),
              isLoading: false,
            };
          });

          // Sort by last message time (most recent first) - WhatsApp style
          updatedConversations.sort(
            (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
          );

          setClients(updatedConversations);
        } catch (error) {
          console.error('[Chat] Failed to fetch clients:', error);
          setIsLoadingClients(false);
        }
      }
    }
    fetchClientsWithChats();
  }, [mode, user?.role, user?.id]);

  // For single mode with otherUserId, open direct chat
  useEffect(() => {
    if (mode === 'single' && otherUserId && currentUserId) {
      openChatWithUser(otherUserId);
    }
  }, [mode, otherUserId, currentUserId, openChatWithUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Get other participant info from active chat
  const otherParticipant = activeChat?.participants?.find(p => p.id !== currentUserId);
  const displayName =
    clientName || otherParticipant?.name || selectedConversation?.title || title || 'Client';
  const displayPlaceholder = placeholder || `Message ${displayName?.split(' ')[0]}...`;

  const handleSelectConversation = useCallback(
    (conversation: ConversationData) => {
      setSelectedConversation(conversation);
      // For strategist, the conversation.id is the client's user ID
      // We open a chat with that user (creates if doesn't exist)
      openChatWithUser(conversation.id);
    },
    [openChatWithUser]
  );

  const handleBack = useCallback(() => {
    if (mode === 'multi') {
      clearActiveChat();
      setSelectedConversation(null);
    }
    onBack?.();
  }, [mode, clearActiveChat, onBack]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      await sendMessage(content);
    },
    [sendMessage]
  );

  // In multi mode, show conversations list if no conversation is selected
  if (mode === 'multi' && !activeChat) {
    return (
      <div className={cn('flex h-full flex-col bg-white', className)}>
        <ChatConversationsList
          conversations={clients}
          onSelectConversation={handleSelectConversation}
          title={listTitle}
          showSearch={showSearch}
        />
      </div>
    );
  }

  // Show chat view
  return (
    <div className={cn('flex h-full w-full flex-col rounded-xl', className)}>
      {showHeader && (
        <ChatHeader
          title={displayName}
          subtitle={subtitle}
          avatarUrl={selectedConversation?.avatarUrl ?? avatarUrl}
          isOnline={isOnline}
          showBackButton={mode === 'multi'}
          onBack={handleBack}
        />
      )}

      <ChatMessagesList
        messages={messages}
        isTyping={isLoadingMessages}
        clientName={displayName}
        emptyStateTitle={emptyStateTitle || 'No messages yet'}
        emptyStateSubtitle={emptyStateSubtitle || `Start the conversation with ${displayName}.`}
      />

      <ChatInput
        onSend={handleSendMessage}
        placeholder={displayPlaceholder}
        isLoading={isSending}
      />
    </div>
  );
}

// Export individual components for flexibility
export { ChatHeader } from './chat-header';
export { ChatInput } from './chat-input';
export { ChatMessage, type ChatMessageData } from './chat-message';
export { ChatMessagesList } from './chat-messages-list';
export { ChatConversationsList } from './chat-conversations-list';
export { ChatConversationItem, type ConversationData } from './chat-conversation-item';
