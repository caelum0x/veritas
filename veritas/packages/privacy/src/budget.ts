// Privacy budget tracking — manages differential privacy epsilon/delta consumption
import { type Result, ok, err, newId } from "@veritas/core";
import { type PrivacyBudget, type BudgetConsumption } from "./types.js";
import { BudgetExhaustedError, PrivacyConfigError } from "./errors.js";

function nowIso(): string {
  return new Date().toISOString();
}

/** Create a new privacy budget with the given epsilon and delta limits. */
export function createPrivacyBudget(
  totalEpsilon: number,
  totalDelta: number = 0,
): Result<PrivacyBudget, PrivacyConfigError> {
  if (totalEpsilon <= 0) {
    return err(new PrivacyConfigError({ message: "Total epsilon must be positive" }));
  }
  if (totalDelta < 0 || totalDelta > 1) {
    return err(new PrivacyConfigError({ message: "Total delta must be between 0 and 1" }));
  }

  const now = nowIso();
  const budget: PrivacyBudget = Object.freeze({
    id: newId("budget"),
    totalEpsilon,
    totalDelta,
    usedEpsilon: 0,
    usedDelta: 0,
    createdAt: now,
    updatedAt: now,
  });

  return ok(budget);
}

/** Consume epsilon/delta from a budget, returning a new updated budget or an error if exhausted. */
export function consumeBudget(
  budget: PrivacyBudget,
  consumption: BudgetConsumption,
): Result<PrivacyBudget, BudgetExhaustedError | PrivacyConfigError> {
  if (consumption.epsilon <= 0) {
    return err(new PrivacyConfigError({ message: "Consumption epsilon must be positive" }));
  }

  const newUsedEpsilon = budget.usedEpsilon + consumption.epsilon;
  const newUsedDelta = budget.usedDelta + (consumption.delta ?? 0);

  if (newUsedEpsilon > budget.totalEpsilon) {
    return err(
      new BudgetExhaustedError({
        message: `Budget "${budget.id}" exhausted: requested ${consumption.epsilon} epsilon but only ${budget.totalEpsilon - budget.usedEpsilon} remaining`,
      }),
    );
  }

  if (newUsedDelta > budget.totalDelta) {
    return err(
      new BudgetExhaustedError({
        message: `Budget "${budget.id}" exhausted: requested ${consumption.delta} delta but only ${budget.totalDelta - budget.usedDelta} remaining`,
      }),
    );
  }

  const updated: PrivacyBudget = Object.freeze({
    ...budget,
    usedEpsilon: newUsedEpsilon,
    usedDelta: newUsedDelta,
    updatedAt: nowIso(),
  });

  return ok(updated);
}

/** Get remaining epsilon and delta from a budget. */
export function getRemainingBudget(
  budget: PrivacyBudget,
): Readonly<{ epsilon: number; delta: number }> {
  return Object.freeze({
    epsilon: Math.max(0, budget.totalEpsilon - budget.usedEpsilon),
    delta: Math.max(0, budget.totalDelta - budget.usedDelta),
  });
}

/** Return true if the budget has no remaining epsilon capacity. */
export function isBudgetExhausted(budget: PrivacyBudget): boolean {
  return budget.usedEpsilon >= budget.totalEpsilon;
}
