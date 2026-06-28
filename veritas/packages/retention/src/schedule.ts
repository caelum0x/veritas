// Retention schedule: maps records to policies and tracks next-run timing.
import { z } from "zod";
import { newId } from "@veritas/core";
import type { RetentionCategory } from "./policy.js";

export const ScheduleStatusSchema = z.enum(["pending", "running", "completed", "failed"]);
export type ScheduleStatus = z.infer<typeof ScheduleStatusSchema>;

export const RetentionScheduleSchema = z.object({
  id: z.string(),
  policyId: z.string(),
  category: z.string(),
  /** ISO timestamp of the next scheduled evaluation. */
  nextRunAt: z.string(),
  /** ISO timestamp of the last completed run, null if never run. */
  lastRunAt: z.string().nullable().default(null),
  status: ScheduleStatusSchema.default("pending"),
  /** How often to re-run the evaluation, in hours. */
  intervalHours: z.number().int().min(1).default(24),
  enabled: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RetentionSchedule = z.infer<typeof RetentionScheduleSchema>;

export const CreateRetentionScheduleSchema = RetentionScheduleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({ nextRunAt: true, status: true, lastRunAt: true, intervalHours: true });
export type CreateRetentionSchedule = z.infer<typeof CreateRetentionScheduleSchema>;

/** Compute the next run time given an interval in hours from a reference time. */
export function computeNextRunAt(referenceIso: string, intervalHours: number): string {
  const base = new Date(referenceIso);
  return new Date(base.getTime() + intervalHours * 60 * 60 * 1000).toISOString();
}

/** Build a new RetentionSchedule, defaulting nextRunAt to now. */
export function makeRetentionSchedule(dto: CreateRetentionSchedule): RetentionSchedule {
  const now = new Date().toISOString();
  const intervalHours = dto.intervalHours ?? 24;
  return RetentionScheduleSchema.parse({
    intervalHours,
    status: "pending",
    lastRunAt: null,
    ...dto,
    nextRunAt: dto.nextRunAt ?? computeNextRunAt(now, intervalHours),
    id: newId("rsched"),
    createdAt: now,
    updatedAt: now,
  });
}

/** Return a schedule with status set to running and updatedAt refreshed. */
export function markScheduleRunning(schedule: RetentionSchedule): RetentionSchedule {
  return { ...schedule, status: "running", updatedAt: new Date().toISOString() };
}

/** Return a schedule updated after a successful run. */
export function markScheduleCompleted(schedule: RetentionSchedule): RetentionSchedule {
  const now = new Date().toISOString();
  return {
    ...schedule,
    status: "completed",
    lastRunAt: now,
    nextRunAt: computeNextRunAt(now, schedule.intervalHours),
    updatedAt: now,
  };
}

/** Return a schedule updated after a failed run (preserves lastRunAt). */
export function markScheduleFailed(schedule: RetentionSchedule): RetentionSchedule {
  const now = new Date().toISOString();
  return {
    ...schedule,
    status: "failed",
    nextRunAt: computeNextRunAt(now, schedule.intervalHours),
    updatedAt: now,
  };
}

/** Return schedules that are due to run at or before the given ISO timestamp. */
export function filterDueSchedules(
  schedules: ReadonlyArray<RetentionSchedule>,
  nowIso: string,
): ReadonlyArray<RetentionSchedule> {
  return schedules.filter(
    (s) => s.enabled && s.status !== "running" && s.nextRunAt <= nowIso,
  );
}
