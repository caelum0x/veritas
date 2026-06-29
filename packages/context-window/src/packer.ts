// Pack a set of turns into a token budget, respecting priority order.
import type { Turn, PackResult } from "./types.js";
import { scoreTurn, type PriorityWeights, DEFAULT_WEIGHTS } from "./priority.js";

export interface PackOptions {
  readonly budgetTokens: number;
  readonly weights?: PriorityWeights;
  readonly estimateTokens?: (turn: Turn) => number;
}

function defaultEstimate(turn: Turn): number {
  return turn.tokenCount ?? Math.ceil(turn.content.length / 4);
}

/**
 * Greedily fills the budget with highest-priority turns.
 * Pinned turns are always included first, then remaining turns by score.
 * The result preserves original chronological order among selected turns.
 */
export function packTurns(turns: readonly Turn[], options: PackOptions): PackResult {
  const estimate = options.estimateTokens ?? defaultEstimate;
  const weights = options.weights ?? DEFAULT_WEIGHTS;
  const total = turns.length;

  const pinnedWithIdx = turns
    .map((turn, index) => ({ turn, index, tokens: estimate(turn) }))
    .filter((m) => m.turn.pinned);

  const unpinnedWithScore = turns
    .map((turn, index) => ({
      turn,
      index,
      tokens: estimate(turn),
      score: scoreTurn(turn, index, total, weights),
    }))
    .filter((m) => !m.turn.pinned)
    .sort((a, b) => b.score - a.score);

  let used = 0;
  const selected = new Set<number>();

  for (const m of pinnedWithIdx) {
    used += m.tokens;
    selected.add(m.index);
  }

  for (const m of unpinnedWithScore) {
    if (used + m.tokens <= options.budgetTokens) {
      used += m.tokens;
      selected.add(m.index);
    }
  }

  const packed = turns.filter((_, i) => selected.has(i));
  const dropped = turns.length - packed.length;

  return { turns: packed, totalTokens: used, dropped };
}
