import { z } from 'zod';
import { authenticatedProcedure, adminProcedure } from '../base';

// Simple in-memory stores for POC
const clients: Array<{ id: string; email: string; name: string | null; createdAt: Date }> = [];

/**
 * List all clients (admin only)
 */
export const listClients = adminProcedure.handler(async () => {
  return clients;
});

/**
 * Create/invite a client (admin only)
 */
export const inviteClient = adminProcedure
  .input(
    z.object({
      email: z.string().email(),
      name: z.string().min(2).optional(),
    })
  )
  .handler(async ({ input }) => {
    const newClient = {
      id: `cli_${Date.now()}`,
      email: input.email,
      name: input.name ?? null,
      createdAt: new Date(),
    };
    clients.push(newClient);
    // In real impl: send email invite + create Firebase user + DB record
    return newClient;
  });

/**
 * Get high-level admin stats
 */
export const getAdminStats = authenticatedProcedure.handler(async () => {
  // Note: no auth role check here; keep simple for POC. Use adminProcedure if needed.
  return {
    totalClients: clients.length,
    totalDocuments: 0,
    totalRevenue: 0,
  };
});
