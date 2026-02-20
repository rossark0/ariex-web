'use client';

import { useState } from 'react';
import { useChat } from '../ChatStore';
import { PaperPlaneRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export function ChatInput() {
  const [input, setInput] = useState('');
  const sendMessage = useChat(state => state.sendMessage);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    sendMessage(input);

    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t border-zinc-200 bg-white p-4">
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Ask a tax question..."
        className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm transition-colors outline-none focus:border-zinc-400"
      />
      <button
        type="submit"
        disabled={!input.trim()}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white transition-all hover:bg-zinc-800',
          !input.trim() && 'cursor-not-allowed opacity-50'
        )}
      >
        <PaperPlaneRight weight="fill" className="h-5 w-5" />
      </button>
    </form>
  );
}
