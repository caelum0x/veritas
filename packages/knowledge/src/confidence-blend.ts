// Blends confidence scores from a cached knowledge record with fresh verification results.

import type { KnowledgeRecord } from "./knowledge-record.js";

/** Weights controlling how cached vs. fresh confidence are combined. */
export interface BlendWeights {
  /** Weight applied to the cached record's confidence (0–1). */
  readonly cachedWeight: number;
  /** Weight applied to the fresh verification confidence (0–1). */
  readonly freshWeight: number;
  /**
   * Similarity score (0–1) from semantic lookup; higher similarity increases
   * trust in the cached value.
   */
  readonly similarityBonus: number;
}

/** Default blend: 40% cached, 60% fresh, similarity provides up to 0.1 bonus. */
export const DEFAULT_BLEND_WEIGHTS: BlendWeights = Object.freeze({
  cachedWeight: 0.4,
  freshWeight: 0.6,
  similarityBonus: 0.1,
});

/**
 * Computes a blended confidence score from a cached record and a fresh
 * confidence value, scaled by semantic similarity.
 */
export function blendConfidence(
  cached: KnowledgeRecord,
  freshConfidence: number,
  similarity: number,
  weights: BlendWeights = DEFAULT_BLEND_WEIGHTS,
): number {
  const clampedSimilarity = Math.max(0, Math.min(1, similarity));
  const clampedFresh = Math.max(0, Math.min(1, freshConfidence));
  const clampedCached = Math.max(0, Math.min(1, cached.confidence));

  const base =
    clampedCached * weights.cachedWeight +
    clampedFresh * weights.freshWeight +
    clampedSimilarity * weights.similarityBonus;

  return Math.max(0, Math.min(1, base));
}

/**
 * When only a cached result is available (no fresh verification), returns the
 * cached confidence discounted by staleness expressed as a fraction in [0, 1].
 */
export function discountCachedConfidence(
  cached: KnowledgeRecord,
  stalenessFraction: number,
): number {
  const discount = Math.max(0, Math.min(1, stalenessFraction));
  return Math.max(0, cached.confidence * (1 - discount * 0.5));
}

/**
 * Returns the confidence to surface when the cached verdict agrees with the
 * fresh verdict vs. when they conflict.
 */
export function reconcileVerdicts(
  cached: KnowledgeRecord,
  freshVerdict: string,
  freshConfidence: number,
  similarity: number,
  weights: BlendWeights = DEFAULT_BLEND_WEIGHTS,
): { readonly confidence: number; readonly verdictAgreed: boolean } {
  const verdictAgreed = cached.verdict === freshVerdict;
  if (verdictAgreed) {
    return {
      confidence: blendConfidence(cached, freshConfidence, similarity, weights),
      verdictAgreed: true,
    };
  }
  // On disagreement, defer entirely to the fresh result with a small penalty.
  return {
    confidence: Math.max(0, freshConfidence - 0.05),
    verdictAgreed: false,
  };
}
