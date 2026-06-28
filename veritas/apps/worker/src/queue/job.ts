// Job envelope type representing a unit of work in the queue.
import { z } from "zod";
import { JobId, newJobId, IsoTimestamp, epochToIso } from "@veritas/core";

export const JobTypeSchema = z.enum([
  "run-verification",
  "deliver-webhook",
  "generate-invoice",
  "reconcile-settlements",
  "expire-orders",
  "aggregate-usage",
]);

export type JobType = z.infer<typeof JobTypeSchema>;

export const JobStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "dead",
]);

export type JobStatus = z.infer<typeof JobStatusSchema>;

export interface Job<TPayload = unknown> {
  readonly id: JobId;
  readonly type: JobType;
  readonly payload: TPayload;
  readonly status: JobStatus;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly createdAt: IsoTimestamp;
  readonly scheduledAt: IsoTimestamp;
  readonly runAt: IsoTimestamp | null;
  readonly completedAt: IsoTimestamp | null;
  readonly failedAt: IsoTimestamp | null;
  readonly lastError: string | null;
}

export function makeJob<TPayload>(
  type: JobType,
  payload: TPayload,
  options: { scheduledAt?: IsoTimestamp; maxAttempts?: number } = {}
): Job<TPayload> {
  const now = epochToIso(Date.now());
  return {
    id: newJobId(),
    type,
    payload,
    status: "pending",
    attempts: 0,
    maxAttempts: options.maxAttempts ?? 3,
    createdAt: now,
    scheduledAt: options.scheduledAt ?? now,
    runAt: null,
    completedAt: null,
    failedAt: null,
    lastError: null,
  };
}

export function withStatus<TPayload>(
  job: Job<TPayload>,
  status: JobStatus,
  extra: Partial<Pick<Job, "lastError" | "runAt" | "completedAt" | "failedAt">> = {}
): Job<TPayload> {
  return { ...job, ...extra, status, attempts: job.attempts + (status === "running" ? 1 : 0) };
}
