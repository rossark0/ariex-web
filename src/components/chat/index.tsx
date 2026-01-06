'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChatHeader } from './chat-header';
import { ChatInput } from './chat-input';
import { ChatMessagesList } from './chat-messages-list';
import { ChatConversationsList } from './chat-conversations-list';
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
  title?: string;
  subtitle?: string;
  avatarUrl?: string;
  isOnline?: boolean;
  conversations?: ConversationData[];
  initialMessages?: ChatMessageData[];
  onSendMessage?: (message: string) => Promise<void>;
  onSelectConversation?: (conversation: ConversationData) => void;
  onNewConversation?: () => void;
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
  title,
  subtitle,
  avatarUrl,
  isOnline = true,
  conversations: initialConversations,
  initialMessages = [],
  onSendMessage,
  onSelectConversation,
  onNewConversation,
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
  // Default demo conversations if none provided (only used in multi mode)
  const [conversations] = useState<ConversationData[]>(
    initialConversations ?? getDemoConversations()
  );
  const [selectedConversation, setSelectedConversation] = useState<ConversationData | null>(
    mode === 'single'
      ? {
          id: 'single',
          title: clientName || title || 'Client',
          lastMessage: '',
          lastMessageAt: new Date(),
        }
      : null
  );
  const [messages, setMessages] = useState<ChatMessageData[]>(initialMessages);
  const [isTyping, setIsTyping] = useState(false);

  const displayName = clientName || selectedConversation?.title || title || 'Client';
  const displayPlaceholder = placeholder || `Message ${displayName?.split(' ')[0]}...`;

  const handleSelectConversation = useCallback(
    (conversation: ConversationData) => {
      setSelectedConversation(conversation);
      setMessages(getDemoMessagesForConversation(conversation.id, conversation.title));
      onSelectConversation?.(conversation);
    },
    [onSelectConversation]
  );

  const handleNewConversation = useCallback(() => {
    const newConversation: ConversationData = {
      id: `conv-${Date.now()}`,
      title: 'New Client',
      lastMessage: 'Start chatting...',
      lastMessageAt: new Date(),
    };
    setSelectedConversation(newConversation);
    setMessages([]);
    onNewConversation?.();
  }, [onNewConversation]);

  const handleBack = useCallback(() => {
    if (mode === 'multi') {
      setSelectedConversation(null);
      setMessages([]);
    }
    onBack?.();
  }, [mode, onBack]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      // Create user message (strategist sending to client)
      const userMessage: ChatMessageData = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);

      if (onSendMessage) {
        try {
          await onSendMessage(content);
        } catch {
          const errorMessage: ChatMessageData = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: 'Message failed to send. Please try again.',
            createdAt: new Date(),
            isError: true,
            senderName: displayName,
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      } else {
        // Demo mode - simulate client response
        setIsTyping(true);
        setTimeout(() => {
          const clientMessage: ChatMessageData = {
            id: `client-${Date.now()}`,
            role: 'assistant',
            content: getSimulatedClientResponse(content),
            createdAt: new Date(),
            senderName: displayName,
          };
          setMessages(prev => [...prev, clientMessage]);
          setIsTyping(false);
        }, 1500);
      }
    },
    [onSendMessage, displayName]
  );

  // In multi mode, show conversations list if no conversation is selected
  if (mode === 'multi' && !selectedConversation) {
    return (
      <div className={cn('flex h-full flex-col bg-white', className)}>
        <ChatConversationsList
          conversations={conversations}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          title={listTitle}
          showSearch={showSearch}
        />
      </div>
    );
  }

  // Show chat view
  return (
    <div className={cn('flex w-full h-full flex-col rounded-xl ', className)}>
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
        isTyping={isTyping}
        clientName={displayName}
        emptyStateTitle={emptyStateTitle || 'No messages yet'}
        emptyStateSubtitle={emptyStateSubtitle || `Start the conversation with ${displayName}.`}
      />

      <ChatInput onSend={handleSendMessage} placeholder={displayPlaceholder} isLoading={isTyping} />
    </div>
  );
}

// ============================================================================
// DEMO DATA
// ============================================================================

function getDemoConversations(): ConversationData[] {
  const now = new Date();
  return [
    {
      id: 'conv-1',
      title: 'John Smith',
      lastMessage: "Thanks! I'll send the documents tomorrow.",
      lastMessageAt: new Date(now.getTime() - 5 * 60 * 1000),
      unreadCount: 2,
    },
    {
      id: 'conv-2',
      title: 'Sarah Johnson',
      lastMessage: 'Yes, I can chat now. What did you find?',
      lastMessageAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      id: 'conv-3',
      title: 'Michael Brown',
      lastMessage: 'Perfect, that makes sense.',
      lastMessageAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
  ];
}

function getDemoMessagesForConversation(
  conversationId: string,
  clientName: string
): ChatMessageData[] {
  const now = new Date();
  const firstName = clientName?.split(' ')[0] || 'Client';

  if (conversationId === 'conv-1') {
    return [
      {
        id: 'msg-1',
        role: 'user',
        content: `Hi ${firstName}, I've reviewed your documents. Do you have a few minutes to discuss?`,
        createdAt: new Date(now.getTime() - 10 * 60 * 1000),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Yes, I can chat now. What did you find?',
        createdAt: new Date(now.getTime() - 8 * 60 * 1000),
        senderName: clientName,
      },
      {
        id: 'msg-3',
        role: 'user',
        content:
          "I found some opportunities for deductions. I'll prepare a summary and send it over.",
        createdAt: new Date(now.getTime() - 5 * 60 * 1000),
      },
      {
        id: 'msg-4',
        role: 'assistant',
        content: "Thanks! I'll send the documents tomorrow.",
        createdAt: new Date(now.getTime() - 3 * 60 * 1000),
        senderName: clientName,
      },
    ];
  }

  return [
    {
      id: 'msg-welcome',
      role: 'user',
      content: `Hi ${firstName}, welcome to Ariex! Let me know if you have any questions about getting started.`,
      createdAt: new Date(now.getTime() - 60 * 60 * 1000),
    },
  ];
}

function getSimulatedClientResponse(userMessage: string): string {
  const responses = [
    "Thanks for letting me know! I'll take care of that.",
    'That makes sense. When do you need it by?',
    'Perfect, I appreciate you explaining that.',
    "Got it. I'll have those documents ready soon.",
    'Thanks! Is there anything else you need from me?',
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

// Export individual components for flexibility
export { ChatHeader } from './chat-header';
export { ChatInput } from './chat-input';
export { ChatMessage, type ChatMessageData } from './chat-message';
export { ChatMessagesList } from './chat-messages-list';
export { ChatConversationsList } from './chat-conversations-list';
export { ChatConversationItem, type ConversationData } from './chat-conversation-item';
