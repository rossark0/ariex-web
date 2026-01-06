export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type SignatureStatus = 'NOT_SENT' | 'SENT' | 'SIGNED' | 'DECLINED' | 'EXPIRED';

export interface Document {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  category: string | null;
  taxYear: number | null;
  status: DocumentStatus;
  aiSummary: string | null;
  aiInsights: Record<string, any> | null;
  extractedData: Record<string, any> | null;
  signatureStatus: SignatureStatus;
  envelopeId: string | null;
  signedAt: Date | null;
  signedDocUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
