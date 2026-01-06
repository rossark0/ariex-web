import { z } from 'zod';

export const clientProfileSchema = z.object({
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  taxId: z.string().optional(),
  businessName: z.string().optional(),
  filingStatus: z.string().optional(),
  dependents: z.number().int().min(0).optional(),
  estimatedIncome: z.number().min(0).optional(),
  businessType: z.string().optional(),
});

export type ClientProfileDto = z.infer<typeof clientProfileSchema>;

export const onboardingSchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().length(2, 'State must be 2 characters'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  taxId: z.string().optional(),
  filingStatus: z.enum(['single', 'married_joint', 'married_separate', 'head_of_household']),
  dependents: z.number().int().min(0),
  estimatedIncome: z.number().min(0),
  businessType: z.string().optional(),
});

export type OnboardingDto = z.infer<typeof onboardingSchema>;
