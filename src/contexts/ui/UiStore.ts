'use client';

import { create } from 'zustand';

interface UiState {
  isChatSidebarCollapsed: boolean;
  isSidebarCollapsed: boolean;
  toggleChatSidebar: () => void;
  toggleSidebar: () => void;
  setChatSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUiStore = create<UiState>(set => ({
  isChatSidebarCollapsed: false,
  isSidebarCollapsed: false,
  toggleChatSidebar: () =>
    set(state => ({ isChatSidebarCollapsed: !state.isChatSidebarCollapsed })),
  toggleSidebar: () => set(state => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setChatSidebarCollapsed: (collapsed: boolean) => set({ isChatSidebarCollapsed: collapsed }),
}));
