import { z } from 'zod';
import { authenticatedProcedure, baseProcedure } from '../base';

// Local type definitions (previously from @ariexai/shared)
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'CLIENT';
  createdAt: Date;
  updatedAt: Date;
  clerkId: string;
  avatarUrl: string | null;
}

export interface CreateUserDto {
  firebaseId: string;
  email: string;
  name?: string;
  role?: 'ADMIN' | 'CLIENT';
}

export interface UpdateUserDto {
  name?: string;
}

// Mock data store - Replace with actual database calls
const users: User[] = [];

/**
 * Get current user's profile
 */
export const getCurrentUser = authenticatedProcedure.handler(
  async ({ context }): Promise<User | null> => {
    // TODO: Replace with actual database query
    const user = users.find(u => u.id === context.userId);
    return user || null;
  }
);

/**
 * Get user by ID
 */
export const getUser = authenticatedProcedure
  .input(
    z.object({
      id: z.string().uuid(),
    })
  )
  .handler(async ({ input }): Promise<User> => {
    // TODO: Replace with actual database query
    const user = users.find(u => u.id === input.id);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  });

/**
 * Get user by Firebase UID
 */
export const getUserByFirebaseId = baseProcedure
  .input(
    z.object({
      firebaseId: z.string(),
    })
  )
  .handler(async ({ input }): Promise<User | null> => {
    // TODO: Replace with actual database query
    const user = users.find(u => u.id === input.firebaseId);
    return user || null;
  });

/**
 * Create a new user
 */
export const createUser = baseProcedure
  .input(
    z.object({
      firebaseId: z.string(),
      email: z.string().email(),
      name: z.string().optional(),
      role: z.enum(['ADMIN', 'CLIENT']).default('CLIENT'),
    })
  )
  .handler(async ({ input }): Promise<User> => {
    // TODO: Replace with actual database insert
    const newUser: User = {
      id: input.firebaseId,
      email: input.email,
      name: input.name || null,
      role: input.role,
      createdAt: new Date(),
      updatedAt: new Date(),
      clerkId: input.firebaseId,
      avatarUrl: null,
    };

    users.push(newUser);
    return newUser;
  });

/**
 * Update current user's profile
 */
export const updateCurrentUser = authenticatedProcedure
  .input(
    z.object({
      name: z.string().optional(),
    })
  )
  .handler(async ({ input, context }): Promise<User> => {
    // TODO: Replace with actual database update
    const userIndex = users.findIndex(u => u.id === context.userId);

    if (userIndex === -1) {
      throw new Error('User not found');
    }

    users[userIndex] = {
      ...users[userIndex],
      ...input,
      updatedAt: new Date(),
    };

    return users[userIndex];
  });

/**
 * Delete current user
 */
export const deleteCurrentUser = authenticatedProcedure.handler(
  async ({ context }): Promise<{ success: boolean }> => {
    // TODO: Replace with actual database delete
    const userIndex = users.findIndex(u => u.id === context.userId);

    if (userIndex === -1) {
      throw new Error('User not found');
    }

    users.splice(userIndex, 1);
    return { success: true };
  }
);
