export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type SignatureStatus = 'NOT_SENT' | 'SENT' | 'SIGNED' | 'DECLINED' | 'EXPIRED';

/**
 * Acceptance status of a document by different parties
 */
export enum AcceptanceStatus {
  REJECTED_BY_COMPLIANCE = 'REJECTED_BY_COMPLIANCE',
  REJECTED_BY_STRATEGIST = 'REJECTED_BY_STRATEGIST',
  REJECTED_BY_CLIENT = 'REJECTED_BY_CLIENT',
  ACCEPTED_BY_COMPLIANCE = 'ACCEPTED_BY_COMPLIANCE',
  ACCEPTED_BY_STRATEGIST = 'ACCEPTED_BY_STRATEGIST',
  ACCEPTED_BY_CLIENT = 'ACCEPTED_BY_CLIENT',
  REQUEST_COMPLIANCE_ACCEPTANCE = 'REQUEST_COMPLIANCE_ACCEPTANCE',
  REQUEST_STRATEGIST_ACCEPTANCE = 'REQUEST_STRATEGIST_ACCEPTANCE',
  REQUEST_CLIENT_ACCEPTANCE = 'REQUEST_CLIENT_ACCEPTANCE',
}

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
