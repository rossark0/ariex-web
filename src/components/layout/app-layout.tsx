'use client';

import { useState, useEffect } from 'react';
import Sidebar, { SidebarItem } from '@/components/layout/sidebar';
import { useUiStore } from '@/contexts/ui/UiStore';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import ChatSidebar from './chat-sidebar';
import { SidebarToggle } from './sidebar-toggle';
import { useAuth } from '@/contexts/auth/AuthStore';
import { AiFloatingChatbot } from '@/components/ai/ai-floating-chatbot';
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
  const { isSidebarCollapsed, selectedCount, onClearSelection, onDownloadSelection, isDownloadingSelection } = useUiStore();
  const { user } = useAuth();

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
  const isComplianceStrategistDetail = pathname.match(/\/compliance\/strategists\/[^/]+$/);
  const isComplianceClientDetail = pathname.match(/\/compliance\/clients\/[^/]+$/);
  const isPayments =
    pathname.startsWith('/client/payments') || pathname.startsWith('/strategist/payments');
  const isDocuments =
    pathname.startsWith('/client/documents') || pathname.startsWith('/strategist/documents');
  const isAgreements =
    pathname.startsWith('/client/agreements') || pathname.startsWith('/strategist/agreements');

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
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-6">
        <div className="flex max-w-md flex-col items-center gap-6 text-center">
          <DesktopIcon className="h-10 w-10 text-zinc-400" weight="duotone" />
          <div className="flex flex-col gap-2">
            <h1 className="text-lg font-semibold text-zinc-900">Use it on desktop only</h1>
            <p className="text-sm leading-relaxed text-balance text-zinc-600">
              This application is optimized for desktop use. Please access it from a device with a
              larger screen for the best experience.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overscroll-none bg-white">
      <aside
        className={cn(
          'hidden flex-col gap-4 p-4 px-2 pt-6 md:flex',
          isSidebarCollapsed ? 'w-0' : 'w-48',
          'transition-all duration-300 ease-in-out'
        )}
      >
        <Sidebar items={navItems} />
      </aside>
      <main className="relative max-h-screen flex-1 p-4 pb-2 pl-0">
        <div className="relative flex h-full w-full flex-1 flex-col overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          {/* Sidebar Close Button */}
          <div
            className={cn(
              'absolute top-4 left-4 z-10 hidden md:block',
              isClientPage ? 'top-5.5 left-12' : ''
            )}
          >
            <SidebarToggle />
          </div>

          {/* Chat Sidebar Toggle Button */}
          {/* <div className="absolute top-4 right-4 z-10 hidden md:block">
            <ChatSidebarToggle />
          </div> */}

          <div className="flex-1 overflow-y-auto">{children}</div>

          {isClientRole || isStrategistRole ? (
            <AiFloatingChatbot
              selectedCount={selectedCount}
              onClearSelection={onClearSelection ?? undefined}
              onDownload={onDownloadSelection ?? undefined}
              isDownloading={isDownloadingSelection}
              contextType={getContextType()}
            />
          ) : null}
        </div>
      </main>
      {(!isCompliance || isComplianceStrategistDetail || isComplianceClientDetail) && (
        <aside className="hidden h-[calc(100vh-0.5rem)] flex-col gap-4 pt-4 pr-4 md:flex">
          <ChatSidebar />
        </aside>
      )}
    </div>
  );
}
