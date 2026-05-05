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
    <div className={cn('relative -translate-y-4 p-0', className)}>
      <div className="relative flex items-center gap-2 rounded-4xl border border-white/10 bg-deep-navy shadow-2xl duration-200 ease-linear transition-all focus-within:ring-2 focus-within:ring-electric-blue/30">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={1}
          className="flex-1 min-h-[56px] resize-none bg-transparent px-6 py-4 text-sm leading-relaxed font-medium tracking-normal text-soft-white placeholder:text-steel-gray focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />

        {/* Attachment Button */}
        <button
          type="button"
          onClick={onAttachment}
          disabled={disabled || isLoading}
          className="flex h-9 cursor-pointer w-9 items-center justify-center rounded-full text-steel-gray duration-150 ease-linear transition-all hover:bg-white/8 hover:text-soft-white disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Attach file"
        >
          <Paperclip size={20} weight="bold" />
        </button>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!message.trim() || disabled || isLoading}
          className="mr-3 flex cursor-pointer h-9 w-9 items-center justify-center rounded-full bg-electric-blue text-soft-white duration-150 ease-linear transition-all hover:bg-electric-blue/80 disabled:bg-white/10 disabled:text-steel-gray disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <ArrowUp size={20} weight="bold" />
        </button>
      </div>
    </div>
  );
}
