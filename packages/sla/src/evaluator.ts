// SLA evaluator: assess whether observed metrics satisfy SLA targets in a window.
import { z } from "zod";
import { newId } from "@veritas/core";
import { SlaTarget, meetsThreshold } from "./target.js";
import { MeasurementWindow } from "./window.js";

export const TargetResultSchema = z.object({
  targetId: z.string(),
  metricKind: z.string(),
  observedValue: z.number(),
  thresholdValue: z.number(),
  thresholdOperator: z.string(),
  compliant: z.boolean(),
  weight: z.number(),
});
export type TargetResult = z.infer<typeof TargetResultSchema>;

export const EvaluationResultSchema = z.object({
  id: z.string(),
  slaId: z.string(),
  window: z.object({
    kind: z.string(),
    startsAt: z.string(),
    endsAt: z.string(),
  }),
  targetResults: z.array(TargetResultSchema),
  /** Weighted compliance ratio (0–1). */
  complianceRatio: z.number().min(0).max(1),
  compliant: z.boolean(),
  evaluatedAt: z.string(),
});
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

export interface MetricObservation {
  targetId: string;
  value: number;
}

export interface EvaluateInput {
  slaId: string;
  targets: readonly SlaTarget[];
  observations: readonly MetricObservation[];
  window: MeasurementWindow;
}

/** Compute weighted compliance ratio from target results. */
function weightedRatio(results: readonly TargetResult[]): number {
  const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
  if (totalWeight === 0) return 1;
  const compliantWeight = results
    .filter((r) => r.compliant)
    .reduce((sum, r) => sum + r.weight, 0);
  return compliantWeight / totalWeight;
}

/** Evaluate SLA compliance for the given targets against observed metric values. */
export function evaluate(input: EvaluateInput): EvaluationResult {
  const observationMap = new Map(input.observations.map((o) => [o.targetId, o.value]));

  const targetResults: TargetResult[] = input.targets
    .filter((t) => t.enabled)
    .map((t): TargetResult => {
      const observed = observationMap.get(t.id) ?? 0;
      const compliant = meetsThreshold(observed, t.threshold);
      return {
        targetId: t.id,
        metricKind: t.metricKind,
        observedValue: observed,
        thresholdValue: t.threshold.value,
        thresholdOperator: t.threshold.operator,
        compliant,
        weight: t.weight,
      };
    });

  const complianceRatio = weightedRatio(targetResults);
  const compliant = targetResults.every((r) => r.compliant);

  return {
    id: newId("eval"),
    slaId: input.slaId,
    window: {
      kind: input.window.kind,
      startsAt: input.window.startsAt,
      endsAt: input.window.endsAt,
    },
    targetResults,
    complianceRatio,
    compliant,
    evaluatedAt: new Date().toISOString(),
  };
}

/** Return only the non-compliant target results from an evaluation. */
export function failingTargets(result: EvaluationResult): TargetResult[] {
  return result.targetResults.filter((r) => !r.compliant);
}
