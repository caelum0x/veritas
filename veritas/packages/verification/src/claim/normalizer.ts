// Normalize claim text: trim, collapse whitespace, fix casing, strip noise.
import { normalizeWhitespace, truncate } from "@veritas/core";

const MAX_CLAIM_LENGTH = 1000;

const NOISE_PREFIXES = [
  /^(it is (said|claimed|alleged|reported|believed) that\s+)/i,
  /^(according to (some|many|experts?|reports?),?\s+)/i,
  /^(some people (say|think|believe) that\s+)/i,
  /^(there (are|is) (claims?|reports?) that\s+)/i,
];

const NOISE_SUFFIXES = [
  /(\s+according to (some|many|experts?|reports?)\.?)$/i,
  /(\s+or so (they|people) (say|claim)\.?)$/i,
];

function stripNoisePrefixes(text: string): string {
  let result = text;
  for (const pattern of NOISE_PREFIXES) {
    const match = result.match(pattern);
    if (match) {
      result = result.slice(match[0].length);
      break;
    }
  }
  return result;
}

function stripNoiseSuffixes(text: string): string {
  let result = text;
  for (const pattern of NOISE_SUFFIXES) {
    result = result.replace(pattern, "");
  }
  return result;
}

function ensureTermination(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) return trimmed;
  if (!/[.!?]$/.test(trimmed)) {
    return trimmed + ".";
  }
  return trimmed;
}

function capitalizeFirst(text: string): string {
  if (text.length === 0) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Normalize a single claim string for consistent downstream processing.
 * Returns null if the claim is empty or too short to be meaningful.
 */
export function normalizeClaim(text: string): string | null {
  let result = normalizeWhitespace(text).trim();
  if (result.length < 5) return null;

  result = stripNoisePrefixes(result);
  result = stripNoiseSuffixes(result);
  result = capitalizeFirst(result.trim());
  result = ensureTermination(result);
  result = truncate(result, MAX_CLAIM_LENGTH);

  return result.trim().length >= 5 ? result : null;
}

/**
 * Normalize an array of claim texts, filtering out empty or invalid results.
 */
export function normalizeClaims(texts: readonly string[]): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const text of texts) {
    const normalized = normalizeClaim(text);
    if (normalized !== null && !seen.has(normalized)) {
      seen.add(normalized);
      results.push(normalized);
    }
  }

  return results;
}
