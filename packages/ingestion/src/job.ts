// Ingestion job: tracks lifecycle state for an async pipeline execution.

import { z } from "zod";
import { JobStatus, newJobId, epochToIso } from "@veritas/core";
import type { JobId } from "@veritas/core";
import { IngestionStage, type IngestionProgress } from "./types.js";

/** Mutable job record maintained internally by the pipeline runner. */
export interface IngestionJob {
  readonly id: JobId;
  readonly sourceUrl: string;
  status: JobStatus;
  stage: IngestionStage;
  readonly startedAt: string;
  updatedAt: string;
  errorMessage?: string;
  resultDocumentId?: string;
}

/** Zod schema for validating persisted job snapshots. */
export const IngestionJobSchema = z.object({
  id: z.string().min(1),
  sourceUrl: z.string().url(),
  status: z.enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"]),
  stage: z.enum(["FETCH", "EXTRACT", "NORMALIZE", "LANGUAGE_DETECT", "CHUNK", "DONE"]),
  startedAt: z.string(),
  updatedAt: z.string(),
  errorMessage: z.string().optional(),
  resultDocumentId: z.string().optional(),
});

/** Factory: create a new ingestion job in QUEUED state. */
export function createIngestionJob(sourceUrl: string): IngestionJob {
  const now = epochToIso(Date.now());
  return {
    id: newJobId(),
    sourceUrl,
    status: JobStatus.QUEUED,
    stage: IngestionStage.FETCH,
    startedAt: now,
    updatedAt: now,
  };
}

/** Transition a job to RUNNING and record the current stage. */
export function startJob(job: IngestionJob, stage: IngestionStage): IngestionJob {
  const now = epochToIso(Date.now());
  return {
    ...job,
    status: JobStatus.RUNNING,
    stage,
    updatedAt: now,
  };
}

/** Advance a running job to the next pipeline stage. */
export function advanceStage(job: IngestionJob, stage: IngestionStage): IngestionJob {
  return { ...job, stage, updatedAt: epochToIso(Date.now()) };
}

/** Mark a job as succeeded with optional document reference. */
export function succeedJob(job: IngestionJob, resultDocumentId: string): IngestionJob {
  return {
    ...job,
    status: JobStatus.SUCCEEDED,
    stage: IngestionStage.DONE,
    updatedAt: epochToIso(Date.now()),
    resultDocumentId,
  };
}

/** Mark a job as failed with a human-readable error message. */
export function failJob(job: IngestionJob, errorMessage: string): IngestionJob {
  return {
    ...job,
    status: JobStatus.FAILED,
    updatedAt: epochToIso(Date.now()),
    errorMessage,
  };
}

/** Mark a job as cancelled. */
export function cancelJob(job: IngestionJob): IngestionJob {
  return {
    ...job,
    status: JobStatus.CANCELLED,
    updatedAt: epochToIso(Date.now()),
  };
}

/** Derive a public progress snapshot from a job record. */
export function toIngestionProgress(job: IngestionJob): IngestionProgress {
  return {
    jobId: job.id,
    stage: job.stage,
    status: job.status,
    startedAt: job.startedAt,
    updatedAt: job.updatedAt,
    errorMessage: job.errorMessage,
  };
}

/** Simple in-memory job store for use within the pipeline (not persistent). */
export class InMemoryJobStore {
  readonly #jobs = new Map<string, IngestionJob>();

  save(job: IngestionJob): void {
    this.#jobs.set(job.id, { ...job });
  }

  get(id: string): IngestionJob | undefined {
    const job = this.#jobs.get(id);
    return job != null ? { ...job } : undefined;
  }

  list(): readonly IngestionJob[] {
    return Array.from(this.#jobs.values()).map((j) => ({ ...j }));
  }

  delete(id: string): boolean {
    return this.#jobs.delete(id);
  }

  clear(): void {
    this.#jobs.clear();
  }
}
