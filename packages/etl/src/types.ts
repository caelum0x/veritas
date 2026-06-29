// Shared ETL types and value objects used across pipeline stages.
import { z } from "zod";
import type { Result } from "@veritas/core";
import type { ExtractError, TransformError, LoadError, PipelineError } from "./errors.js";

export const EtlStatusSchema = z.enum(["pending", "running", "success", "failed", "skipped"]);
export type EtlStatus = z.infer<typeof EtlStatusSchema>;

export const FieldTypeSchema = z.enum(["string", "number", "boolean", "date", "json", "null"]);
export type FieldType = z.infer<typeof FieldTypeSchema>;

export const RunModeSchema = z.enum(["full", "incremental"]);
export type RunMode = z.infer<typeof RunModeSchema>;

export const PipelineStatusSchema = z.enum(["idle", "running", "success", "failed", "paused"]);
export type PipelineStatus = z.infer<typeof PipelineStatusSchema>;

export interface EtlRecord {
  readonly id: string;
  readonly fields: Readonly<Record<string, unknown>>;
  readonly meta: Readonly<Record<string, unknown>>;
  readonly sourceId: string;
  readonly extractedAt: string;
}

export interface RawRecord {
  readonly id: string;
  readonly fields: Readonly<Record<string, unknown>>;
  readonly meta: Readonly<Record<string, unknown>>;
}

export interface TransformedRecord extends EtlRecord {
  readonly transformedAt: string;
}

export interface LoadResult {
  readonly loaded: number;
  readonly skipped: number;
  readonly failed: number;
  readonly errors: readonly string[];
}

export interface ExtractResult {
  readonly records: readonly RawRecord[];
  readonly cursor: string | null;
  readonly total: number | null;
}

export interface SinkStats {
  readonly written: number;
  readonly failed: number;
  readonly skipped: number;
}

export interface SinkConfig {
  readonly id: string;
  readonly name: string;
  readonly batchSize?: number;
}

export interface SourceConfig {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly connectionString?: string;
  readonly options?: Readonly<Record<string, unknown>>;
}

export interface PipelineConfig {
  readonly id: string;
  readonly name: string;
  readonly sourceId: string;
  readonly sinkId: string;
  readonly batchSize?: number;
  readonly maxRetries?: number;
}

export interface PipelineRun {
  readonly id: string;
  readonly pipelineId: string;
  readonly status: EtlStatus;
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly recordsExtracted: number;
  readonly recordsLoaded: number;
  readonly recordsFailed: number;
  readonly error: string | null;
}

export type EtlResult<T> = Result<T>;

// ---------------------------------------------------------------------------
// Field mapping & schedule & checkpoint schemas
// ---------------------------------------------------------------------------

export const FieldMappingSchema = z.object({
  sourceField: z.string(),
  targetField: z.string(),
  transform: z
    .enum(["none", "lowercase", "uppercase", "trim", "cast_string", "cast_number"])
    .default("none"),
  required: z.boolean().default(false),
  defaultValue: z.unknown().optional(),
});
export type FieldMapping = z.infer<typeof FieldMappingSchema>;

export const ScheduleSchema = z.object({
  id: z.string(),
  pipelineId: z.string(),
  cron: z.string(),
  mode: RunModeSchema,
  enabled: z.boolean().default(true),
  nextRunAt: z.string().optional(),
});
export type Schedule = z.infer<typeof ScheduleSchema>;

export const CheckpointSchema = z.object({
  pipelineId: z.string(),
  cursor: z.string(),
  recordsProcessed: z.number().int().nonnegative(),
  checkpointedAt: z.string(),
});
export type Checkpoint = z.infer<typeof CheckpointSchema>;

// ---------------------------------------------------------------------------
// Extractor / TransformStep / Loader port interfaces
// ---------------------------------------------------------------------------

export interface ExtractContext {
  readonly runId: string;
  readonly mode: RunMode;
  readonly since?: string;
  readonly limit?: number;
}

export interface Extractor {
  readonly name: string;
  extract(ctx: ExtractContext): AsyncIterable<Result<RawRecord, ExtractError>>;
}

export interface TransformContext {
  readonly runId: string;
  readonly stepIndex: number;
}

export interface TransformStep {
  readonly name: string;
  transform(record: RawRecord, ctx: TransformContext): Result<TransformedRecord, TransformError>;
}

export interface LoadContext {
  readonly runId: string;
  readonly batchSize: number;
}

export interface Loader {
  readonly name: string;
  load(
    records: readonly TransformedRecord[],
    ctx: LoadContext,
  ): Promise<Result<LoadResult, LoadError>>;
}

export type PipelineRunResult = Result<PipelineRun, PipelineError>;
