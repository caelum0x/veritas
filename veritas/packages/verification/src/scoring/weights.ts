// Verdict weight table: maps each Verdict to a numeric weight in [0, 1] for trust score computation.

import { Verdict } from "@veritas/core";
import type { Verdict as VerdictType } from "@veritas/core";

/**
 * Weight assigned to each verdict when computing the aggregate trust score.
 * SUPPORTED evidence pushes the score up; REFUTED pulls it down; UNVERIFIABLE
 * contributes a neutral midpoint but reduces overall certainty.
 */
export const VERDICT_WEIGHTS: Readonly<Record<VerdictType, number>> = {
  [Verdict.SUPPORTED]: 1.0,
  [Verdict.UNVERIFIABLE]: 0.5,
  [Verdict.REFUTED]: 0.0,
} as const;

/** Retrieve the numeric weight for a given verdict. */
export function weightForVerdict(verdict: VerdictType): number {
  return VERDICT_WEIGHTS[verdict];
}
