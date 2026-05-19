'use client';

import { useState, useEffect } from 'react';
import Sidebar, { SidebarItem } from '@/components/layout/sidebar';
import { useUiStore } from '@/contexts/ui/UiStore';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import ChatSidebar from './chat-sidebar';
import { TopContextBar } from './top-context-bar';
import { useAuth } from '@/contexts/auth/AuthStore';
import { AiFloatingChatbot } from '@/components/ai/ai-floating-chatbot';
import { AiInsightsRail } from '@/components/ai/ai-insights-rail';
import { ClientDetailRail } from '@/components/ai/client-detail-rail';
import { useAiBasicPageContext } from '@/contexts/ai/hooks/use-ai-page-context';
import { DesktopIcon, DeviceMobileCamera } from '@phosphor-icons/react';

interface AppLayoutProps {
  children: React.ReactNode;
  navItems: SidebarItem[];
}

export default function AppLayout({ children, navItems }: AppLayoutProps) {
  // ============================================================================
  // ALL HOOKS MUST BE CALLED AT THE TOP (Rules of Hooks)
  // ============================================================================
  const pathname = usePathname();
  const {
    isSidebarCollapsed,
    selectedCount,
    onClearSelection,
    onDownloadSelection,
    onDeleteSelection,
    isDownloadingSelection,
    isDeletingSelection,
    hydrateAiMessages,
  } = useUiStore();
  const { user } = useAuth();

  // Restore the AI chat history once on mount so a refresh doesn't lose
  // the conversation. Per-device fallback until server-backed sessions ship.
  useEffect(() => {
    hydrateAiMessages();
  }, [hydrateAiMessages]);

  // Provide basic page context (route + role) to AI chatbot for all pages.
  // Individual pages can override with richer context via useAiPageContext.
  useAiBasicPageContext(user?.role || 'UNKNOWN');

  // Mobile detection (below lg breakpoint - 1024px)
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    // Check on mount
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ============================================================================
  // DERIVED STATE & VARIABLES (calculated from hooks above)
  // ============================================================================
  const isClientPage = pathname.startsWith('/strategist/clients/');
  const isClientRole = user?.role === 'CLIENT';
  const isStrategistRole = user?.role === 'STRATEGIST';
  const isCompliance = pathname.startsWith('/compliance');
  const isStrategistCompliance = pathname.startsWith('/strategist/compliance');
  const isComplianceStrategistDetail = pathname.match(/\/compliance\/strategists\/[^/]+$/);
  const isComplianceClientDetail = pathname.match(/\/compliance\/clients\/[^/]+$/);
  const isBilling = pathname.startsWith('/strategist/billing');
  const isPayments =
    pathname.startsWith('/client/payments') || pathname.startsWith('/strategist/payments');
  const isDocuments =
    pathname.startsWith('/client/documents') || pathname.startsWith('/strategist/documents');
  const isAgreements =
    pathname.startsWith('/client/agreements') || pathname.startsWith('/strategist/agreements');

  // Routes where the AI Insights Rail replaces the human ChatSidebar.
  // Pick pages with rich page context where structured insights add the most value.
  const isStrategistHome = pathname === '/strategist/home';
  const isStrategistClientDetail = !!pathname.match(/^\/strategist\/clients\/[^/]+$/);
  const isClientHome = pathname === '/client/home';
  const showAiInsightsRail =
    (isStrategistRole && isStrategistHome) || (isClientRole && isClientHome);
  // Client detail uses a richer tabbed rail (AI Copilot + Client Chat) instead.
  const showClientDetailRail = isStrategistRole && isStrategistClientDetail;
  // The floating "Ask ARIEX" chatbot must stay mounted everywhere it can be
  // invoked. The ClientDetailRail's "Client Chat" tab is the human
  // strategist↔client chat — a different surface — while its "Ask ARIEX"
  // buttons (and the AiInsightsRail's) open this floating AI chatbot.
  // Suppressing it here left those buttons dead, so it is never suppressed.
  const suppressFloatingChatbot = false;

  // Determine context type for AI chatbot based on current page
  const getContextType = () => {
    if (isPayments) return 'payment';
    if (isAgreements) return 'agreement';
    if (isDocuments) return 'document';
    return 'item';
  };

  // ============================================================================
  // CONDITIONAL RENDERING (after all hooks)
  // ============================================================================

  // Show mobile message
  if (isMobile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-graphite p-6">
        <div className="flex max-w-md flex-col items-center gap-6 text-center">
          <DesktopIcon className="h-10 w-10 text-steel-gray" weight="duotone" />
          <div className="flex flex-col gap-2">
            <h1 className="text-lg font-semibold text-soft-white">Use it on desktop only</h1>
            <p className="text-sm leading-relaxed text-balance text-steel-gray">
              This application is optimized for desktop use. Please access it from a device with a
              larger screen for the best experience.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overscroll-none bg-deep-navy">
      <aside
        className={cn(
          'hidden flex-col gap-4 overflow-hidden bg-graphite px-2 pt-6 pb-4 md:flex',
          isSidebarCollapsed ? 'w-0 px-0' : 'w-48',
          'transition-all duration-300 ease-in-out'
        )}
      >
        <Sidebar items={navItems} />
      </aside>
      <main className="relative max-h-screen flex-1 p-4 pb-2 pl-4">
        <div className="relative flex h-full w-full flex-1 flex-col overflow-y-auto rounded-lg border border-white/6 bg-panel shadow-sm">
          <TopContextBar />

          <div className="flex-1 overflow-y-auto">{children}</div>

          {(isClientRole || isStrategistRole) && !suppressFloatingChatbot ? (
            <AiFloatingChatbot
              selectedCount={selectedCount}
              onClearSelection={onClearSelection ?? undefined}
              onDownload={onDownloadSelection ?? undefined}
              onDelete={onDeleteSelection ?? undefined}
              isDownloading={isDownloadingSelection}
              isDeleting={isDeletingSelection}
              contextType={getContextType()}
            />
          ) : null}
        </div>
      </main>
      {showClientDetailRail ? (
        <aside className="hidden h-[calc(100vh-0.5rem)] flex-col gap-4 py-4 pr-4 md:flex">
          <ClientDetailRail className="h-full" />
        </aside>
      ) : showAiInsightsRail ? (
        <aside className="hidden h-[calc(100vh-0.5rem)] flex-col gap-4 py-4 pr-4 md:flex">
          <AiInsightsRail className="h-full" />
        </aside>
      ) : (
        (!isCompliance || isComplianceStrategistDetail || isComplianceClientDetail) && !isStrategistCompliance && !isBilling && (
          <aside className="hidden h-[calc(100vh-0.5rem)] flex-col gap-4 pt-4 pr-4 md:flex">
            <ChatSidebar />
          </aside>
        )
      )}
    </div>
  );
}
