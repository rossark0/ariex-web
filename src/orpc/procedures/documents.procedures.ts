import { z } from 'zod';
import { authenticatedProcedure } from '../base';
import { getPresignedPutUrl, getPresignedGetUrl } from '@/lib/storage/s3';

// In-memory list
const documents: Array<{
  id: string;
  userId: string;
  originalName: string;
  key?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  category?: string | null;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  signedUrl?: string | null;
  createdAt: Date;
}> = [];

/**
 * List documents for current user
 */
export const listDocuments = authenticatedProcedure.handler(async ({ context }) => {
  return documents.filter(d => d.userId === context.userId);
});

/**
 * Get single document
 */
export const getDocument = authenticatedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }) => {
    const doc = documents.find(d => d.id === input.id && d.userId === context.userId);
    if (!doc) throw new Error('Document not found');
    return doc;
  });

/**
 * Create presigned URL for direct upload to S3
 */
export const createUploadUrl = authenticatedProcedure
  .input(z.object({ originalName: z.string().min(1), mimeType: z.string().min(1) }))
  .handler(async ({ input }) => {
    const { key, url } = await getPresignedPutUrl(input.originalName, input.mimeType);
    return { key, url };
  });

/**
 * Finalize upload: persist metadata (POC in-memory store)
 */
export const finalizeUpload = authenticatedProcedure
  .input(
    z.object({
      key: z.string(),
      originalName: z.string().min(1),
      mimeType: z.string().min(1),
      fileSize: z.number().int().positive(),
      category: z.string().optional(),
    })
  )
  .handler(async ({ input, context }) => {
    const doc = {
      id: `doc_${Date.now()}`,
      userId: context.userId,
      originalName: input.originalName,
      key: input.key,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      category: input.category ?? null,
      status: 'PENDING' as const,
      signedUrl: null,
      createdAt: new Date(),
    };
    documents.push(doc);
    return doc;
  });

/**
 * Delete document
 */
export const deleteDocument = authenticatedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }) => {
    const idx = documents.findIndex(d => d.id === input.id && d.userId === context.userId);
    if (idx === -1) throw new Error('Document not found');
    documents.splice(idx, 1);
    return { success: true };
  });

/**
 * Request signature (stub): would call SignatureAPI to create envelope and ceremony URL.
 * For now, returns a placeholder ceremony URL and stores it.
 */
export const requestSignature = authenticatedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }) => {
    const doc = documents.find(d => d.id === input.id && d.userId === context.userId);
    if (!doc) throw new Error('Document not found');
    // Placeholder signed URL for viewing; real flow will use SignatureAPI ceremony URL
    const viewUrl = doc.key ? await getPresignedGetUrl(doc.key) : null;
    return { success: true, envelopeId: `env_${Date.now()}`, ceremonyUrl: viewUrl };
  });

export const uploadDocument = finalizeUpload;
