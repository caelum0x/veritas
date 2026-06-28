// Classification confidence scoring and thresholds for taxonomy assignments.

import { clampScore, type Score, asScore } from "@veritas/core";
import type { ClaimType } from "./claim-type.js";
import type { Domain } from "./domain.js";

/** Minimum confidence required to accept a classification result. */
export const MIN_CONFIDENCE: Score = asScore(0.3);

/** Confidence threshold above which results are considered high-quality. */
export const HIGH_CONFIDENCE_THRESHOLD: Score = asScore(0.75);

/** Confidence threshold above which results are considered medium-quality. */
export const MEDIUM_CONFIDENCE_THRESHOLD: Score = asScore(0.5);

/** Quality tier derived from confidence score. */
export type ConfidenceTier = "high" | "medium" | "low" | "insufficient";

/** Per-classification confidence with rationale. */
export interface ClassificationConfidence {
  readonly score: Score;
  readonly tier: ConfidenceTier;
  readonly signals: readonly string[];
}

/** Aggregate confidence for a full taxonomy classification. */
export interface TaxonomyConfidence {
  readonly claimType: ClassificationConfidence;
  readonly domain: ClassificationConfidence;
  readonly overall: Score;
}

/** Determine confidence tier from a numeric score. */
export function confidenceTier(score: Score): ConfidenceTier {
  if (score >= HIGH_CONFIDENCE_THRESHOLD) return "high";
  if (score >= MEDIUM_CONFIDENCE_THRESHOLD) return "medium";
  if (score >= MIN_CONFIDENCE) return "low";
  return "insufficient";
}

/** Build a ClassificationConfidence from a raw score and signal list. */
export function makeClassificationConfidence(
  rawScore: number,
  signals: readonly string[],
): ClassificationConfidence {
  const score = clampScore(rawScore);
  return { score, tier: confidenceTier(score), signals };
}

/** Combine claim-type and domain confidences into an aggregate. */
export function makeTaxonomyConfidence(
  claimType: ClassificationConfidence,
  domain: ClassificationConfidence,
): TaxonomyConfidence {
  const overall = clampScore((claimType.score + domain.score) / 2);
  return { claimType, domain, overall };
}

/** Boost a confidence score by a delta, clamping to [0,1]. */
export function boostConfidence(
  confidence: ClassificationConfidence,
  delta: number,
  reason: string,
): ClassificationConfidence {
  const newScore = clampScore(confidence.score + delta);
  return makeClassificationConfidence(newScore, [...confidence.signals, reason]);
}

/** Penalty tables: how many matched features each type/domain typically needs. */
export const CLAIM_TYPE_BASE_CONFIDENCE: Readonly<Record<ClaimType, number>> = {
  statistical: 0.6,
  causal: 0.55,
  definitional: 0.5,
  predictive: 0.55,
  quote: 0.7,
  event: 0.6,
  comparative: 0.55,
} as const;

export const DOMAIN_BASE_CONFIDENCE: Readonly<Record<Domain, number>> = {
  financial: 0.6,
  scientific: 0.65,
  medical: 0.65,
  news: 0.55,
  crypto: 0.65,
  legal: 0.6,
  general: 0.4,
} as const;

/** Compute confidence from number of matched keyword signals. */
export function scoreFromMatches(
  base: number,
  matchCount: number,
  maxBoost: number = 0.35,
): Score {
  const boost = Math.min(matchCount * 0.07, maxBoost);
  return clampScore(base + boost);
}
