// SLO evaluator: fetch SLI data for a window and determine whether the objective is met.
import { z } from "zod";
import { newId, type Result, ok, err } from "@veritas/core";
import { type Slo } from "./slo.js";
import { type SliSource, goodRatio } from "./sli.js";
import { type ObjectiveTarget, meetsObjective } from "./objective.js";
import { type Window } from "./window.js";
import { computeErrorBudget, type ErrorBudget } from "./error-budget.js";
import { SloEvaluationError } from "./errors.js";

export const SloEvaluationResultSchema = z.object({
  id: z.string(),
  sloId: z.string(),
  sliName: z.string(),
  windowStartMs: z.number().int().nonnegative(),
  windowEndMs: z.number().int().positive(),
  goodCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  observedRatio: z.number().min(0).max(1),
  targetRatio: z.number().min(0).max(1),
  compliant: z.boolean(),
  errorBudgetConsumedRatio: z.number().min(0),
  evaluatedAt: z.string(),
});

export type SloEvaluationResult = z.infer<typeof SloEvaluationResultSchema>;

export interface EvaluatorInput {
  readonly slo: Slo;
  readonly objective: ObjectiveTarget;
  readonly window: Window;
  readonly nowMs: number;
}

/** Evaluate a single SLO against its SLI source for the given rolling window. */
export async function evaluateSlo(
  input: EvaluatorInput,
  source: SliSource,
): Promise<Result<SloEvaluationResult>> {
  const { slo, objective, window, nowMs } = input;
  const startMs = nowMs - window.durationMs;
  const endMs = nowMs;

  let measurement;
  try {
    measurement = await source.query(slo.sliName, startMs, endMs);
  } catch (cause) {
    return err(new SloEvaluationError(`Failed to query SLI "${slo.sliName}": ${String(cause)}`));
  }

  const observedRatio = goodRatio(measurement);
  const compliant = meetsObjective(observedRatio, objective);
  const budget: ErrorBudget = computeErrorBudget({
    sloId: slo.id,
    targetRatio: objective.targetRatio,
    windowDurationMs: input.window.durationMs,
    totalEvents: measurement.totalCount,
    goodEvents: measurement.goodCount,
    computedAt: nowMs,
  });

  const result: SloEvaluationResult = Object.freeze({
    id: newId("sloe"),
    sloId: slo.id,
    sliName: slo.sliName,
    windowStartMs: startMs,
    windowEndMs: endMs,
    goodCount: measurement.goodCount,
    totalCount: measurement.totalCount,
    observedRatio,
    targetRatio: objective.targetRatio,
    compliant,
    errorBudgetConsumedRatio: budget.budgetConsumedRatio,
    evaluatedAt: new Date(nowMs).toISOString(),
  });

  return ok(result);
}
