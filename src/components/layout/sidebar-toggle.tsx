'use client';

import { SidebarOpen } from 'lucide-react';
import { SidebarClose } from 'lucide-react';
import { SidebarIcon } from '@phosphor-icons/react';
import { useUiStore } from '@/contexts/ui/UiStore';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

interface SidebarToggleProps {
  className?: string;
}

export function SidebarToggle({ className }: SidebarToggleProps) {
  const pathname = usePathname();
  const isClientPage = pathname.startsWith('/strategist/clients/');
  const { isSidebarCollapsed, toggleSidebar } = useUiStore();

  // if (isClientPage) {
  //   return null;
  // }

  return (
    <button
      onClick={toggleSidebar}
      className={cn(
        'flex cursor-pointer items-center justify-center rounded-lg bg-zinc-50 text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900',
        className
      )}
      aria-label={isSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
    >
      {' '}
      <div className="h-4 w-4 rounded-sm border-2 border-zinc-400 bg-white">
        <div
          className={cn(
            'h-full bg-zinc-400 transition-all duration-300 ease-in-out',
            isSidebarCollapsed ? 'w-0.5' : 'w-2'
          )}
        />
      </div>
    </button>
  );
}
