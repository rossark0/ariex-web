'use client';

import { cn } from '@/lib/utils';

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  isError?: boolean;
  senderName?: string;
}

interface ChatMessageProps {
  message: ChatMessageData;
  showTimestamp?: boolean;
  className?: string;
}

export function ChatMessage({
  message,
  showTimestamp = true,
  className,
}: ChatMessageProps) {
  // In client chat context: 'user' = strategist (me), 'assistant' = client
  const isMe = message.role === 'user';

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
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
    <div className={cn('flex', className)}>
      {isMe ? (
        /* My message (strategist) - right side, teal bubble */
        <div className="flex w-full justify-end">
          <div className="max-w-[85%]">
            <div className="rounded-2xl rounded-br-sm bg-teal-500 px-4 py-2">
              <p className="text-sm text-white">{message.content}</p>
            </div>
            {showTimestamp && (
              <p className="mt-1 text-right text-[10px] text-zinc-400">
                {formatTime(message.createdAt)}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Client message - left side with avatar */
        <div className="flex gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-medium text-zinc-600">
            {getInitials(message.senderName)}
          </div>
          <div className="max-w-[85%]">
            <div
              className={cn(
                'rounded-2xl rounded-bl-sm bg-zinc-100 px-4 py-2',
                message.isError && 'bg-red-50'
              )}
            >
              <p
                className={cn('text-sm text-zinc-900', message.isError && 'text-red-600')}
              >
                {message.content}
              </p>
            </div>
            {showTimestamp && (
              <p className="mt-1 text-[10px] text-zinc-400">
                {formatTime(message.createdAt)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
