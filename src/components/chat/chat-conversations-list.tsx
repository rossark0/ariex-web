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
      <div className="flex items-center justify-between border-b border-white/8 py-3">
        <h2 className="text-base font-semibold text-soft-white">{title}</h2>
        {onNewConversation && (
          <button
            onClick={onNewConversation}
            className="flex h-8 w-8 items-center justify-center rounded-full text-steel-gray duration-150 ease-linear transition-colors hover:bg-white/8 hover:text-soft-white"
            aria-label="New conversation"
          >
            <Plus className="h-5 w-5" weight="bold" />
          </button>
        )}
      </div>

      {/* Search */}
      {showSearch && (
        <div className="py-2">
          <div className="flex items-center gap-2 rounded-lg bg-white/6 px-3 py-2">
            <MagnifyingGlass className="h-4 w-4 text-steel-gray" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="flex-1 bg-transparent text-sm text-soft-white outline-none placeholder:text-steel-gray"
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
                <p className="text-sm font-medium text-soft-white">No results found</p>
                <p className="mt-1 text-xs text-steel-gray">Try searching with different keywords</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-soft-white">No conversations yet</p>
                <p className="mt-1 text-xs text-steel-gray">Start a new conversation to get help</p>
                {onNewConversation && (
                  <button
                    onClick={onNewConversation}
                    className="mt-4 rounded-full bg-electric-blue px-4 py-2 text-sm font-medium text-soft-white duration-150 ease-linear transition-colors hover:bg-electric-blue/80"
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
