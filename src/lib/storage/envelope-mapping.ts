'use server';

import { cookies } from 'next/headers';

/**
 * Simple server-side storage for agreement-to-envelope mapping
 * This bridges the gap when the backend doesn't store SignatureAPI envelope IDs
 * 
 * In production, this should be stored in a proper database
 * For now, we use cookies/localStorage as a workaround
 */

interface EnvelopeMapping {
  agreementId: string;
  envelopeId: string;
  recipientId: string;
  ceremonyUrl: string;
  createdAt: string;
}

const COOKIE_NAME = 'ariex_envelope_mappings';

/**
 * Store envelope mapping
 */
export async function storeEnvelopeMapping(mapping: Omit<EnvelopeMapping, 'createdAt'>): Promise<void> {
  try {
    const cookieStore = await cookies();
    const existing = cookieStore.get(COOKIE_NAME)?.value;
    
    let mappings: EnvelopeMapping[] = [];
    if (existing) {
      try {
        mappings = JSON.parse(existing);
      } catch {
        mappings = [];
      }
    }
    
    // Remove any existing mapping for this agreement
    mappings = mappings.filter(m => m.agreementId !== mapping.agreementId);
    
    // Add new mapping
    mappings.push({
      ...mapping,
      createdAt: new Date().toISOString(),
    });
    
    // Keep only last 50 mappings to avoid cookie size issues
    if (mappings.length > 50) {
      mappings = mappings.slice(-50);
    }
    
    cookieStore.set(COOKIE_NAME, JSON.stringify(mappings), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    
    console.log('[EnvelopeMapping] Stored mapping for agreement:', mapping.agreementId);
  } catch (error) {
    console.error('[EnvelopeMapping] Failed to store mapping:', error);
  }
}

/**
 * Get envelope mapping by agreement ID
 */
export async function getEnvelopeMapping(agreementId: string): Promise<EnvelopeMapping | null> {
  try {
    const cookieStore = await cookies();
    const existing = cookieStore.get(COOKIE_NAME)?.value;
    
    if (!existing) {
      return null;
    }
    
    const mappings: EnvelopeMapping[] = JSON.parse(existing);
    return mappings.find(m => m.agreementId === agreementId) || null;
  } catch (error) {
    console.error('[EnvelopeMapping] Failed to get mapping:', error);
    return null;
  }
}

/**
 * Get all envelope mappings
 */
export async function getAllEnvelopeMappings(): Promise<EnvelopeMapping[]> {
  try {
    const cookieStore = await cookies();
    const existing = cookieStore.get(COOKIE_NAME)?.value;
    
    if (!existing) {
      return [];
    }
    
    return JSON.parse(existing);
  } catch (error) {
    console.error('[EnvelopeMapping] Failed to get mappings:', error);
    return [];
  }
}

/**
 * Remove envelope mapping
 */
export async function removeEnvelopeMapping(agreementId: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    const existing = cookieStore.get(COOKIE_NAME)?.value;
    
    if (!existing) {
      return;
    }
    
    let mappings: EnvelopeMapping[] = JSON.parse(existing);
    mappings = mappings.filter(m => m.agreementId !== agreementId);
    
    cookieStore.set(COOKIE_NAME, JSON.stringify(mappings), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });
  } catch (error) {
    console.error('[EnvelopeMapping] Failed to remove mapping:', error);
  }
}
