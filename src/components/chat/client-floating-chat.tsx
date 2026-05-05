'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { CaretUp, SpinnerGap } from '@phosphor-icons/react';
import { useChatStore } from '@/contexts/chat/ChatStore';
import { useAuth } from '@/contexts/auth/AuthStore';

// ============================================================================
// TYPES
// ============================================================================

interface ClientFloatingChatProps {
  client: {
    id: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ClientFloatingChat({ client }: ClientFloatingChatProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false); // Track if first load completed
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // Auth state
  const user = useAuth(state => state.user);

  // Chat store state
  const {
    currentUserId,
    messages,
    isLoadingMessages,
    isSending,
    initialize,
    openChatWithUser,
    sendMessage,
    stopPolling,
  } = useChatStore();

  // Initialize chat store when user is available
  useEffect(() => {
    if (user?.id && !currentUserId) {
      initialize(user.id, 'STRATEGIST');
    }
  }, [user?.id, currentUserId, initialize]);

  // Open chat with client when expanded
  useEffect(() => {
    if (isExpanded && currentUserId && client.user.id) {
      setHasLoadedOnce(false); // Reset when opening new chat
      openChatWithUser(client.user.id).then(() => {
        setHasLoadedOnce(true);
      });
    }
  }, [isExpanded, currentUserId, client.user.id, openChatWithUser]);

  // Stop polling when collapsed
  useEffect(() => {
    if (!isExpanded) {
      stopPolling();
    }
  }, [isExpanded, stopPolling]);

  // Click outside to minimize
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom();
    }
  }, [messages, isExpanded, scrollToBottom]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending) return;

    const messageContent = input.trim();
    setInput('');
    await sendMessage(messageContent);
  }, [input, isSending, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      ref={chatRef}
      className={`fixed right-10 bottom-4 z-40 flex w-80 flex-col overflow-hidden border border-white/10 bg-deep-navy transition-[height,border-radius,box-shadow] duration-200 ease-linear ${
        isExpanded
          ? 'h-[500px] rounded-2xl shadow-2xl'
          : 'h-auto rounded-lg shadow-lg hover:shadow-xl'
      }`}
    >
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex shrink-0 cursor-pointer items-center gap-3 duration-150 ease-linear transition-colors ${
          isExpanded ? 'border-b border-white/8 px-4 py-3 hover:bg-white/4' : 'px-2 py-1'
        }`}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-soft-white">
          {getInitials(client.user.name)}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-soft-white">{client.user.name}</p>
          <div className="flex items-center gap-1">
            <div className="relative flex h-2 w-2">
              {!isExpanded && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <span className="text-xs text-steel-gray">Online</span>
          </div>
        </div>
        <CaretUp
          weight="bold"
          className={`h-4 w-4 text-steel-gray transition-transform duration-200 ease-linear ${
            isExpanded ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </div>

      {/* Messages */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingMessages || !hasLoadedOnce ? (
            <div className="flex h-full items-center justify-center">
              <SpinnerGap className="h-6 w-6 animate-spin text-steel-gray" />
            </div>
          ) : (
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-steel-gray">No messages yet</p>
                  <p className="text-xs text-steel-gray/60">
                    Start the conversation with {client.user.name?.split(' ')[0]}
                  </p>
                </div>
              ) : (
                messages.map(message => (
                  <div key={message.id}>
                    {message.role === 'user' ? (
                      /* Strategist message - right side */
                      <div className="flex justify-end">
                        <div className="max-w-[85%]">
                          <div className="rounded-2xl rounded-br-sm bg-electric-blue px-4 py-2">
                            <p className="text-sm text-soft-white">{message.content}</p>
                          </div>
                          <p className="mt-1 text-right text-[10px] text-steel-gray">
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Client message - left side */
                      <div className="flex gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-soft-white">
                          {getInitials(client.user.name)}
                        </div>
                        <div className="max-w-[85%]">
                          <div
                            className={`rounded-2xl rounded-bl-sm bg-white/6 px-4 py-2 ${message.isError ? 'bg-red-500/10' : ''}`}
                          >
                            <p
                              className={`text-sm text-soft-white ${message.isError ? 'text-red-400' : ''}`}
                            >
                              {message.content}
                            </p>
                          </div>
                          <p className="mt-1 text-[10px] text-steel-gray">
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      )}

      {/* Input */}
      {isExpanded && (
        <div className="shrink-0 border-t border-white/8 p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${client.user.name?.split(' ')[0]}...`}
              rows={1}
              disabled={isSending}
              className="min-h-[44px] flex-1 resize-none rounded-2xl border border-white/10 bg-graphite px-4 py-3 text-sm text-soft-white duration-200 ease-linear transition-all placeholder:text-steel-gray focus:ring-2 focus:ring-electric-blue/30 focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>
      )}
    </div>
  );
}
