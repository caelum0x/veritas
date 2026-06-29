// Aggregate per-citation stances into a single dominant stance with confidence
import { stanceToNumber, numberToStance } from "./stance.js";
import type { CitationStance, AggregatedStance } from "./types.js";

/**
 * Aggregate an array of citation stances into a single dominant stance.
 * Each citation's contribution is scaled by its authority weight * confidence.
 * An optional override weightMap (sourceId -> weight) takes precedence over
 * the weight stored on the CitationStance itself.
 */
export function aggregateStances(
  stances: ReadonlyArray<CitationStance>,
  overrideWeights: ReadonlyMap<string, number> = new Map(),
): AggregatedStance {
  if (stances.length === 0) {
    return { dominant: "neutral", confidence: 0, supporting: 0, opposing: 0, neutral: 0, total: 0 };
  }

  let weightedSum = 0;
  let totalWeight = 0;
  let supporting  = 0;
  let opposing    = 0;
  let neutral     = 0;

  for (const cs of stances) {
    const authority = cs.sourceId !== null && overrideWeights.has(cs.sourceId)
      ? (overrideWeights.get(cs.sourceId) as number)
      : cs.weight;
    // Combined signal weight = authority * confidence
    const w = authority * cs.confidence;
    weightedSum += stanceToNumber(cs.stance) * w;
    totalWeight += w;

    switch (cs.stance) {
      case "supports": supporting++; break;
      case "opposes":  opposing++;   break;
      case "neutral":  neutral++;    break;
    }
  }

  const normalizedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const dominant        = numberToStance(normalizedScore);
  // Confidence = |normalizedScore| clamped to [0,1]
  const confidence      = Math.min(1, Math.abs(normalizedScore));

  return { dominant, confidence, supporting, opposing, neutral, total: stances.length };
}

/** Split citations by stance bucket */
export function partitionByStance(stances: ReadonlyArray<CitationStance>): {
  supporting: CitationStance[];
  opposing:   CitationStance[];
  neutral:    CitationStance[];
} {
  const supporting: CitationStance[] = [];
  const opposing:   CitationStance[] = [];
  const neutral:    CitationStance[] = [];
  for (const cs of stances) {
    switch (cs.stance) {
      case "supports": supporting.push(cs); break;
      case "opposes":  opposing.push(cs);   break;
      case "neutral":  neutral.push(cs);    break;
    }
  }
  return { supporting, opposing, neutral };
}
