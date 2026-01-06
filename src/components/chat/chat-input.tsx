'use client';

import { cn } from '@/lib/utils';
import { useRef, useState, useEffect, useCallback } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function ChatInput({
  onSend,
  placeholder = 'Type a message...',
  disabled = false,
  isLoading = false,
  className,
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
    <div className={cn('p-0', className)}>
      <textarea
        ref={textareaRef}
        value={message}
        onChange={e => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        rows={1}
        className="min-h-[56px] w-full resize-none rounded-4xl border border-zinc-200 bg-white px-6 py-4 text-sm leading-relaxed font-medium tracking-tight text-zinc-500 shadow-2xl transition-all duration-300 placeholder:text-zinc-500 hover:bg-white focus:ring-2 focus:ring-zinc-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
