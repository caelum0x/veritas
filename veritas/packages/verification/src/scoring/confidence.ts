// Confidence normalization: maps raw LLM confidence scores to calibrated [0, 1] values.

import { clampScore } from "@veritas/core";
import type { Score } from "@veritas/core";

/**
 * Calibration factor applied to raw LLM confidence.
 * LLMs tend to be overconfident; this shrinks raw values toward a midpoint
 * so that a raw 1.0 becomes ~0.9 and 0.0 stays at 0.
 */
const CALIBRATION_FACTOR = 0.9;

/**
 * Normalize a raw confidence score from an LLM into a calibrated Score.
 * Applies mild shrinkage toward zero to account for LLM overconfidence.
 *
 * @param raw - Raw confidence value from the LLM, expected in [0, 1].
 * @returns Calibrated Score clamped to [0, 1].
 */
export function normalizeConfidence(raw: Score): Score {
  return clampScore(raw * CALIBRATION_FACTOR);
}

/**
 * Compute a weighted average of confidence scores.
 * Each entry pairs a confidence value with a positive weight.
 * Returns 0 when the entries array is empty or total weight is zero.
 *
 * @param entries - Array of { confidence, weight } pairs.
 */
export function weightedMeanConfidence(
  entries: ReadonlyArray<{ readonly confidence: Score; readonly weight: number }>,
): Score {
  if (entries.length === 0) return clampScore(0);

  let weightedSum = 0;
  let totalWeight = 0;

  for (const { confidence, weight } of entries) {
    const w = Math.max(0, weight);
    weightedSum += confidence * w;
    totalWeight += w;
  }

  if (totalWeight === 0) return clampScore(0);
  return clampScore(weightedSum / totalWeight);
}
