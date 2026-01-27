/**
 * Script to generate the Ariex Service Agreement DOCX template
 * with SignatureAPI placeholders.
 *
 * Run with: node scripts/generate-agreement-template.mjs
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateAgreementTemplate() {
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
              new TextRun({ text: '{{agreement_title}}' }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Date: ', bold: true }),
              new TextRun({ text: '{{date}}' }),
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
              new TextRun({ text: '{{strategist_name}}' }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Client: ', bold: true }),
              new TextRun({ text: '{{client_name}}' }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Client Email: ', bold: true }),
              new TextRun({ text: '{{client_email}}' }),
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
            text: '{{service_description}}',
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
              new TextRun({ text: '${{price}} USD', bold: true }),
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
              new TextRun({ text: '{{client_name}}' }),
            ],
            spacing: { after: 400 },
          }),

          // Strategist Signature (optional, can be pre-signed)
          new Paragraph({
            children: [
              new TextRun({ text: 'Tax Strategist: ', bold: true }),
              new TextRun({ text: '{{strategist_name}}' }),
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

  // Generate the DOCX file
  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(
    __dirname,
    '../public/templates/ariex-service-agreement-template.docx'
  );

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Template generated: ${outputPath}`);
  console.log('\nPlaceholders in the template:');
  console.log('  - {{agreement_title}}');
  console.log('  - {{date}}');
  console.log('  - {{strategist_name}}');
  console.log('  - {{client_name}}');
  console.log('  - {{client_email}}');
  console.log('  - {{service_description}}');
  console.log('  - {{price}}');
  console.log('  - [[client_signature]] (SignatureAPI signature field)');
  console.log('\nNext steps:');
  console.log('  1. Upload this file to S3 or a public URL');
  console.log('  2. Add the URL to AGREEMENT_TEMPLATE_URL in .env.local');
}

generateAgreementTemplate().catch(console.error);
