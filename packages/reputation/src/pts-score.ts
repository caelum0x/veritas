// Provider Trust Score (PTS): branded numeric score for CAP agent reputation in [0, 1].

import { clampScore, asScore, type Score } from "@veritas/core";
import { z } from "zod";

/** Branded PTS wrapping a core Score, distinct from generic confidence scores. */
export type PtsScore = Score & { readonly __pts: true };

/** Minimum PTS at which an agent is considered trusted. */
export const PTS_TRUST_THRESHOLD = 0.5 as const;

/** Default PTS assigned to newly-onboarded agents. */
export const PTS_INITIAL = 0.3 as const;

/** Zod schema for raw PTS numeric values. */
export const ptsScoreSchema = z.number().min(0).max(1).brand<"PtsScore">();

/** Cast a Score to PTS (no runtime cost). */
export function asPtsScore(value: number): PtsScore {
  return asScore(value) as unknown as PtsScore;
}

/** Clamp any finite number into a valid PTS without throwing. */
export function clampPtsScore(value: number): PtsScore {
  return clampScore(value) as unknown as PtsScore;
}

/** Return true when the PTS meets the trust threshold. */
export function isTrusted(pts: PtsScore): boolean {
  return pts >= PTS_TRUST_THRESHOLD;
}

/** Blend two PTS values with an explicit weight in [0, 1] for the first score. */
export function blendPts(a: PtsScore, b: PtsScore, weight: number): PtsScore {
  const w = Math.min(1, Math.max(0, weight));
  return clampPtsScore(a * w + b * (1 - w));
}

/** Format PTS as a human-readable percentage string, e.g. "73%". */
export function formatPts(pts: PtsScore): string {
  return `${Math.round(pts * 100)}%`;
}
