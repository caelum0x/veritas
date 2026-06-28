// Scheduler interface and in-memory implementation: registers, manages, and dispatches jobs.
import { type Logger, noopLogger } from "@veritas/core";
import { type ScheduledJob, type JobHandler, type CreateScheduledJob, makeJob, withJobSuccess, withJobFailure } from "./job.js";
import { type Schedule, nextRunAt } from "./schedule.js";
import { scheduleTrigger, type Trigger } from "./trigger.js";
import { type TickableClock } from "./clock.js";
import { type JobRegistry } from "./registry.js";
import { SchedulerError } from "./errors.js";

export interface SchedulerOptions {
  readonly logger?: Logger;
  readonly tickMs?: number;
}

export interface Scheduler {
  register(job: CreateScheduledJob, handler: JobHandler): Promise<ScheduledJob>;
  unregister(jobId: string): Promise<void>;
  pause(jobId: string): Promise<void>;
  resume(jobId: string): Promise<void>;
  trigger(jobId: string, initiatedBy: string): Promise<void>;
  getJob(jobId: string): Promise<ScheduledJob | null>;
  listJobs(): Promise<ReadonlyArray<ScheduledJob>>;
  start(): void;
  stop(): void;
}

export class InMemoryScheduler implements Scheduler {
  private readonly logger: Logger;
  private readonly tickMs: number;
  private readonly registry: JobRegistry;
  private readonly handlers: Map<string, JobHandler> = new Map();
  private readonly clock: TickableClock;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(registry: JobRegistry, clock: TickableClock, opts: SchedulerOptions = {}) {
    this.registry = registry;
    this.clock = clock;
    this.logger = opts.logger ?? noopLogger;
    this.tickMs = opts.tickMs ?? 10_000;
  }

  async register(input: CreateScheduledJob, handler: JobHandler): Promise<ScheduledJob> {
    const now = new Date(this.clock.now());
    const schedule: Schedule = input.schedule;
    const next = nextRunAt(schedule, now);
    const job = makeJob(input, now, next);
    this.registry.register(job);
    this.handlers.set(job.id, handler);
    this.logger.info("Scheduler: registered job", { jobId: job.id, jobName: job.name });
    return job;
  }

  async unregister(jobId: string): Promise<void> {
    this.registry.unregister(jobId);
    this.handlers.delete(jobId);
    this.logger.info("Scheduler: unregistered job", { jobId });
  }

  async pause(jobId: string): Promise<void> {
    const job = this.registry.get(jobId);
    if (!job) throw new SchedulerError(`Job not found: ${jobId}`);
    const updated: ScheduledJob = { ...job, status: "paused", updatedAt: new Date(this.clock.now()).toISOString() };
    this.registry.unregister(jobId);
    this.registry.register(updated);
    this.logger.info("Scheduler: paused job", { jobId });
  }

  async resume(jobId: string): Promise<void> {
    const job = this.registry.get(jobId);
    if (!job) throw new SchedulerError(`Job not found: ${jobId}`);
    const now = new Date(this.clock.now());
    const next = nextRunAt(job.schedule, now);
    const updated: ScheduledJob = {
      ...job,
      status: "active",
      nextRunAt: next ? next.toISOString() : null,
      updatedAt: now.toISOString(),
    };
    this.registry.unregister(jobId);
    this.registry.register(updated);
    this.logger.info("Scheduler: resumed job", { jobId });
  }

  async trigger(jobId: string, _initiatedBy: string): Promise<void> {
    const job = this.registry.get(jobId);
    if (!job) throw new SchedulerError(`Job not found: ${jobId}`);
    const handler = this.handlers.get(jobId);
    if (!handler) throw new SchedulerError(`No handler registered for job: ${jobId}`);
    const now = new Date(this.clock.now());
    await this.runJob(job, handler, scheduleTrigger(now), 1);
  }

  async getJob(jobId: string): Promise<ScheduledJob | null> {
    return this.registry.get(jobId) ?? null;
  }

  async listJobs(): Promise<ReadonlyArray<ScheduledJob>> {
    return this.registry.list();
  }

  start(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.tickMs);
    this.logger.info("Scheduler: started", { tickMs: this.tickMs });
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.logger.info("Scheduler: stopped");
  }

  private async tick(): Promise<void> {
    const now = new Date(this.clock.now());
    const jobs = this.registry.list().filter((j) => {
      if (j.status !== "active") return false;
      if (!j.nextRunAt) return false;
      return new Date(j.nextRunAt) <= now;
    });
    await Promise.allSettled(
      jobs.map(async (job) => {
        const handler = this.handlers.get(job.id);
        if (!handler) return;
        const trigger: Trigger = scheduleTrigger(now);
        await this.runJob(job, handler, trigger, job.failureCount + 1);
      })
    );
  }

  private async runJob(
    job: ScheduledJob,
    handler: JobHandler,
    _trigger: Trigger,
    attempt: number
  ): Promise<void> {
    const now = new Date(this.clock.now());
    const ctx = {
      jobId: job.id,
      jobName: job.name,
      scheduledAt: now,
      payload: job.payload,
      attempt,
    };
    try {
      await handler(ctx);
      const next = nextRunAt(job.schedule, now);
      const updated = withJobSuccess(job, now, next);
      this.registry.unregister(job.id);
      this.registry.register(updated);
      this.logger.info("Scheduler: job succeeded", { jobId: job.id });
    } catch (err: unknown) {
      const updated = withJobFailure(job, now);
      this.registry.unregister(job.id);
      this.registry.register(updated);
      const willRetry = updated.status !== "failed";
      if (willRetry) {
        const next = nextRunAt(job.schedule, now);
        const retried: ScheduledJob = { ...updated, nextRunAt: next ? next.toISOString() : null };
        this.registry.unregister(updated.id);
        this.registry.register(retried);
      }
      this.logger.error("Scheduler: job failed", {
        jobId: job.id,
        attempt,
        err: err instanceof Error ? err.message : String(err),
        status: updated.status,
      });
    }
  }
}
