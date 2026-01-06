import { NextRequest } from 'next/server';

const SIGNATURE_API_KEY = process.env.SIGNATURE_API_KEY || '';
const SIGNATURE_API_BASE = process.env.SIGNATURE_API_BASE || 'https://api.signatureapi.com';

type CreateEnvelopeParams = {
  title: string;
};

type UploadParams = {
  fileName: string;
  fileUrl: string;
};

type CreateRecipientParams = {
  name: string;
  email: string;
  role?: 'signer' | 'cc';
};

type CeremonyParams = {
  envelopeId: string;
  recipientId: string;
  redirectUrl?: string;
};

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${SIGNATURE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SIGNATURE_API_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SignatureAPI error ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Create a simple envelope with one uploaded document and one signer.
 * Based on SignatureAPI concepts: envelope → recipient → upload → ceremony.
 * Docs: https://signatureapi.com/docs/api/welcome
 */
export async function createEnvelopeWithUploadAndRecipient(params: {
  envelope: CreateEnvelopeParams;
  upload: UploadParams;
  recipient: CreateRecipientParams;
  redirectUrl?: string;
}): Promise<{ envelopeId: string; recipientId: string; ceremonyUrl?: string }> {
  const envelope = await api('/envelopes', {
    method: 'POST',
    body: JSON.stringify({ title: params.envelope.title }),
  });

  const envelopeId = envelope.id;

  await api(`/envelopes/${envelopeId}/uploads`, {
    method: 'POST',
    body: JSON.stringify({ fileName: params.upload.fileName, fileUrl: params.upload.fileUrl }),
  });

  const recipient = await api(`/envelopes/${envelopeId}/recipients`, {
    method: 'POST',
    body: JSON.stringify({
      name: params.recipient.name,
      email: params.recipient.email,
      role: params.recipient.role ?? 'signer',
    }),
  });

  const recipientId = recipient.id;

  const ceremony = await api(`/ceremonies`, {
    method: 'POST',
    body: JSON.stringify({
      envelopeId,
      recipientId,
      redirectUrl: params.redirectUrl,
    }),
  });

  return { envelopeId, recipientId, ceremonyUrl: ceremony.url };
}

/**
 * Minimal webhook signature parser placeholder.
 * In production, verify using SignatureAPI's recommended scheme (if provided).
 */
export function parseSignatureWebhook(req: NextRequest): Promise<any> {
  return req.json();
}
