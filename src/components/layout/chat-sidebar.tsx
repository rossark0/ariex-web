'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth/AuthStore';
import { useUiStore } from '@/contexts/ui/UiStore';
import { cn } from '@/lib/utils';
import { Chat } from '../chat';
import { usePathname, useSearchParams } from 'next/navigation';
import { getClientDashboardData } from '@/lib/api/client.api';

export default function ChatSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useAuth(state => state.user);
  const isStrategist = user?.role === 'STRATEGIST';
  const isCompliance = user?.role === 'COMPLIANCE';
  const { isChatSidebarCollapsed } = useUiStore();

  // For clients, we need to know their strategist ID
  const [strategistIdFromDashboard, setStrategistIdFromDashboard] = useState<string | null>(null);

  // On compliance client detail page, use strategistId from URL so sidebar = same room as strategy review chat
  const complianceClientPage = pathname.match(/^\/compliance\/clients\/[^/]+$/);
  const strategistIdFromUrl = complianceClientPage ? searchParams.get('strategistId') : null;

  // Resolved other user for single-chat mode: URL (compliance) > dashboard (client)
  const otherUserId = strategistIdFromUrl || strategistIdFromDashboard || null;

  // Fetch strategist ID for clients (dashboard)
  useEffect(() => {
    async function fetchStrategistId() {
      if (!isStrategist && !strategistIdFromUrl && user?.id) {
        try {
          const dashboardData = await getClientDashboardData();
          const firstAgreement = dashboardData?.agreements?.[0];
          if (firstAgreement?.strategistId) {
            setStrategistIdFromDashboard(firstAgreement.strategistId);
          }
        } catch (error) {
          console.error('[ChatSidebar] Failed to fetch strategist ID:', error);
        }
      }
    }
    fetchStrategistId();
  }, [isStrategist, strategistIdFromUrl, user?.id]);

  // Hide sidebar for strategist client routes and strategist documents/agreements/payments routes
  const isClientsRoute = pathname.startsWith('/strategist/clients');
  const isStrategistDocuments = pathname.startsWith('/strategist/documents');
  const isStrategistAgreements = pathname.startsWith('/strategist/agreements');
  const isStrategistPayments = pathname.startsWith('/strategist/payments');

  if (isClientsRoute || isStrategistDocuments || isStrategistAgreements || isStrategistPayments) {
    return null;
  }

  // Determine chat mode: compliance on client page = single chat with that strategist
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
          otherUserId={!isStrategist ? (otherUserId ?? undefined) : undefined}
          clientName={!isStrategist ? (isCompliance && otherUserId ? 'Strategist' : 'Your Strategist') : undefined}
        />
      </div>
    </div>
  );
}
