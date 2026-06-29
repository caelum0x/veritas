// SLO report: aggregate evaluation results into a compliance summary for a time window.
import { z } from "zod";
import { newId } from "@veritas/core";
import { type SloEvaluationResult } from "./evaluator.js";
import { type BurnAlertEvent } from "./alert.js";

export const SloReportSchema = z.object({
  id: z.string(),
  sloId: z.string(),
  sliName: z.string(),
  windowStartMs: z.number().int().nonnegative(),
  windowEndMs: z.number().int().positive(),
  totalEvaluations: z.number().int().nonnegative(),
  compliantEvaluations: z.number().int().nonnegative(),
  complianceRate: z.number().min(0).max(1),
  targetRatio: z.number().min(0).max(1),
  avgObservedRatio: z.number().min(0).max(1),
  minObservedRatio: z.number().min(0).max(1),
  maxObservedRatio: z.number().min(0).max(1),
  avgErrorBudgetConsumedRatio: z.number().min(0),
  maxErrorBudgetConsumedRatio: z.number().min(0),
  alertsFired: z.array(z.string()),
  generatedAt: z.string(),
});

export type SloReport = z.infer<typeof SloReportSchema>;

export interface SloReportInput {
  readonly sloId: string;
  readonly sliName: string;
  readonly targetRatio: number;
  readonly evaluations: readonly SloEvaluationResult[];
  readonly alertEvents?: readonly BurnAlertEvent[];
  readonly nowMs: number;
}

/** Build an SLO compliance report from a set of evaluation results. */
export function generateSloReport(input: SloReportInput): SloReport {
  const { evaluations, alertEvents = [], nowMs } = input;

  const totalEvaluations = evaluations.length;
  const compliantEvaluations = evaluations.filter((e) => e.compliant).length;
  const complianceRate = totalEvaluations > 0 ? compliantEvaluations / totalEvaluations : 1;

  const ratios = evaluations.map((e) => e.observedRatio);
  const avgObservedRatio = ratios.length > 0 ? ratios.reduce((s, v) => s + v, 0) / ratios.length : 1;
  const minObservedRatio = ratios.length > 0 ? Math.min(...ratios) : 1;
  const maxObservedRatio = ratios.length > 0 ? Math.max(...ratios) : 1;

  const budgetRatios = evaluations.map((e) => e.errorBudgetConsumedRatio);
  const avgErrorBudgetConsumedRatio =
    budgetRatios.length > 0 ? budgetRatios.reduce((s, v) => s + v, 0) / budgetRatios.length : 0;
  const maxErrorBudgetConsumedRatio =
    budgetRatios.length > 0 ? Math.max(...budgetRatios) : 0;

  const windowStartMs = evaluations.length > 0
    ? Math.min(...evaluations.map((e) => e.windowStartMs))
    : nowMs;
  const windowEndMs = evaluations.length > 0
    ? Math.max(...evaluations.map((e) => e.windowEndMs))
    : nowMs;

  return Object.freeze({
    id: newId("slorp"),
    sloId: input.sloId,
    sliName: input.sliName,
    windowStartMs,
    windowEndMs,
    totalEvaluations,
    compliantEvaluations,
    complianceRate,
    targetRatio: input.targetRatio,
    avgObservedRatio,
    minObservedRatio,
    maxObservedRatio,
    avgErrorBudgetConsumedRatio,
    maxErrorBudgetConsumedRatio,
    alertsFired: alertEvents.map((a) => a.id),
    generatedAt: new Date(nowMs).toISOString(),
  });
}

/** Format compliance rate as a percentage string e.g. "99.95%". */
export function formatSloComplianceRate(rate: number, decimals: number = 2): string {
  return `${(rate * 100).toFixed(decimals)}%`;
}

/** True when the report meets the SLO target for the overall compliance rate. */
export function reportIsMeetingTarget(report: SloReport): boolean {
  return report.avgObservedRatio >= report.targetRatio;
}
