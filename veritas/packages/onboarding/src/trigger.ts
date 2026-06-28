// Step trigger definitions — conditions that auto-advance or activate onboarding steps.
import { z } from "zod";

export const TriggerEvent = z.enum([
  "user_created",
  "email_verified",
  "profile_updated",
  "plan_selected",
  "member_invited",
  "api_key_created",
  "claim_submitted",
  "verification_completed",
  "billing_method_added",
  "tour_dismissed",
  "custom",
]);
export type TriggerEvent = z.infer<typeof TriggerEvent>;

export const TriggerAction = z.enum(["complete_step", "skip_step", "start_step", "advance_flow"]);
export type TriggerAction = z.infer<typeof TriggerAction>;

export const StepTriggerSchema = z.object({
  id: z.string(),
  flowId: z.string(),
  stepId: z.string(),
  event: TriggerEvent,
  action: TriggerAction,
  /** Optional JSON-path style condition evaluated against the event payload. */
  condition: z.string().nullable().default(null),
  metadata: z.record(z.unknown()).default({}),
});
export type StepTrigger = z.infer<typeof StepTriggerSchema>;

export const CreateTriggerSchema = StepTriggerSchema.omit({ id: true });
export type CreateTrigger = z.infer<typeof CreateTriggerSchema>;

export function makeTrigger(id: string, input: CreateTrigger): StepTrigger {
  return StepTriggerSchema.parse({ ...input, id });
}

/** Match triggers for a given event on a specific flow. */
export function matchTriggers(
  triggers: readonly StepTrigger[],
  flowId: string,
  event: TriggerEvent,
): StepTrigger[] {
  return triggers.filter((t) => t.flowId === flowId && t.event === event);
}

/** Evaluate a simple dot-path condition against an event payload. */
export function evaluateCondition(
  condition: string | null,
  payload: Record<string, unknown>,
): boolean {
  if (condition === null) return true;
  const parts = condition.split(".");
  let current: unknown = payload;
  for (const part of parts) {
    if (!isRecord(current) || !(part in current)) return false;
    current = current[part];
  }
  return Boolean(current);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Return all triggers for a given step. */
export function triggersForStep(
  triggers: readonly StepTrigger[],
  stepId: string,
): StepTrigger[] {
  return triggers.filter((t) => t.stepId === stepId);
}
