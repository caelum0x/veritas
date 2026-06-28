// Trust score aggregation: confidence-weighted verdict aggregate over all adjudicated claims.

import { clampScore } from "@veritas/core";
import type { Score, Verdict } from "@veritas/core";
import { weightForVerdict } from "./weights.js";
import { normalizeConfidence, weightedMeanConfidence } from "./confidence.js";

/** Input record for a single adjudicated claim. */
export interface ScoredClaim {
  readonly verdict: Verdict;
  readonly confidence: Score;
}

/**
 * Compute an overall trust score for a verification run.
 *
 * The algorithm:
 * 1. For each claim, normalize the raw LLM confidence.
 * 2. Use the calibrated confidence as the weight.
 * 3. Use the verdict weight (1 = SUPPORTED, 0.5 = UNVERIFIABLE, 0 = REFUTED) as the value.
 * 4. Return the confidence-weighted mean of verdict weights.
 *
 * An empty claim list yields a trust score of 0.
 *
 * @param claims - Adjudicated claims with their verdicts and confidence scores.
 * @returns A Score in [0, 1] representing overall trustworthiness.
 */
export function computeTrustScore(claims: ReadonlyArray<ScoredClaim>): Score {
  if (claims.length === 0) return clampScore(0);

  const entries = claims.map(({ verdict, confidence }) => ({
    confidence: normalizeConfidence(confidence),
    weight: weightForVerdict(verdict),
  }));

  // Reinterpret: use normalized confidence as weight, verdict weight as the scored value.
  const weightedEntries = entries.map(({ confidence, weight }) => ({
    confidence: clampScore(weight),
    weight: confidence,
  }));

  return weightedMeanConfidence(weightedEntries);
}

/** Counts of each verdict type across all claims. */
export interface VerdictCounts {
  readonly supported: number;
  readonly refuted: number;
  readonly unverifiable: number;
  readonly total: number;
}

/** Tally verdict outcomes across the adjudicated claim list. */
export function tallyVerdicts(claims: ReadonlyArray<ScoredClaim>): VerdictCounts {
  let supported = 0;
  let refuted = 0;
  let unverifiable = 0;

  for (const { verdict } of claims) {
    if (verdict === "SUPPORTED") supported++;
    else if (verdict === "REFUTED") refuted++;
    else unverifiable++;
  }

  return { supported, refuted, unverifiable, total: claims.length };
}
