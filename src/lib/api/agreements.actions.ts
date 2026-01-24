'use server';

import { createEnvelopeWithCeremony } from '@/lib/signature/signatureapi';
import {
  createAgreement,
  createTodoList,
  createTodo,
  createDocument,
  confirmDocumentUpload,
  attachContract,
  getClientById,
  getCurrentUser,
  updateAgreementSignature,
} from '@/lib/api/strategist.api';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

// ============================================================================
// Types
// ============================================================================

export interface SendAgreementResult {
  success: boolean;
  agreementId?: string;
  ceremonyUrl?: string;
  error?: string;
}

// ============================================================================
// Generate Agreement DOCX
// ============================================================================

async function generateAgreementDocx(data: {
  agreementTitle: string;
  date: string;
  strategistName: string;
  clientName: string;
  clientEmail: string;
  serviceDescription: string;
  price: number;
}): Promise<Uint8Array> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
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
          new Paragraph({
            text: 'SERVICE DESCRIPTION',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: data.serviceDescription,
            spacing: { after: 200 },
          }),
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
          new Paragraph({
            text: 'SIGNATURES',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: 'By signing below, both parties agree to the terms and conditions outlined in this agreement.',
            spacing: { after: 400 },
          }),
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

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

// ============================================================================
// Send Agreement Action
// ============================================================================

/**
 * Main action to send an agreement to a client
 *
 * Flow (updated - SignatureAPI first):
 * 1. Create SignatureAPI envelope FIRST to get ceremonyUrl
 * 2. Create agreement in backend with ceremonyUrl in description metadata
 * 3. Create todo list for the agreement
 * 4. Create todo for signing the contract
 * 5. Create document (type: AGREEMENT) with todoId → returns uploadUrl
 * 6. Generate DOCX and upload to S3
 * 7. Confirm document upload
 * 8. Attach contract to agreement
 * 9. Create additional custom todos
 */
export async function sendAgreementToClient(params: {
  clientId: string;
  customTitle?: string;
  description?: string;
  price?: number;
  todos?: Array<{ title: string; description?: string }>;
  redirectUrl?: string;
}): Promise<SendAgreementResult> {
  const {
    clientId,
    customTitle = 'Ariex Tax Advisory Service Agreement 2024',
    description = 'Comprehensive tax advisory services including strategy development, filing support, and ongoing optimization.',
    price = 499,
    todos = [],
    redirectUrl,
  } = params;

  try {
    // 1. Get client details
    const client = await getClientById(clientId);
    if (!client) {
      return { success: false, error: 'Client not found' };
    }

    if (!client.email) {
      return { success: false, error: 'Client email not found' };
    }

    const agreementTitle = customTitle;
    const clientName = client.name || client.fullName || client.email.split('@')[0];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Get strategist info
    let strategistName = 'Ariex Tax Strategist';
    try {
      const currentUser = await getCurrentUser();
      if (currentUser?.name) {
        strategistName = currentUser.name;
      }
    } catch {
      // Use default name
    }

    // 2. Create SignatureAPI envelope with ceremony URL
    console.log('[Agreements] Step 1: Creating SignatureAPI envelope with ceremony');
    const signatureResult = await createEnvelopeWithCeremony({
      title: agreementTitle,
      documentUrl: 'https://pub-9cb75390636c4a8a83a6f76da33d7f45.r2.dev/privacy-placeholder.pdf',
      recipient: {
        name: clientName,
        email: client.email,
      },
      redirectUrl: redirectUrl || `${baseUrl}/client/agreements?signed=true`,
      metadata: {
        clientId,
        agreementTitle,
      },
    });
    console.log('[Agreements] SignatureAPI envelope created:', signatureResult.envelopeId);
    console.log('[Agreements] Ceremony URL:', signatureResult.ceremonyUrl);

    // 3. Build description with signature metadata embedded
    const signatureMetadata = {
      envelopeId: signatureResult.envelopeId,
      recipientId: signatureResult.recipientId,
      ceremonyUrl: signatureResult.ceremonyUrl,
      createdAt: new Date().toISOString(),
    };
    const descriptionWithMetadata = `${description}\n\n__SIGNATURE_METADATA__:${JSON.stringify(signatureMetadata)}`;

    // 4. Create agreement in backend WITH signature metadata in description
    console.log('[Agreements] Step 2: Creating agreement in backend');
    const agreement = await createAgreement({
      name: agreementTitle,
      description: descriptionWithMetadata,
      clientId,
      price,
    });

    if (!agreement) {
      return { success: false, error: 'Failed to create agreement in backend' };
    }
    console.log('[Agreements] Agreement created:', agreement.id);

    // 5. Create todo list for the agreement
    // Note: When agreementId is provided, the backend auto-assigns the client from the agreement
    console.log('[Agreements] Step 3: Creating todo list');
    const todoList = await createTodoList({
      name: 'Contract Documents',
      agreementId: agreement.id,
    });

    if (!todoList) {
      return { success: false, error: 'Failed to create todo list' };
    }
    console.log('[Agreements] Todo list created:', todoList.id);

    // 6. Create todo for signing the contract
    console.log('[Agreements] Step 4: Creating signing todo');
    const signingTodo = await createTodo({
      title: 'Sign service agreement',
      description: `Please review and sign the ${agreementTitle}. You will receive an email with a link to sign electronically.`,
      todoListId: todoList.id,
    });

    if (!signingTodo) {
      return { success: false, error: 'Failed to create signing todo' };
    }
    console.log('[Agreements] Signing todo created:', signingTodo.id);

    // 7. Generate the DOCX document
    console.log('[Agreements] Step 5: Generating DOCX document');
    const docxBuffer = await generateAgreementDocx({
      agreementTitle,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      strategistName,
      clientName,
      clientEmail: client.email,
      serviceDescription: description,
      price,
    });
    console.log('[Agreements] DOCX generated, size:', docxBuffer.length);

    // 6. Create document record with todoId → get uploadUrl
    console.log('[Agreements] Step 5: Creating document record');
    const fileName = `agreement-${clientName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.docx`;
    const documentRecord = await createDocument({
      type: 'AGREEMENT',
      fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: docxBuffer.length,
      agreementId: agreement.id,
      todoId: signingTodo.id,
      clientId: clientId, // Required for backend validation
    });

    if (!documentRecord || !documentRecord.uploadUrl) {
      return { success: false, error: 'Failed to create document record' };
    }
    console.log('[Agreements] Document record created:', documentRecord.id);

    // 7. Upload to S3
    console.log('[Agreements] Step 6: Uploading to S3');
    const uploadResponse = await fetch(documentRecord.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
      body: docxBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[Agreements] S3 upload failed:', uploadResponse.status, errorText);
      return { success: false, error: `S3 upload failed: ${uploadResponse.status}` };
    }
    console.log('[Agreements] S3 upload successful');

    // 8. Confirm document upload
    console.log('[Agreements] Step 6: Confirming document upload');
    const confirmed = await confirmDocumentUpload(documentRecord.id);
    if (!confirmed) {
      return { success: false, error: 'Failed to confirm document upload' };
    }
    console.log('[Agreements] Document upload confirmed');

    // 9. Attach contract to agreement
    console.log('[Agreements] Step 7: Attaching contract to agreement');
    const attached = await attachContract(agreement.id, documentRecord.id);
    if (!attached) {
      console.warn('[Agreements] Failed to attach contract - continuing anyway');
    }

    // 10. Create custom todos if any
    for (const todo of todos) {
      try {
        await createTodo({
          title: todo.title,
          description: todo.description,
          todoListId: todoList.id,
        });
        console.log('[Agreements] Created custom todo:', todo.title);
      } catch (e) {
        console.error('[Agreements] Failed to create custom todo:', todo.title, e);
      }
    }

    console.log('[Agreements] ✅ Agreement flow completed successfully');

    return {
      success: true,
      agreementId: agreement.id,
      ceremonyUrl: signatureResult.ceremonyUrl,
    };
  } catch (error) {
    console.error(
      '[Agreements] sendAgreementToClient error:',
      error instanceof Error ? error.message : error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Resend an agreement that was already created
 */
export async function resendAgreement(agreementId: string): Promise<SendAgreementResult> {
  return {
    success: false,
    error: 'Resend not yet implemented - please create a new agreement',
  };
}
