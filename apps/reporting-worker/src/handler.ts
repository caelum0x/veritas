// Report job handler — dequeues a single job, runs generation, and updates job state.
import { isOk } from "@veritas/core";
import type { Logger } from "@veritas/observability";
import type { JobQueue, ReportJob } from "./queue.js";
import type { GeneratorDeps } from "./generator.js";
import { generateAndDeliver } from "./generator.js";

export interface HandlerDeps extends GeneratorDeps {
  readonly queue: JobQueue;
  readonly logger: Logger;
}

export interface HandleResult {
  readonly processed: boolean;
  readonly jobId?: string;
  readonly reportId?: string;
  readonly error?: string;
}

/** Process the next pending job from the queue. Returns processed=false when queue is empty. */
export async function handleNextJob(deps: HandlerDeps): Promise<HandleResult> {
  const { queue, logger } = deps;

  const job: ReportJob | undefined = await queue.dequeue();
  if (!job) {
    return { processed: false };
  }

  const running = await queue.markRunning(job.id);
  if (!running) {
    return { processed: false };
  }

  logger.info("Processing report job", {
    jobId: job.id,
    templateId: job.templateId,
    organizationId: job.organizationId,
    attempt: running.attempts,
  });

  const result = await generateAndDeliver(running, deps);

  if (isOk(result)) {
    const { reportId } = result.value;
    await queue.markCompleted(job.id, reportId as Parameters<typeof queue.markCompleted>[1]);
    logger.info("Report job completed", { jobId: job.id, reportId });
    return { processed: true, jobId: job.id, reportId };
  }

  const errorMsg =
    result.error instanceof Error
      ? result.error.message
      : String(result.error);

  await queue.markFailed(job.id, errorMsg);
  logger.warn("Report job failed", { jobId: job.id, error: errorMsg, attempt: running.attempts });
  return { processed: true, jobId: job.id, error: errorMsg };
}
