// pipeline-runner: executes the ingestion pipeline for a single queued job and persists results.

import { ok, err, isOk, isErr } from "@veritas/core";
import type { Result, Logger, AppError } from "@veritas/core";
import {
  IngestionPipeline,
  InMemoryJobStore,
  createIngestionJob,
  startJob,
  advanceStage,
  succeedJob,
  failJob,
  IngestionStage,
  chunkText,
  makeSourceRef,
} from "@veritas/ingestion";
import type { IngestionJob, IngestionResult } from "@veritas/ingestion";
import type { QueuedJob } from "./queue.js";
import type { WorkerConfig } from "./config.js";

export interface PipelineRunnerDeps {
  readonly pipeline: IngestionPipeline;
  readonly jobStore: InMemoryJobStore;
  readonly logger: Logger;
  readonly config: WorkerConfig;
}

export interface PipelineRunResult {
  readonly job: IngestionJob;
  readonly ingestionResult: IngestionResult;
}

/**
 * Run the full ingestion pipeline for one queued job.
 * Updates job state in the store at each stage transition.
 */
export async function runPipeline(
  queued: QueuedJob,
  deps: PipelineRunnerDeps,
): Promise<Result<PipelineRunResult, AppError>> {
  const { pipeline, jobStore, logger, config } = deps;
  const startMs = Date.now();

  // Create and persist initial job record.
  let job = createIngestionJob(queued.sourceUrl);
  jobStore.save(job);

  logger.info("pipeline-runner: starting", { jobId: job.id, sourceUrl: queued.sourceUrl });

  // FETCH stage.
  job = startJob(job, IngestionStage.FETCH);
  jobStore.save(job);

  const sourceRef = makeSourceRef(queued.sourceUrl, {
    mimeType: queued.mimeType,
    headers: queued.headers,
  });

  const ingestResult = await pipeline.ingest(sourceRef);

  if (isErr(ingestResult)) {
    const message = ingestResult.error instanceof Error
      ? ingestResult.error.message
      : String(ingestResult.error);
    job = failJob(job, message);
    jobStore.save(job);
    logger.error("pipeline-runner: ingest failed", { jobId: job.id, message });
    return err({ code: "INTERNAL", message, statusCode: 500 } as unknown as AppError);
  }

  const doc = ingestResult.value;

  // Enforce document size limit.
  if (doc.rawContent.length > config.maxDocumentBytes) {
    const message = `Document exceeds max size: ${doc.rawContent.length} > ${config.maxDocumentBytes}`;
    job = failJob(job, message);
    jobStore.save(job);
    return err({ code: "VALIDATION", message, statusCode: 413 } as unknown as AppError);
  }

  // CHUNK stage.
  job = advanceStage(job, IngestionStage.CHUNK);
  jobStore.save(job);

  const chunkResult = chunkText(doc.textContent, {
    chunkSize: config.chunkSize,
    overlap: config.chunkOverlap,
  });

  if (isErr(chunkResult)) {
    const message = chunkResult.error instanceof Error
      ? chunkResult.error.message
      : "Chunking failed";
    job = failJob(job, message);
    jobStore.save(job);
    return err({ code: "INTERNAL", message, statusCode: 500 } as unknown as AppError);
  }

  const chunks = chunkResult.value;

  // DONE.
  job = succeedJob(job, doc.id);
  jobStore.save(job);

  const durationMs = Date.now() - startMs;

  logger.info("pipeline-runner: complete", {
    jobId: job.id,
    documentId: doc.id,
    chunkCount: chunks.length,
    durationMs,
  });

  return ok({
    job,
    ingestionResult: { jobId: job.id, document: doc, chunks, durationMs },
  });
}
