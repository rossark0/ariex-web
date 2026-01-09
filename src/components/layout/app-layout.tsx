'use client';

import Sidebar, { SidebarItem } from '@/components/layout/sidebar';
import { useUiStore } from '@/contexts/ui/UiStore';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import ChatSidebar from './chat-sidebar';
import { SidebarToggle } from './sidebar-toggle';
import { useAuth } from '@/contexts/auth/AuthStore';
import { AiFloatingChatbot } from '@/components/ai/ai-floating-chatbot';

interface AppLayoutProps {
  children: React.ReactNode;
  navItems: SidebarItem[];
}

export default function AppLayout({ children, navItems }: AppLayoutProps) {
  const pathname = usePathname();
  const isClientPage = pathname.startsWith('/strategist/clients/');
  const { isSidebarCollapsed, selectedCount, onClearSelection } = useUiStore();
  const { user } = useAuth();
  const isClientRole = user?.role === 'CLIENT';
  const isCompliance = pathname.startsWith('/compliance');
  const isComplianceStrategistDetail = pathname.match(/\/compliance\/strategists\/[^/]+$/);
  const isPayments = pathname.startsWith('/client/payments');
  const isDocuments = pathname.startsWith('/client/documents');
  const isAgreements = pathname.startsWith('/client/agreements');

  // Determine context type for AI chatbot based on current page
  const getContextType = () => {
    if (isPayments) return 'payment';
    if (isAgreements) return 'agreement';
    if (isDocuments) return 'document';
    return 'item';
  };

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

          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
          
          {isClientRole ? <AiFloatingChatbot selectedCount={selectedCount} onClearSelection={onClearSelection ?? undefined} contextType={getContextType()} /> : null}
        </div>
      </main>
      {(!isCompliance || isComplianceStrategistDetail) && <aside className="hidden h-[calc(100vh-0.5rem)] flex-col gap-4 pt-4 pr-4 md:flex">
        <ChatSidebar />
      </aside>}
    </div>
  );
}
