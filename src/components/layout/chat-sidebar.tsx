'use client';

import { useAuth } from '@/contexts/auth/AuthStore';
import { useUiStore } from '@/contexts/ui/UiStore';
import { cn } from '@/lib/utils';
import { Chat } from '../chat';
import { usePathname } from 'next/navigation';
import { getFullUserProfile } from '@/contexts/auth/data/mock-users';
import type { FullClientMock } from '@/lib/mocks/client-full';
import { getStrategistById } from '@/lib/mocks/strategist-full';

export default function ChatSidebar() {
  const pathname = usePathname();
  const user = useAuth(state => state.user);
  const isStrategist = user?.role === 'STRATEGIST';
  const isClient = user?.role === 'CLIENT';
  const isCompliance = user?.role === 'COMPLIANCE';
  const { isChatSidebarCollapsed } = useUiStore();

  // Check if on compliance strategist detail page
  const complianceStrategistMatch = pathname.match(/\/compliance\/strategists\/([^/]+)$/);
  const complianceStrategistId = complianceStrategistMatch?.[1];

  // Hide sidebar for strategist client routes and strategist documents/agreements/payments routes
  const isClientsRoute = pathname.startsWith('/strategist/clients');
  const isStrategistDocuments = pathname.startsWith('/strategist/documents');
  const isStrategistAgreements = pathname.startsWith('/strategist/agreements');
  const isStrategistPayments = pathname.startsWith('/strategist/payments');
  
  if (isClientsRoute || isStrategistDocuments || isStrategistAgreements || isStrategistPayments) {
    return null;
  }

  // Get strategist info for client users or compliance viewing strategist
  let chatTitle: string | undefined;
  let chatSubtitle: string | undefined;
  let strategistName: string | undefined;

  if (isClient && user) {
    const clientProfile = getFullUserProfile(user) as FullClientMock | null;
    if (clientProfile?.strategistId) {
      const strategist = getStrategistById(clientProfile.strategistId);
      if (strategist && strategist.user.name) {
        strategistName = strategist.user.name;
        chatTitle = strategistName;
        chatSubtitle = 'Your Tax Strategist';
      }
    }
  } else if (isCompliance && complianceStrategistId) {
    const strategist = getStrategistById(complianceStrategistId);
    if (strategist && strategist.user.name) {
      strategistName = strategist.user.name;
      chatTitle = strategistName;
      chatSubtitle = 'Tax Strategist';
    }
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
        <Chat mode={chatMode} title={chatTitle} subtitle={chatSubtitle} />
      </div>
    </div>
  );
}
