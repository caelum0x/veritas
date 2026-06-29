// Report schedule: defines cron-based recurrence rules and next-run computation for reports.
import { z } from "zod";
import { newId } from "@veritas/core";
import type { ScheduleId, TemplateId, ReportFormat } from "./report.js";

export const CronExpressionSchema = z.string().regex(
  /^(\*|[0-9,-/]+)\s+(\*|[0-9,-/]+)\s+(\*|[0-9,-/]+)\s+(\*|[0-9,-/]+)\s+(\*|[0-9,-/]+)$/,
  "Invalid cron expression (must be 5-field: min hour dom mon dow)"
);

export const ScheduleStatusSchema = z.enum(["active", "paused", "disabled"]);
export type ScheduleStatus = z.infer<typeof ScheduleStatusSchema>;

export interface ReportSchedule {
  readonly id: ScheduleId;
  readonly name: string;
  readonly templateId: TemplateId;
  readonly cronExpression: string;
  readonly timezone: string;
  readonly status: ScheduleStatus;
  readonly format: ReportFormat;
  readonly parameters: Record<string, unknown>;
  readonly recipientIds: readonly string[];
  readonly lastRunAt?: string;
  readonly nextRunAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateScheduleInput {
  readonly name: string;
  readonly templateId: TemplateId;
  readonly cronExpression: string;
  readonly timezone?: string;
  readonly format?: ReportFormat;
  readonly parameters?: Record<string, unknown>;
  readonly recipientIds?: readonly string[];
}

export const CreateScheduleInputSchema = z.object({
  name: z.string().min(1).max(200),
  templateId: z.string().min(1),
  cronExpression: CronExpressionSchema,
  timezone: z.string().default("UTC"),
  format: z.enum(["json", "html", "pdf", "csv", "markdown"]).default("json"),
  parameters: z.record(z.unknown()).default({}),
  recipientIds: z.array(z.string()).default([]),
});

/** Parse a simple cron field and return an array of matching numeric values. */
function parseCronField(field: string, min: number, max: number): readonly number[] {
  if (field === "*") {
    const result: number[] = [];
    for (let i = min; i <= max; i++) result.push(i);
    return result;
  }
  const values: number[] = [];
  for (const part of field.split(",")) {
    if (part.includes("/")) {
      const splitParts = part.split("/");
      const rangeStr = splitParts[0] ?? "*";
      const stepStr = splitParts[1] ?? "1";
      const step = parseInt(stepStr, 10);
      const rangeParts = rangeStr === "*" ? [min, max] : rangeStr.split("-").map(Number);
      const rMin = rangeParts[0] ?? min;
      const rMax = rangeParts[1] ?? max;
      for (let i = rMin; i <= rMax; i += step) values.push(i);
    } else if (part.includes("-")) {
      const dashParts = part.split("-").map(Number);
      const lo = dashParts[0] ?? min;
      const hi = dashParts[1] ?? max;
      for (let i = lo; i <= hi; i++) values.push(i);
    } else {
      values.push(parseInt(part, 10));
    }
  }
  return values.filter((v) => v >= min && v <= max);
}

/** Compute the next UTC run time after `after` for the given 5-field cron expression. */
export function computeNextRun(cronExpression: string, after: Date = new Date()): Date {
  const cronParts = cronExpression.trim().split(/\s+/);
  const minF = cronParts[0] ?? "*";
  const hourF = cronParts[1] ?? "*";
  const dowF = cronParts[4] ?? "*";
  const minutes = parseCronField(minF, 0, 59);
  const hours = parseCronField(hourF, 0, 23);
  const dows = parseCronField(dowF, 0, 6);

  const candidate = new Date(after.getTime() + 60_000); // at least 1 minute ahead
  candidate.setSeconds(0, 0);

  for (let attempt = 0; attempt < 10_080; attempt++) {
    const dow = candidate.getUTCDay();
    const h = candidate.getUTCHours();
    const m = candidate.getUTCMinutes();
    if (dows.includes(dow) && hours.includes(h) && minutes.includes(m)) {
      return candidate;
    }
    candidate.setTime(candidate.getTime() + 60_000);
  }
  // Fallback: 1 week from after
  return new Date(after.getTime() + 7 * 24 * 60 * 60 * 1000);
}

export function createSchedule(input: CreateScheduleInput): ReportSchedule {
  const now = new Date();
  const parsed = CreateScheduleInputSchema.parse(input);
  const nextRun = computeNextRun(parsed.cronExpression, now);
  return {
    id: newId("Schedule") as ScheduleId,
    name: parsed.name,
    templateId: parsed.templateId as TemplateId,
    cronExpression: parsed.cronExpression,
    timezone: parsed.timezone,
    status: "active",
    format: parsed.format,
    parameters: parsed.parameters,
    recipientIds: parsed.recipientIds,
    nextRunAt: nextRun.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function pauseSchedule(schedule: ReportSchedule): ReportSchedule {
  return { ...schedule, status: "paused", updatedAt: new Date().toISOString() };
}

export function resumeSchedule(schedule: ReportSchedule): ReportSchedule {
  const nextRun = computeNextRun(schedule.cronExpression);
  return {
    ...schedule,
    status: "active",
    nextRunAt: nextRun.toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function recordRun(schedule: ReportSchedule): ReportSchedule {
  const now = new Date();
  const nextRun = computeNextRun(schedule.cronExpression, now);
  return {
    ...schedule,
    lastRunAt: now.toISOString(),
    nextRunAt: nextRun.toISOString(),
    updatedAt: now.toISOString(),
  };
}
