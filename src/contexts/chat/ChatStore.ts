import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface ChatState {
  messages: Message[];
  isTyping: boolean;
  addMessage: (message: Message) => void;
  setIsTyping: (typing: boolean) => void;
  clearMessages: () => void;
}

export const chatStore = createStore<ChatState>(set => ({
  messages: [],
  isTyping: false,
  addMessage: message => set(state => ({ messages: [...state.messages, message] })),
  setIsTyping: typing => set({ isTyping: typing }),
  clearMessages: () => set({ messages: [] }),
}));

export const useChat = <T>(selector: (state: ChatState) => T) => useStore(chatStore, selector);
