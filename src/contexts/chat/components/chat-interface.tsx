'use client';

import { useChat } from '../ChatStore';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';

export function ChatInterface() {
  const messages = useChat(state => state.messages);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-muted-foreground py-12 text-center">
            Start a conversation with your AI tax assistant
          </div>
        )}
        {messages.map(message => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>
      <ChatInput />
    </div>
  );
}
