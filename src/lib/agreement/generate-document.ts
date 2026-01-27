'use server';

/**
 * Server-side service to generate agreement DOCX documents dynamically
 * and upload them to S3 for SignatureAPI to access.
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { getUploadUrl, confirmUpload } from '@/lib/api/strategist.api';

// ============================================================================
// Types
// ============================================================================

export interface AgreementDocumentData {
  agreementTitle: string;
  date: string;
  strategistName: string;
  clientName: string;
  clientEmail: string;
  serviceDescription: string;
  price: number;
}

export interface GeneratedDocument {
  fileId: string;
  downloadUrl: string;
}

// ============================================================================
// Generate Agreement Document
// ============================================================================

/**
 * Generate a DOCX agreement document with the provided data,
 * upload it to S3, and return the public URL.
 */
export async function generateAndUploadAgreement(
  data: AgreementDocumentData
): Promise<GeneratedDocument> {
  // 1. Generate the DOCX document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header / Title
          new Paragraph({
            text: 'ARIEX TAX ADVISORY',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: 'SERVICE AGREEMENT',
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Agreement Details Section
          new Paragraph({
            children: [
              new TextRun({ text: 'Agreement Title: ', bold: true }),
              new TextRun({ text: data.agreementTitle }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Date: ', bold: true }),
              new TextRun({ text: data.date }),
            ],
            spacing: { after: 200 },
          }),

          // Parties Section
          new Paragraph({
            text: 'PARTIES',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Tax Strategist: ', bold: true }),
              new TextRun({ text: data.strategistName }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Client: ', bold: true }),
              new TextRun({ text: data.clientName }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Client Email: ', bold: true }),
              new TextRun({ text: data.clientEmail }),
            ],
            spacing: { after: 200 },
          }),

          // Service Description
          new Paragraph({
            text: 'SERVICE DESCRIPTION',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: data.serviceDescription,
            spacing: { after: 200 },
          }),

          // Service Fee
          new Paragraph({
            text: 'SERVICE FEE',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Total Fee: ', bold: true }),
              new TextRun({ text: `$${data.price.toLocaleString()} USD`, bold: true }),
            ],
            spacing: { after: 200 },
          }),

          // Terms and Conditions
          new Paragraph({
            text: 'TERMS AND CONDITIONS',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: '1. The Tax Strategist agrees to provide professional tax advisory services as described above.',
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: '2. The Client agrees to provide accurate and complete financial information as requested.',
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: '3. Payment is due upon signing of this agreement.',
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: '4. This agreement is valid for the current tax year unless otherwise specified.',
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: '5. Confidentiality: All information shared will be kept strictly confidential.',
            spacing: { after: 200 },
          }),

          // Signature Section
          // new Paragraph({
          //   text: 'SIGNATURES',
          //   heading: HeadingLevel.HEADING_3,
          //   spacing: { before: 400, after: 200 },
          // }),
          // new Paragraph({
          //   text: 'By signing below, both parties agree to the terms and conditions outlined in this agreement.',
          //   spacing: { after: 400 },
          // }),

          // Client Signature - SignatureAPI placeholder
          new Paragraph({
            children: [new TextRun({ text: 'Client Signature: ', bold: true })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: '[[client_signature]]',
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Signed by: ', italics: true }),
              new TextRun({ text: data.clientName }),
            ],
            spacing: { after: 400 },
          }),

          // Strategist info
          new Paragraph({
            children: [
              new TextRun({ text: 'Tax Strategist: ', bold: true }),
              new TextRun({ text: data.strategistName }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Ariex Tax Advisory' })],
          }),
        ],
      },
    ],
  });

  // 2. Convert to buffer
  const buffer = await Packer.toBuffer(doc);
  const uint8Array = new Uint8Array(buffer);

  // 3. Get presigned upload URL from backend
  const fileName = `agreement-${data.clientName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.docx`;
  const uploadResult = await getUploadUrl({
    fileName,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: buffer.byteLength,
  });

  if (!uploadResult) {
    throw new Error('Failed to get upload URL from S3');
  }

  console.log('[AgreementDocument] Upload URL received:', uploadResult.uploadUrl);
  console.log('[AgreementDocument] File ID:', uploadResult.fileId);
  console.log('[AgreementDocument] Buffer size:', buffer.byteLength);

  // 4. Upload to S3
  const uploadResponse = await fetch(uploadResult.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    body: uint8Array,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('[AgreementDocument] S3 upload failed:', uploadResponse.status, errorText);
    throw new Error(`Failed to upload document to S3: ${uploadResponse.status}`);
  }

  // 5. Confirm upload
  const confirmed = await confirmUpload(uploadResult.fileId);
  if (!confirmed) {
    throw new Error('Failed to confirm upload');
  }

  // 6. Get download URL for SignatureAPI to access
  const { getDownloadUrl } = await import('@/lib/api/strategist.api');
  const downloadUrl = await getDownloadUrl(uploadResult.fileId);

  if (!downloadUrl) {
    throw new Error('Failed to get download URL');
  }

  console.log('[AgreementDocument] Generated and uploaded:', fileName, uploadResult.fileId);

  return {
    fileId: uploadResult.fileId,
    downloadUrl,
  };
}
