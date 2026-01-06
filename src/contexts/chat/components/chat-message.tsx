'use client';

import type { Message } from '../ChatStore';
import { cn } from '@/lib/utils';
import { User, Robot } from '@phosphor-icons/react';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-900">
          <Robot weight="fill" className="h-5 w-5 text-white" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2',
          isUser ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-900'
        )}
      >
        <p className="text-sm">{message.content}</p>
      </div>
      {isUser && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-200">
          <User weight="fill" className="h-5 w-5 text-zinc-600" />
        </div>
      )}
    </div>
  );
}
