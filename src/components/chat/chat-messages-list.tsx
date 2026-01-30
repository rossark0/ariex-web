'use client';

import { cn } from '@/lib/utils';
import { ChatMessage, type ChatMessageData } from './chat-message';
import { useRef, useEffect, useState } from 'react';
import { ArrowDown, ChatCircleDots } from '@phosphor-icons/react';
import { EmptyMessagesIllustration } from '@/components/ui/empty-messages-illustration';

interface ChatMessagesListProps {
  messages: ChatMessageData[];
  isTyping?: boolean;
  clientName?: string;
  emptyStateTitle?: string;
  emptyStateSubtitle?: string;
  className?: string;
}

export function ChatMessagesList({
  messages,
  isTyping = false,
  clientName,
  emptyStateTitle = 'No messages yet',
  emptyStateSubtitle = 'Start the conversation with your client.',
  className,
}: ChatMessagesListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, autoScroll]);

  // Track scroll position
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    setShowScrollButton(!isNearBottom);
    setAutoScroll(isNearBottom);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setAutoScroll(true);
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn('relative flex-1 overflow-hidden pb-[200px]', className)}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto pt-4 pb-[200px]"
      >
        {/* Empty state */}
        {messages.length === 0 && !isTyping && (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <EmptyMessagesIllustration />
            <h3 className="mb-1 text-lg font-semibold text-zinc-800">{emptyStateTitle}</h3>
            <p className="max-w-sm text-sm font-medium text-zinc-500">{emptyStateSubtitle}</p>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="space-y-4">
            {messages.map(message => (
              <ChatMessage
                key={message.id}
                message={{
                  ...message,
                  senderName: message.role === 'assistant' ? clientName : undefined,
                }}
                showTimestamp={true}
              />
            ))}
          </div>
        )}

        {/* Typing indicator - bouncing dots */}
        {isTyping && (
          <div className="mt-4 flex gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-medium text-zinc-600">
              {getInitials(clientName)}
            </div>
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-zinc-100 px-4 py-2">
              <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-zinc-200 transition-all hover:bg-zinc-50"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-4 w-4 text-zinc-600" weight="bold" />
        </button>
      )}
    </div>
  );
}
