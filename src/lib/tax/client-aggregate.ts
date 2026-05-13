'use server';

/**
 * Server-side aggregator that pulls the FULL picture of a client in one
 * round trip from the strategist's session: profile, documents, agreements.
 *
 * Used by the scenario workspace's "Generate from client" flow — feeds the
 * AI model enough context to propose tax strategies tailored to the actual
 * client situation (W-2 vs SE income, prior filings on hand, business
 * entity type, payment / agreement status).
 */

import {
  getClientById,
  listClientAgreements,
  listClientDocuments,
  type ApiAgreement,
  type ApiClient,
  type ApiDocument,
} from '@/lib/api/strategist.api';

export interface ClientAggregate {
  client: ApiClient | null;
  documents: ApiDocument[];
  agreements: ApiAgreement[];
}

/**
 * Fetches profile + documents + agreements for a client in parallel.
 * Tolerant to partial failures — returns what we got, logs the rest.
 */
export async function fetchClientAggregate(clientId: string): Promise<ClientAggregate> {
  const [clientRes, docsRes, agreementsRes] = await Promise.allSettled([
    getClientById(clientId),
    listClientDocuments(clientId),
    listClientAgreements(clientId),
  ]);

  const client = clientRes.status === 'fulfilled' ? clientRes.value : null;
  const documents = docsRes.status === 'fulfilled' ? docsRes.value : [];
  const agreements =
    agreementsRes.status === 'fulfilled' ? agreementsRes.value : [];

  if (clientRes.status === 'rejected') {
    console.error('[ClientAggregate] getClientById failed:', clientRes.reason);
  }
  if (docsRes.status === 'rejected') {
    console.error('[ClientAggregate] listClientDocuments failed:', docsRes.reason);
  }
  if (agreementsRes.status === 'rejected') {
    console.error('[ClientAggregate] listClientAgreements failed:', agreementsRes.reason);
  }

  return { client, documents, agreements };
}
