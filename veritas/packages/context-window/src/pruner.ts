// Prune old / low-priority turns to bring a context within token budget.
import { type Result, ok, err } from "@veritas/core";
import type { Turn } from "./types.js";
import { scoreTurn, type PriorityWeights, DEFAULT_WEIGHTS } from "./priority.js";
import { BudgetExceededError } from "./errors.js";

export interface PruneOptions {
  readonly budgetTokens: number;
  readonly weights?: PriorityWeights;
  /** Estimate tokens per turn when turn.tokenCount is absent. Default: ceil(len/4). */
  readonly estimateTokens?: (turn: Turn) => number;
}

function defaultEstimate(turn: Turn): number {
  return turn.tokenCount ?? Math.ceil(turn.content.length / 4);
}

/**
 * Removes turns in ascending priority order until total tokens fit the budget.
 * Pinned turns are never removed.
 * Returns the surviving turns in their original chronological order.
 */
export function pruneTurns(
  turns: readonly Turn[],
  options: PruneOptions,
): Result<readonly Turn[], BudgetExceededError> {
  const estimate = options.estimateTokens ?? defaultEstimate;
  const weights = options.weights ?? DEFAULT_WEIGHTS;
  const total = turns.length;

  const withMeta = turns.map((turn, index) => ({
    turn,
    index,
    tokens: estimate(turn),
    score: scoreTurn(turn, index, total, weights),
  }));

  let usedTokens = withMeta.reduce((acc, m) => acc + m.tokens, 0);

  if (usedTokens <= options.budgetTokens) {
    return ok(turns);
  }

  // Sort candidates for removal: lowest score first, pinned last (excluded)
  const candidates = withMeta
    .filter((m) => !m.turn.pinned)
    .sort((a, b) => a.score - b.score);

  const removed = new Set<number>();

  for (const candidate of candidates) {
    if (usedTokens <= options.budgetTokens) break;
    removed.add(candidate.index);
    usedTokens -= candidate.tokens;
  }

  if (usedTokens > options.budgetTokens) {
    return err(new BudgetExceededError(usedTokens, options.budgetTokens));
  }

  const pruned = withMeta
    .filter((m) => !removed.has(m.index))
    .map((m) => m.turn);

  return ok(pruned);
}
