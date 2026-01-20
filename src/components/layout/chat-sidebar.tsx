'use client';

import { useAuth } from '@/contexts/auth/AuthStore';
import { useUiStore } from '@/contexts/ui/UiStore';
import { cn } from '@/lib/utils';
import { Chat } from '../chat';
import { usePathname } from 'next/navigation';

export default function ChatSidebar() {
  const pathname = usePathname();
  const user = useAuth(state => state.user);
  const isStrategist = user?.role === 'STRATEGIST';
  const { isChatSidebarCollapsed } = useUiStore();

  // Hide sidebar for strategist client routes and strategist documents/agreements/payments routes
  const isClientsRoute = pathname.startsWith('/strategist/clients');
  const isStrategistDocuments = pathname.startsWith('/strategist/documents');
  const isStrategistAgreements = pathname.startsWith('/strategist/agreements');
  const isStrategistPayments = pathname.startsWith('/strategist/payments');
  
  if (isClientsRoute || isStrategistDocuments || isStrategistAgreements || isStrategistPayments) {
    return null;
  }

  // Determine chat mode
  const chatMode = isStrategist ? 'multi' : 'single';

  return (
    <div
      className={cn(
        'relative hidden h-full flex-col gap-4 transition-all duration-300 ease-in-out md:flex',
        isChatSidebarCollapsed ? 'w-0' : 'w-90'
      )}
    >
      {/* Expanded State - Show full chat */}
      <div
        className={cn(
          'h-full w-full flex-col gap-4 transition-opacity duration-200',
          isChatSidebarCollapsed ? 'hidden opacity-0' : 'flex opacity-100'
        )}
      >
        <Chat mode={chatMode} />
      </div>
    </div>
  );
}
