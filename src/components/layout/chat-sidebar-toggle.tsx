'use client';

import { ChatCircle, ChatCircleIcon, X } from '@phosphor-icons/react';
import { useUiStore } from '@/contexts/ui/UiStore';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

interface ChatSidebarToggleProps {
  className?: string;
}

export function ChatSidebarToggle({ className }: ChatSidebarToggleProps) {
  const pathname = usePathname();
  const isClientPage = pathname.startsWith('/strategist/clients/');
  const { isChatSidebarCollapsed, toggleChatSidebar } = useUiStore();

  if (isClientPage) {
    return null;
  }

  return (
    <button
      onClick={toggleChatSidebar}
      className={cn(
        'flex cursor-pointer items-center justify-center rounded-lg  bg-zinc-50 text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900',
        className
      )}
      aria-label={isChatSidebarCollapsed ? 'Open chat sidebar' : 'Close chat sidebar'}
    >
      {' '}
      <ChatCircleIcon weight="fill" className="h-4.5 w-4.5 text-zinc-400" />
    </button>
  );
}
