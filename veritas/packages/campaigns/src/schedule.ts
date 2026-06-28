// Campaign schedule: one-time and recurring send-time configuration.

import { z } from "zod";
import { ok, err, newId, epochToIso, type Result } from "@veritas/core";
import { CampaignValidationError } from "./errors.js";

export const RecurrenceRuleSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly"]),
  interval: z.number().int().min(1).default(1),
  /** ISO weekday numbers 1=Mon–7=Sun; only used when frequency=weekly */
  daysOfWeek: z.array(z.number().int().min(1).max(7)).optional(),
  /** Day of month 1-28; only used when frequency=monthly */
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  endsAt: z.string().datetime().optional(),
  maxOccurrences: z.number().int().positive().optional(),
});
export type RecurrenceRule = z.infer<typeof RecurrenceRuleSchema>;

export const CampaignScheduleSchema = z.object({
  id: z.string().min(1),
  orgId: z.string().min(1),
  campaignId: z.string().min(1),
  sendAt: z.string().datetime(),
  timezone: z.string().min(1).default("UTC"),
  recurrence: RecurrenceRuleSchema.optional(),
  nextRunAt: z.string().datetime().optional(),
  lastRunAt: z.string().datetime().optional(),
  runCount: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CampaignSchedule = z.infer<typeof CampaignScheduleSchema>;

export const CreateScheduleInputSchema = CampaignScheduleSchema.omit({
  id: true,
  nextRunAt: true,
  lastRunAt: true,
  runCount: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateScheduleInput = z.infer<typeof CreateScheduleInputSchema>;

/** Creates a new campaign schedule, computing the initial nextRunAt. */
export function createSchedule(
  input: CreateScheduleInput,
): Result<CampaignSchedule, CampaignValidationError> {
  const parsed = CreateScheduleInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      new CampaignValidationError(
        parsed.error.issues.map((i) => i.message).join("; "),
      ),
    );
  }
  const now = epochToIso(Date.now());
  return ok({
    ...parsed.data,
    id: newId("schedule"),
    nextRunAt: parsed.data.sendAt,
    runCount: 0,
    createdAt: now,
    updatedAt: now,
  });
}

/** Advances a schedule after a run, returning updated schedule or null when exhausted. */
export function advanceSchedule(
  schedule: CampaignSchedule,
): CampaignSchedule | null {
  const now = epochToIso(Date.now());
  const nextRunCount = schedule.runCount + 1;
  if (!schedule.recurrence) {
    return { ...schedule, lastRunAt: now, nextRunAt: undefined, runCount: nextRunCount, updatedAt: now };
  }
  const rule = schedule.recurrence;
  if (rule.maxOccurrences !== undefined && nextRunCount >= rule.maxOccurrences) {
    return { ...schedule, lastRunAt: now, nextRunAt: undefined, runCount: nextRunCount, updatedAt: now };
  }
  const next = computeNextRun(schedule.nextRunAt ?? schedule.sendAt, rule);
  if (rule.endsAt !== undefined && next > rule.endsAt) {
    return { ...schedule, lastRunAt: now, nextRunAt: undefined, runCount: nextRunCount, updatedAt: now };
  }
  return { ...schedule, lastRunAt: now, nextRunAt: next, runCount: nextRunCount, updatedAt: now };
}

/** Returns true when the schedule has no further runs to execute. */
export function isScheduleExhausted(schedule: CampaignSchedule): boolean {
  return schedule.nextRunAt === undefined;
}

/** Computes the next ISO datetime string after a base time given a recurrence rule. */
function computeNextRun(base: string, rule: RecurrenceRule): string {
  const d = new Date(base);
  switch (rule.frequency) {
    case "daily":
      d.setUTCDate(d.getUTCDate() + rule.interval);
      break;
    case "weekly":
      d.setUTCDate(d.getUTCDate() + 7 * rule.interval);
      break;
    case "monthly":
      d.setUTCMonth(d.getUTCMonth() + rule.interval);
      if (rule.dayOfMonth !== undefined) {
        d.setUTCDate(rule.dayOfMonth);
      }
      break;
  }
  return epochToIso(d.getTime());
}
