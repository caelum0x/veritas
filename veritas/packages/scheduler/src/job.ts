// Scheduled job definition: describes a unit of work the scheduler will execute.
import { z } from "zod";
import { ScheduleSchema, type Schedule } from "./schedule.js";

export const JobStatusSchema = z.enum(["active", "paused", "completed", "failed"]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const ScheduledJobSchema = z.object({
  id: z.string(),
  name: z.string(),
  schedule: ScheduleSchema,
  payload: z.unknown().optional(),
  status: JobStatusSchema.default("active"),
  lastRunAt: z.string().datetime().nullable().default(null),
  nextRunAt: z.string().datetime().nullable().default(null),
  failureCount: z.number().int().nonnegative().default(0),
  maxRetries: z.number().int().nonnegative().default(3),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ScheduledJob = z.infer<typeof ScheduledJobSchema>;

export const CreateScheduledJobSchema = ScheduledJobSchema.omit({
  status: true,
  lastRunAt: true,
  nextRunAt: true,
  failureCount: true,
  createdAt: true,
  updatedAt: true,
}).partial({ maxRetries: true });

export type CreateScheduledJob = z.infer<typeof CreateScheduledJobSchema>;

export interface JobExecutionContext {
  readonly jobId: string;
  readonly jobName: string;
  readonly scheduledAt: Date;
  readonly payload: unknown;
  readonly attempt: number;
}

export type JobHandler = (ctx: JobExecutionContext) => Promise<void>;

export function makeJob(
  input: CreateScheduledJob,
  now: Date,
  computedNextRunAt: Date | null
): ScheduledJob {
  const ts = now.toISOString();
  return {
    ...input,
    status: "active",
    lastRunAt: null,
    nextRunAt: computedNextRunAt ? computedNextRunAt.toISOString() : null,
    failureCount: 0,
    maxRetries: input.maxRetries ?? 3,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function withJobFailure(job: ScheduledJob, now: Date): ScheduledJob {
  const newCount = job.failureCount + 1;
  return {
    ...job,
    failureCount: newCount,
    status: newCount >= job.maxRetries ? "failed" : job.status,
    updatedAt: now.toISOString(),
  };
}

export function withJobSuccess(
  job: ScheduledJob,
  now: Date,
  nextRunAt: Date | null
): ScheduledJob {
  return {
    ...job,
    lastRunAt: now.toISOString(),
    nextRunAt: nextRunAt ? nextRunAt.toISOString() : null,
    failureCount: 0,
    status: nextRunAt === null ? "completed" : "active",
    updatedAt: now.toISOString(),
  };
}
