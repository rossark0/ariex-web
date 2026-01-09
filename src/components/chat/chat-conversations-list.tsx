'use client';

import { cn } from '@/lib/utils';
import { ChatConversationItem, type ConversationData } from './chat-conversation-item';
import { MagnifyingGlass, Plus, ChatCircleDots } from '@phosphor-icons/react';
import { useState } from 'react';
import { EmptyMessagesIllustration } from '@/components/ui/empty-messages-illustration';

interface ChatConversationsListProps {
  conversations: ConversationData[];
  activeConversationId?: string;
  onSelectConversation: (conversation: ConversationData) => void;
  onNewConversation?: () => void;
  title?: string;
  showSearch?: boolean;
  className?: string;
}

export function ChatConversationsList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  title = 'Messages',
  showSearch = true,
  className,
}: ChatConversationsListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(
    conv =>
      conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={cn('flex h-full w-full flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 py-3">
        <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
        {onNewConversation && (
          <button
            onClick={onNewConversation}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="New conversation"
          >
            <Plus className="h-5 w-5" weight="bold" />
          </button>
        )}
      </div>

      {/* Search */}
      {showSearch && (
        <div className="py-2">
          <div className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2">
            <MagnifyingGlass className="h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="flex-1 bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
            />
          </div>
        </div>
      )}

      {/* Conversations list */}
      <div className="w-full flex-1 overflow-y-auto py-1">
        {filteredConversations.length === 0 ? (
          <div className="flex w-full flex-col items-center justify-center py-12 text-center">
            <EmptyMessagesIllustration />
            {searchQuery ? (
              <>
                <p className="text-sm font-medium text-zinc-700">No results found</p>
                <p className="mt-1 text-xs text-zinc-500">Try searching with different keywords</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-zinc-700">No conversations yet</p>
                <p className="mt-1 text-xs text-zinc-500">Start a new conversation to get help</p>
                {onNewConversation && (
                  <button
                    onClick={onNewConversation}
                    className="mt-4 rounded-full bg-teal-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600"
                  >
                    Start a conversation
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex w-full flex-col gap-1">
            {filteredConversations.map(conversation => (
              <ChatConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeConversationId}
                onClick={() => onSelectConversation(conversation)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
