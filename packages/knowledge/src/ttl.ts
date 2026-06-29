// Freshness policy: determines whether a cached knowledge record has expired.

import type { IsoTimestamp } from "@veritas/core";
import { isoToEpoch } from "@veritas/core";

/** TTL configuration for knowledge cache entries. */
export interface TtlPolicy {
  /** Maximum age in milliseconds before a record is considered stale. */
  readonly maxAgeMs: number;
  /** If true, high-confidence records get an extended TTL multiplier. */
  readonly boostHighConfidence: boolean;
  /** Multiplier applied to maxAgeMs when confidence >= confidenceBoostThreshold. */
  readonly confidenceBoostMultiplier: number;
  /** Confidence score threshold (0-1) above which the boost applies. */
  readonly confidenceBoostThreshold: number;
}

/** Default freshness policy: 24-hour TTL with confidence boost for high-trust records. */
export const DEFAULT_TTL_POLICY: TtlPolicy = Object.freeze({
  maxAgeMs: 24 * 60 * 60 * 1000,
  boostHighConfidence: true,
  confidenceBoostMultiplier: 3,
  confidenceBoostThreshold: 0.85,
});

/** Returns the effective TTL in ms for a given confidence score and policy. */
export function effectiveTtlMs(confidence: number, policy: TtlPolicy): number {
  if (
    policy.boostHighConfidence &&
    confidence >= policy.confidenceBoostThreshold
  ) {
    return policy.maxAgeMs * policy.confidenceBoostMultiplier;
  }
  return policy.maxAgeMs;
}

/** Determines if a cached record is still fresh given a creation timestamp and policy. */
export function isFresh(
  cachedAt: IsoTimestamp,
  confidence: number,
  policy: TtlPolicy,
  nowMs: number = Date.now(),
): boolean {
  const epochMs = isoToEpoch(cachedAt);
  if (epochMs === null) return false;
  const ageMs = nowMs - epochMs;
  return ageMs < effectiveTtlMs(confidence, policy);
}

/** Returns the expiry timestamp (ms since epoch) for a cached record. */
export function expiresAtMs(
  cachedAt: IsoTimestamp,
  confidence: number,
  policy: TtlPolicy,
): number {
  const epochMs = isoToEpoch(cachedAt);
  if (epochMs === null) return 0;
  return epochMs + effectiveTtlMs(confidence, policy);
}
