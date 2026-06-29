// JobHandler interface defining the contract for all worker job handlers.
import { Result } from "@veritas/core";
import { Job } from "./queue/job.js";

/**
 * A JobHandler processes a single job and returns a Result indicating
 * success or failure. Implementations should be idempotent where possible.
 */
export interface JobHandler<TPayload = unknown> {
  /**
   * Execute the job. Return ok(undefined) on success, err(AppError) on failure.
   */
  handle(job: Job<TPayload>): Promise<Result<void>>;
}
