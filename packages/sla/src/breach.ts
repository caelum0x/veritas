// Breach detection: models and factories for SLA breach events.
import { z } from "zod";
import { newId } from "@veritas/core";
import { TargetMetricKindSchema } from "./target.js";

export const SlaBreachSeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export type SlaBreachSeverity = z.infer<typeof SlaBreachSeveritySchema>;

export const SlaBreachEventSchema = z.object({
  id: z.string(),
  slaId: z.string(),
  targetId: z.string(),
  metricKind: TargetMetricKindSchema,
  measuredValue: z.number(),
  thresholdValue: z.number(),
  operator: z.enum(["gte", "lte", "gt", "lt", "eq"]),
  deviationPct: z.number(),
  severity: SlaBreachSeveritySchema,
  windowStart: z.string(),
  windowEnd: z.string(),
  serviceId: z.string(),
  organizationId: z.string(),
  detectedAt: z.string(),
  resolvedAt: z.string().optional(),
});
export type SlaBreachEvent = z.infer<typeof SlaBreachEventSchema>;

export type CreateSlaBreachEvent = Omit<
  SlaBreachEvent,
  "id" | "deviationPct" | "severity" | "detectedAt"
>;

export function makeBreachEvent(input: CreateSlaBreachEvent): SlaBreachEvent {
  const deviationPct =
    input.thresholdValue !== 0
      ? Math.abs((input.measuredValue - input.thresholdValue) / input.thresholdValue) * 100
      : 0;

  return {
    ...input,
    id: newId("breach"),
    deviationPct,
    severity: classifySeverity(deviationPct),
    detectedAt: new Date().toISOString(),
  };
}

function classifySeverity(deviationPct: number): SlaBreachSeverity {
  if (deviationPct >= 50) return "critical";
  if (deviationPct >= 20) return "high";
  if (deviationPct >= 5)  return "medium";
  return "low";
}

export function isResolved(breach: SlaBreachEvent): boolean {
  return breach.resolvedAt !== undefined;
}

export function resolveBreach(
  breach: SlaBreachEvent,
  resolvedAt: string = new Date().toISOString()
): SlaBreachEvent {
  return { ...breach, resolvedAt };
}
