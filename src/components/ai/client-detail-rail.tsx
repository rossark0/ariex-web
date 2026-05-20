'use client';

import { useState } from 'react';
import { Sparkle, ChatCircleDots } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  AiInsightsContent,
  AiInsightsRefreshButton,
} from '@/components/ai/ai-insights-rail';
import { ClientChatPane } from '@/components/chat/client-chat-pane';
import { useClientDetailStore } from '@/contexts/strategist-contexts/client-management/ClientDetailStore';

type RailTab = 'copilot' | 'chat';

interface ClientDetailRailProps {
  className?: string;
}

/**
 * Right rail shown on /strategist/clients/[id]. Hosts both the AI Copilot
 * (insights for this client) and the strategist↔client chat under one tab strip.
 *
 * Both panes are mounted simultaneously so their state — chat polling, insight
 * fetches — survives tab switches; only the visible one is "active".
 */
export function ClientDetailRail({ className }: ClientDetailRailProps) {
  const [tab, setTab] = useState<RailTab>('copilot');
  const clientInfo = useClientDetailStore(s => s.clientInfo);
  const clientId = useClientDetailStore(s => s.clientId);

  const chatClient = clientInfo && clientId
    ? {
        id: clientId,
        user: {
          id: clientInfo.user.id,
          name: clientInfo.user.name,
          email: clientInfo.user.email,
        },
      }
    : null;

  return (
    <aside
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border border-white/10 bg-deep-navy',
        className
      )}
      aria-label="Client detail rail"
    >
      {/* Tab strip */}
      <header className="flex items-center justify-between border-b border-white/6 px-2 py-2">
        <div role="tablist" aria-label="Rail mode" className="flex items-center gap-1">
          <TabButton
            active={tab === 'copilot'}
            onClick={() => setTab('copilot')}
            icon={<Sparkle weight="fill" className="h-3.5 w-3.5" />}
            label="AI Copilot"
          />
          <TabButton
            active={tab === 'chat'}
            onClick={() => setTab('chat')}
            icon={<ChatCircleDots weight="fill" className="h-3.5 w-3.5" />}
            label="Client Chat"
            disabled={!chatClient}
          />
        </div>
        {tab === 'copilot' && <AiInsightsRefreshButton />}
      </header>

      {/* Panes — both mounted; visibility toggled to preserve state */}
      <div className="relative flex flex-1 min-h-0 flex-col">
        <div
          role="tabpanel"
          aria-label="AI Copilot"
          className={cn('absolute inset-0 flex flex-col', tab === 'copilot' ? 'visible' : 'invisible pointer-events-none')}
        >
          <AiInsightsContent />
        </div>
        <div
          role="tabpanel"
          aria-label="Client Chat"
          className={cn('absolute inset-0 flex flex-col', tab === 'chat' ? 'visible' : 'invisible pointer-events-none')}
        >
          {chatClient ? (
            <ClientChatPane client={chatClient} active={tab === 'chat'} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-xs font-medium text-soft-white">No client loaded</p>
              <p className="text-[11px] text-steel-gray/70">Open a client to start a conversation.</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}

function TabButton({ active, onClick, icon, label, disabled }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 ease-linear disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'bg-white/8 text-soft-white'
          : 'text-steel-gray hover:bg-white/5 hover:text-soft-white'
      )}
    >
      <span className={cn(active ? 'text-electric-blue' : 'text-steel-gray')}>{icon}</span>
      {label}
    </button>
  );
}
