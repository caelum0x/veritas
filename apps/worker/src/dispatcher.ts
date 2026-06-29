// Dispatcher routes dequeued jobs to the appropriate registered handler.
import { Result, ok, err, InternalError, Logger, noopLogger } from "@veritas/core";
import { Job, JobType } from "./queue/job.js";
import { JobHandler } from "./handler.js";

export interface DispatcherConfig {
  readonly logger?: Logger;
}

export class Dispatcher {
  private readonly handlers = new Map<JobType, JobHandler<unknown>>();
  private readonly logger: Logger;

  constructor(logger: Logger = noopLogger, config: DispatcherConfig = {}) {
    this.logger = config.logger ?? logger;
  }

  register<TPayload>(type: JobType, handler: JobHandler<TPayload>): void {
    this.handlers.set(type, handler as JobHandler<unknown>);
    this.logger.info("dispatcher: registered handler", { type });
  }

  async dispatch(job: Job<unknown>): Promise<Result<void>> {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      const msg = `No handler registered for job type: ${job.type}`;
      this.logger.warn("dispatcher: unhandled job type", { type: job.type, jobId: job.id });
      return err(new InternalError({ message: msg }));
    }

    this.logger.info("dispatcher: handling job", { type: job.type, jobId: job.id, attempt: job.attempts });

    try {
      const result = await handler.handle(job);
      if (result.ok) {
        this.logger.info("dispatcher: job completed", { type: job.type, jobId: job.id });
        return ok(undefined);
      } else {
        const errorMsg = result.error instanceof Error ? result.error.message : String(result.error);
        this.logger.error("dispatcher: job failed", { type: job.type, jobId: job.id, error: errorMsg });
        return err(new InternalError({ message: errorMsg }));
      }
    } catch (thrown: unknown) {
      const msg = thrown instanceof Error ? thrown.message : String(thrown);
      this.logger.error("dispatcher: job threw unexpectedly", { type: job.type, jobId: job.id, error: msg });
      return err(new InternalError({ message: msg }));
    }
  }

  async dispatchBatch(jobs: ReadonlyArray<Job<unknown>>): Promise<void> {
    await Promise.all(jobs.map((job) => this.dispatch(job)));
  }
}
