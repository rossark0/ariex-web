import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

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

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  // Create a new client each time to pick up env changes
  return new OpenAI({ apiKey });
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

CRITICAL BEHAVIOR RULES:
1. DEFAULT ACTION: Edit the CURRENT page content. Most requests should update the current page.
2. ONLY create a new page when the user EXPLICITLY asks with phrases like:
   - "create a new page"
   - "add a new page"
   - "make a new page"
   - "add another page"
   - "new page for..."
3. IMPORTANT: You can only create ONE page at a time. If the user asks for multiple pages (e.g., "create 5 pages"), create the FIRST page only and tell them: "I've created the first page. I can only create one page at a time - please ask me to create the next page when you're ready."
4. ONLY delete a page when the user EXPLICITLY asks with phrases like:
   - "delete this page"
   - "remove this page"
   - "delete page"
   - "remove current page"
   NOTE: Cannot delete if only 1 page remains.
5. Requests like "add a section", "create a signature section", "add legal language", "improve this", "enhance", "update" should ALL edit the CURRENT page - NOT create a new page.
6. After creating a page, subsequent messages should edit that page unless explicitly asked for another new page.

When the user asks for edits, you should:
1. Understand the current document content
2. Make precise, targeted edits TO THE CURRENT PAGE
3. Preserve the document structure and formatting
4. Explain what changes you made

IMPORTANT RESPONSE FORMAT:
You MUST respond with a valid JSON object. Include these fields as needed:
- "message": A friendly explanation of what you did or are suggesting (REQUIRED)
- "fullContent": The complete updated HTML content (when making edits to current page - THIS IS THE DEFAULT)
- "action": Use "addPage" when user EXPLICITLY requests a new page, "deletePage" to delete current page, "goToPage" to navigate
- "newPageContent": HTML content for the new page (when action is "addPage")
- "pageIndex": Page number to navigate to (when action is "goToPage", 1-indexed)

Example - editing current page (MOST COMMON):
{
  "message": "I've added a signature section to this page.",
  "fullContent": "<h2>Agreement</h2><p>Terms here...</p><h3>Signature</h3><p>Sign below:</p>"
}

Example - creating a new page (ONLY when explicitly asked):
{
  "message": "I've created a new page with the Terms and Conditions section.",
  "action": "addPage",
  "newPageContent": "<h2>Terms and Conditions</h2><p>1. Service Agreement...</p>"
}

Example - deleting current page (ONLY when explicitly asked):
{
  "message": "I've deleted the current page.",
  "action": "deletePage"
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
    const {
      action,
      documentContent,
      userMessage,
      chatHistory,
      pdfBase64,
      clientName,
      currentPageIndex,
      totalPages,
    } = body;

    const openai = getOpenAI();

    if (action === 'chat') {
      return handleDocumentChat(
        openai,
        documentContent,
        userMessage,
        chatHistory,
        clientName,
        currentPageIndex,
        totalPages
      );
    } else if (action === 'ocr-pdf') {
      // Legacy: OCR PDF (may not work since Vision API needs images, not raw PDF)
      return handlePdfOcr(openai, pdfBase64 ? [pdfBase64] : [], clientName);
    } else if (action === 'ocr-images') {
      // OCR images (base64 PNG) using OpenAI Vision
      const { images } = body;
      if (!images || !Array.isArray(images) || images.length === 0) {
        return NextResponse.json({ error: 'No images provided' }, { status: 400 });
      }
      return handlePdfOcr(openai, images, clientName);
    } else if (action === 'fetch-pdf') {
      // Proxy fetch to bypass CORS on the client
      const { pdfUrl } = body;
      if (!pdfUrl) {
        return NextResponse.json({ error: 'No PDF URL provided' }, { status: 400 });
      }
      return handleFetchPdfProxy(pdfUrl);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('[AI Document Editor] Error:', error);

    // Handle OpenAI API errors by checking error properties
    const err = error as { status?: number; code?: string; message?: string };

    if (err.code === 'invalid_api_key' || err.status === 401) {
      return NextResponse.json(
        {
          error:
            'Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env.local and restart the server.',
        },
        { status: 401 }
      );
    }

    if (err.status === 429) {
      return NextResponse.json(
        { error: 'OpenAI rate limit exceeded. Please try again in a moment.' },
        { status: 429 }
      );
    }

    if (err.status && err.status >= 400) {
      return NextResponse.json(
        { error: `OpenAI API error: ${err.message || 'Unknown error'}` },
        { status: err.status }
      );
    }

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
  const pageInfo =
    currentPageIndex && totalPages
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
// Image OCR Handler (using OpenAI Vision)
// Accepts an array of base64 PNG images (one per PDF page) and uses gpt-4o
// vision to extract the text content as TipTap-compatible HTML.
// ============================================================================

async function handlePdfOcr(
  openai: OpenAI,
  imageBase64Array: string[],
  clientName?: string
): Promise<NextResponse> {
  if (!imageBase64Array || imageBase64Array.length === 0) {
    return NextResponse.json({ error: 'No images provided' }, { status: 400 });
  }

  try {
    // Build image content parts for the Vision API
    const imageContents = imageBase64Array.map(img => ({
      type: 'image_url' as const,
      image_url: {
        url: `data:image/png;base64,${img}`,
        detail: 'high' as const,
      },
    }));

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 16384,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `You are an expert document OCR assistant. Your job is to extract the full text content from document page images and convert it into clean HTML suitable for a TipTap rich text editor.

Use these HTML elements:
- <h1>, <h2>, <h3> for headings
- <p> for paragraphs
- <ul>/<ol> with <li> for lists
- <strong> and <em> for emphasis
- <hr> for horizontal rules/section dividers

IMPORTANT RULES:
1. Extract ALL text content faithfully — do not summarize or skip sections
2. Preserve the document's original structure, headings, and formatting
3. Output ONLY valid HTML content, no markdown
4. Do NOT wrap the entire output in any container tags
5. Respond with a JSON object in this exact format:
{
  "pages": [{ "pageNumber": 1, "content": "<h2>Title</h2><p>Content...</p>" }],
  "title": "Document Title"
}
6. Create one entry per page image provided
${clientName ? `7. The client name is: ${clientName}` : ''}`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please extract the full content from these ${imageBase64Array.length} document page image(s) and convert to structured HTML.`,
            },
            ...imageContents,
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    const parsed: PdfOcrResult = JSON.parse(content);

    if (!parsed.pages || parsed.pages.length === 0) {
      return NextResponse.json({
        pages: [{ pageNumber: 1, content: '<p>Could not extract content from the document.</p>' }],
        title: parsed.title || 'Extracted Document',
      });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('[AI Document Editor] Image OCR error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process images' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Proxy Fetch PDF Handler
// Fetches a PDF from a URL server-side (to bypass CORS) and returns base64
// ============================================================================

async function handleFetchPdfProxy(pdfUrl: string): Promise<NextResponse> {
  try {
    const response = await fetch(pdfUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return NextResponse.json({ base64 });
  } catch (error) {
    console.error('[AI Document Editor] Proxy fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch PDF' },
      { status: 500 }
    );
  }
}
