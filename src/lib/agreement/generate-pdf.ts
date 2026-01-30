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

export interface SignatureField {
  id: string;
  role: string;
  label: string;
}

export interface Page {
  id: string;
  content: string;
  signatureFields: SignatureField[];
}

export interface AgreementFromEditorData {
  title: string;
  pages: Page[];
  clientName: string;
  strategistName: string;
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
  // addHeading('SIGNATURES');
  // addText('By signing below, both parties agree to these terms.');
  // addSpace(2);

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

// ============================================================================
// HTML to Text Parser (for Tiptap content)
// ============================================================================

interface ParsedElement {
  type: 'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'list-item' | 'hr' | 'space';
  text?: string;
  bold?: boolean;
  items?: string[];
  ordered?: boolean;
}

/**
 * Parse HTML content from Tiptap editor into structured elements
 */
function parseHtmlContent(html: string): ParsedElement[] {
  const elements: ParsedElement[] = [];
  
  // Handle null/undefined
  if (!html) return elements;
  
  // Remove extra whitespace and normalize
  const cleanHtml = html.replace(/\s+/g, ' ').trim();
  
  // Split by tags while preserving content
  // Use regex to find each block element
  const blockPattern = /<(h[1-3]|p|ul|ol|hr|li)[^>]*>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;
  
  let match;
  let lastIndex = 0;
  
  // Helper to strip HTML tags and decode entities
  const stripTags = (str: string): string => {
    if (!str) return '';
    return str
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  };
  
  // Check if text contains <strong> tags
  const hasBold = (str: string): boolean => {
    if (!str) return false;
    return /<strong>|<b>/i.test(str);
  };
  
  // Process the HTML
  const processBlock = (tagName: string, content: string) => {
    const text = stripTags(content);
    if (!text && tagName !== 'hr') return;
    
    switch (tagName.toLowerCase()) {
      case 'h1':
        elements.push({ type: 'heading1', text, bold: true });
        break;
      case 'h2':
        elements.push({ type: 'heading2', text, bold: true });
        break;
      case 'h3':
        elements.push({ type: 'heading3', text, bold: true });
        break;
      case 'p':
        elements.push({ type: 'paragraph', text, bold: hasBold(content) });
        break;
      case 'li':
        elements.push({ type: 'list-item', text });
        break;
      case 'hr':
        elements.push({ type: 'hr' });
        break;
    }
  };
  
  // Find all ul/ol lists and process their items
  const listPattern = /<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi;
  let processedHtml = cleanHtml;
  
  // Extract list items
  while ((match = listPattern.exec(cleanHtml)) !== null) {
    const listType = match[1].toLowerCase();
    const listContent = match[2];
    const items: string[] = [];
    
    const itemPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let itemMatch;
    while ((itemMatch = itemPattern.exec(listContent)) !== null) {
      items.push(stripTags(itemMatch[1]));
    }
    
    if (items.length > 0) {
      // Add a marker that we'll replace later
      const marker = `__LIST_${elements.length}__`;
      elements.push({ 
        type: 'list-item', 
        items, 
        ordered: listType === 'ol' 
      } as ParsedElement & { items: string[], ordered: boolean });
    }
  }
  
  // Process remaining block elements
  const simpleBlockPattern = /<(h[1-3]|p)[^>]*>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;
  while ((match = simpleBlockPattern.exec(cleanHtml)) !== null) {
    if (match[0].toLowerCase().startsWith('<hr')) {
      elements.push({ type: 'hr' });
    } else {
      processBlock(match[1], match[2]);
    }
  }
  
  return elements;
}

// ============================================================================
// Generate PDF from Editor Content
// ============================================================================

/**
 * Generate a PDF from the Tiptap editor HTML content.
 * This preserves the exact content the user sees in the editor.
 */
export async function generateAgreementPdfFromEditor(data: AgreementFromEditorData): Promise<Uint8Array> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 72; // 1 inch
  const contentWidth = pageWidth - 2 * margin;
  const bottomMargin = 100; // Space for signatures
  let y = 72;
  let currentPdfPage = 1;

  // Helper to check if we need a new page
  const checkPageBreak = (neededHeight: number = 20) => {
    if (y + neededHeight > pageHeight - bottomMargin) {
      doc.addPage();
      currentPdfPage++;
      y = margin;
    }
  };

  // Helper functions
  const addTitle = (text: string, size: number = 20) => {
    checkPageBreak(size + 20);
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.text(text, pageWidth / 2, y, { align: 'center' });
    y += size + 12;
  };

  const addHeading = (text: string, level: 1 | 2 | 3 = 2) => {
    const sizes = { 1: 16, 2: 14, 3: 12 };
    const size = sizes[level];
    checkPageBreak(size + 16);
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin, y);
    y += size + 8;
  };

  const addParagraph = (text: string, options: { bold?: boolean; indent?: number } = {}) => {
    const { bold = false, indent = 0 } = options;
    doc.setFontSize(11);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    
    // Word wrap
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    const lineHeight = 14;
    
    // Check if we have room for at least 2 lines
    checkPageBreak(lineHeight * Math.min(2, lines.length));
    
    for (const line of lines) {
      checkPageBreak(lineHeight);
      doc.text(line, margin + indent, y);
      y += lineHeight;
    }
    y += 4; // Small gap after paragraph
  };

  const addListItem = (text: string, index: number, ordered: boolean = false) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const bullet = ordered ? `${index + 1}.` : '•';
    const bulletWidth = ordered ? 20 : 12;
    
    // Word wrap the text
    const lines = doc.splitTextToSize(text, contentWidth - bulletWidth - 10);
    const lineHeight = 14;
    
    checkPageBreak(lineHeight);
    
    // Draw bullet/number
    doc.text(bullet, margin + 5, y);
    
    // Draw text
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) checkPageBreak(lineHeight);
      doc.text(lines[i], margin + bulletWidth + 5, y);
      if (i < lines.length - 1) y += lineHeight;
    }
    y += lineHeight;
  };

  const addHorizontalRule = () => {
    checkPageBreak(20);
    y += 8;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;
  };

  const addSpace = (n: number = 1) => {
    y += 14 * n;
  };

  const addSignatureBlock = (label: string, signerName: string) => {
    checkPageBreak(60);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    y += 30;
    
    // Signature line
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 200, y);
    y += 4;
    
    // Name under line
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(signerName, margin, y + 10);
    y += 20;
  };

  // ============== Process Each Editor Page ==============
  
  for (let pageIndex = 0; pageIndex < data.pages.length; pageIndex++) {
    const page = data.pages[pageIndex];
    
    // Add new PDF page for each editor page (except first)
    if (pageIndex > 0) {
      doc.addPage();
      currentPdfPage++;
      y = margin;
    }
    
    // Add title on first page
    if (pageIndex === 0) {
      addTitle(data.title || 'Service Agreement');
      addSpace(0.5);
    }
    
    // Parse and render the HTML content
    const content = page.content || '';
    
    // If no content, skip to signatures
    if (!content.trim()) {
      // Still add signatures if present
      if (page.signatureFields && page.signatureFields.length > 0) {
        addSpace(2);
        addHorizontalRule();
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(128, 128, 128);
        doc.text('SIGNATURES', margin, y);
        doc.setTextColor(0, 0, 0);
        y += 20;
        
        for (const field of page.signatureFields) {
          const signerName = field.role === 'Client' ? data.clientName : 
                            field.role === 'Tax Strategist' ? data.strategistName : 
                            field.role;
          addSignatureBlock(field.label, signerName);
        }
      }
      continue;
    }
    
    // Simple HTML parser - process common elements
    // Split by <hr> first as section dividers
    const sections = content.split(/<hr\s*\/?>/i);
    
    for (let secIndex = 0; secIndex < sections.length; secIndex++) {
      const section = sections[secIndex];
      if (!section.trim()) continue;
      
      // Add horizontal rule between sections (not before first)
      if (secIndex > 0) {
        addHorizontalRule();
      }
      
      // Create a working copy and track positions
      const elements: Array<{ type: string; content: string; index: number; endIndex?: number; ordered?: boolean }> = [];
      
      // Helper to safely strip tags
      const safeStripTags = (str: string | undefined): string => {
        if (!str) return '';
        return str.replace(/<[^>]+>/g, '').trim();
      };
      
      // Track list ranges to avoid parsing paragraphs inside lists
      const listRanges: Array<{ start: number; end: number }> = [];
      
      // Find all lists FIRST - to know which ranges to exclude from paragraph parsing
      let match: RegExpExecArray | null;
      const listRegex = /<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi;
      while ((match = listRegex.exec(section)) !== null) {
        const listStart = match.index;
        const listEnd = match.index + match[0].length;
        listRanges.push({ start: listStart, end: listEnd });
        
        const listType = (match[1] || 'ul').toLowerCase();
        const listHtml = match[2] || '';
        const itemRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        const items: string[] = [];
        
        let itemMatch: RegExpExecArray | null;
        while ((itemMatch = itemRegex.exec(listHtml)) !== null) {
          const itemText = safeStripTags(itemMatch[1]);
          if (itemText) items.push(itemText);
        }
        
        if (items.length > 0) {
          elements.push({
            type: 'list',
            content: items.join('|||'),
            index: match.index,
            ordered: listType === 'ol',
          });
        }
      }
      
      // Helper to check if a position is inside a list
      const isInsideList = (pos: number): boolean => {
        return listRanges.some(range => pos >= range.start && pos < range.end);
      };
      
      // Find all headings - create fresh regex each time
      const headingRegex = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
      while ((match = headingRegex.exec(section)) !== null) {
        const headingContent = safeStripTags(match[2]);
        if (headingContent) {
          elements.push({
            type: `h${match[1]}`,
            content: headingContent,
            index: match.index,
          });
        }
      }
      
      // Find all paragraphs - but SKIP any inside lists
      const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      while ((match = paragraphRegex.exec(section)) !== null) {
        // Skip if this paragraph is inside a list (to avoid duplicates)
        if (isInsideList(match.index)) {
          continue;
        }
        const text = safeStripTags(match[1]);
        if (text) {
          elements.push({
            type: 'p',
            content: text,
            index: match.index,
          });
        }
      }
      
      // Sort by position in original HTML
      elements.sort((a, b) => a.index - b.index);
      
      // Render elements
      for (const el of elements) {
        switch (el.type) {
          case 'h1':
            addHeading(el.content, 1);
            break;
          case 'h2':
            addHeading(el.content, 2);
            break;
          case 'h3':
            addHeading(el.content, 3);
            break;
          case 'p':
            addParagraph(el.content);
            break;
          case 'list':
            const items = el.content.split('|||');
            items.forEach((item, i) => {
              addListItem(item, i, el.ordered);
            });
            addSpace(0.5);
            break;
        }
      }
    }
    
    // Add signature fields for this page
    if (page.signatureFields.length > 0) {
      addSpace(2);
      addHorizontalRule();
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(128, 128, 128);
      doc.text('SIGNATURES', margin, y);
      doc.setTextColor(0, 0, 0);
      y += 20;
      
      for (const field of page.signatureFields) {
        const signerName = field.role === 'Client' ? data.clientName : 
                          field.role === 'Tax Strategist' ? data.strategistName : 
                          field.role;
        addSignatureBlock(field.label, signerName);
      }
    }
  }

  // Get PDF as array buffer
  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}
