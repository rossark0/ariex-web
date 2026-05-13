import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

// ─── Types ────────────────────────────────────────────────────────────────

type FilingStatus =
  | 'single'
  | 'married_filing_jointly'
  | 'married_filing_separately'
  | 'head_of_household';

type StrategyId =
  | 's_corp_election'
  | 'solo_401k'
  | 'section_179_vehicle'
  | 'hsa_contribution';

interface ScenarioInputsLite {
  filingStatus: FilingStatus;
  wages: number;
  selfEmploymentIncome: number;
  otherIncome: number;
  year?: number;
  state?: string;
}

interface ScenarioBlueprint {
  name: string;
  rationale: string;
  inputs: ScenarioInputsLite;
  enabledStrategies: StrategyId[];
  notes: string[];
}

interface GenerateScenarioRequestBody {
  /** PII-sanitized client / profile / docs / agreements snapshot. */
  context: {
    client?: Record<string, unknown> | null;
    profile?: Record<string, unknown> | null;
    documents?: Array<Record<string, unknown>>;
    agreements?: Array<Record<string, unknown>>;
  };
  /** The current baseline (used as a seed; AI may revise). */
  currentInputs: ScenarioInputsLite;
  /** Tax year the strategist wants to model for. */
  year: number;
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

// ─── Per-IP rate limit (token bucket) ─────────────────────────────────────

const RATE_LIMIT_PER_MINUTE = 10;
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
  const refill = (elapsedMs / 60000) * RATE_LIMIT_PER_MINUTE;
  bucket.tokens = Math.min(RATE_LIMIT_PER_MINUTE, bucket.tokens + refill);
  bucket.lastRefill = now;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

// ─── Prompt builder ────────────────────────────────────────────────────────

function buildSystemPrompt(year: number): string {
  return `You are the **ARIEX Scenario Generator** — a senior tax strategist AI that turns a
client's actual situation into a runnable tax-planning scenario inside the ARIEX Scenario
Workspace.

You have FOUR strategies available. You must choose which to enable based on the client's
real picture (entity type, income mix, prior filings on hand, agreement state):

1. **s_corp_election** — Reasonable salary + distribution split. Saves SE tax on the
   distribution portion. APPLICABLE WHEN: client has an LLC or sole proprietorship with
   self-employment income ≥ ~$60k. NOT applicable if already an S-Corp, partnership, or
   C-Corp.
2. **solo_401k** — Pre-tax employee deferral up to the year's limit ($24,500 in 2026).
   APPLICABLE WHEN: client has earned income (W-2 or SE) ≥ $30k AND no existing employer
   401(k) blocking the Solo plan.
3. **section_179_vehicle** — $20k year-one expense for a qualifying business vehicle.
   APPLICABLE WHEN: client has self-employment / pass-through income ≥ $40k AND mentions
   or implies a vehicle in their docs/profile. Skip if no signal of vehicle use.
4. **hsa_contribution** — Pre-tax HDHP-paired HSA contribution. APPLICABLE WHEN: client
   is enrolled in an HDHP. If unknown, suggest WITH a note to verify HDHP enrollment.

OUTPUT REQUIREMENTS:
- Return a single JSON object matching the schema below. No prose around it.
- Tax year for math: ${year}.
- Pick a descriptive scenario name that names the strategies, e.g. "S-Corp + Solo 401(k) — Acme LLC 2026".
- Refine inputs from the seed only if the documents or profile clearly contradict them
  (e.g., a 1099 in docs implies SE income; W-2 in docs implies wages).
- enabledStrategies: only include strategies you are confident apply. Empty array is OK.
- rationale (≤ 200 chars): the one-sentence pitch you'd give the strategist.
- notes: 2–5 short bullets summarizing the planning logic, including any flags that
  require verification ("Confirm HDHP enrollment", "Need 2024 1040 to validate baseline", etc.).

JSON SCHEMA (you must return exactly this shape):
{
  "name": string,
  "rationale": string,
  "inputs": {
    "filingStatus": "single"|"married_filing_jointly"|"married_filing_separately"|"head_of_household",
    "wages": number,
    "selfEmploymentIncome": number,
    "otherIncome": number,
    "year": ${year},
    "state": string
  },
  "enabledStrategies": Array<"s_corp_election"|"solo_401k"|"section_179_vehicle"|"hsa_contribution">,
  "notes": string[]
}

CRITICAL RULES:
- Never fabricate data. If the docs don't reveal something, leave the seed value as-is.
- Don't enable a strategy "just in case" — only when the data justifies it.
- If the client picture is too thin to plan meaningfully, return an empty enabledStrategies
  array with a note explaining what's needed.`;
}

function buildUserPrompt(body: GenerateScenarioRequestBody): string {
  return `--- CLIENT CONTEXT ---
${JSON.stringify(body.context.client ?? null, null, 2)}

--- CLIENT PROFILE ---
${JSON.stringify(body.context.profile ?? null, null, 2)}

--- DOCUMENTS ON FILE (${body.context.documents?.length ?? 0}) ---
${JSON.stringify(body.context.documents ?? [], null, 2)}

--- AGREEMENTS (${body.context.agreements?.length ?? 0}) ---
${JSON.stringify(body.context.agreements ?? [], null, 2)}

--- CURRENT BASELINE INPUTS (seed) ---
${JSON.stringify(body.currentInputs, null, 2)}

Generate the scenario blueprint JSON now.`;
}

// ─── Response sanitization ─────────────────────────────────────────────────

const VALID_FILING_STATUSES: FilingStatus[] = [
  'single',
  'married_filing_jointly',
  'married_filing_separately',
  'head_of_household',
];

const VALID_STRATEGIES: StrategyId[] = [
  's_corp_election',
  'solo_401k',
  'section_179_vehicle',
  'hsa_contribution',
];

function sanitizeBlueprint(
  raw: unknown,
  fallback: ScenarioInputsLite,
  year: number
): ScenarioBlueprint {
  const empty: ScenarioBlueprint = {
    name: 'AI-generated scenario',
    rationale: '',
    inputs: { ...fallback, year },
    enabledStrategies: [],
    notes: [],
  };
  if (!raw || typeof raw !== 'object') return empty;
  const r = raw as Record<string, unknown>;

  const nameRaw = typeof r.name === 'string' ? r.name.trim() : '';
  const rationaleRaw = typeof r.rationale === 'string' ? r.rationale.trim() : '';

  let inputs: ScenarioInputsLite = { ...fallback, year };
  if (r.inputs && typeof r.inputs === 'object') {
    const i = r.inputs as Record<string, unknown>;
    const fs = typeof i.filingStatus === 'string' ? i.filingStatus : '';
    inputs = {
      filingStatus: VALID_FILING_STATUSES.includes(fs as FilingStatus)
        ? (fs as FilingStatus)
        : fallback.filingStatus,
      wages: typeof i.wages === 'number' && Number.isFinite(i.wages) ? i.wages : fallback.wages,
      selfEmploymentIncome:
        typeof i.selfEmploymentIncome === 'number' && Number.isFinite(i.selfEmploymentIncome)
          ? i.selfEmploymentIncome
          : fallback.selfEmploymentIncome,
      otherIncome:
        typeof i.otherIncome === 'number' && Number.isFinite(i.otherIncome)
          ? i.otherIncome
          : fallback.otherIncome,
      year,
      state: typeof i.state === 'string' ? i.state : fallback.state,
    };
  }

  const stratsRaw = Array.isArray(r.enabledStrategies) ? r.enabledStrategies : [];
  const enabledStrategies = stratsRaw
    .filter((x): x is StrategyId => typeof x === 'string' && VALID_STRATEGIES.includes(x as StrategyId))
    .filter((x, i, arr) => arr.indexOf(x) === i); // dedupe

  const notesRaw = Array.isArray(r.notes) ? r.notes : [];
  const notes = notesRaw
    .filter((x): x is string => typeof x === 'string')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .slice(0, 8);

  return {
    name: nameRaw.slice(0, 80) || 'AI-generated scenario',
    rationale: rationaleRaw.slice(0, 240),
    inputs,
    enabledStrategies,
    notes,
  };
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

    const body = (await request.json()) as GenerateScenarioRequestBody;

    if (!body.currentInputs) {
      return NextResponse.json(
        { error: 'currentInputs is required' },
        { status: 400 }
      );
    }
    const year = Number.isFinite(body.year) ? body.year : 2026;

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_INSIGHTS_MODEL || 'gpt-4o-mini',
      max_tokens: 900,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(year) },
        { role: 'user', content: buildUserPrompt(body) },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(sanitizeBlueprint(null, body.currentInputs, year), { status: 200 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('[generate-scenario] Model returned non-JSON:', raw.slice(0, 200));
      return NextResponse.json(sanitizeBlueprint(null, body.currentInputs, year), { status: 200 });
    }

    const blueprint = sanitizeBlueprint(parsed, body.currentInputs, year);
    return NextResponse.json(blueprint);
  } catch (error: unknown) {
    const err = error as { code?: string; status?: number; message?: string };
    console.error('[generate-scenario] Error:', err);
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
