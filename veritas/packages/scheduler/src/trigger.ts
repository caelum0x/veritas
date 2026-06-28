// Trigger types: describe events that can initiate scheduler actions.
import { z } from "zod";

export const ManualTriggerSchema = z.object({
  kind: z.literal("manual"),
  initiatedBy: z.string(),
});

export const ScheduleTriggerSchema = z.object({
  kind: z.literal("schedule"),
  scheduledAt: z.string().datetime(),
});

export const EventTriggerSchema = z.object({
  kind: z.literal("event"),
  eventType: z.string(),
  eventId: z.string(),
  occurredAt: z.string().datetime(),
});

export const RetryTriggerSchema = z.object({
  kind: z.literal("retry"),
  attempt: z.number().int().positive(),
  previousFailureAt: z.string().datetime(),
  reason: z.string().optional(),
});

export const TriggerSchema = z.discriminatedUnion("kind", [
  ManualTriggerSchema,
  ScheduleTriggerSchema,
  EventTriggerSchema,
  RetryTriggerSchema,
]);

export type ManualTrigger = z.infer<typeof ManualTriggerSchema>;
export type ScheduleTrigger = z.infer<typeof ScheduleTriggerSchema>;
export type EventTrigger = z.infer<typeof EventTriggerSchema>;
export type RetryTrigger = z.infer<typeof RetryTriggerSchema>;
export type Trigger = z.infer<typeof TriggerSchema>;

export function scheduleTrigger(scheduledAt: Date): ScheduleTrigger {
  return { kind: "schedule", scheduledAt: scheduledAt.toISOString() };
}

export function manualTrigger(initiatedBy: string): ManualTrigger {
  return { kind: "manual", initiatedBy };
}

export function retryTrigger(attempt: number, previousFailureAt: Date, reason?: string): RetryTrigger {
  return {
    kind: "retry",
    attempt,
    previousFailureAt: previousFailureAt.toISOString(),
    ...(reason !== undefined ? { reason } : {}),
  };
}

export function eventTrigger(eventType: string, eventId: string, occurredAt: Date): EventTrigger {
  return { kind: "event", eventType, eventId, occurredAt: occurredAt.toISOString() };
}

export function isManualTrigger(t: Trigger): t is ManualTrigger {
  return t.kind === "manual";
}

export function isScheduleTrigger(t: Trigger): t is ScheduleTrigger {
  return t.kind === "schedule";
}

export function isRetryTrigger(t: Trigger): t is RetryTrigger {
  return t.kind === "retry";
}

export function isEventTrigger(t: Trigger): t is EventTrigger {
  return t.kind === "event";
}
