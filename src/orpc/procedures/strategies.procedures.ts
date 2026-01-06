import { z } from 'zod';
import { authenticatedProcedure } from '../base';

export type Strategy = {
  id: string;
  userId: string;
  title: string;
  description: string;
  category:
    | 'deduction'
    | 'credit'
    | 'deferral'
    | 'entity_structure'
    | 'retirement'
    | 'investment'
    | 'other';
  estimatedSavings?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  implemented: boolean;
  createdAt: Date;
};

const strategies: Strategy[] = [];

/**
 * List strategies for current user
 */
export const listStrategies = authenticatedProcedure.handler(async ({ context }) => {
  return strategies.filter(s => s.userId === context.userId);
});

/**
 * Generate strategies (stub)
 */
export const generateStrategies = authenticatedProcedure
  .input(z.object({ count: z.number().int().min(1).max(5).default(3) }))
  .handler(async ({ input, context }) => {
    const generated: Strategy[] = Array.from({ length: input.count }).map((_, idx) => ({
      id: `str_${Date.now()}_${idx}`,
      userId: context.userId,
      title: `Strategy ${idx + 1}`,
      description: 'Generated strategy description (stub).',
      category: 'deduction',
      estimatedSavings: Math.round(Math.random() * 5000) + 500,
      priority: 'medium',
      implemented: false,
      createdAt: new Date(),
    }));

    strategies.push(...generated);
    return generated;
  });

/**
 * Update strategy
 */
export const updateStrategy = authenticatedProcedure
  .input(
    z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      implemented: z.boolean().optional(),
    })
  )
  .handler(async ({ input, context }) => {
    const idx = strategies.findIndex(s => s.id === input.id && s.userId === context.userId);
    if (idx === -1) throw new Error('Strategy not found');
    strategies[idx] = { ...strategies[idx], ...input };
    return strategies[idx];
  });
