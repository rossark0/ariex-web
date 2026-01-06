import { z } from 'zod';

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1, 'Message cannot be empty'),
});

export type ChatMessageDto = z.infer<typeof chatMessageSchema>;

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
  conversationId: z.string().optional(),
});

export type SendMessageDto = z.infer<typeof sendMessageSchema>;
