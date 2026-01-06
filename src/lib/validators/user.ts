import { z } from 'zod';

/**
 * User validation schemas
 */

export const emailSchema = z
  .string({ required_error: 'Email is required' })
  .email('Please enter a valid email address');

export const userNameSchema = z
  .string({ required_error: 'Name is required' })
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters');

export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters');

export const userProfileSchema = z.object({
  id: z.string(),
  email: emailSchema,
  name: userNameSchema,
  image: z.string().url().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const updateUserProfileSchema = z.object({
  name: userNameSchema.optional(),
  image: z.string().url().optional(),
});

export const signUpSchema = z.object({
  email: emailSchema,
  name: userNameSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Type inference
export type UserProfile = z.infer<typeof userProfileSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
