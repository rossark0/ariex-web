import { z } from 'zod';

export const documentUploadSchema = z.object({
  file: z.instanceof(File),
  category: z.string().optional(),
  taxYear: z.number().int().min(2000).max(2100).optional(),
});

export type DocumentUploadDto = z.infer<typeof documentUploadSchema>;

export const documentCategorySchema = z.enum([
  'w2',
  '1099',
  '1040',
  'schedule_c',
  'receipt',
  'invoice',
  'contract',
  'bank_statement',
  'investment_statement',
  'other',
]);

export type DocumentCategory = z.infer<typeof documentCategorySchema>;

export const documentStatusSchema = z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']);

export type DocumentStatus = z.infer<typeof documentStatusSchema>;

export const signatureStatusSchema = z.enum(['NOT_SENT', 'SENT', 'SIGNED', 'DECLINED', 'EXPIRED']);

export type SignatureStatus = z.infer<typeof signatureStatusSchema>;
