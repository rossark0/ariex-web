import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

// ─── Types ────────────────────────────────────────────────────────────────

interface InsightsRequestBody {
  pageContext: {
    pagePath: string;
    pageTitle: string;
    userRole: string;
    client?: Record<string, unknown> | null;
    documents?: Record<string, unknown>[];
    agreements?: Record<string, unknown>[];
    payments?: Record<string, unknown>[];
    strategy?: Record<string, unknown> | null;
    extra?: Record<string, unknown>;
  };
}

export interface AiInsightItem {
  /** Short headline shown on the card (≤60 chars) */
  title: string;
  /** One-sentence supporting detail (≤140 chars) */
  detail: string;
  /** Numeric impact for count-up display, optional */
  impactValue?: number;
  /** Format hint: 'currency' renders $X, 'count' renders raw, 'percent' renders X% */
  impactFormat?: 'currency' | 'count' | 'percent';
  /** Severity tier — drives accent color */
  severity?: 'high' | 'medium' | 'low';
  /** Optional follow-up prompt the rail can send to the chatbot */
  followUpPrompt?: string;
}

export interface AiInsightsResponse {
  risks: AiInsightItem[];
  opportunities: AiInsightItem[];
  actions: AiInsightItem[];
}

// ─── OpenAI client ────────────────────────────────────────────────────────

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

// ─── In-memory cache (per-process; 5-min TTL) ─────────────────────────────
// Saves duplicate calls when users navigate between pages with the same context.

interface CacheEntry {
  payload: AiInsightsResponse;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_SIZE = 256;

function cacheKey(body: InsightsRequestBody): string {
  // Stable key over the structural bits that change insights (not timestamps)
  const c = body.pageContext;
  const norm = {
    role: c.userRole,
    path: c.pagePath,
    client: c.client,
    documents: c.documents,
    agreements: c.agreements,
    payments: c.payments,
    strategy: c.strategy,
    extra: c.extra,
  };
  return JSON.stringify(norm);
}

function getCached(key: string): AiInsightsResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.payload;
}

function setCached(key: string, payload: AiInsightsResponse) {
  if (cache.size >= CACHE_MAX_SIZE) {
    // Drop oldest entry (Map iteration is insertion order)
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, { payload, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Prompt builder ───────────────────────────────────────────────────────

function buildSystemPrompt(role: string): string {
  return `You are the **Ariex Tax Strategy Insights Engine** — a senior tax strategist AI that surfaces the most important findings for the user looking at the page right now.

Your job: produce three compact, prioritized lists based on the page context:
1. **risks** — things that could harm the client (missing docs, overdue agreement, compliance issues, IRS deadline pressure, status stuck for too long, audit triggers). Up to 3 items, most severe first.
2. **opportunities** — tax-saving angles the data suggests (deductions, credits, deferrals, entity restructure, retirement vehicles). Up to 3 items, highest dollar impact first.
3. **actions** — concrete next moves the user can take in the Ariex platform right now (send agreement, request a specific document, advance to strategy, follow up). Up to 3 items, most time-sensitive first.

Each item must have:
- **title** — a punchy 4–8 word headline (e.g., "Missing 2024 Schedule C")
- **detail** — one sentence (≤140 chars) explaining the so-what
- **severity** — "high" | "medium" | "low" — pick honestly based on dollar impact / urgency
- **impactValue** + **impactFormat** when a number makes sense:
  - For opportunities, prefer an estimated annual dollar saving (e.g., 4800, format "currency")
  - For risks, use a count or dollar exposure
  - For actions, omit unless directly numeric
- **followUpPrompt** — optional ≤120-char question the user could ask the chatbot to drill into this item

ROLE-AWARE BEHAVIOR (current user: **${role}**):
- **STRATEGIST**: Speak as a senior tax colleague. Cite IRC sections briefly. Estimate dollar savings. Reference the workflow (Documents tab, Strategy tab, etc.).
- **CLIENT**: Avoid jargon. Frame opportunities as "your strategist may suggest X". Actions are about what THEY need to do (sign, pay, upload). Severity 'high' should be reserved for things that block their progress.
- **COMPLIANCE**: Risks dominate. Focus on documentation gaps, regulatory exposure, statute-of-limitations issues, signature chain integrity.

CRITICAL RULES:
- Output **only** valid JSON matching the schema. No prose around it.
- If the page has no client context (e.g., user is on /strategist/home with a list), return systemic insights across the visible clients (e.g., "3 clients overdue", "Strategist queue: 5 awaiting compliance").
- If you genuinely have nothing meaningful to say for a category, return an empty array for that category — do NOT pad with filler.
- Never reference data that isn't in the provided context. If you say "Missing Schedule C", the Schedule C must actually be missing per the data.

JSON SCHEMA (you must return exactly this shape):
{
  "risks":         [{ "title": string, "detail": string, "severity": "high"|"medium"|"low", "impactValue"?: number, "impactFormat"?: "currency"|"count"|"percent", "followUpPrompt"?: string }],
  "opportunities": [{ "title": string, "detail": string, "severity": "high"|"medium"|"low", "impactValue"?: number, "impactFormat"?: "currency"|"count"|"percent", "followUpPrompt"?: string }],
  "actions":       [{ "title": string, "detail": string, "severity": "high"|"medium"|"low", "impactValue"?: number, "impactFormat"?: "currency"|"count"|"percent", "followUpPrompt"?: string }]
}`;
}

function buildUserPrompt(body: InsightsRequestBody): string {
  const c = body.pageContext;
  return `--- PAGE CONTEXT ---
Page: ${c.pageTitle}
Route: ${c.pagePath}
User Role: ${c.userRole}

${c.client ? `--- CLIENT ---\n${JSON.stringify(c.client, null, 2)}` : ''}
${c.documents?.length ? `\n--- DOCUMENTS (${c.documents.length}) ---\n${JSON.stringify(c.documents, null, 2)}` : ''}
${c.agreements?.length ? `\n--- AGREEMENTS (${c.agreements.length}) ---\n${JSON.stringify(c.agreements, null, 2)}` : ''}
${c.payments?.length ? `\n--- PAYMENTS (${c.payments.length}) ---\n${JSON.stringify(c.payments, null, 2)}` : ''}
${c.strategy ? `\n--- STRATEGY ---\n${JSON.stringify(c.strategy, null, 2)}` : ''}
${c.extra ? `\n--- EXTRA ---\n${JSON.stringify(c.extra, null, 2)}` : ''}

Return the JSON object now.`;
}

// ─── Response validation ──────────────────────────────────────────────────

function sanitizeItem(raw: unknown): AiInsightItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = typeof r.title === 'string' ? r.title.trim() : '';
  const detail = typeof r.detail === 'string' ? r.detail.trim() : '';
  if (!title || !detail) return null;
  const severity =
    r.severity === 'high' || r.severity === 'medium' || r.severity === 'low' ? r.severity : 'medium';
  const item: AiInsightItem = { title, detail, severity };
  if (typeof r.impactValue === 'number' && Number.isFinite(r.impactValue)) {
    item.impactValue = r.impactValue;
  }
  if (r.impactFormat === 'currency' || r.impactFormat === 'count' || r.impactFormat === 'percent') {
    item.impactFormat = r.impactFormat;
  }
  if (typeof r.followUpPrompt === 'string' && r.followUpPrompt.trim()) {
    item.followUpPrompt = r.followUpPrompt.trim();
  }
  return item;
}

function sanitizeResponse(raw: unknown): AiInsightsResponse {
  const empty: AiInsightsResponse = { risks: [], opportunities: [], actions: [] };
  if (!raw || typeof raw !== 'object') return empty;
  const r = raw as Record<string, unknown>;
  const pick = (key: 'risks' | 'opportunities' | 'actions'): AiInsightItem[] => {
    const arr = Array.isArray(r[key]) ? (r[key] as unknown[]) : [];
    return arr
      .map(sanitizeItem)
      .filter((x): x is AiInsightItem => x !== null)
      .slice(0, 3);
  };
  return {
    risks: pick('risks'),
    opportunities: pick('opportunities'),
    actions: pick('actions'),
  };
}

// ─── Route handler ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as InsightsRequestBody;

    if (!body.pageContext) {
      return NextResponse.json({ error: 'pageContext is required' }, { status: 400 });
    }

    const key = cacheKey(body);
    const cached = getCached(key);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'X-Ariex-Cache': 'hit' },
      });
    }

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 900,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(body.pageContext.userRole) },
        { role: 'user', content: buildUserPrompt(body) },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { risks: [], opportunities: [], actions: [] } satisfies AiInsightsResponse,
        { status: 200 }
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('[AI Insights] Model returned non-JSON content:', raw.slice(0, 200));
      return NextResponse.json(
        { risks: [], opportunities: [], actions: [] } satisfies AiInsightsResponse,
        { status: 200 }
      );
    }

    const sanitized = sanitizeResponse(parsed);
    setCached(key, sanitized);

    return NextResponse.json(sanitized, {
      headers: { 'X-Ariex-Cache': 'miss' },
    });
  } catch (error: unknown) {
    const err = error as { code?: string; status?: number; message?: string };
    console.error('[AI Insights] Error:', err);

    if (err.code === 'invalid_api_key' || err.status === 401) {
      return NextResponse.json({ error: 'Invalid OpenAI API key.' }, { status: 401 });
    }
    if (err.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again shortly.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
