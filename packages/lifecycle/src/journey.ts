// Customer lifecycle journey — tracks a subject's progression through lifecycle stages.
import { z } from "zod";
import { type LifecycleStage, LifecycleStageSchema, isFinalStage } from "./stage.js";
import { type TriggerType, TriggerTypeSchema } from "./trigger.js";
import { type LifecycleEvent } from "./event.js";

export const JourneyStatusSchema = z.enum(["active", "paused", "terminated"]);
export type JourneyStatus = z.infer<typeof JourneyStatusSchema>;

export const StageHistoryEntrySchema = z.object({
  stage: LifecycleStageSchema,
  enteredAt: z.string().datetime(),
  exitedAt: z.string().datetime().nullable(),
  trigger: TriggerTypeSchema.nullable(),
  actorId: z.string().nullable(),
});
export type StageHistoryEntry = z.infer<typeof StageHistoryEntrySchema>;

export const SubjectKindSchema = z.enum([
  "user",
  "organization",
  "subscription",
  "claim",
  "order",
]);

export const JourneySubjectSchema = z.object({
  kind: SubjectKindSchema,
  id: z.string().min(1),
});
export type JourneySubject = z.infer<typeof JourneySubjectSchema>;

export const LifecycleJourneySchema = z.object({
  id: z.string().min(1),
  subject: JourneySubjectSchema,
  currentStage: LifecycleStageSchema,
  status: JourneyStatusSchema,
  stageHistory: z.array(StageHistoryEntrySchema),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type LifecycleJourney = z.infer<typeof LifecycleJourneySchema>;

export interface CreateJourneyOptions {
  readonly id: string;
  readonly subject: JourneySubject;
  readonly initialStage?: LifecycleStage;
  readonly metadata?: Record<string, unknown>;
}

export function createJourney(options: CreateJourneyOptions): LifecycleJourney {
  const now = new Date().toISOString();
  const initialStage: LifecycleStage = options.initialStage ?? "prospect";
  const entry: StageHistoryEntry = {
    stage: initialStage,
    enteredAt: now,
    exitedAt: null,
    trigger: null,
    actorId: null,
  };
  return {
    id: options.id,
    subject: options.subject,
    currentStage: initialStage,
    status: "active",
    stageHistory: [entry],
    metadata: options.metadata ?? {},
    createdAt: now,
    updatedAt: now,
  };
}

export interface AdvanceJourneyOptions {
  readonly toStage: LifecycleStage;
  readonly trigger: TriggerType;
  readonly actorId?: string | null;
  readonly metadata?: Record<string, unknown>;
}

/** Produce a new journey with the stage advanced — does NOT mutate the input. */
export function advanceJourney(
  journey: LifecycleJourney,
  options: AdvanceJourneyOptions,
): LifecycleJourney {
  const now = new Date().toISOString();
  const actorId = options.actorId ?? null;

  // Close the current open history entry
  const closedHistory = journey.stageHistory.map((entry) =>
    entry.exitedAt === null ? { ...entry, exitedAt: now } : entry,
  );

  const newEntry: StageHistoryEntry = {
    stage: options.toStage,
    enteredAt: now,
    exitedAt: null,
    trigger: options.trigger,
    actorId,
  };

  return {
    ...journey,
    currentStage: options.toStage,
    status: isFinalStage(options.toStage) ? "terminated" : journey.status,
    stageHistory: [...closedHistory, newEntry],
    metadata: options.metadata !== undefined
      ? { ...journey.metadata, ...options.metadata }
      : journey.metadata,
    updatedAt: now,
  };
}

/** Pause a journey — does NOT mutate the input. */
export function pauseJourney(journey: LifecycleJourney): LifecycleJourney {
  return { ...journey, status: "paused", updatedAt: new Date().toISOString() };
}

/** Resume a paused journey — does NOT mutate the input. */
export function resumeJourney(journey: LifecycleJourney): LifecycleJourney {
  return { ...journey, status: "active", updatedAt: new Date().toISOString() };
}

/** Return time in ms the journey has spent in its current stage. */
export function currentStageDurationMs(journey: LifecycleJourney): number {
  const current = [...journey.stageHistory].reverse().find((e) => e.exitedAt === null);
  if (current === undefined) return 0;
  return Date.now() - new Date(current.enteredAt).getTime();
}

/** Collect all emitted events from stageHistory as a chronological summary. */
export function journeyTimeline(
  journey: LifecycleJourney,
): ReadonlyArray<StageHistoryEntry> {
  return [...journey.stageHistory];
}

/** Build a compact event log from the journey for use with external event buses. */
export function journeyToEvents(
  journey: LifecycleJourney,
  entityType: string,
): ReadonlyArray<Pick<LifecycleEvent, "type">> {
  return journey.stageHistory.map((entry, idx) => {
    const isLast = idx === journey.stageHistory.length - 1;
    if (isLast && entry.exitedAt === null) {
      return { type: "lifecycle.stage_entered" as const };
    }
    return { type: "lifecycle.stage_exited" as const };
  });
}
