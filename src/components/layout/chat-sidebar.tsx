'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth/AuthStore';
import { useUiStore } from '@/contexts/ui/UiStore';
import { cn } from '@/lib/utils';
import { Chat } from '../chat';
import { usePathname } from 'next/navigation';
import { getClientDashboardData } from '@/lib/api/client.api';

export default function ChatSidebar() {
  const pathname = usePathname();
  const user = useAuth(state => state.user);
  const isStrategist = user?.role === 'STRATEGIST';
  const { isChatSidebarCollapsed } = useUiStore();

  // For clients, we need to know their strategist ID
  const [strategistId, setStrategistId] = useState<string | null>(null);

  // Fetch strategist ID for clients
  useEffect(() => {
    async function fetchStrategistId() {
      if (!isStrategist && user?.id) {
        try {
          const dashboardData = await getClientDashboardData();
          // Get strategist ID from first agreement
          const firstAgreement = dashboardData?.agreements?.[0];
          if (firstAgreement?.strategistId) {
            setStrategistId(firstAgreement.strategistId);
          }
        } catch (error) {
          console.error('[ChatSidebar] Failed to fetch strategist ID:', error);
        }
      }
    }
    fetchStrategistId();
  }, [isStrategist, user?.id]);

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
        <Chat
          mode={chatMode}
          otherUserId={!isStrategist ? (strategistId ?? undefined) : undefined}
          clientName={!isStrategist ? 'Your Strategist' : undefined}
        />
      </div>
    </div>
  );
}
