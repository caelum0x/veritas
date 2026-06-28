// Rank agents by reputation score with tie-breaking and percentile computation.

import { Score, asScore, clampScore } from "@veritas/core";

/** Agent entry for ranking input. */
export interface RankableAgent {
  readonly agentId: string;
  readonly score: Score;
  /** Optional secondary sort key (e.g., total verified count). */
  readonly tieBreaker?: number;
}

/** Ranked output with ordinal position and percentile. */
export interface RankedAgent extends RankableAgent {
  readonly rank: number;
  readonly percentile: Score;
}

/**
 * Rank agents by descending score, using tieBreaker as a secondary sort.
 * Agents with equal score and tieBreaker receive the same rank (dense ranking).
 */
export function rankAgents(agents: ReadonlyArray<RankableAgent>): ReadonlyArray<RankedAgent> {
  if (agents.length === 0) return [];

  const sorted = [...agents].sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (scoreDiff !== 0) return scoreDiff;
    return (b.tieBreaker ?? 0) - (a.tieBreaker ?? 0);
  });

  const total = sorted.length;
  const result: RankedAgent[] = [];
  let rank = 1;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]!;
    const prev = sorted[i - 1];

    // Detect tie group start
    if (
      i > 0 &&
      prev !== undefined &&
      (current.score !== prev.score ||
        (current.tieBreaker ?? 0) !== (prev.tieBreaker ?? 0))
    ) {
      rank = i + 1;
    }

    // Percentile: fraction of agents this agent outranks (0 = last, 1 = first)
    const percentile = clampScore(1 - (rank - 1) / total);

    result.push({ ...current, rank, percentile });
  }

  return result;
}

/**
 * Return the top-N ranked agents from a ranked list.
 */
export function topN(
  ranked: ReadonlyArray<RankedAgent>,
  n: number,
): ReadonlyArray<RankedAgent> {
  return ranked.slice(0, Math.max(0, n));
}

/**
 * Return agents above a minimum percentile threshold.
 */
export function abovePercentile(
  ranked: ReadonlyArray<RankedAgent>,
  minPercentile: number,
): ReadonlyArray<RankedAgent> {
  return ranked.filter((a) => a.percentile >= minPercentile);
}

/**
 * Compute the score at a given percentile from a ranked list (0–1).
 * Uses linear interpolation between adjacent entries.
 */
export function scoreAtPercentile(
  ranked: ReadonlyArray<RankedAgent>,
  targetPercentile: number,
): Score {
  if (ranked.length === 0) return asScore(0.5);
  const first = ranked[0]!;
  if (ranked.length === 1) return first.score;

  const p = Math.min(Math.max(targetPercentile, 0), 1);
  // Ranked list is descending; percentile 1 = index 0, percentile 0 = last index
  const idx = (1 - p) * (ranked.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const loEntry = ranked[lo]!;
  const hiEntry = ranked[hi]!;
  if (lo === hi) return loEntry.score;
  const frac = idx - lo;
  return clampScore(loEntry.score * (1 - frac) + hiEntry.score * frac);
}
