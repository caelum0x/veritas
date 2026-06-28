// Compute final stance confidence score combining authority weights and disagreement
import { numberToStance, stanceToNumber } from "./stance.js";
import { measureDisagreement } from "./disagreement.js";
import type { WeightedStance, ScoredStance, AggregatedStance } from "./types.js";

/**
 * Compute a weighted-mean stance score from normalised signals.
 * Returns a value in [-1, 1] reflecting the net polar direction.
 */
function weightedMean(signals: readonly WeightedStance[]): number {
  if (signals.length === 0) return 0;
  const totalWeight = signals.reduce((s, w) => s + w.weight, 0);
  if (totalWeight === 0) return 0;
  return signals.reduce((s, w) => s + stanceToNumber(w.stance) * w.weight, 0) / totalWeight;
}

/**
 * Derive a confidence scalar from the mean score and disagreement.
 * High disagreement penalises confidence even if the mean is strong.
 */
function deriveConfidence(mean: number, disagreementScore: number): number {
  const polarStrength = Math.abs(mean);           // 0-1: how strongly polar
  const agreementBonus = 1 - disagreementScore;   // 0-1: higher = less contested
  const raw = polarStrength * agreementBonus;
  return Math.max(0, Math.min(1, raw));
}

/**
 * Score a set of weighted stance signals into a ScoredStance.
 * The final score penalises high disagreement to avoid overconfident verdicts.
 */
export function scoreStances(signals: readonly WeightedStance[]): ScoredStance {
  if (signals.length === 0) {
    const emptyDisagreement = measureDisagreement([]);
    return { stance: "neutral", score: 0, disagreement: emptyDisagreement };
  }

  const disagreement = measureDisagreement(signals);
  const mean         = weightedMean(signals);
  const stance       = numberToStance(mean);
  const score        = deriveConfidence(mean, disagreement.score);

  return { stance, score, disagreement };
}

/**
 * Convert weighted signals into an AggregatedStance summary (count-based view).
 */
export function aggregateStances(signals: readonly WeightedStance[]): AggregatedStance {
  const scored = scoreStances(signals);
  const { supporting, opposing, neutral, total } = scored.disagreement;
  return {
    dominant:   scored.stance,
    confidence: scored.score,
    supporting,
    opposing,
    neutral,
    total,
  };
}

/**
 * Blend two scored stances using an explicit alpha blend [0,1].
 * Alpha=1 returns stanceA, alpha=0 returns stanceB.
 */
export function blendScores(
  stanceA: ScoredStance,
  stanceB: ScoredStance,
  alpha: number,
): ScoredStance {
  const a = Math.max(0, Math.min(1, alpha));
  const numA = stanceToNumber(stanceA.stance) * stanceA.score;
  const numB = stanceToNumber(stanceB.stance) * stanceB.score;
  const blended = numA * a + numB * (1 - a);
  const blendedScore = stanceA.score * a + stanceB.score * (1 - a);
  const blendedDisagreement = stanceA.disagreement.score * a + stanceB.disagreement.score * (1 - a);

  return {
    stance: numberToStance(blended),
    score:  Math.max(0, Math.min(1, blendedScore)),
    disagreement: {
      ...stanceA.disagreement,
      score:           blendedDisagreement,
      isControversial: blendedDisagreement >= 0.35,
    },
  };
}
