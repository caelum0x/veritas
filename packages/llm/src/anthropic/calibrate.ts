// Confidence calibration: maps raw model confidence floats to a validated Score
import type { Score } from "@veritas/core";
import { asScore } from "@veritas/core";
import type { Verdict } from "@veritas/core";

/**
 * Applies isotonic-inspired sigmoid calibration to a raw [0,1] confidence value.
 * The curve compresses extremes and compensates for model over-confidence.
 */
function sigmoidCalibrate(raw: number): number {
  // Shift centre to 0.5 using logit-like transform, apply mild dampening
  const clipped = Math.min(Math.max(raw, 0.001), 0.999);
  const logit = Math.log(clipped / (1 - clipped));
  const dampened = logit * 0.8; // shrink towards 0.5
  return 1 / (1 + Math.exp(-dampened));
}

/**
 * Returns a calibrated Score given a raw confidence and the final verdict.
 * For TRUE/FALSE verdicts (high commitment), the calibrated score is shifted
 * slightly towards certainty; for UNCERTAIN/UNVERIFIABLE it is pulled towards 0.5.
 */
export function calibrateConfidence(
  rawConfidence: number,
  verdict: Verdict,
): Score {
  const base = sigmoidCalibrate(rawConfidence);

  let adjusted: number;

  switch (verdict) {
    case "SUPPORTED":
    case "REFUTED": {
      // High-commitment verdicts: mild boost towards certainty
      adjusted = base + (1 - base) * 0.1;
      break;
    }
    case "UNVERIFIABLE": {
      // Low-commitment verdicts: pull towards mid-range (0.35–0.65)
      const target = 0.5;
      adjusted = base + (target - base) * 0.4;
      break;
    }
    default: {
      adjusted = base;
    }
  }

  return asScore(Math.min(Math.max(adjusted, 0), 1));
}

/**
 * Converts a 0–100 integer percentage to a calibrated Score.
 * Convenience overload for models that emit integer percentages.
 */
export function calibratePercentage(
  percentageInt: number,
  verdict: Verdict,
): Score {
  return calibrateConfidence(percentageInt / 100, verdict);
}

/**
 * Parses a confidence value from an LLM output that may be a float or integer
 * percentage, then returns the calibrated Score.
 */
export function parseAndCalibrateConfidence(
  raw: number | string,
  verdict: Verdict,
): Score {
  const numeric = typeof raw === "string" ? parseFloat(raw) : raw;

  if (!Number.isFinite(numeric)) {
    // Fallback: use 0.5 for uncertain when parse fails
    return calibrateConfidence(0.5, verdict);
  }

  // Heuristic: if value is >1, assume it is a percentage
  const normalized = numeric > 1 ? numeric / 100 : numeric;
  return calibrateConfidence(normalized, verdict);
}
