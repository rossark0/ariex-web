import { NextRequest, NextResponse } from 'next/server';
import { parseSignatureWebhook } from '@/lib/signature/signatureapi';

export async function POST(req: NextRequest) {
  // TODO: Verify webhook signature per SignatureAPI guidelines
  const event = await parseSignatureWebhook(req);
  // For now, just acknowledge receipt
  return NextResponse.json({ received: true, type: event?.type ?? null });
}
