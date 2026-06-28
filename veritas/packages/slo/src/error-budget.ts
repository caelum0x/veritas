// Error budget: remaining allowance for bad events before SLO breach.
import { z } from "zod";

export const ErrorBudgetSchema = z.object({
  sloId: z.string(),
  targetRatio: z.number().min(0).max(1),
  windowDurationMs: z.number().int().positive(),
  totalEvents: z.number().int().nonnegative(),
  goodEvents: z.number().int().nonnegative(),
  badEvents: z.number().int().nonnegative(),
  budgetTotalRatio: z.number(),
  budgetConsumedRatio: z.number(),
  budgetRemainingRatio: z.number(),
  budgetConsumedPct: z.number(),
  isBudgetExhausted: z.boolean(),
  computedAt: z.number().int(),
});

export type ErrorBudget = z.infer<typeof ErrorBudgetSchema>;

export interface ErrorBudgetInput {
  sloId: string;
  targetRatio: number;
  windowDurationMs: number;
  totalEvents: number;
  goodEvents: number;
  computedAt: number;
}

export function computeErrorBudget(input: ErrorBudgetInput): ErrorBudget {
  const { sloId, targetRatio, windowDurationMs, totalEvents, goodEvents, computedAt } = input;
  const badEvents = totalEvents - goodEvents;
  const budgetTotalRatio = 1 - targetRatio;
  const budgetConsumedRatio = totalEvents === 0 ? 0 : badEvents / totalEvents;
  const budgetRemainingRatio = Math.max(0, budgetTotalRatio - budgetConsumedRatio);
  const budgetConsumedPct = budgetTotalRatio === 0 ? 0 : (budgetConsumedRatio / budgetTotalRatio) * 100;
  const isBudgetExhausted = budgetConsumedRatio >= budgetTotalRatio && totalEvents > 0;
  return Object.freeze({
    sloId,
    targetRatio,
    windowDurationMs,
    totalEvents,
    goodEvents,
    badEvents,
    budgetTotalRatio,
    budgetConsumedRatio,
    budgetRemainingRatio,
    budgetConsumedPct,
    isBudgetExhausted,
    computedAt,
  });
}

/** Remaining fraction of budget (0–1). Returns 1 when total events = 0. */
export function remainingBudgetFraction(budget: ErrorBudget): number {
  if (budget.budgetTotalRatio === 0) return 0;
  return Math.max(0, 1 - budget.budgetConsumedRatio / budget.budgetTotalRatio);
}
