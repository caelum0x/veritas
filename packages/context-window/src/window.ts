// Sliding context window: maintains turns within a token budget with add/prune/compact.
import { type Result, ok, err } from "@veritas/core";
import type { Turn, ContextWindow, PackResult } from "./types.js";
import { makeBudget, type Budget } from "./budget.js";
import { pruneTurns } from "./pruner.js";
import { type CompactionStrategy, concatenationCompactor } from "./compactor.js";
import { type PriorityWeights, DEFAULT_WEIGHTS } from "./priority.js";
import { BudgetExceededError } from "./errors.js";

export interface WindowOptions {
  readonly budgetTokens: number;
  readonly reservedTokens?: number;
  readonly weights?: PriorityWeights;
  readonly compactor?: CompactionStrategy;
  readonly estimateTokens?: (turn: Turn) => number;
}

function defaultEstimate(turn: Turn): number {
  return turn.tokenCount ?? Math.ceil(turn.content.length / 4);
}

export interface SlidingWindow {
  readonly snapshot: ContextWindow;
  add(turn: Turn): Promise<Result<SlidingWindow, BudgetExceededError>>;
  prune(): Result<SlidingWindow, BudgetExceededError>;
  compact(): Promise<Result<SlidingWindow, BudgetExceededError>>;
  pack(): PackResult;
  replace(turns: readonly Turn[]): SlidingWindow;
}

function makeWindow(
  turns: readonly Turn[],
  budget: Budget,
  options: WindowOptions,
): SlidingWindow {
  const estimate = options.estimateTokens ?? defaultEstimate;
  const totalTokens = turns.reduce((acc, t) => acc + estimate(t), 0);

  const snapshot: ContextWindow = Object.freeze({
    turns,
    totalTokens,
    budgetTokens: budget.available,
  });

  return {
    snapshot,

    async add(turn: Turn): Promise<Result<SlidingWindow, BudgetExceededError>> {
      const next = [...turns, turn];
      const nextTokens = totalTokens + estimate(turn);
      if (nextTokens <= budget.available) {
        return ok(makeWindow(next, budget, options));
      }
      // Attempt auto-prune
      const pruned = pruneTurns(next, {
        budgetTokens: budget.available,
        weights: options.weights,
        estimateTokens: estimate,
      });
      if (!pruned.ok) return err(pruned.error);
      return ok(makeWindow(pruned.value, budget, options));
    },

    prune(): Result<SlidingWindow, BudgetExceededError> {
      const r = pruneTurns(turns, {
        budgetTokens: budget.available,
        weights: options.weights,
        estimateTokens: estimate,
      });
      if (!r.ok) return err(r.error);
      return ok(makeWindow(r.value, budget, options));
    },

    async compact(): Promise<Result<SlidingWindow, BudgetExceededError>> {
      const strategy = options.compactor ?? concatenationCompactor;
      const unpinned = turns.filter((t) => !t.pinned);
      const pinned = turns.filter((t) => t.pinned);

      if (unpinned.length <= 1) {
        return ok(makeWindow(turns, budget, options));
      }

      const halfway = Math.ceil(unpinned.length / 2);
      const toCompact = unpinned.slice(0, halfway);
      const keep = unpinned.slice(halfway);

      const r = await strategy.compact(toCompact);
      if (!r.ok) {
        return err(new BudgetExceededError(totalTokens, budget.available));
      }

      // Reconstruct chronological order: pinned system turns first, then summary, then remainder
      const systemPinned = pinned.filter((t) => t.role === "system");
      const otherPinned = pinned.filter((t) => t.role !== "system");
      const next = [...systemPinned, r.value, ...otherPinned, ...keep];
      return ok(makeWindow(next, budget, options));
    },

    pack(): PackResult {
      const estimate2 = options.estimateTokens ?? defaultEstimate;
      let used = 0;
      const packed: Turn[] = [];
      let dropped = 0;

      // Always include pinned first
      for (const t of turns) {
        if (t.pinned) {
          used += estimate2(t);
          packed.push(t);
        }
      }

      for (const t of turns) {
        if (t.pinned) continue;
        const tk = estimate2(t);
        if (used + tk <= budget.available) {
          used += tk;
          packed.push(t);
        } else {
          dropped++;
        }
      }

      return { turns: packed, totalTokens: used, dropped };
    },

    replace(next: readonly Turn[]): SlidingWindow {
      return makeWindow(next, budget, options);
    },
  };
}

export function createSlidingWindow(options: WindowOptions): SlidingWindow {
  const budget = makeBudget(options.budgetTokens, options.reservedTokens ?? 0);
  return makeWindow([], budget, options);
}
