'use client';

import { cn } from '@/lib/utils';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Paperclip, ArrowUp } from '@phosphor-icons/react';

interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  onAttachment?: () => void;
}

export function ChatInput({
  onSend,
  placeholder = 'Type a message...',
  disabled = false,
  isLoading = false,
  className,
  onAttachment,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const maxHeight = 240;
    const baseHeight = 56;
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  const handleSubmit = () => {
    if (!message.trim() || disabled || isLoading) return;

    onSend(message.trim());
    setMessage('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn('relative p-0', className)}>
      <div className="relative flex items-center gap-2 rounded-4xl border border-zinc-200 bg-white shadow-2xl transition-all duration-300 hover:bg-white focus-within:ring-2 focus-within:ring-zinc-300">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={1}
          className="flex-1 min-h-[56px] resize-none bg-transparent px-6 py-4 text-sm leading-relaxed font-medium tracking-tight text-black placeholder:text-zinc-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />

        {/* Attachment Button */}
        <button
          type="button"
          onClick={onAttachment}
          disabled={disabled || isLoading}
          className="flex h-9 cursor-pointer w-9 items-center justify-center rounded-full text-zinc-500 transition-all hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Attach file"
        >
          <Paperclip size={20} weight="bold" />
        </button>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!message.trim() || disabled || isLoading}
          className="mr-3 flex cursor-pointer h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white transition-all hover:bg-emerald-700 disabled:bg-zinc-300 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <ArrowUp size={20} weight="bold" />
        </button>
      </div>
    </div>
  );
}
