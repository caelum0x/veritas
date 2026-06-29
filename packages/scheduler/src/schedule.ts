// Schedule type: represents when a job should run (cron or interval).
import { z } from "zod";
import { parseCron, nextCronDate, type CronFields } from "./cron.js";

export const CronScheduleSchema = z.object({
  kind: z.literal("cron"),
  expression: z.string().refine((v) => {
    try { parseCron(v); return true; } catch { return false; }
  }, { message: "Invalid cron expression" }),
});

export const IntervalScheduleSchema = z.object({
  kind: z.literal("interval"),
  ms: z.number().int().positive(),
});

export const OnceScheduleSchema = z.object({
  kind: z.literal("once"),
  at: z.string().datetime(),
});

export const ScheduleSchema = z.discriminatedUnion("kind", [
  CronScheduleSchema,
  IntervalScheduleSchema,
  OnceScheduleSchema,
]);

export type CronSchedule = z.infer<typeof CronScheduleSchema>;
export type IntervalSchedule = z.infer<typeof IntervalScheduleSchema>;
export type OnceSchedule = z.infer<typeof OnceScheduleSchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;

export function nextRunAt(schedule: Schedule, after: Date): Date | null {
  switch (schedule.kind) {
    case "cron": {
      const fields: CronFields = parseCron(schedule.expression);
      return nextCronDate(fields, after);
    }
    case "interval": {
      return new Date(after.getTime() + schedule.ms);
    }
    case "once": {
      const at = new Date(schedule.at);
      return at > after ? at : null;
    }
  }
}
