import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { createHash } from 'crypto';

/**
 * AI-driven client prioritization.
 *
 * Replaces the heuristic SLA / scoring constants the strategist home used to
 * carry. Takes the strategist's PII-sanitized client list + agreements,
 * asks gpt-4o-mini to rank by urgency, and returns a deterministic JSON
 * payload that all priority surfaces (home, matrix, alerts badge) share.
 *
 * Production guarantees:
 *   - 5-min server-side cache keyed on a stable hash of the input
 *   - Per-IP token bucket so a misbehaving client can't drain budget
 *   - Hard response sanitization — caller always gets a valid ranking array
 *   - Caller is expected to keep a deterministic fallback for when this
 *     endpoint is unavailable (e.g., no OPENAI_API_KEY)
 */

// ─── Types ────────────────────────────────────────────────────────────────

type RiskBand = 'high' | 'medium' | 'low';

interface InputClient {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  status?: string;
}

interface InputAgreement {
  clientId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  price?: string | number;
}

interface PrioritizeRequestBody {
  clients: InputClient[];
  agreements: InputAgreement[];
}

export interface ClientRanking {
  clientId: string;
  /** 0–100 urgency score. Stable enough to sort by. */
  score: number;
  riskBand: RiskBand;
  atRisk: boolean;
  /** Short, scannable signal label e.g. "Payment 76d overdue". */
  signal: string;
  /** One-sentence reasoning visible to the strategist. */
  reasoning: string;
}

export interface PrioritizeResponse {
  rankings: ClientRanking[];
  /** ISO timestamp the rankings were computed. */
  generatedAt: string;
}

// ─── OpenAI client ────────────────────────────────────────────────────────

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY environment variable is not set');
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// ─── Per-IP rate limit (token bucket) ─────────────────────────────────────

const RATE_LIMIT_PER_MINUTE = 12;
const rateLimitBuckets = new Map<string, { tokens: number; lastRefill: number }>();
const RATE_BUCKET_MAX_SIZE = 1024;

function getClientKey(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

function takeToken(key: string): boolean {
  const now = Date.now();
  let bucket = rateLimitBuckets.get(key);
  if (!bucket) {
    if (rateLimitBuckets.size >= RATE_BUCKET_MAX_SIZE) {
      const oldest = rateLimitBuckets.keys().next().value;
      if (oldest) rateLimitBuckets.delete(oldest);
    }
    bucket = { tokens: RATE_LIMIT_PER_MINUTE, lastRefill: now };
    rateLimitBuckets.set(key, bucket);
  }
  const elapsedMs = now - bucket.lastRefill;
  bucket.tokens = Math.min(
    RATE_LIMIT_PER_MINUTE,
    bucket.tokens + (elapsedMs / 60000) * RATE_LIMIT_PER_MINUTE
  );
  bucket.lastRefill = now;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

// ─── Server-side cache (5-min TTL, keyed on input hash) ───────────────────

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 128;
const cache = new Map<string, { payload: PrioritizeResponse; expiresAt: number }>();

function inputHash(body: PrioritizeRequestBody): string {
  // Normalize so reordering doesn't bust the cache.
  const norm = {
    clients: [...body.clients]
      .map(c => ({ id: c.id, status: c.status, createdAt: c.createdAt }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    agreements: [...body.agreements]
      .map(a => ({
        clientId: a.clientId,
        status: a.status,
        updatedAt: a.updatedAt,
        price: a.price,
      }))
      .sort((a, b) => a.clientId.localeCompare(b.clientId) || a.updatedAt.localeCompare(b.updatedAt)),
  };
  return createHash('sha1').update(JSON.stringify(norm)).digest('hex');
}

function getCached(key: string): PrioritizeResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.payload;
}

function setCached(key: string, payload: PrioritizeResponse): void {
  if (cache.size >= CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, { payload, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Prompt builder ────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  const today = new Date().toISOString().split('T')[0];
  return `You are the **ARIEX Priority Engine** for a US tax-advisory platform. The
strategist needs to know which of their clients are urgent RIGHT NOW. You
read the actual agreement state + timestamps and rank by professional
judgment — same way an experienced firm partner would triage a portfolio.

Today's date: ${today}

INPUT
You will receive two arrays:
- clients: { id, name, email, createdAt, status }
- agreements: { clientId, status, createdAt, updatedAt, price }

Agreement statuses (US tax workflow):
- DRAFT: strategist hasn't sent it. Stalls on the strategist's side.
- PENDING_SIGNATURE: sent, awaiting client signature.
- PENDING_PAYMENT: signed, awaiting payment.
- PENDING_TODOS_COMPLETION: paid, awaiting document uploads from client.
- PENDING_STRATEGY: docs received, strategist must create the plan.
- PENDING_STRATEGY_REVIEW: strategy sent for compliance + client approval.
- COMPLETED: engagement done.
- CANCELLED: dead.

RANKING RULES (use professional judgment, not arbitrary thresholds):
- A client with NO agreements who was created >2 days ago is stalled — strategist needs to send one.
- DRAFT agreements not sent for several days = strategist side stalled. Higher urgency the older they get.
- PENDING_SIGNATURE >7 days = client unresponsive. The longer, the more concerning.
- PENDING_PAYMENT past a reasonable window (a few business days) = collection risk. Larger dollar amounts compound the urgency.
- PENDING_TODOS_COMPLETION dragging out = onboarding momentum lost.
- PENDING_STRATEGY = strategist owes work. Don't let these sit.
- PENDING_STRATEGY_REVIEW = compliance/client gate. Flag if review has been sitting for >a week.
- COMPLETED clients are baseline maintenance — low priority unless something else surfaces.
- CANCELLED = ignore (score 0).

OUTPUT
Return JSON exactly like:
{
  "rankings": [
    {
      "clientId": string,           // matches one of the input client ids
      "score": 0-100,                // higher = more urgent. Distribute across the full range.
      "riskBand": "high"|"medium"|"low",
      "atRisk": boolean,             // true if this client deserves the strategist's attention soon
      "signal": string,              // ≤ 50 chars, e.g. "Payment 76d overdue", "Unsigned 12d"
      "reasoning": string            // ≤ 140 chars, why this client is at this rank
    }
  ]
}

CRITICAL:
- Output one ranking per input client. Never invent client IDs.
- Sort the array by score DESC.
- "atRisk" should align with score: true when score >= ~50, false otherwise. Use judgment.
- "signal" must be precise and quantitative when possible — cite the actual day count from updatedAt.
- "reasoning" is the strategist's tooltip: explain WHY in business terms.
- Never include PII in signal/reasoning. The data has been anonymized but the names you see (e.g. "Client A1") are safe to use as-is.`;
}

function buildUserPrompt(body: PrioritizeRequestBody): string {
  return `--- CLIENTS (${body.clients.length}) ---
${JSON.stringify(body.clients, null, 2)}

--- AGREEMENTS (${body.agreements.length}) ---
${JSON.stringify(body.agreements, null, 2)}

Rank the clients now. Return the JSON object.`;
}

// ─── Response sanitization ─────────────────────────────────────────────────

function sanitizeRanking(raw: unknown, validIds: Set<string>): ClientRanking | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const clientId = typeof r.clientId === 'string' ? r.clientId : '';
  if (!validIds.has(clientId)) return null;

  const score = typeof r.score === 'number' && Number.isFinite(r.score)
    ? Math.max(0, Math.min(100, r.score))
    : 0;
  const riskBand: RiskBand =
    r.riskBand === 'high' || r.riskBand === 'medium' || r.riskBand === 'low'
      ? r.riskBand
      : score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  const atRisk = typeof r.atRisk === 'boolean' ? r.atRisk : score >= 50;
  const signal = typeof r.signal === 'string' ? r.signal.trim().slice(0, 50) : '';
  const reasoning = typeof r.reasoning === 'string' ? r.reasoning.trim().slice(0, 140) : '';

  return { clientId, score: Math.round(score), riskBand, atRisk, signal, reasoning };
}

function sanitizeResponse(raw: unknown, validIds: Set<string>): PrioritizeResponse {
  const empty: PrioritizeResponse = { rankings: [], generatedAt: new Date().toISOString() };
  if (!raw || typeof raw !== 'object') return empty;
  const r = raw as Record<string, unknown>;
  const arr = Array.isArray(r.rankings) ? r.rankings : [];
  const seen = new Set<string>();
  const rankings: ClientRanking[] = [];
  for (const item of arr) {
    const ranking = sanitizeRanking(item, validIds);
    if (!ranking) continue;
    if (seen.has(ranking.clientId)) continue;
    seen.add(ranking.clientId);
    rankings.push(ranking);
  }
  rankings.sort((a, b) => b.score - a.score);
  return { rankings, generatedAt: new Date().toISOString() };
}

// ─── Route handler ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const ipKey = getClientKey(request);
    if (!takeToken(ipKey)) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': '6' } }
      );
    }

    const body = (await request.json()) as PrioritizeRequestBody;
    if (!Array.isArray(body.clients)) {
      return NextResponse.json({ error: 'clients array is required' }, { status: 400 });
    }
    if (!Array.isArray(body.agreements)) {
      return NextResponse.json({ error: 'agreements array is required' }, { status: 400 });
    }
    if (body.clients.length === 0) {
      return NextResponse.json(
        { rankings: [], generatedAt: new Date().toISOString() } satisfies PrioritizeResponse,
        { status: 200, headers: { 'X-Ariex-Cache': 'empty' } }
      );
    }

    // Server cache check
    const cacheKey = inputHash(body);
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { headers: { 'X-Ariex-Cache': 'hit' } });
    }

    const validIds = new Set(body.clients.map(c => c.id));

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_INSIGHTS_MODEL || 'gpt-4o-mini',
      max_tokens: Math.min(4000, 200 + body.clients.length * 80),
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(body) },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      const fallback: PrioritizeResponse = { rankings: [], generatedAt: new Date().toISOString() };
      return NextResponse.json(fallback, { headers: { 'X-Ariex-Cache': 'empty' } });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('[prioritize-clients] Non-JSON response:', raw.slice(0, 200));
      const fallback: PrioritizeResponse = { rankings: [], generatedAt: new Date().toISOString() };
      return NextResponse.json(fallback, { headers: { 'X-Ariex-Cache': 'empty' } });
    }

    const sanitized = sanitizeResponse(parsed, validIds);
    setCached(cacheKey, sanitized);
    return NextResponse.json(sanitized, { headers: { 'X-Ariex-Cache': 'miss' } });
  } catch (error: unknown) {
    const err = error as { code?: string; status?: number; message?: string };
    console.error('[prioritize-clients] Error:', err);
    if (err.code === 'invalid_api_key' || err.status === 401) {
      return NextResponse.json({ error: 'Invalid OpenAI API key.' }, { status: 401 });
    }
    if (err.status === 429) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
