import { z } from 'zod';
import { authenticatedProcedure } from '../base';

// In-memory map of client profiles
const profiles = new Map<
  string,
  {
    phoneNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    onboardingComplete?: boolean;
  }
>();

/**
 * Get current client's profile
 */
export const getProfile = authenticatedProcedure.handler(async ({ context }) => {
  return (
    profiles.get(context.userId) ?? {
      onboardingComplete: false,
    }
  );
});

/**
 * Update profile fields
 */
export const updateProfile = authenticatedProcedure
  .input(
    z.object({
      phoneNumber: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
    })
  )
  .handler(async ({ input, context }) => {
    const current = profiles.get(context.userId) ?? {};
    const next = { ...current, ...input };
    profiles.set(context.userId, next);
    return next;
  });

/**
 * Mark onboarding complete
 */
export const completeOnboarding = authenticatedProcedure.handler(async ({ context }) => {
  const current = profiles.get(context.userId) ?? {};
  const next = { ...current, onboardingComplete: true };
  profiles.set(context.userId, next);
  return next;
});
