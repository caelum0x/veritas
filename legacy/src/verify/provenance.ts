import { createHash } from 'node:crypto';
import { Verdict, type ClaimVerdict } from './schema.js';

/**
 * Deterministic JSON serialisation: object keys sorted recursively so the same
 * logical value always produces the same bytes (and therefore the same hash),
 * regardless of property insertion order. This is what makes the content hash a
 * meaningful, reproducible commitment another party can recompute.
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortDeep((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/** SHA-256 (hex, `sha256:`-prefixed) over the canonical form of `value`. */
export function contentHash(value: unknown): string {
  const digest = createHash('sha256').update(canonicalize(value)).digest('hex');
  return `sha256:${digest}`;
}

/**
 * Confidence-weighted aggregate trust score in [0, 100].
 *
 * Each claim contributes its confidence as weight. SUPPORTED pulls toward 100,
 * REFUTED toward 0, UNVERIFIABLE toward a neutral 50 (we know nothing, so it
 * neither vouches for nor condemns the body). With no scorable claims, returns
 * a neutral 50.
 */
export function computeTrustScore(claims: ClaimVerdict[]): number {
  if (claims.length === 0) return 50;
  let weighted = 0;
  let totalWeight = 0;
  for (const c of claims) {
    const weight = Math.max(c.confidence, 0.01);
    const value =
      c.verdict === Verdict.Supported ? 1 : c.verdict === Verdict.Refuted ? 0 : 0.5;
    weighted += value * weight;
    totalWeight += weight;
  }
  return Math.round((weighted / totalWeight) * 1000) / 10; // one decimal place
}

export function countVerdicts(claims: ClaimVerdict[]): {
  supported: number;
  refuted: number;
  unverifiable: number;
} {
  let supported = 0;
  let refuted = 0;
  let unverifiable = 0;
  for (const c of claims) {
    if (c.verdict === Verdict.Supported) supported++;
    else if (c.verdict === Verdict.Refuted) refuted++;
    else unverifiable++;
  }
  return { supported, refuted, unverifiable };
}

export function countSources(claims: ClaimVerdict[]): number {
  const urls = new Set<string>();
  for (const c of claims) for (const cite of c.citations) if (cite.url) urls.add(cite.url);
  return urls.size;
}
