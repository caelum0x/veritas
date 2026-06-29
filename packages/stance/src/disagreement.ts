// Measure disagreement (controversy) across weighted stance signals
import type { WeightedStance, DisagreementReport } from "./types.js";
import { stanceToNumber } from "./stance.js";

/** Threshold above which a set of stances is considered controversial */
const CONTROVERSY_THRESHOLD = 0.35;

/**
 * Count weighted signals by polarity bucket.
 * Returns summed weights for supporting, opposing, and neutral signals.
 */
function bucketWeights(signals: readonly WeightedStance[]): {
  supporting: number;
  opposing:   number;
  neutral:    number;
} {
  let supporting = 0;
  let opposing   = 0;
  let neutral    = 0;
  for (const s of signals) {
    const n = stanceToNumber(s.stance);
    if (n > 0)      supporting += s.weight;
    else if (n < 0) opposing   += s.weight;
    else            neutral    += s.weight;
  }
  return { supporting, opposing, neutral };
}

/**
 * Compute a disagreement score in [0,1].
 * Score reflects the proportion of minority-polarity weight vs total polar weight.
 * A score of 0 means unanimous; 0.5 means evenly split; 1 means impossible edge case.
 */
export function measureDisagreement(signals: readonly WeightedStance[]): DisagreementReport {
  const total = signals.length;
  if (total === 0) {
    return { score: 0, supporting: 0, opposing: 0, neutral: 0, total: 0, isControversial: false };
  }

  const { supporting, opposing, neutral } = bucketWeights(signals);
  const polar = supporting + opposing;

  // Disagreement is defined as the minority polar bucket over total polar weight
  const score = polar === 0
    ? 0
    : Math.min(supporting, opposing) / polar;

  return {
    score:          Math.max(0, Math.min(1, score)),
    supporting:     signals.filter((s) => stanceToNumber(s.stance) > 0).length,
    opposing:       signals.filter((s) => stanceToNumber(s.stance) < 0).length,
    neutral:        signals.filter((s) => stanceToNumber(s.stance) === 0).length,
    total,
    isControversial: score >= CONTROVERSY_THRESHOLD,
  };
}

/**
 * Compute weighted variance of numeric stance values as an alternative
 * disagreement metric (useful for continuous confidence models).
 */
export function stanceVariance(signals: readonly WeightedStance[]): number {
  if (signals.length === 0) return 0;
  const totalWeight = signals.reduce((s, w) => s + w.weight, 0);
  if (totalWeight === 0) return 0;

  const mean = signals.reduce((s, w) => s + stanceToNumber(w.stance) * w.weight, 0) / totalWeight;
  const variance = signals.reduce((s, w) => {
    const diff = stanceToNumber(w.stance) - mean;
    return s + w.weight * diff * diff;
  }, 0) / totalWeight;

  return Math.max(0, Math.min(1, variance));
}
