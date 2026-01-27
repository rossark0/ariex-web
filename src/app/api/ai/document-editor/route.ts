import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionContentPart } from 'openai/resources/chat/completions';

// ============================================================================
// Types
// ============================================================================

interface AIResponse {
  message: string;
  fullContent?: string;
  suggestions?: string[];
}

interface PdfOcrResult {
  pages: Array<{
    pageNumber: number;
    content: string;
  }>;
  title: string;
  summary: string;
}

// ============================================================================
// OpenAI Client
// ============================================================================

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// ============================================================================
// System Prompts
// ============================================================================

const DOCUMENT_EDITOR_SYSTEM_PROMPT = `You are an expert document editor AI assistant for Ariex, a tax advisory platform. You help users edit and improve legal agreements, contracts, and tax-related documents.

You have full control over the document content and can make any edits requested. You understand HTML structure (as used in Tiptap editor) including:
- Headings: <h1>, <h2>, <h3>
- Paragraphs: <p>
- Lists: <ul>, <ol>, <li>
- Emphasis: <strong>, <em>
- Horizontal rules: <hr>
- Blockquotes: <blockquote>

You also have PAGE MANAGEMENT capabilities:
- You can CREATE new pages when the user asks (e.g., "add a new page", "create page 2", "add another page for terms")
- You can suggest navigating to different pages

When the user asks for edits, you should:
1. Understand the current document content
2. Make precise, targeted edits
3. Preserve the document structure and formatting
4. Explain what changes you made

IMPORTANT RESPONSE FORMAT:
You MUST respond with a valid JSON object. Include these fields as needed:
- "message": A friendly explanation of what you did or are suggesting (REQUIRED)
- "fullContent": The complete updated HTML content (when making edits to current page)
- "action": Use "addPage" to create a new page, "goToPage" to navigate
- "newPageContent": HTML content for the new page (when action is "addPage")
- "pageIndex": Page number to navigate to (when action is "goToPage", 1-indexed)

Example - editing current page:
{
  "message": "I've updated the executive summary with the tax savings estimate.",
  "fullContent": "<h2>Executive Summary</h2><p>Based on our analysis...</p>"
}

Example - creating a new page:
{
  "message": "I've created a new page with the Terms and Conditions section.",
  "action": "addPage",
  "newPageContent": "<h2>Terms and Conditions</h2><p>1. Service Agreement...</p>"
}

Example - just answering a question:
{
  "message": "The current page contains the executive summary and key findings."
}

Always maintain professional legal language appropriate for financial agreements.`;

// ============================================================================
// API Route Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, documentContent, userMessage, chatHistory, pdfBase64, clientName, currentPageIndex, totalPages } = body;

    const openai = getOpenAI();

    if (action === 'chat') {
      return handleDocumentChat(openai, documentContent, userMessage, chatHistory, clientName, currentPageIndex, totalPages);
    } else if (action === 'ocr-pdf') {
      // OCR PDF using OpenAI Vision
      return handlePdfOcr(openai, pdfBase64, clientName);
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "chat" or "ocr-pdf"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[AI Document Editor] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Document Chat Handler
// ============================================================================

async function handleDocumentChat(
  openai: OpenAI,
  documentContent: string,
  userMessage: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  clientName?: string,
  currentPageIndex?: number,
  totalPages?: number
) {
  const pageInfo = currentPageIndex && totalPages 
    ? `\n\nYou are currently editing page ${currentPageIndex} of ${totalPages}.`
    : '';

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: DOCUMENT_EDITOR_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: `Current document content:\n\n${documentContent}\n\n${clientName ? `Client name: ${clientName}` : ''}${pageInfo}`,
    },
  ];

  // Add chat history
  if (chatHistory && chatHistory.length > 0) {
    for (const msg of chatHistory.slice(-10)) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  messages.push({
    role: 'user',
    content: userMessage,
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    temperature: 0.7,
    messages,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
  }

  try {
    const parsed: AIResponse = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({
      message: content,
      suggestions: [],
    });
  }
}

// ============================================================================
// PDF OCR Handler using OpenAI Vision (GPT-4o can read PDFs directly)
// ============================================================================

async function handlePdfOcr(
  openai: OpenAI,
  pdfBase64: string, // Base64 encoded PDF file
  clientName?: string
): Promise<NextResponse> {
  if (!pdfBase64) {
    return NextResponse.json({ error: 'No PDF data provided' }, { status: 400 });
  }

  // GPT-4o can read PDFs directly via vision API
  const contentParts: ChatCompletionContentPart[] = [
    {
      type: 'text',
      text: `Please read this PDF document and convert it to well-structured HTML.${clientName ? ` This document is for client: ${clientName}.` : ''}\n\nExtract ALL text, preserve formatting, and organize by pages.`,
    },
    {
      type: 'image_url',
      image_url: {
        url: `data:application/pdf;base64,${pdfBase64}`,
        detail: 'high',
      },
    },
  ];

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are an expert document OCR and interpreter. Your job is to:
1. Read and extract ALL text from the PDF document
2. Convert to well-structured HTML for a rich text editor
3. Preserve structure, formatting, and page breaks
4. Identify and format headings, paragraphs, lists, tables

Use HTML elements: <h1>, <h2>, <h3> for headings, <p> for paragraphs, <ul>/<ol>/<li> for lists, <strong>/<em> for emphasis, <hr> for section breaks.

RESPONSE FORMAT (JSON):
{
  "pages": [
    { "pageNumber": 1, "content": "<h2>Title</h2><p>Content...</p>" }
  ],
  "title": "Document title",
  "summary": "Brief summary"
}`,
    },
    {
      role: 'user',
      content: contentParts,
    },
  ];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 8192,
      temperature: 0.1,
      messages,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('[PDF OCR] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process PDF' },
      { status: 500 }
    );
  }
}
