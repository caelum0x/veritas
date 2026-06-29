// Escalation policy: timed escalation steps and trigger evaluation for incidents.
import { z } from "zod";
import { newId, IsoTimestamp, Result, ok, err } from "@veritas/core";
import { SeverityLevel, SeverityLevelSchema } from "./severity.js";

export const EscalationTargetTypeSchema = z.enum(["USER", "TEAM", "WEBHOOK"]);
export type EscalationTargetType = z.infer<typeof EscalationTargetTypeSchema>;

export const EscalationStepSchema = z.object({
  order: z.number().int().min(0),
  delayMinutes: z.number().int().min(0),
  targetType: EscalationTargetTypeSchema,
  targetId: z.string(),
  notifyChannels: z.array(z.enum(["EMAIL", "SMS", "SLACK", "PAGERDUTY"])).default([]),
});
export type EscalationStep = z.infer<typeof EscalationStepSchema>;

export const EscalationPolicySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(128),
  teamId: z.string(),
  appliesTo: z.array(SeverityLevelSchema).min(1),
  steps: z.array(EscalationStepSchema).min(1),
  repeatAfterMinutes: z.number().int().min(0).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EscalationPolicy = z.infer<typeof EscalationPolicySchema>;

export const EscalationEventSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  policyId: z.string(),
  stepOrder: z.number().int().min(0),
  targetType: EscalationTargetTypeSchema,
  targetId: z.string(),
  triggeredAt: z.string(),
  acknowledgedAt: z.string().optional(),
});
export type EscalationEvent = z.infer<typeof EscalationEventSchema>;

export function makePolicy(
  input: Omit<EscalationPolicy, "id" | "createdAt" | "updatedAt">,
  now: IsoTimestamp
): EscalationPolicy {
  return EscalationPolicySchema.parse({
    ...input,
    id: newId("esc"),
    createdAt: now,
    updatedAt: now,
  });
}

export function makePolicyForSeverity(
  policies: readonly EscalationPolicy[],
  teamId: string,
  severity: SeverityLevel
): EscalationPolicy | undefined {
  return policies.find(
    (p) => p.teamId === teamId && p.appliesTo.includes(severity)
  );
}

export function computeDueSteps(
  policy: EscalationPolicy,
  incidentDetectedAt: IsoTimestamp,
  now: IsoTimestamp,
  alreadyFiredStepOrders: readonly number[]
): EscalationStep[] {
  const detectedMs = new Date(incidentDetectedAt).getTime();
  const nowMs = new Date(now).getTime();
  const elapsedMinutes = (nowMs - detectedMs) / 60_000;

  const firedSet = new Set(alreadyFiredStepOrders);

  return policy.steps.filter(
    (step) =>
      !firedSet.has(step.order) && step.delayMinutes <= elapsedMinutes
  );
}

export function makeEscalationEvent(
  incidentId: string,
  policyId: string,
  step: EscalationStep,
  now: IsoTimestamp
): EscalationEvent {
  return EscalationEventSchema.parse({
    id: newId("esc"),
    incidentId,
    policyId,
    stepOrder: step.order,
    targetType: step.targetType,
    targetId: step.targetId,
    triggeredAt: now,
  });
}

export function acknowledgeEscalationEvent(
  event: EscalationEvent,
  now: IsoTimestamp
): EscalationEvent {
  return { ...event, acknowledgedAt: now };
}

export function shouldRepeatEscalation(
  policy: EscalationPolicy,
  lastStepFiredAt: IsoTimestamp,
  now: IsoTimestamp
): boolean {
  if (!policy.repeatAfterMinutes) return false;
  const elapsedMinutes =
    (new Date(now).getTime() - new Date(lastStepFiredAt).getTime()) / 60_000;
  return elapsedMinutes >= policy.repeatAfterMinutes;
}

export function validatePolicy(policy: EscalationPolicy): Result<EscalationPolicy, string> {
  const orders = policy.steps.map((s) => s.order);
  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== orders.length) {
    return err("Escalation policy steps must have unique order values");
  }
  return ok(policy);
}
