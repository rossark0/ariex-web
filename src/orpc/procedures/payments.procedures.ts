import { z } from 'zod';
import { authenticatedProcedure } from '../base';

export type Payment = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  paymentMethod: 'stripe' | 'coinbase';
  payLink?: string | null;
  createdAt: Date;
};

const payments: Payment[] = [];

/**
 * List payments
 */
export const listPayments = authenticatedProcedure.handler(async ({ context }) => {
  return payments.filter(p => p.userId === context.userId);
});

/**
 * Create payment intent (stub)
 */
export const createPayment = authenticatedProcedure
  .input(
    z.object({
      amount: z.number().positive(),
      currency: z.string().default('USD'),
      method: z.enum(['stripe', 'coinbase']),
    })
  )
  .handler(async ({ input, context }) => {
    const payment: Payment = {
      id: `pay_${Date.now()}`,
      userId: context.userId,
      amount: input.amount,
      currency: input.currency,
      status: 'PENDING',
      paymentMethod: input.method,
      payLink:
        input.method === 'stripe'
          ? 'https://checkout.stripe.com/test_session'
          : 'https://commerce.coinbase.com/checkout/test',
      createdAt: new Date(),
    };
    payments.push(payment);
    // Real impl: create Stripe/Coinbase resources
    return payment;
  });

/**
 * Update payment status (stub)
 */
export const updatePaymentStatus = authenticatedProcedure
  .input(
    z.object({ id: z.string(), status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']) })
  )
  .handler(async ({ input, context }) => {
    const idx = payments.findIndex(p => p.id === input.id && p.userId === context.userId);
    if (idx === -1) throw new Error('Payment not found');
    payments[idx] = { ...payments[idx], status: input.status };
    return payments[idx];
  });
