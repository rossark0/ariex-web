import { z } from 'zod';

export const createPaymentSchema = z.object({
  amount: z.number().min(0.5, 'Minimum payment is $0.50'),
  currency: z.string().default('USD'),
  description: z.string().optional(),
  paymentMethod: z.enum(['stripe', 'coinbase']),
});

export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;

export const paymentStatusSchema = z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']);

export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
