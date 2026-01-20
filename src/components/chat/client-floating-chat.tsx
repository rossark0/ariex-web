'use client';

import { useEffect, useState, useRef } from 'react';
import { CaretUp } from '@phosphor-icons/react';

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

interface ChatMessage {
  id: string;
  role: 'strategist' | 'client';
  content: string;
  createdAt: Date;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ClientFloatingChat({ client }: ClientFloatingChatProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // TODO: Load messages from API
  useEffect(() => {
    // Messages will be loaded from API when implemented
    setMessages([]);
  }, [client]);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom();
    }
  }, [messages, isExpanded]);

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'strategist',
      content: input.trim(),
      createdAt: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div
      ref={chatRef}
      className={`fixed right-10 bottom-4 z-40 flex w-80 flex-col overflow-hidden border border-zinc-200 bg-white transition-[height,border-radius,box-shadow] duration-300 ease-out ${
        isExpanded
          ? 'h-[500px] rounded-2xl shadow-2xl'
          : 'h-auto rounded-lg shadow-lg hover:shadow-xl'
      }`}
    >
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex shrink-0 cursor-pointer items-center gap-3 transition-colors ${
          isExpanded ? 'border-b border-zinc-100 px-4 py-3 hover:bg-zinc-50' : 'px-2 py-1'
        }`}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-white">
          {getInitials(client.user.name)}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-900">{client.user.name}</p>
          <div className="flex items-center gap-1">
            <div className="relative flex h-2 w-2">
              {!isExpanded && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <span className="text-xs text-zinc-500">Online</span>
          </div>
        </div>
        <CaretUp
          weight="bold"
          className={`h-4 w-4 text-zinc-400 transition-transform duration-300 ease-out ${
            isExpanded ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </div>

      {/* Messages */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map(message => (
              <div key={message.id}>
                {message.role === 'strategist' ? (
                  /* Strategist message - right side */
                  <div className="flex justify-end">
                    <div className="max-w-[85%]">
                      <div className="rounded-2xl rounded-br-sm bg-teal-500 px-4 py-2">
                        <p className="text-sm text-white">{message.content}</p>
                      </div>
                      <p className="mt-1 text-right text-[10px] text-zinc-400">
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Client message - left side */
                  <div className="flex gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-medium text-zinc-600">
                      {getInitials(client.user.name)}
                    </div>
                    <div className="max-w-[85%]">
                      <div className="rounded-2xl rounded-bl-sm bg-zinc-100 px-4 py-2">
                        <p className="text-sm text-zinc-900">{message.content}</p>
                      </div>
                      <p className="mt-1 text-[10px] text-zinc-400">
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Input */}
      {isExpanded && (
        <div className="shrink-0 border-t border-zinc-100 p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${client.user.name?.split(' ')[0]}...`}
              rows={1}
              className="min-h-[44px] flex-1 resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 transition-all placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </div>
        </div>
      )}
    </div>
  );
}
