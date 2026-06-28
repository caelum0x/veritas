// Content priority scoring: assigns a 0–1 priority to turns for pruning decisions.
import type { Turn } from "./types.js";

/** Scoring weights used to compute priority. */
export interface PriorityWeights {
  readonly recencyWeight: number;   // 0–1, higher = newer turns score higher
  readonly roleWeight: number;      // 0–1, multiplier for role bonus
  readonly pinnedBonus: number;     // added for pinned turns (typically 1)
}

export const DEFAULT_WEIGHTS: PriorityWeights = {
  recencyWeight: 0.5,
  roleWeight: 0.3,
  pinnedBonus: 1.0,
};

const ROLE_SCORES: Record<string, number> = {
  system: 1.0,
  assistant: 0.6,
  user: 0.5,
  tool: 0.3,
};

/**
 * Scores a single turn relative to the set of all turns.
 * Returns a value in [0, 2] (may exceed 1 for pinned system turns).
 */
export function scoreTurn(
  turn: Turn,
  index: number,
  total: number,
  weights: PriorityWeights = DEFAULT_WEIGHTS,
): number {
  const recencyScore = total <= 1 ? 1 : index / (total - 1);
  const roleScore = ROLE_SCORES[turn.role] ?? 0.3;
  const explicitPriority = turn.priority ?? 0.5;

  const base =
    recencyScore * weights.recencyWeight +
    roleScore * weights.roleWeight +
    explicitPriority * (1 - weights.recencyWeight - weights.roleWeight);

  return turn.pinned ? base + weights.pinnedBonus : base;
}

/** Returns a new array of turns sorted by priority descending. */
export function sortByPriority(
  turns: readonly Turn[],
  weights?: PriorityWeights,
): readonly Turn[] {
  const total = turns.length;
  return [...turns].sort(
    (a, b) =>
      scoreTurn(b, turns.indexOf(b), total, weights) -
      scoreTurn(a, turns.indexOf(a), total, weights),
  );
}
