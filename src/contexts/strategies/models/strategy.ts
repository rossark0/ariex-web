import { z } from 'zod';

export const strategySchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  category: z.enum([
    'deduction',
    'credit',
    'deferral',
    'entity_structure',
    'retirement',
    'investment',
    'other',
  ]),
  estimatedSavings: z.number().min(0).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
});

export type StrategyDto = z.infer<typeof strategySchema>;

export const generateStrategySchema = z.object({
  userId: z.string(),
  includeDocuments: z.boolean().default(true),
});

export type GenerateStrategyDto = z.infer<typeof generateStrategySchema>;
