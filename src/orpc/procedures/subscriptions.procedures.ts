import { z } from 'zod';
import { authenticatedProcedure } from '../base';
import type { Subscription } from '@ariexai/shared';
import { SubscriptionStatus, PlanType } from '@ariexai/shared';

// Mock data store - Replace with actual database calls
const subscriptions: Subscription[] = [];

/**
 * Get current user's subscription
 */
export const getCurrentSubscription = authenticatedProcedure.handler(
  async ({ context }): Promise<Subscription | null> => {
    // TODO: Replace with actual database query
    // For now, returning a mock subscription
    return subscriptions.find(s => s.userId === context.userId) || null;
  }
);

/**
 * Get subscription by ID
 */
export const getSubscription = authenticatedProcedure
  .input(
    z.object({
      id: z.string().uuid(),
    })
  )
  .handler(async ({ input, context }): Promise<Subscription> => {
    // TODO: Replace with actual database query
    const subscription = subscriptions.find(s => s.id === input.id && s.userId === context.userId);

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
      planType: z.nativeEnum(PlanType),
      stripeSubscriptionId: z.string().optional(),
      stripeCustomerId: z.string().optional(),
    })
  )
  .handler(async ({ input, context }): Promise<Subscription> => {
    // TODO: Replace with actual database insert and Stripe integration
    const newSubscription: Subscription = {
      id: crypto.randomUUID(),
      userId: context.userId,
      status: SubscriptionStatus.ACTIVE,
      planType: input.planType,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: input.stripeSubscriptionId || null,
      stripeCustomerId: input.stripeCustomerId || null,
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
      id: z.string().uuid(),
      status: z.nativeEnum(SubscriptionStatus).optional(),
      planType: z.nativeEnum(PlanType).optional(),
      cancelAtPeriodEnd: z.boolean().optional(),
    })
  )
  .handler(async ({ input, context }): Promise<Subscription> => {
    // TODO: Replace with actual database update
    const subscriptionIndex = subscriptions.findIndex(
      s => s.id === input.id && s.userId === context.userId
    );

    if (subscriptionIndex === -1) {
      throw new Error('Subscription not found');
    }

    const { id, ...updates } = input;
    subscriptions[subscriptionIndex] = {
      ...subscriptions[subscriptionIndex],
      ...updates,
      updatedAt: new Date(),
    };

    return subscriptions[subscriptionIndex];
  });

/**
 * Cancel subscription
 */
export const cancelSubscription = authenticatedProcedure
  .input(
    z.object({
      id: z.string().uuid(),
    })
  )
  .handler(async ({ input, context }): Promise<Subscription> => {
    // TODO: Replace with actual Stripe cancellation and database update
    const subscriptionIndex = subscriptions.findIndex(
      s => s.id === input.id && s.userId === context.userId
    );

    if (subscriptionIndex === -1) {
      throw new Error('Subscription not found');
    }

    subscriptions[subscriptionIndex] = {
      ...subscriptions[subscriptionIndex],
      cancelAtPeriodEnd: true,
      updatedAt: new Date(),
    };

    return subscriptions[subscriptionIndex];
  });
