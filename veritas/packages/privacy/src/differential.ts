// Differential privacy mechanisms — Laplace and Gaussian mechanism factories with budget tracking.
import { ok, err, type Result, newId } from "@veritas/core";
import {
  type PrivacyBudget,
  type BudgetConsumption,
  PrivacyBudgetSchema,
  BudgetConsumptionSchema,
} from "./types.js";
import { BudgetExhaustedError, PrivacyConfigError } from "./errors.js";
import { laplaceNoise, gaussianNoise } from "./noise.js";

export interface DifferentialPrivacyMechanism {
  readonly budgetId: string;
  readonly query: (value: number, sensitivity: number) => Result<number, BudgetExhaustedError | PrivacyConfigError>;
  readonly getBudget: () => PrivacyBudget;
}

/** Create a fresh privacy budget with the given limits. */
export function createBudget(
  totalEpsilon: number,
  totalDelta: number
): PrivacyBudget {
  const now = new Date().toISOString();
  return PrivacyBudgetSchema.parse({
    id: newId("budget"),
    totalEpsilon,
    totalDelta,
    usedEpsilon: 0,
    usedDelta: 0,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Consume budget for a differentially-private mechanism.
 * Returns updated budget or BudgetExhaustedError.
 */
export function consumeBudget(
  budget: PrivacyBudget,
  consumption: BudgetConsumption
): Result<PrivacyBudget, BudgetExhaustedError> {
  const parsed = BudgetConsumptionSchema.parse(consumption);
  const newEpsilon = budget.usedEpsilon + parsed.epsilon;
  const newDelta = budget.usedDelta + parsed.delta;

  if (newEpsilon > budget.totalEpsilon) {
    return err(
      new BudgetExhaustedError({
        message: `Epsilon budget exceeded: used ${newEpsilon} of ${budget.totalEpsilon}`,
      })
    );
  }
  if (newDelta > budget.totalDelta) {
    return err(
      new BudgetExhaustedError({
        message: `Delta budget exceeded: used ${newDelta} of ${budget.totalDelta}`,
      })
    );
  }

  return ok(
    PrivacyBudgetSchema.parse({
      ...budget,
      usedEpsilon: newEpsilon,
      usedDelta: newDelta,
      updatedAt: new Date().toISOString(),
    })
  );
}

/**
 * Create a stateful differential privacy mechanism that tracks budget consumption.
 * Uses the Laplace mechanism for pure ε-DP, or Gaussian for (ε,δ)-DP when delta > 0.
 */
export function createDifferentialPrivacyMechanism(
  totalEpsilon: number,
  totalDelta: number = 0
): Result<DifferentialPrivacyMechanism, PrivacyConfigError> {
  if (totalEpsilon <= 0) {
    return err(new PrivacyConfigError({ message: "totalEpsilon must be positive" }));
  }
  if (totalDelta < 0 || totalDelta > 1) {
    return err(new PrivacyConfigError({ message: "totalDelta must be in [0,1]" }));
  }

  let budget = createBudget(totalEpsilon, totalDelta);

  const query = (
    value: number,
    sensitivity: number
  ): Result<number, BudgetExhaustedError | PrivacyConfigError> => {
    const consumption: BudgetConsumption = {
      epsilon: totalEpsilon,
      delta: totalDelta,
      mechanism: totalDelta > 0 ? "gaussian" : "laplace",
    };
    const budgetResult = consumeBudget(budget, consumption);
    if (!budgetResult.ok) {
      return budgetResult;
    }
    budget = budgetResult.value;

    if (totalDelta > 0) {
      return gaussianNoise(value, sensitivity, totalEpsilon, totalDelta);
    }
    return laplaceNoise(value, sensitivity, totalEpsilon);
  };

  const getBudget = (): PrivacyBudget => budget;

  return ok({ budgetId: budget.id, query, getBudget });
}
