// SLA report: aggregate evaluation results into a human-readable compliance summary.
import { z } from "zod";
import { newId } from "@veritas/core";
import { EvaluationResult, TargetResult } from "./evaluator.js";
import { MeasurementWindow } from "./window.js";

export const TargetSummarySchema = z.object({
  targetId: z.string(),
  metricKind: z.string(),
  evaluationCount: z.number().int().nonnegative(),
  compliantCount: z.number().int().nonnegative(),
  complianceRate: z.number().min(0).max(1),
  avgObservedValue: z.number(),
  minObservedValue: z.number(),
  maxObservedValue: z.number(),
  thresholdValue: z.number(),
  thresholdOperator: z.string(),
});
export type TargetSummary = z.infer<typeof TargetSummarySchema>;

export const SlaReportSchema = z.object({
  id: z.string(),
  slaId: z.string(),
  organizationId: z.string(),
  window: z.object({ kind: z.string(), startsAt: z.string(), endsAt: z.string() }),
  totalEvaluations: z.number().int().nonnegative(),
  compliantEvaluations: z.number().int().nonnegative(),
  overallComplianceRate: z.number().min(0).max(1),
  targetSummaries: z.array(TargetSummarySchema),
  breachIds: z.array(z.string()),
  generatedAt: z.string(),
});
export type SlaReport = z.infer<typeof SlaReportSchema>;

interface ReportInput {
  slaId: string;
  organizationId: string;
  window: MeasurementWindow;
  evaluations: readonly EvaluationResult[];
  breachIds?: readonly string[];
}

function buildTargetSummaries(evaluations: readonly EvaluationResult[]): TargetSummary[] {
  const byTarget = new Map<string, TargetResult[]>();
  for (const ev of evaluations) {
    for (const tr of ev.targetResults) {
      const list = byTarget.get(tr.targetId) ?? [];
      list.push(tr);
      byTarget.set(tr.targetId, list);
    }
  }

  return Array.from(byTarget.entries()).map(([targetId, results]): TargetSummary => {
    const compliantCount = results.filter((r) => r.compliant).length;
    const values = results.map((r) => r.observedValue);
    const avgObservedValue = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    const minObservedValue = values.length > 0 ? Math.min(...values) : 0;
    const maxObservedValue = values.length > 0 ? Math.max(...values) : 0;
    const first = results[0];
    return {
      targetId,
      metricKind: first?.metricKind ?? "",
      evaluationCount: results.length,
      compliantCount,
      complianceRate: results.length > 0 ? compliantCount / results.length : 1,
      avgObservedValue,
      minObservedValue,
      maxObservedValue,
      thresholdValue: first?.thresholdValue ?? 0,
      thresholdOperator: first?.thresholdOperator ?? "",
    };
  });
}

/** Generate an SLA compliance report from a set of evaluation results. */
export function generateReport(input: ReportInput): SlaReport {
  const totalEvaluations = input.evaluations.length;
  const compliantEvaluations = input.evaluations.filter((e) => e.compliant).length;
  const overallComplianceRate = totalEvaluations > 0 ? compliantEvaluations / totalEvaluations : 1;

  return {
    id: newId("slrp"),
    slaId: input.slaId,
    organizationId: input.organizationId,
    window: {
      kind: input.window.kind,
      startsAt: input.window.startsAt,
      endsAt: input.window.endsAt,
    },
    totalEvaluations,
    compliantEvaluations,
    overallComplianceRate,
    targetSummaries: buildTargetSummaries(input.evaluations),
    breachIds: input.breachIds ? [...input.breachIds] : [],
    generatedAt: new Date().toISOString(),
  };
}

/** Format compliance rate as a percentage string (e.g. "99.95%"). */
export function formatComplianceRate(rate: number, decimals: number = 2): string {
  return `${(rate * 100).toFixed(decimals)}%`;
}
