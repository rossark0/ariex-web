'use server';

/**
 * Server-side utility to extract text from PDF files.
 * Uses pdf-parse v1.1.1 - simple and reliable.
 */

// ============================================================================
// Types
// ============================================================================

export interface PdfExtractionResult {
  success: boolean;
  text?: string;
  markdown?: string;
  pageCount?: number;
  error?: string;
}

// ============================================================================
// PDF Text Extraction
// ============================================================================

/**
 * Extract text content from a PDF and convert to markdown format.
 * Accepts base64 encoded PDF data (since Buffer can't be serialized across server actions)
 */
export async function extractTextFromPdf(base64Data: string): Promise<PdfExtractionResult> {
  try {
    // Import the actual parsing library directly (bypasses pdf-parse's buggy index.js)
    // pdf-parse has a bug where it tries to load test files when imported dynamically
    const pdfParse = (await import('pdf-parse/lib/pdf-parse')).default;
    
    // Convert base64 to Buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Parse the PDF
    const result = await pdfParse(buffer);
    
    const text = result.text || '';
    const pageCount = result.numpages || 1;
    
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: 'PDF appears to be empty or contains only images (no extractable text)',
      };
    }
    
    // Convert extracted text to markdown format
    const markdown = convertTextToMarkdown(text);
    
    return {
      success: true,
      text,
      markdown,
      pageCount,
    };
  } catch (error) {
    console.error('[PDF Extract] Failed to extract text:', error);
    
    // Provide helpful error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isStructureError = errorMessage.includes('Invalid PDF structure');
    
    return {
      success: false,
      error: isStructureError 
        ? 'This PDF format is not supported. Try starting from the template instead.'
        : `Failed to extract PDF text: ${errorMessage}`,
    };
  }
}

/**
 * Extract text from a PDF URL
 */
export async function extractTextFromPdfUrl(url: string): Promise<PdfExtractionResult> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { success: false, error: `Failed to fetch PDF: ${response.status}` };
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return extractTextFromPdf(buffer);
  } catch (error) {
    console.error('[PDF Extract] Failed to extract from URL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch PDF',
    };
  }
}

// ============================================================================
// Text to Markdown Conversion
// ============================================================================

/**
 * Convert plain text to a markdown-like format.
 * Attempts to detect headings, lists, and structure.
 */
function convertTextToMarkdown(text: string): string {
  const lines = text.split('\n');
  const markdownLines: string[] = [];
  
  let prevLineWasEmpty = true;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Skip empty lines but preserve paragraph breaks
    if (!line) {
      if (!prevLineWasEmpty) {
        markdownLines.push('');
        prevLineWasEmpty = true;
      }
      continue;
    }
    
    prevLineWasEmpty = false;
    
    // Detect potential headings (all caps, short lines after empty line)
    if (isLikelyHeading(line, lines[i - 1])) {
      // Determine heading level based on position and length
      if (line.length < 30 && line === line.toUpperCase()) {
        line = `## ${titleCase(line)}`;
      } else if (line.length < 50) {
        line = `### ${line}`;
      }
    }
    
    // Detect bullet points (lines starting with •, -, *, or numbers)
    if (/^[•\-\*]\s/.test(line)) {
      line = `- ${line.substring(2)}`;
    } else if (/^\d+[.)]\s/.test(line)) {
      // Numbered lists
      line = line.replace(/^(\d+)[.)]\s/, '$1. ');
    }
    
    // Detect bold text patterns (words in ALL CAPS that aren't headings)
    line = line.replace(/\b([A-Z]{2,})\b/g, (match) => {
      // Skip common acronyms and short words
      if (match.length <= 3 || ['THE', 'AND', 'FOR', 'WITH'].includes(match)) {
        return match;
      }
      return `**${titleCase(match)}**`;
    });
    
    markdownLines.push(line);
  }
  
  // Clean up multiple consecutive empty lines
  let result = markdownLines.join('\n');
  result = result.replace(/\n{3,}/g, '\n\n');
  
  return result.trim();
}

/**
 * Check if a line is likely a heading
 */
function isLikelyHeading(line: string, prevLine?: string): boolean {
  // Empty previous line suggests section break
  const afterEmptyLine = !prevLine || prevLine.trim() === '';
  
  // Short lines in all caps are likely headings
  if (line === line.toUpperCase() && line.length < 50 && afterEmptyLine) {
    return true;
  }
  
  // Lines ending with : might be headings
  if (line.endsWith(':') && line.length < 60 && afterEmptyLine) {
    return true;
  }
  
  return false;
}

/**
 * Convert text to title case
 */
function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
