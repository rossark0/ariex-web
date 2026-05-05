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
        'flex cursor-pointer items-center justify-center rounded-lg text-steel-gray duration-150 ease-linear transition-colors hover:text-soft-white',
        className
      )}
      aria-label={isSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
    >
      {' '}
      <div className="h-4 w-4 rounded-sm border-2 border-steel-gray bg-transparent">
        <div
          className={cn(
            'h-full bg-steel-gray transition-all duration-200 ease-linear',
            isSidebarCollapsed ? 'w-0.5' : 'w-2'
          )}
        />
      </div>
    </button>
  );
}
