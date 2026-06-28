// Reporting schedule: defines recurring compliance report generation cadence per framework.

import { z } from "zod";
import { type IsoTimestamp, ok, err, type Result, isoTimestampSchema } from "@veritas/core";
import {
  ReportingFrameworkSchema,
  type ReportingFramework,
  ScheduleRecurrenceSchema,
  ScheduleStatusSchema,
  type ScheduleStatus,
  asScheduleId,
  type ScheduleId,
} from "./types.js";
import { ScheduleNotFoundError, DuplicateScheduleError } from "./errors.js";

// --- Schemas ---

export const ScheduleNotificationSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string().min(1),
  notifyOnGeneration: z.boolean().default(true),
  notifyOnApproval: z.boolean().default(false),
});
export type ScheduleNotification = z.infer<typeof ScheduleNotificationSchema>;

export const ReportingScheduleSchema = z.object({
  id: z.string().min(1),
  framework: ReportingFrameworkSchema,
  recurrence: ScheduleRecurrenceSchema,
  status: ScheduleStatusSchema,
  /** ISO date string: next scheduled generation (YYYY-MM-DD). */
  nextRunDate: z.string().min(1),
  /** ISO date string: last completed run, if any. */
  lastRunDate: z.string().optional(),
  notifications: z.array(ScheduleNotificationSchema).default([]),
  createdBy: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});
export type ReportingSchedule = z.infer<typeof ReportingScheduleSchema>;

export const CreateScheduleSchema = z.object({
  framework: ReportingFrameworkSchema,
  recurrence: ScheduleRecurrenceSchema,
  /** ISO date for first run (YYYY-MM-DD). */
  startDate: z.string().min(1),
  notifications: z.array(ScheduleNotificationSchema).default([]),
  createdBy: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateSchedule = z.infer<typeof CreateScheduleSchema>;

export const UpdateScheduleSchema = z.object({
  recurrence: ScheduleRecurrenceSchema.optional(),
  status: ScheduleStatusSchema.optional(),
  nextRunDate: z.string().min(1).optional(),
  notifications: z.array(ScheduleNotificationSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateSchedule = z.infer<typeof UpdateScheduleSchema>;

// --- Date arithmetic helpers ---

/** Advance an ISO date string (YYYY-MM-DD) by the given recurrence interval. */
export function advanceByRecurrence(
  dateStr: string,
  recurrence: ReportingSchedule["recurrence"],
): string {
  const d = new Date(dateStr);
  switch (recurrence) {
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "semi_annual":
      d.setMonth(d.getMonth() + 6);
      break;
    case "annual":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().slice(0, 10);
}

/** Check if a schedule is due on or before the given ISO date string. */
export function isScheduleDue(schedule: ReportingSchedule, asOfDate: string): boolean {
  return schedule.status === "active" && schedule.nextRunDate <= asOfDate;
}

// --- In-memory schedule store ---

export class ScheduleStore {
  private readonly store = new Map<string, ReportingSchedule>();

  /** Create a schedule; returns conflict error if an active one already exists for this framework. */
  create(
    input: CreateSchedule,
    now: IsoTimestamp,
    idGenerator: () => string = () => crypto.randomUUID(),
  ): Result<ReportingSchedule, DuplicateScheduleError> {
    const existing = [...this.store.values()].find(
      (s) => s.framework === input.framework && s.status === "active",
    );
    if (existing) {
      return err(new DuplicateScheduleError(input.framework));
    }
    const schedule: ReportingSchedule = {
      id: asScheduleId(idGenerator()),
      framework: input.framework,
      recurrence: input.recurrence,
      status: "active",
      nextRunDate: input.startDate,
      notifications: input.notifications,
      createdBy: input.createdBy,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(schedule.id, schedule);
    return ok(schedule);
  }

  findById(id: ScheduleId | string): Result<ReportingSchedule, ScheduleNotFoundError> {
    const found = this.store.get(id);
    if (!found) return err(new ScheduleNotFoundError(id));
    return ok(found);
  }

  update(
    id: ScheduleId | string,
    input: UpdateSchedule,
    now: IsoTimestamp,
  ): Result<ReportingSchedule, ScheduleNotFoundError> {
    const existing = this.store.get(id);
    if (!existing) return err(new ScheduleNotFoundError(id));
    const updated: ReportingSchedule = {
      ...existing,
      ...(input.recurrence !== undefined ? { recurrence: input.recurrence } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.nextRunDate !== undefined ? { nextRunDate: input.nextRunDate } : {}),
      ...(input.notifications !== undefined ? { notifications: input.notifications } : {}),
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      updatedAt: now,
    };
    this.store.set(id, updated);
    return ok(updated);
  }

  /** Record a completed run and advance the nextRunDate. */
  recordRun(
    id: ScheduleId | string,
    runDate: string,
    now: IsoTimestamp,
  ): Result<ReportingSchedule, ScheduleNotFoundError> {
    const existing = this.store.get(id);
    if (!existing) return err(new ScheduleNotFoundError(id));
    const updated: ReportingSchedule = {
      ...existing,
      lastRunDate: runDate,
      nextRunDate: advanceByRecurrence(runDate, existing.recurrence),
      updatedAt: now,
    };
    this.store.set(id, updated);
    return ok(updated);
  }

  listByFramework(framework: ReportingFramework): ReportingSchedule[] {
    return [...this.store.values()].filter((s) => s.framework === framework);
  }

  listDue(asOfDate: string): ReportingSchedule[] {
    return [...this.store.values()].filter((s) => isScheduleDue(s, asOfDate));
  }

  listAll(): ReportingSchedule[] {
    return [...this.store.values()];
  }
}
