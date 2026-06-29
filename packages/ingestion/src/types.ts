// Shared type definitions for the ingestion pipeline: options, results, and status enums.

import { z } from "zod";
import type { JobId } from "@veritas/core";
import { JobStatus } from "@veritas/core";
import type { IngestedDocument } from "./document.js";
import type { TextChunk } from "./chunker.js";

/** Supported stages of the ingestion pipeline. */
export const IngestionStage = {
  FETCH: "FETCH",
  EXTRACT: "EXTRACT",
  NORMALIZE: "NORMALIZE",
  LANGUAGE_DETECT: "LANGUAGE_DETECT",
  CHUNK: "CHUNK",
  DONE: "DONE",
} as const;
export type IngestionStage = (typeof IngestionStage)[keyof typeof IngestionStage];

/** Configuration for a single ingestion run. */
export interface IngestionOptions {
  /** Maximum raw document byte size allowed (default 10 MB). */
  readonly maxBytes?: number;
  /** Target chunk size in characters (default 1000). */
  readonly chunkSize?: number;
  /** Overlap between adjacent chunks in characters (default 100). */
  readonly chunkOverlap?: number;
  /** Whether to detect document language (default true). */
  readonly detectLanguage?: boolean;
  /** Whether to normalize whitespace and control chars (default true). */
  readonly normalize?: boolean;
  /** Optional idempotency key to deduplicate repeat requests. */
  readonly idempotencyKey?: string;
}

/** The result produced when a pipeline run succeeds. */
export interface IngestionResult {
  readonly jobId: JobId;
  readonly document: IngestedDocument;
  readonly chunks: readonly TextChunk[];
  readonly durationMs: number;
}

/** Progress snapshot emitted during an asynchronous job run. */
export interface IngestionProgress {
  readonly jobId: JobId;
  readonly stage: IngestionStage;
  readonly status: JobStatus;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly errorMessage?: string;
}

/** Zod schema for validating ingestion option inputs from external callers. */
export const IngestionOptionsSchema = z.object({
  maxBytes: z.number().int().positive().optional(),
  chunkSize: z.number().int().positive().optional(),
  chunkOverlap: z.number().int().min(0).optional(),
  detectLanguage: z.boolean().optional(),
  normalize: z.boolean().optional(),
  idempotencyKey: z.string().min(1).optional(),
});

/** Default pipeline configuration values. */
export const DEFAULT_INGESTION_OPTIONS = Object.freeze({
  maxBytes: 10 * 1024 * 1024,
  chunkSize: 1000,
  chunkOverlap: 100,
  detectLanguage: true,
  normalize: true,
} satisfies Required<Omit<IngestionOptions, "idempotencyKey">>);
