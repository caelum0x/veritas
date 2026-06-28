// Queue interface defining the contract for job queue implementations.
import { Result } from "@veritas/core";
import { Job, JobType } from "./job.js";

export interface EnqueueOptions {
  readonly scheduledAt?: string;
  readonly maxAttempts?: number;
}

export interface DequeueOptions {
  readonly types?: ReadonlyArray<JobType>;
  readonly limit?: number;
}

export interface Queue {
  /**
   * Enqueue a new job of the given type with the provided payload.
   */
  enqueue<TPayload>(
    type: JobType,
    payload: TPayload,
    options?: EnqueueOptions
  ): Promise<Result<Job<TPayload>>>;

  /**
   * Dequeue jobs that are ready to run (scheduledAt <= now, status=pending).
   */
  dequeue(options?: DequeueOptions): Promise<Result<ReadonlyArray<Job<unknown>>>>;

  /**
   * Mark a job as successfully completed.
   */
  complete(jobId: string): Promise<Result<Job<unknown>>>;

  /**
   * Mark a job as failed. If attempts < maxAttempts, it is re-queued.
   * Otherwise it transitions to "dead".
   */
  fail(jobId: string, error: string): Promise<Result<Job<unknown>>>;

  /**
   * Return a snapshot of all jobs (for observability / testing).
   */
  list(type?: JobType): Promise<Result<ReadonlyArray<Job<unknown>>>>;

  /**
   * Return queue depth (pending + running).
   */
  depth(): Promise<number>;
}
