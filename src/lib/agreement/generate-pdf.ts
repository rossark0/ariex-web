'use server';

/**
 * Server-side service to generate agreement PDF documents
 * for SignatureAPI to use for digital signing.
 * 
 * Uses jsPDF which works better in Node.js environments.
 */

import { jsPDF } from 'jspdf';

// ============================================================================
// Types
// ============================================================================

export interface AgreementPdfData {
  agreementTitle: string;
  date: string;
  strategistName: string;
  clientName: string;
  clientEmail: string;
  strategies: Array<{
    name: string;
    description?: string;
    estimatedSavings?: number;
  }>;
  totalSavings: number;
  serviceFee: number;
}

// ============================================================================
// PDF Generation
// ============================================================================

/**
 * Generate a PDF agreement document with the provided data.
 * Returns the PDF as a Uint8Array buffer.
 */
export async function generateAgreementPdf(data: AgreementPdfData): Promise<Uint8Array> {
  // Create new PDF document (letter size)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 72; // 1 inch
  const contentWidth = pageWidth - 2 * margin;
  let y = 72;

  // Helper functions
  const addTitle = (text: string, size: number = 18) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.text(text, pageWidth / 2, y, { align: 'center' });
    y += size + 8;
  };

  const addHeading = (text: string) => {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin, y);
    y += 20;
  };

  const addText = (text: string, options: { bold?: boolean; indent?: number } = {}) => {
    const { bold = false, indent = 0 } = options;
    doc.setFontSize(11);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    
    // Word wrap
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    doc.text(lines, margin + indent, y);
    y += lines.length * 14;
  };

  const addSpace = (n: number = 1) => {
    y += 14 * n;
  };

  // ============== Document Content ==============

  // Header
  addTitle('ARIEX TAX ADVISORY', 18);
  addTitle('SERVICE AGREEMENT', 14);
  addSpace(2);

  // Agreement info
  addText(`Agreement: ${data.agreementTitle}`);
  addText(`Date: ${data.date}`);
  addSpace(2);

  // Parties
  addHeading('PARTIES');
  addText(`Tax Strategist: ${data.strategistName}`);
  addText(`Client: ${data.clientName}`);
  addText(`Email: ${data.clientEmail}`);
  addSpace(2);

  // Strategies
  addHeading('TAX STRATEGIES');
  
  data.strategies.forEach((strategy, i) => {
    addText(`${i + 1}. ${strategy.name}`, { bold: true, indent: 10 });
    if (strategy.description) {
      addText(strategy.description, { indent: 20 });
    }
    if (strategy.estimatedSavings) {
      addText(`Estimated Savings: $${strategy.estimatedSavings.toLocaleString()}`, { indent: 20 });
    }
    addSpace(0.5);
  });

  addSpace(1);

  // Financial Summary
  addHeading('FINANCIAL SUMMARY');
  addText(`Total Estimated Tax Savings: $${data.totalSavings.toLocaleString()}`, { bold: true });
  addText(`Service Fee: $${data.serviceFee.toLocaleString()}`, { bold: true });
  addSpace(2);

  // Terms
  addHeading('TERMS AND CONDITIONS');
  const terms = [
    '1. The Tax Strategist agrees to provide professional tax advisory services.',
    '2. The Client agrees to provide accurate financial information.',
    '3. Payment is due upon signing of this agreement.',
    '4. This agreement is valid for the current tax year.',
    '5. All information shared will be kept strictly confidential.',
  ];
  terms.forEach(term => {
    addText(term);
  });

  addSpace(2);

  // Signature
  addHeading('SIGNATURES');
  addText('By signing below, both parties agree to these terms.');
  addSpace(2);

  addText('Client Signature:', { bold: true });
  addSpace(2);
  
  // Draw signature line
  doc.setDrawColor(0);
  doc.line(margin, y, margin + 200, y);
  addSpace(1);
  
  addText(`Name: ${data.clientName}`);
  addSpace(2);

  addText('Tax Strategist:', { bold: true });
  addText(data.strategistName);
  addText('Ariex Tax Advisory');

  // Get PDF as array buffer
  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}
