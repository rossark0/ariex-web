/**
 * Strip the genuinely sensitive identifiers from AI page contexts before
 * the data leaves the browser.
 *
 * Policy: the AI is analyzing the strategist's OWN client portfolio for the
 * strategist's OWN benefit, on the firm's OWN OpenAI account. Client display
 * names are required for the product to be usable — the strategist must know
 * WHICH client an insight is about — so names pass through. What we DO strip
 * is the high-severity, regulated stuff that the AI never needs: emails,
 * phone numbers, street addresses, and government tax IDs (SSN/EIN). Exact
 * dollar income is coarsened into tiers.
 *
 * This is a frontend mitigation; it does NOT replace a server-side audit
 * log + per-client opt-out flag, which is still recommended before scaling
 * with regulated tax data. But it removes the highest-severity items
 * (emails, addresses, taxIds, SSNs) from the OpenAI request stream while
 * keeping the tool functional.
 */

/** Keys whose values are dropped from the payload entirely. */
const PII_KEY_BLOCKLIST = new Set([
  'email',
  'phone',
  'phoneNumber',
  'address',
  'taxId',
  'ssn',
  'einMasked',
]);

/**
 * Names pass through unchanged — the strategist needs to know which client
 * each insight refers to. (Kept as an empty set so the recursion logic
 * stays identical if a future policy decides to anonymize a subset again.)
 */
const NAME_KEYS = new Set<string>([]);

/** Coarse income tiers used in place of exact dollar figures. */
function bucketIncome(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  if (value < 50_000) return '<$50k';
  if (value < 100_000) return '$50k–$100k';
  if (value < 250_000) return '$100k–$250k';
  if (value < 500_000) return '$250k–$500k';
  if (value < 1_000_000) return '$500k–$1M';
  if (value < 5_000_000) return '$1M–$5M';
  return '$5M+';
}

/** Replace a person's name with a stable, anonymized handle. */
function anonymizeName(name: string | null | undefined, fallback = 'Client'): string {
  if (!name || typeof name !== 'string') return fallback;
  // Stable hash → "Client A1" style — same name maps to same handle across calls.
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const suffix = Math.abs(hash).toString(36).slice(0, 2).toUpperCase();
  return `${fallback} ${suffix}`;
}

/** Recursive sanitizer for arbitrary nested values. */
function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return value; // safety net against deep recursion
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (PII_KEY_BLOCKLIST.has(key)) continue; // drop entirely

      if (NAME_KEYS.has(key)) {
        out[key] = anonymizeName(typeof val === 'string' ? val : null);
        continue;
      }
      if (key === 'estimatedIncome' || key === 'income' || key === 'wages') {
        const bucket = bucketIncome(typeof val === 'number' ? val : null);
        if (bucket) out[`${key}Tier`] = bucket;
        continue;
      }
      out[key] = sanitizeValue(val, depth + 1);
    }
    return out;
  }
  return value;
}

/**
 * Produce a PII-stripped copy of a page context suitable for sending to
 * external AI services. Original object is not mutated. Generic over any
 * record-like shape; callers retain their input type on the return.
 */
export function sanitizePageContext<T extends object>(ctx: T): T {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(ctx)) {
    sanitized[key] = sanitizeValue(value);
  }
  return sanitized as T;
}
