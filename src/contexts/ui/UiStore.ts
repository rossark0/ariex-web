'use client';

import { create } from 'zustand';

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UiState {
  isChatSidebarCollapsed: boolean;
  isSidebarCollapsed: boolean;
  toggleChatSidebar: () => void;
  toggleSidebar: () => void;
  setChatSidebarCollapsed: (collapsed: boolean) => void;
  // Selection state for AI floating chatbot
  selectedCount: number;
  onClearSelection: (() => void) | null;
  setSelection: (count: number, onClear: (() => void) | null) => void;
  clearSelection: () => void;
  // AI chat state
  aiMessages: AiMessage[];
  isAiChatOpen: boolean;
  setAiChatOpen: (open: boolean) => void;
  addAiMessage: (message: Omit<AiMessage, 'id' | 'timestamp'>) => void;
  clearAiMessages: () => void;
  askAriexWithContext: (contextType: string, count: number) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  isChatSidebarCollapsed: false,
  isSidebarCollapsed: false,
  toggleChatSidebar: () =>
    set(state => ({ isChatSidebarCollapsed: !state.isChatSidebarCollapsed })),
  toggleSidebar: () => set(state => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setChatSidebarCollapsed: (collapsed: boolean) => set({ isChatSidebarCollapsed: collapsed }),
  // Selection state
  selectedCount: 0,
  onClearSelection: null,
  setSelection: (count, onClear) => set({ selectedCount: count, onClearSelection: onClear }),
  clearSelection: () => set({ selectedCount: 0, onClearSelection: null }),
  // AI chat state
  aiMessages: [],
  isAiChatOpen: false,
  setAiChatOpen: (open) => set({ isAiChatOpen: open }),
  addAiMessage: (message) => set(state => ({
    aiMessages: [...state.aiMessages, {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    }],
  })),
  clearAiMessages: () => set({ aiMessages: [] }),
  askAriexWithContext: (contextType, count) => {
    const { addAiMessage, setAiChatOpen, onClearSelection } = get();
    
    // Add user message with context
    const userMessage = `Analyze my ${count} selected ${contextType}${count > 1 ? 's' : ''}`;
    addAiMessage({ role: 'user', content: userMessage });
    
    // Open the chat
    setAiChatOpen(true);
    
    // Simulate AI response after a short delay
    setTimeout(() => {
      const mockResponses: Record<string, string> = {
        payment: `I've analyzed your ${count} selected payment${count > 1 ? 's' : ''}. Here's what I found:\n\n• **Total amount**: The selected payments total varies based on your selection\n• **Status overview**: I can see the payment statuses and due dates\n• **Recommendations**: Consider setting up automatic payments for recurring invoices to avoid late fees\n\nWould you like me to provide more details about any specific payment, or help you understand your payment history better?`,
        agreement: `I've reviewed your ${count} selected agreement${count > 1 ? 's' : ''}. Here's my analysis:\n\n• **Document status**: I can see the signature status of each agreement\n• **Key terms**: These agreements outline your tax advisory services with Ariex\n• **Action items**: ${count > 1 ? 'Some agreements may require your signature' : 'Check if this agreement requires any action'}\n\nWould you like me to summarize the key points of any specific agreement, or explain any terms in detail?`,
        document: `I've analyzed your ${count} selected document${count > 1 ? 's' : ''}. Here's what I found:\n\n• **Document types**: Tax-related documents for your strategy\n• **Upload dates**: Recently uploaded files are ready for review\n• **Next steps**: Your tax strategist will review these documents\n\nWould you like me to help categorize these documents or explain how they'll be used in your tax strategy?`,
      };
      
      const response = mockResponses[contextType] || `I've analyzed your ${count} selected item${count > 1 ? 's' : ''}. How can I help you with ${count > 1 ? 'them' : 'it'}?`;
      addAiMessage({ role: 'assistant', content: response });
    }, 1000);
    
    // Clear selection after asking
    if (onClearSelection) {
      onClearSelection();
    }
  },
}));
