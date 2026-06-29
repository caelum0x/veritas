// Periodic review schedule management — defines cadence and triggers for access review campaigns.
import { z } from "zod";
import { type Result, ok, err, newId, type IsoTimestamp, epochToIso } from "@veritas/core";
import { type ReviewFrequency, ReviewFrequencySchema, ReviewScopeSchema } from "./types.js";
import { ScheduleConflictError } from "./errors.js";

export const ReviewScheduleSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  name: z.string().min(1),
  frequency: ReviewFrequencySchema,
  scope: ReviewScopeSchema,
  enabled: z.boolean(),
  lastRunAt: z.string().datetime().optional(),
  nextRunAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ReviewSchedule = z.infer<typeof ReviewScheduleSchema>;

export const CreateReviewScheduleSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(1),
  frequency: ReviewFrequencySchema,
  scope: ReviewScopeSchema,
  enabled: z.boolean().default(true),
  firstRunAt: z.string().datetime().optional(),
});

export type CreateReviewSchedule = z.infer<typeof CreateReviewScheduleSchema>;

const FREQUENCY_DAYS: Record<ReviewFrequency, number> = {
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 90,
  SEMI_ANNUAL: 180,
  ANNUAL: 365,
};

function computeNextRunAt(from: IsoTimestamp, frequency: ReviewFrequency): IsoTimestamp {
  const ms = Date.parse(from);
  const days = FREQUENCY_DAYS[frequency];
  return epochToIso(ms + days * 24 * 60 * 60 * 1000);
}

function nowIso(): IsoTimestamp {
  return epochToIso(Date.now());
}

export function createReviewSchedule(input: CreateReviewSchedule): Result<ReviewSchedule> {
  const parsed = CreateReviewScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return err(new ScheduleConflictError(parsed.error.message));
  }
  const now = nowIso();
  const nextRunAt = parsed.data.firstRunAt
    ? (parsed.data.firstRunAt as IsoTimestamp)
    : computeNextRunAt(now, parsed.data.frequency);

  const schedule: ReviewSchedule = {
    id: newId("rsched"),
    organizationId: parsed.data.organizationId,
    name: parsed.data.name,
    frequency: parsed.data.frequency,
    scope: parsed.data.scope,
    enabled: parsed.data.enabled,
    nextRunAt,
    createdAt: now,
    updatedAt: now,
  };
  return ok(schedule);
}

export function advanceSchedule(schedule: ReviewSchedule): Result<ReviewSchedule> {
  if (!schedule.enabled) {
    return err(new ScheduleConflictError(`Schedule ${schedule.id} is disabled`));
  }
  const now = nowIso();
  const next = computeNextRunAt(schedule.nextRunAt as IsoTimestamp, schedule.frequency);
  const updated: ReviewSchedule = {
    ...schedule,
    lastRunAt: schedule.nextRunAt,
    nextRunAt: next,
    updatedAt: now,
  };
  return ok(updated);
}

export function toggleSchedule(schedule: ReviewSchedule, enabled: boolean): ReviewSchedule {
  return { ...schedule, enabled, updatedAt: nowIso() };
}

export function isDue(schedule: ReviewSchedule): boolean {
  if (!schedule.enabled) return false;
  return Date.parse(schedule.nextRunAt) <= Date.now();
}
