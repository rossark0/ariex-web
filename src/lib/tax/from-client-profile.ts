/**
 * Adapter that derives ScenarioInputs from a client's persisted profile.
 *
 * Used by the Scenario Workspace to auto-populate baseline numbers when a
 * strategist links a scenario to a specific client. Returns only the fields
 * the profile actually provides — the workspace merges this on top of the
 * existing scenario inputs so manual edits aren't clobbered for fields the
 * profile doesn't know about.
 */

import { STATE_TAX, type FilingStatus, type ScenarioInputs, type UsState } from './calculator';
import type { ApiClient, ApiClientProfile } from '@/lib/api/strategist.api';

const VALID_FILING_STATUSES: FilingStatus[] = [
  'single',
  'married_filing_jointly',
  'married_filing_separately',
  'head_of_household',
];

/** Set of US state codes we model. */
const STATE_CODES = new Set<UsState>(Object.keys(STATE_TAX) as UsState[]);

/** Pull a 2-letter US state code out of a free-form address like
 *  "123 Main St, San Francisco, CA 94110" or "Austin, TX". */
function parseStateFromAddress(address: string | undefined | null): UsState | null {
  if (!address) return null;
  // Match the last ", XX" or " XX " token (case-insensitive uppercase letters only)
  const matches = address.match(/[,\s]([A-Z]{2})(?:\s+\d{5}|\s|,|$)/g);
  if (!matches || matches.length === 0) return null;
  // Take the last hit (state usually comes right before zip)
  const last = matches[matches.length - 1];
  const codeMatch = last.match(/[A-Z]{2}/);
  if (!codeMatch) return null;
  const code = codeMatch[0] as UsState;
  return STATE_CODES.has(code) ? code : null;
}

function resolveState(profile: ApiClientProfile | undefined): UsState | null {
  if (!profile) return null;
  // Prefer the explicit state field (2-letter code), fall back to parsing
  // it out of the freeform address.
  const stateCandidate = profile.state ?? '';
  if (typeof stateCandidate === 'string' && stateCandidate.length === 2) {
    const code = stateCandidate.toUpperCase() as UsState;
    if (STATE_CODES.has(code)) return code;
  }
  return parseStateFromAddress(profile.address);
}

function resolveFilingStatus(profile: ApiClientProfile | undefined): FilingStatus | null {
  if (!profile?.filingStatus) return null;
  const cleaned = profile.filingStatus.toLowerCase().replace(/\s+/g, '_');
  return VALID_FILING_STATUSES.find(s => s === cleaned) ?? null;
}

/** Split the client's estimatedIncome between SE and wages based on whether
 *  they have a business entity. Clients with any businessType are treated as
 *  pass-through SE earners; clients without are treated as W-2 employees. */
function resolveIncomeSplit(profile: ApiClientProfile | undefined): {
  wages: number;
  selfEmploymentIncome: number;
} | null {
  if (!profile) return null;
  const income = profile.estimatedIncome;
  if (typeof income !== 'number' || !Number.isFinite(income) || income <= 0) return null;
  const hasBusiness =
    typeof profile.businessType === 'string' && profile.businessType.length > 0;
  return hasBusiness
    ? { wages: 0, selfEmploymentIncome: income }
    : { wages: income, selfEmploymentIncome: 0 };
}

export interface ClientProfileSyncResult {
  /** Patch suitable for merging on top of existing scenario inputs. Only
   *  contains fields the profile actually provided. */
  patch: Partial<ScenarioInputs>;
  /** Human-readable list of fields filled in from the profile. */
  filledFields: string[];
}

/**
 * Derive a partial ScenarioInputs from a client + profile. Fields without
 * source data in the profile are omitted from the patch so the caller can
 * preserve existing values.
 */
export function clientProfileToScenarioInputs(client: ApiClient): ClientProfileSyncResult {
  const profile = client.clientProfile;
  const patch: Partial<ScenarioInputs> = {};
  const filledFields: string[] = [];

  const filingStatus = resolveFilingStatus(profile);
  if (filingStatus) {
    patch.filingStatus = filingStatus;
    filledFields.push('Filing status');
  }

  const state = resolveState(profile);
  if (state) {
    patch.state = state;
    filledFields.push('State');
  }

  const split = resolveIncomeSplit(profile);
  if (split) {
    patch.wages = split.wages;
    patch.selfEmploymentIncome = split.selfEmploymentIncome;
    filledFields.push(
      split.selfEmploymentIncome > 0 ? 'SE income' : 'W-2 wages'
    );
  }

  return { patch, filledFields };
}
