'use client';

import { cn } from '@/lib/utils';
import { Robot, SpinnerGap } from '@phosphor-icons/react';

export interface ConversationData {
  id: string;
  title: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount?: number;
  isAI?: boolean;
  avatarUrl?: string;
  isLoading?: boolean; // Show loading spinner instead of lastMessage
}

interface ChatConversationItemProps {
  conversation: ConversationData;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ChatConversationItem({
  conversation,
  isActive = false,
  onClick,
  className,
}: ChatConversationItemProps) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors',
        isActive ? 'bg-zinc-100' : 'hover:bg-zinc-50',
        className
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {conversation.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={conversation.avatarUrl}
            alt={conversation.title}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-white">
            {conversation.isAI ? (
              <Robot weight="fill" className="h-4 w-4" />
            ) : (
              getInitials(conversation.title)
            )}
          </div>
        )}

        {/* Unread indicator */}
        {conversation.unreadCount && conversation.unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-500 px-1 text-[10px] font-semibold text-white">
            {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'truncate text-sm',
              conversation.unreadCount ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-700'
            )}
          >
            {conversation.title}
          </span>
          <span className="shrink-0 text-[10px] text-zinc-400">
            {conversation.isLoading ? '' : `Last message ${formatTime(conversation.lastMessageAt)}`}
          </span>
        </div>
        {/* {conversation.isLoading ? (
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <SpinnerGap className="h-3 w-3 animate-spin" />
            <span>Loading...</span>
          </div>
        ) : (
          <p
            className={cn(
              'truncate text-xs',
              conversation.unreadCount ? 'font-medium text-zinc-600' : 'text-zinc-500'
            )}
          >
            {conversation.lastMessage}
          </p>
        )} */}
      </div>
    </button>
  );
}
