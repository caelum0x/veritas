// handler: processes a single dequeued job end-to-end (ingest → optional verification dispatch).

import { ok, err, isErr } from "@veritas/core";
import type { Result, Logger, AppError } from "@veritas/core";
import { InMemoryJobStore } from "@veritas/ingestion";
import type { IngestionPipeline } from "@veritas/ingestion";
import type { QueuedJob } from "./queue.js";
import type { WorkerConfig } from "./config.js";
import { runPipeline } from "./pipeline-runner.js";
import { dispatchToVerification } from "./to-verification.js";
import type { ToVerificationOptions } from "./to-verification.js";

export interface HandlerDeps {
  readonly pipeline: IngestionPipeline;
  readonly jobStore: InMemoryJobStore;
  readonly logger: Logger;
  readonly config: WorkerConfig;
  readonly verificationOptions?: ToVerificationOptions;
}

export interface HandlerResult {
  readonly jobId: string;
  readonly documentId: string;
  readonly chunkCount: number;
  readonly verificationDispatched: boolean;
  readonly durationMs: number;
}

/**
 * Handle one ingestion job: run the pipeline then optionally dispatch
 * extracted claims to the verification engine.
 */
export async function handleJob(
  queued: QueuedJob,
  deps: HandlerDeps,
): Promise<Result<HandlerResult, AppError>> {
  const { logger, config, verificationOptions } = deps;
  const startMs = Date.now();

  const pipelineResult = await runPipeline(queued, {
    pipeline: deps.pipeline,
    jobStore: deps.jobStore,
    logger,
    config,
  });

  if (isErr(pipelineResult)) {
    return err(pipelineResult.error);
  }

  const { job, ingestionResult } = pipelineResult.value;
  const doc = ingestionResult.document;

  let verificationDispatched = false;

  if (config.verificationEnabled && verificationOptions != null) {
    logger.info("handler: dispatching to verification", { documentId: doc.id });

    const dispatchResult = await dispatchToVerification(doc, verificationOptions);

    if (isErr(dispatchResult)) {
      // Verification failure is non-fatal — log and continue.
      logger.error("handler: verification dispatch failed (non-fatal)", {
        documentId: doc.id,
        code: dispatchResult.error.code,
        message: dispatchResult.error.message,
      });
    } else {
      verificationDispatched = dispatchResult.value.dispatchedCount > 0;
    }
  }

  const durationMs = Date.now() - startMs;

  return ok({
    jobId: job.id,
    documentId: doc.id,
    chunkCount: ingestionResult.chunks.length,
    verificationDispatched,
    durationMs,
  });
}
