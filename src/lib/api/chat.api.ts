'use server';

import { API_URL } from '@/lib/cognito-config';
import { cookies } from 'next/headers';

// ============================================================================
// TYPES
// ============================================================================

export interface ChatUser {
  id: string;
  name: string | null;
  email: string;
  role?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId?: string; // Some APIs use this
  userId?: string; // Some APIs use this instead
  content: string;
  createdAt: string;
  updatedAt?: string;
  sender?: ChatUser;
}

export interface Chat {
  id: string;
  createdAt: string;
  updatedAt?: string;
  participants: ChatUser[];
  messages?: ChatMessage[];
  lastMessage?: ChatMessage;
}

export interface CreateChatRequest {
  participantIds: string[];
}

export interface SendMessageRequest {
  content: string;
  senderId: string;
}

// ============================================================================
// HELPERS
// ============================================================================

async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('ariex_access_token')?.value || null;
}

async function chatApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'ngrok-skip-browser-warning': 'true',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[ChatAPI] Error ${response.status}:`, errorText);
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Create or get existing chat between users
 * POST /chat
 * API expects: userId1, userId2, createdByUserId
 */
export async function createOrGetChat(
  userId1: string,
  userId2: string,
  createdByUserId: string
): Promise<Chat> {
  console.log('[ChatAPI] Creating/getting chat between:', userId1, 'and', userId2);

  return chatApiRequest<Chat>('/chat', {
    method: 'POST',
    body: JSON.stringify({ userId1, userId2, createdByUserId }),
  });
}

/**
 * Get chat details with all messages
 * GET /chat/{chatId}
 */
export async function getChatWithMessages(chatId: string): Promise<Chat> {
  console.log('[ChatAPI] Getting chat with messages:', chatId);

  return chatApiRequest<Chat>(`/chat/${chatId}`);
}

/**
 * Get all chats for a user
 * GET /chat/user/{userId}
 */
export async function getChatsForUser(userId: string): Promise<Chat[]> {
  console.log('[ChatAPI] Getting chats for user:', userId);

  return chatApiRequest<Chat[]>(`/chat/user/${userId}`);
}

/**
 * Send a message in a chat
 * POST /chat/{chatId}/messages
 * API expects: userId, content
 */
export async function sendMessage(
  chatId: string,
  content: string,
  userId: string
): Promise<ChatMessage> {
  console.log('[ChatAPI] Sending message to chat:', chatId);

  return chatApiRequest<ChatMessage>(`/chat/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ userId, content }),
  });
}

/**
 * Get all messages in a chat
 * GET /chat/{chatId}/messages
 */
export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
  console.log('[ChatAPI] Getting messages for chat:', chatId);

  return chatApiRequest<ChatMessage[]>(`/chat/${chatId}/messages`);
}

/**
 * Get a specific message
 * GET /chat/messages/{messageId}
 */
export async function getMessage(messageId: string): Promise<ChatMessage> {
  console.log('[ChatAPI] Getting message:', messageId);

  return chatApiRequest<ChatMessage>(`/chat/messages/${messageId}`);
}
