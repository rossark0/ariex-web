import { OpenAI } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client instance
 * Lazy-initialized to avoid build-time errors when API key is missing
 */
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

export interface DocumentAnalysisResult {
  category: string;
  taxYear: number | null;
  summary: string;
  insights: Record<string, any>;
  extractedData: Record<string, any>;
}

export async function analyzeDocument(documentText: string): Promise<DocumentAnalysisResult> {
  const openai = getOpenAI();
  const prompt = `Analyze this tax document and extract:
1. Document category (w2, 1099, 1040, schedule_c, receipt, invoice, contract, bank_statement, investment_statement, or other)
2. Tax year (if applicable)
3. Brief summary
4. Key insights
5. Important extracted data

Document text:
${documentText}

Respond in JSON format with keys: category, taxYear, summary, insights, extractedData`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
  });

  // gpt-4o outputs content as string (in choices[0].message.content)
  const content = response.choices[0].message.content;
  return JSON.parse(content!);
}

export async function generateTaxStrategies(
  clientProfile: any,
  documents: any[]
): Promise<
  Array<{
    title: string;
    description: string;
    category: string;
    estimatedSavings: number;
    priority: string;
  }>
> {
  const openai = getOpenAI();
  const prompt = `Based on this client profile and documents, generate 3-5 personalized tax strategies:

Client Profile:
${JSON.stringify(clientProfile, null, 2)}

Documents:
${JSON.stringify(
    documents.map(d => ({
      category: d.category,
      summary: d.aiSummary,
    })),
    null,
    2
  )}

For each strategy, provide:
- title: Clear, actionable title
- description: Detailed explanation
- category: deduction, credit, deferral, entity_structure, retirement, investment, or other
- estimatedSavings: Dollar amount (number)
- priority: low, medium, high, or critical

Respond in JSON format as an array of strategies.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  return JSON.parse(content!);
}

export async function chatWithAI(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: { clientProfile?: any; recentDocuments?: any[] }
): Promise<string> {
  const openai = getOpenAI();
  const systemPrompt = `You are a helpful tax assistant AI. You provide accurate, helpful tax advice based on current tax law.

Client Context:
${context.clientProfile ? JSON.stringify(context.clientProfile, null, 2) : 'No profile available'}

Recent Documents:
${context.recentDocuments
      ? JSON.stringify(
        context.recentDocuments.map(d => d.category),
        null,
        2
      )
      : 'No documents available'
    }

Provide clear, actionable advice. If you're unsure, recommend consulting with a tax professional.`;

  // Map previous messages for OpenAI chat format
  const chatMessages = [
    {
      role: 'system',
      content: systemPrompt,
    },
    ...messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    messages: chatMessages as ChatCompletionMessageParam[],
  });

  return response.choices[0].message.content!;
}
