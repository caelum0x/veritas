// Scale decision value object representing a resolved scaling action
import { z } from "zod";

export const ScaleDirectionSchema = z.enum(["UP", "DOWN", "NONE"]);
export type ScaleDirection = z.infer<typeof ScaleDirectionSchema>;

export const ScaleDecisionSchema = z.object({
  direction: ScaleDirectionSchema,
  currentCapacity: z.number().int().nonnegative(),
  desiredCapacity: z.number().int().nonnegative(),
  delta: z.number().int(),
  reason: z.string().min(1),
  triggeredByPolicy: z.string().optional(),
  predictive: z.boolean().default(false),
  timestamp: z.string().datetime(),
});

export type ScaleDecision = z.infer<typeof ScaleDecisionSchema>;

export function makeScaleDecision(
  currentCapacity: number,
  desiredCapacity: number,
  reason: string,
  opts?: { triggeredByPolicy?: string; predictive?: boolean; timestamp?: string }
): ScaleDecision {
  const delta = desiredCapacity - currentCapacity;
  const direction: ScaleDirection =
    delta > 0 ? "UP" : delta < 0 ? "DOWN" : "NONE";
  return ScaleDecisionSchema.parse({
    direction,
    currentCapacity,
    desiredCapacity,
    delta,
    reason,
    triggeredByPolicy: opts?.triggeredByPolicy,
    predictive: opts?.predictive ?? false,
    timestamp: opts?.timestamp ?? new Date().toISOString(),
  });
}

export function noopDecision(
  currentCapacity: number,
  reason: string,
  timestamp?: string
): ScaleDecision {
  return makeScaleDecision(currentCapacity, currentCapacity, reason, {
    timestamp,
  });
}
