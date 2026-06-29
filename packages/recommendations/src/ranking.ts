// Rank recommendation candidates by combining raw scores with boost factors and normalising to [0,1].

import type { RankedCandidate } from "./types.js";

export interface RankInput {
  readonly itemId: string;
  readonly rawScore: number;
  readonly boostFactor?: number;
  readonly reason: string;
}

/** Normalise an array of raw values to [0,1] using min-max; returns uniform 1s if all equal. */
function minMaxNormalise(values: readonly number[]): readonly number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 1);
  return values.map((v) => (v - min) / (max - min));
}

/** Clamp a number to [0,1]. */
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Rank candidates: apply boost, normalise scores, sort descending.
 * Returns at most `limit` entries (default: all).
 */
export function rankCandidates(
  inputs: readonly RankInput[],
  limit = inputs.length,
): readonly RankedCandidate[] {
  if (inputs.length === 0) return [];

  const boosted = inputs.map((c) => ({
    ...c,
    boostedScore: c.rawScore * (c.boostFactor ?? 1),
  }));

  const boostedValues = boosted.map((c) => c.boostedScore);
  const normalised = minMaxNormalise(boostedValues);

  const ranked: RankedCandidate[] = boosted.map((c, i) => ({
    itemId: c.itemId,
    rawScore: c.rawScore,
    normalizedScore: clamp01(normalised[i] ?? 0),
    boostFactor: c.boostFactor ?? 1,
    finalScore: clamp01(normalised[i] ?? 0),
    reason: c.reason,
  }));

  return ranked
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, limit);
}

/** Apply a recency decay multiplier to a score given age in milliseconds. */
export function decayByAge(score: number, ageMs: number, halfLifeMs: number): number {
  const decayFactor = Math.pow(0.5, ageMs / halfLifeMs);
  return clamp01(score * decayFactor);
}

/** Merge two ranked lists by weighted average of finalScore, deduplicating by itemId. */
export function mergeRankings(
  primary: readonly RankedCandidate[],
  secondary: readonly RankedCandidate[],
  primaryWeight = 0.7,
  secondaryWeight = 0.3,
): readonly RankedCandidate[] {
  const map = new Map<string, RankedCandidate>();

  for (const c of primary) {
    map.set(c.itemId, { ...c, finalScore: clamp01(c.finalScore * primaryWeight) });
  }

  for (const c of secondary) {
    const existing = map.get(c.itemId);
    if (existing !== undefined) {
      const merged: RankedCandidate = {
        ...existing,
        finalScore: clamp01(existing.finalScore + c.finalScore * secondaryWeight),
        reason: `${existing.reason}; ${c.reason}`,
      };
      map.set(c.itemId, merged);
    } else {
      map.set(c.itemId, { ...c, finalScore: clamp01(c.finalScore * secondaryWeight) });
    }
  }

  return [...map.values()].sort((a, b) => b.finalScore - a.finalScore);
}
