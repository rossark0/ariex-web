import { z } from 'zod';
import { authenticatedProcedure } from '../base';
import { chatWithAI } from '@/lib/ai/openai';

export type ChatMessage = {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
};

const messages: ChatMessage[] = [];

/**
 * List chat messages
 */
export const listMessages = authenticatedProcedure.handler(async ({ context }) => {
  return messages
    .filter(m => m.userId === context.userId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
});

/**
 * Send a message (assistant uses OpenAI helper)
 */
export const sendMessage = authenticatedProcedure
  .input(z.object({ content: z.string().min(1) }))
  .handler(async ({ context, input }) => {
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      userId: context.userId,
      role: 'user',
      content: input.content,
      createdAt: new Date(),
    };
    messages.push(userMsg);

    const recent = messages.filter(m => m.userId === context.userId).slice(-10);
    const reply = await chatWithAI(
      recent.map(m => ({ role: m.role, content: m.content })),
      {
        // TODO: enrich with real client profile and recent documents
        clientProfile: null,
        recentDocuments: [],
      }
    );

    const assistantMsg: ChatMessage = {
      id: `msg_${Date.now()}_a`,
      userId: context.userId,
      role: 'assistant',
      content: reply,
      createdAt: new Date(),
    };
    messages.push(assistantMsg);

    return { user: userMsg, assistant: assistantMsg };
  });

/**
 * Clear conversation
 */
export const clearConversation = authenticatedProcedure.handler(async ({ context }) => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].userId === context.userId) {
      messages.splice(i, 1);
    }
  }
  return { success: true };
});
