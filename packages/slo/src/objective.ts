// Objective targets: define the numeric threshold an SLI must meet to satisfy an SLO.
import { z } from "zod";

export const ObjectiveOperatorSchema = z.enum(["gte", "gt", "lte", "lt", "eq"]);
export type ObjectiveOperator = z.infer<typeof ObjectiveOperatorSchema>;

export const ObjectiveTargetSchema = z.object({
  /** Minimum/maximum acceptable good-event ratio (0–1). */
  targetRatio: z.number().min(0).max(1),
  /** Comparison direction; defaults to gte (good ratio must be at least targetRatio). */
  operator: ObjectiveOperatorSchema.default("gte"),
  /** Human-readable description, e.g. "99.9% availability". */
  description: z.string().optional(),
});
export type ObjectiveTarget = z.infer<typeof ObjectiveTargetSchema>;

/** Return true when the observed ratio satisfies the objective. */
export function meetsObjective(observedRatio: number, target: ObjectiveTarget): boolean {
  switch (target.operator) {
    case "gte": return observedRatio >= target.targetRatio;
    case "gt":  return observedRatio > target.targetRatio;
    case "lte": return observedRatio <= target.targetRatio;
    case "lt":  return observedRatio < target.targetRatio;
    case "eq":  return Math.abs(observedRatio - target.targetRatio) < Number.EPSILON;
  }
}

/** Allowed error ratio = 1 − targetRatio (only meaningful for gte/gt objectives). */
export function allowedErrorRatio(target: ObjectiveTarget): number {
  return Math.max(0, 1 - target.targetRatio);
}

/** Format target as a human-readable percentage string, e.g. "≥ 99.90%". */
export function formatObjective(target: ObjectiveTarget): string {
  const pct = (target.targetRatio * 100).toFixed(2);
  const opSymbol: Record<ObjectiveOperator, string> = {
    gte: "≥",
    gt: ">",
    lte: "≤",
    lt: "<",
    eq: "=",
  };
  return `${opSymbol[target.operator]} ${pct}%`;
}
