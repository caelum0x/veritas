// Lifecycle domain events emitted when stage transitions occur.
import { z } from "zod";
import { LifecycleStageSchema } from "./stage.js";
import { TriggerTypeSchema } from "./trigger.js";

export const LifecycleEventTypeSchema = z.enum([
  "lifecycle.stage_entered",
  "lifecycle.stage_exited",
  "lifecycle.transition_completed",
  "lifecycle.transition_rejected",
  "lifecycle.trigger_fired",
]);

export type LifecycleEventType = z.infer<typeof LifecycleEventTypeSchema>;

const BaseEventSchema = z.object({
  id: z.string().min(1),
  occurredAt: z.string().datetime(),
  entityId: z.string().min(1),
  entityType: z.string().min(1),
});

export const StageEnteredEventSchema = BaseEventSchema.extend({
  type: z.literal("lifecycle.stage_entered"),
  stage: LifecycleStageSchema,
  previousStage: LifecycleStageSchema.nullable(),
});

export const StageExitedEventSchema = BaseEventSchema.extend({
  type: z.literal("lifecycle.stage_exited"),
  stage: LifecycleStageSchema,
  nextStage: LifecycleStageSchema,
});

export const TransitionCompletedEventSchema = BaseEventSchema.extend({
  type: z.literal("lifecycle.transition_completed"),
  fromStage: LifecycleStageSchema,
  toStage: LifecycleStageSchema,
  triggeredBy: TriggerTypeSchema,
  actorId: z.string().nullable(),
});

export const TransitionRejectedEventSchema = BaseEventSchema.extend({
  type: z.literal("lifecycle.transition_rejected"),
  fromStage: LifecycleStageSchema,
  attemptedStage: LifecycleStageSchema,
  reason: z.string(),
  actorId: z.string().nullable(),
});

export const TriggerFiredEventSchema = BaseEventSchema.extend({
  type: z.literal("lifecycle.trigger_fired"),
  trigger: TriggerTypeSchema,
  metadata: z.record(z.unknown()),
});

export const LifecycleEventSchema = z.discriminatedUnion("type", [
  StageEnteredEventSchema,
  StageExitedEventSchema,
  TransitionCompletedEventSchema,
  TransitionRejectedEventSchema,
  TriggerFiredEventSchema,
]);

export type StageEnteredEvent = z.infer<typeof StageEnteredEventSchema>;
export type StageExitedEvent = z.infer<typeof StageExitedEventSchema>;
export type TransitionCompletedEvent = z.infer<typeof TransitionCompletedEventSchema>;
export type TransitionRejectedEvent = z.infer<typeof TransitionRejectedEventSchema>;
export type TriggerFiredEvent = z.infer<typeof TriggerFiredEventSchema>;
export type LifecycleEvent = z.infer<typeof LifecycleEventSchema>;

function baseFields(entityId: string, entityType: string): Pick<z.infer<typeof BaseEventSchema>, "id" | "occurredAt" | "entityId" | "entityType"> {
  return {
    id: `lce_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    occurredAt: new Date().toISOString(),
    entityId,
    entityType,
  };
}

export function makeStageEnteredEvent(
  entityId: string,
  entityType: string,
  stage: StageEnteredEvent["stage"],
  previousStage: StageEnteredEvent["previousStage"]
): StageEnteredEvent {
  return { ...baseFields(entityId, entityType), type: "lifecycle.stage_entered", stage, previousStage };
}

export function makeStageExitedEvent(
  entityId: string,
  entityType: string,
  stage: StageExitedEvent["stage"],
  nextStage: StageExitedEvent["nextStage"]
): StageExitedEvent {
  return { ...baseFields(entityId, entityType), type: "lifecycle.stage_exited", stage, nextStage };
}

export function makeTransitionCompletedEvent(
  entityId: string,
  entityType: string,
  fromStage: TransitionCompletedEvent["fromStage"],
  toStage: TransitionCompletedEvent["toStage"],
  triggeredBy: TransitionCompletedEvent["triggeredBy"],
  actorId: string | null
): TransitionCompletedEvent {
  return { ...baseFields(entityId, entityType), type: "lifecycle.transition_completed", fromStage, toStage, triggeredBy, actorId };
}

export function makeTransitionRejectedEvent(
  entityId: string,
  entityType: string,
  fromStage: TransitionRejectedEvent["fromStage"],
  attemptedStage: TransitionRejectedEvent["attemptedStage"],
  reason: string,
  actorId: string | null
): TransitionRejectedEvent {
  return { ...baseFields(entityId, entityType), type: "lifecycle.transition_rejected", fromStage, attemptedStage, reason, actorId };
}

export function makeTriggerFiredEvent(
  entityId: string,
  entityType: string,
  trigger: TriggerFiredEvent["trigger"],
  metadata: Record<string, unknown>
): TriggerFiredEvent {
  return { ...baseFields(entityId, entityType), type: "lifecycle.trigger_fired", trigger, metadata };
}
