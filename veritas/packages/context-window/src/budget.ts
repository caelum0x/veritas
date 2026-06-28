// Token budget management: tracks usage and enforces limits.
import { type Result, ok, err } from "@veritas/core";
import { BudgetExceededError } from "./errors.js";

export interface Budget {
  readonly total: number;
  readonly reserved: number; // tokens reserved for completion
  readonly available: number; // total - reserved
}

export function makeBudget(total: number, reserved = 0): Budget {
  const available = Math.max(0, total - reserved);
  return Object.freeze({ total, reserved, available });
}

export interface BudgetTracker {
  readonly budget: Budget;
  readonly used: number;
  readonly remaining: number;
  add(tokens: number): Result<BudgetTracker, BudgetExceededError>;
  reset(): BudgetTracker;
}

function makeTracker(budget: Budget, used: number): BudgetTracker {
  return {
    budget,
    used,
    remaining: Math.max(0, budget.available - used),
    add(tokens: number): Result<BudgetTracker, BudgetExceededError> {
      const next = used + tokens;
      if (next > budget.available) {
        return err(new BudgetExceededError(next, budget.available));
      }
      return ok(makeTracker(budget, next));
    },
    reset(): BudgetTracker {
      return makeTracker(budget, 0);
    },
  };
}

export function createBudgetTracker(budget: Budget): BudgetTracker {
  return makeTracker(budget, 0);
}

export function wouldExceed(tracker: BudgetTracker, tokens: number): boolean {
  return tracker.used + tokens > tracker.budget.available;
}
