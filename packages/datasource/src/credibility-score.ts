// Credibility score: aggregate domain authority, tier, and freshness into a single Score.

import { type Score, clampScore, meanScore, type IsoTimestamp } from "@veritas/core";
import { type Source } from "@veritas/contracts";
import { domainAuthorityScore, tierToAuthorityBaseline } from "./domain-authority.js";

/** Weight configuration for credibility factor aggregation. */
const WEIGHTS = {
  domainAuthority: 0.50,
  tierBaseline: 0.30,
  freshness: 0.20,
} as const;

/** Maximum age in milliseconds considered fully fresh (1 year). */
const MAX_FRESH_AGE_MS = 365 * 24 * 60 * 60 * 1000;

/** Compute a freshness Score based on how recently the source was retrieved. */
function freshnessScore(retrievedAt: string): Score {
  const ageMs = Date.now() - new Date(retrievedAt).getTime();
  if (ageMs <= 0) return clampScore(1.0);
  const ratio = 1 - Math.min(ageMs / MAX_FRESH_AGE_MS, 1);
  return clampScore(ratio);
}

/** Compute an overall credibility Score [0,1] for a Source record. */
export function credibilityScore(source: Source): Score {
  const authority = domainAuthorityScore(source.domain);
  const baseline = tierToAuthorityBaseline(source.tier);
  const fresh = freshnessScore(source.retrievedAt);

  const weighted =
    authority * WEIGHTS.domainAuthority +
    baseline * WEIGHTS.tierBaseline +
    fresh * WEIGHTS.freshness;

  return clampScore(weighted);
}

/** Compute the mean credibility Score across multiple sources. */
export function meanCredibility(sources: readonly Source[]): Score {
  if (sources.length === 0) return clampScore(0);
  return meanScore(sources.map(credibilityScore));
}
