'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { SpinnerGap } from '@phosphor-icons/react';
import { useChatStore } from '@/contexts/chat/ChatStore';
import { useAuth } from '@/contexts/auth/AuthStore';
import { cn } from '@/lib/utils';

interface ClientChatPaneClient {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface ClientChatPaneProps {
  client: ClientChatPaneClient;
  /** When false, polling is paused (e.g. while another tab is active). */
  active?: boolean;
  className?: string;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Embedded one-on-one strategist ↔ client chat panel.
 * Headless variant of ClientFloatingChat — meant to be hosted inside a
 * tabbed rail / sheet / sidebar rather than floating on the page.
 */
export function ClientChatPane({ client, active = true, className }: ClientChatPaneProps) {
  const [input, setInput] = useState('');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const user = useAuth(state => state.user);
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

  // Open chat with this client whenever the pane becomes active
  useEffect(() => {
    if (active && currentUserId && client.user.id) {
      setHasLoadedOnce(false);
      openChatWithUser(client.user.id).then(() => setHasLoadedOnce(true));
    }
  }, [active, currentUserId, client.user.id, openChatWithUser]);

  // Stop polling when the pane is inactive (other tab focused / unmounted)
  useEffect(() => {
    if (!active) {
      stopPolling();
    }
    return () => stopPolling();
  }, [active, stopPolling]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (active) scrollToBottom();
  }, [messages, active, scrollToBottom]);

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
        void handleSend();
      }
    },
    [handleSend]
  );

  const firstName = client.user.name?.split(' ')[0] ?? '';

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      {/* Online indicator strip */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/6 px-4 py-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-soft-white">
          {getInitials(client.user.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-soft-white">{client.user.name || client.user.email}</p>
          <div className="flex items-center gap-1">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-electric-blue" />
            <span className="text-[10px] text-steel-gray">Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {(isLoadingMessages || !hasLoadedOnce) && active ? (
          <div className="flex h-full items-center justify-center">
            <SpinnerGap className="h-5 w-5 animate-spin text-steel-gray" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-steel-gray">No messages yet</p>
            <p className="text-xs text-steel-gray/60">
              Start the conversation with {firstName || client.user.email}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(message => (
              <div key={message.id}>
                {message.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%]">
                      <div className="rounded-2xl rounded-br-sm bg-electric-blue px-3 py-1.5">
                        <p className="text-sm text-soft-white">{message.content}</p>
                      </div>
                      <p className="mt-0.5 text-right text-[10px] text-steel-gray">
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-soft-white">
                      {getInitials(client.user.name)}
                    </div>
                    <div className="max-w-[85%]">
                      <div
                        className={cn(
                          'rounded-2xl rounded-bl-sm bg-white/6 px-3 py-1.5',
                          message.isError && 'bg-red-500/10'
                        )}
                      >
                        <p className={cn('text-sm text-soft-white', message.isError && 'text-red-400')}>
                          {message.content}
                        </p>
                      </div>
                      <p className="mt-0.5 text-[10px] text-steel-gray">
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-white/6 p-3">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={firstName ? `Message ${firstName}...` : 'Send a message...'}
          rows={1}
          disabled={isSending || !active}
          className="min-h-[40px] w-full resize-none rounded-xl border border-white/10 px-3 py-2 text-sm duration-150 ease-linear transition-all focus:ring-2 focus:ring-electric-blue/30 focus:outline-none disabled:opacity-50 bg-deep-navy text-soft-white placeholder:text-steel-gray focus:border-electric-blue"
        />
      </div>
    </div>
  );
}
