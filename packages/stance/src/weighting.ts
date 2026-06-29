// Weight stance signals by source authority tier for aggregation
import type { CitationStance, WeightedStance } from "./types.js";

/** Source tier authority weights (mirrors @veritas/core SourceTier ordering) */
const TIER_WEIGHTS: Record<string, number> = {
  tier1: 1.0,
  tier2: 0.75,
  tier3: 0.5,
  tier4: 0.25,
  unknown: 0.1,
};

const DEFAULT_WEIGHT = 0.3;

/** Derive a base authority weight from optional tier metadata */
export function tierWeight(tier: string | null | undefined): number {
  if (tier == null) return DEFAULT_WEIGHT;
  const normalized = tier.toLowerCase().replace(/\s+/g, "");
  return TIER_WEIGHTS[normalized] ?? DEFAULT_WEIGHT;
}

/**
 * Apply authority weight to a citation stance.
 * The effective weight combines source tier authority with citation confidence.
 */
export function applyCitationWeight(
  citation: CitationStance,
  tier: string | null | undefined,
): WeightedStance {
  const authority = tierWeight(tier);
  // Combine tier authority with per-citation confidence for effective weight
  const weight = authority * citation.confidence;
  return {
    stance:     citation.stance,
    confidence: citation.confidence,
    weight:     Math.max(0, Math.min(1, weight)),
  };
}

/**
 * Normalise a list of weighted stances so weights sum to 1.
 * Returns new objects — does not mutate input.
 */
export function normalizeWeights(signals: readonly WeightedStance[]): readonly WeightedStance[] {
  if (signals.length === 0) return [];
  const total = signals.reduce((s, w) => s + w.weight, 0);
  if (total === 0) {
    const even = 1 / signals.length;
    return signals.map((s) => ({ ...s, weight: even }));
  }
  return signals.map((s) => ({ ...s, weight: s.weight / total }));
}

/**
 * Weight a batch of citation stances using an optional tier resolver.
 * Falls back to uniform weight when no tier is available.
 */
export function weightCitationStances(
  citations: readonly CitationStance[],
  tierResolver?: (sourceId: string | null) => string | null,
): readonly WeightedStance[] {
  const raw = citations.map((c) => {
    const tier = tierResolver ? tierResolver(c.sourceId) : null;
    return applyCitationWeight(c, tier);
  });
  return normalizeWeights(raw);
}
