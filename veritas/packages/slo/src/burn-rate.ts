// Burn rate: how fast error budget is consumed relative to the SLO window.
import { z } from "zod";
import { type ErrorBudget } from "./error-budget.js";

export const BurnRateSchema = z.object({
  sloId: z.string(),
  windowDurationMs: z.number().int().positive(),
  burnRate: z.number().nonnegative(),
  budgetConsumedPct: z.number(),
  projectedExhaustionMs: z.number().nullable(),
  computedAt: z.number().int(),
});

export type BurnRate = z.infer<typeof BurnRateSchema>;

export interface BurnRateInput {
  budget: ErrorBudget;
  /** Elapsed time in ms since start of window (used for projection). */
  elapsedMs: number;
}

/**
 * Burn rate = (bad event rate observed) / (allowed bad event rate for target).
 * A burn rate of 1 means budget depletes exactly at window end.
 * >1 means burning faster than allowed.
 */
export function computeBurnRate(input: BurnRateInput): BurnRate {
  const { budget, elapsedMs } = input;
  const { sloId, windowDurationMs, budgetConsumedRatio, budgetTotalRatio, computedAt } = budget;

  const allowedBadFractionPerMs = budgetTotalRatio / windowDurationMs;
  const observedBadFractionPerMs = elapsedMs === 0 ? 0 : budgetConsumedRatio / elapsedMs;
  const burnRate = allowedBadFractionPerMs === 0 ? 0 : observedBadFractionPerMs / allowedBadFractionPerMs;

  let projectedExhaustionMs: number | null = null;
  if (burnRate > 0 && budgetTotalRatio > 0) {
    const remainingBudget = Math.max(0, budgetTotalRatio - budgetConsumedRatio);
    if (remainingBudget > 0) {
      const msToExhaustion = remainingBudget / observedBadFractionPerMs;
      projectedExhaustionMs = computedAt + msToExhaustion;
    } else {
      projectedExhaustionMs = computedAt; // already exhausted
    }
  }

  return Object.freeze({
    sloId,
    windowDurationMs,
    burnRate,
    budgetConsumedPct: budget.budgetConsumedPct,
    projectedExhaustionMs,
    computedAt,
  });
}

/** Returns true when burn rate exceeds the given threshold multiplier. */
export function isBurningFast(burnRate: BurnRate, thresholdMultiplier: number): boolean {
  return burnRate.burnRate > thresholdMultiplier;
}
