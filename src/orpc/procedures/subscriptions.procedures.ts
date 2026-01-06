import { z } from 'zod';
import { authenticatedProcedure } from '../base';

// Local type definitions
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';
export type PlanType = 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';

export interface Subscription {
  id: string;
  userId: string;
  planType: PlanType;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Mock data store
const subscriptions: Subscription[] = [];

/**
 * Get current user's subscription
 */
export const getCurrentSubscription = authenticatedProcedure.handler(
  async ({ context }): Promise<Subscription | null> => {
    return subscriptions.find(s => s.userId === context.userId) || null;
  }
);

/**
 * Get subscription by ID
 */
export const getSubscription = authenticatedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }): Promise<Subscription> => {
    const subscription = subscriptions.find(
      s => s.id === input.id && s.userId === context.userId
    );
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    return subscription;
  });

/**
 * Create a new subscription
 */
export const createSubscription = authenticatedProcedure
  .input(
    z.object({
      planType: z.enum(['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE']),
    })
  )
  .handler(async ({ input, context }): Promise<Subscription> => {
    const newSubscription: Subscription = {
      id: `sub_${Date.now()}`,
      userId: context.userId,
      planType: input.planType,
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    subscriptions.push(newSubscription);
    return newSubscription;
  });

/**
 * Update subscription
 */
export const updateSubscription = authenticatedProcedure
  .input(
    z.object({
      id: z.string(),
      planType: z.enum(['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE']).optional(),
      status: z.enum(['ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING']).optional(),
    })
  )
  .handler(async ({ input, context }): Promise<Subscription> => {
    const index = subscriptions.findIndex(
      s => s.id === input.id && s.userId === context.userId
    );
    if (index === -1) {
      throw new Error('Subscription not found');
    }
    subscriptions[index] = {
      ...subscriptions[index],
      ...input,
      updatedAt: new Date(),
    };
    return subscriptions[index];
  });

/**
 * Cancel subscription
 */
export const cancelSubscription = authenticatedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }): Promise<Subscription> => {
    const index = subscriptions.findIndex(
      s => s.id === input.id && s.userId === context.userId
    );
    if (index === -1) {
      throw new Error('Subscription not found');
    }
    subscriptions[index] = {
      ...subscriptions[index],
      status: 'CANCELLED',
      endDate: new Date(),
      updatedAt: new Date(),
    };
    return subscriptions[index];
  });
