// In-memory FIFO job queue for report generation jobs — port interface pattern.
import { newId } from "@veritas/core";
import type { ReportId, TemplateId, ScheduleId } from "@veritas/reporting";

export type JobState = "pending" | "running" | "completed" | "failed";

export interface ReportJob {
  readonly id: string;
  readonly reportId?: ReportId;
  readonly templateId: TemplateId;
  readonly scheduleId?: ScheduleId;
  readonly organizationId: string;
  readonly ownerId: string;
  readonly parameters: Record<string, unknown>;
  readonly format: string;
  readonly recipientIds: readonly string[];
  readonly state: JobState;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly errorMessage?: string;
  readonly enqueuedAt: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
}

export interface EnqueueInput {
  readonly templateId: TemplateId;
  readonly scheduleId?: ScheduleId;
  readonly organizationId: string;
  readonly ownerId: string;
  readonly parameters: Record<string, unknown>;
  readonly format: string;
  readonly recipientIds?: readonly string[];
  readonly maxAttempts?: number;
}

/** Port interface for report job queues. */
export interface JobQueue {
  enqueue(input: EnqueueInput): Promise<ReportJob>;
  dequeue(): Promise<ReportJob | undefined>;
  markRunning(jobId: string): Promise<ReportJob | undefined>;
  markCompleted(jobId: string, reportId: ReportId): Promise<ReportJob | undefined>;
  markFailed(jobId: string, errorMessage: string): Promise<ReportJob | undefined>;
  get(jobId: string): Promise<ReportJob | undefined>;
  listPending(): Promise<readonly ReportJob[]>;
}

/** Thread-unsafe in-memory job queue suitable for single-process workers. */
export class InMemoryJobQueue implements JobQueue {
  readonly #jobs = new Map<string, ReportJob>();
  readonly #queue: string[] = [];

  async enqueue(input: EnqueueInput): Promise<ReportJob> {
    const job: ReportJob = {
      id: newId("job"),
      templateId: input.templateId,
      scheduleId: input.scheduleId,
      organizationId: input.organizationId,
      ownerId: input.ownerId,
      parameters: { ...input.parameters },
      format: input.format,
      recipientIds: input.recipientIds ?? [],
      state: "pending",
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 3,
      enqueuedAt: new Date().toISOString(),
    };
    this.#jobs.set(job.id, job);
    this.#queue.push(job.id);
    return job;
  }

  async dequeue(): Promise<ReportJob | undefined> {
    while (this.#queue.length > 0) {
      const id = this.#queue.shift()!;
      const job = this.#jobs.get(id);
      if (job && job.state === "pending") return job;
    }
    return undefined;
  }

  async markRunning(jobId: string): Promise<ReportJob | undefined> {
    const job = this.#jobs.get(jobId);
    if (!job) return undefined;
    const updated: ReportJob = {
      ...job,
      state: "running",
      attempts: job.attempts + 1,
      startedAt: new Date().toISOString(),
    };
    this.#jobs.set(jobId, updated);
    return updated;
  }

  async markCompleted(jobId: string, reportId: ReportId): Promise<ReportJob | undefined> {
    const job = this.#jobs.get(jobId);
    if (!job) return undefined;
    const updated: ReportJob = {
      ...job,
      state: "completed",
      reportId,
      completedAt: new Date().toISOString(),
    };
    this.#jobs.set(jobId, updated);
    return updated;
  }

  async markFailed(jobId: string, errorMessage: string): Promise<ReportJob | undefined> {
    const job = this.#jobs.get(jobId);
    if (!job) return undefined;
    const canRetry = job.attempts < job.maxAttempts;
    const updated: ReportJob = {
      ...job,
      state: canRetry ? "pending" : "failed",
      errorMessage,
      completedAt: canRetry ? undefined : new Date().toISOString(),
    };
    this.#jobs.set(jobId, updated);
    if (canRetry) this.#queue.push(jobId);
    return updated;
  }

  async get(jobId: string): Promise<ReportJob | undefined> {
    return this.#jobs.get(jobId);
  }

  async listPending(): Promise<readonly ReportJob[]> {
    return [...this.#jobs.values()].filter((j) => j.state === "pending");
  }
}
