// ETL-specific error types extending AppError for pipeline failures.
import { AppError, type AppErrorOptions, type ErrorCode } from "@veritas/core";

export class ExtractError extends AppError {
  readonly source: string;
  constructor(source: string, opts: AppErrorOptions) {
    super("INTERNAL" as ErrorCode, 500, "Extract failed", opts);
    this.source = source;
  }
}

export class TransformError extends AppError {
  readonly step: string;
  readonly record?: unknown;
  constructor(step: string, opts: AppErrorOptions & { record?: unknown }) {
    super("INTERNAL" as ErrorCode, 500, "Transform failed", opts);
    this.step = step;
    this.record = opts.record;
  }
}

export class LoadError extends AppError {
  readonly sink: string;
  constructor(sink: string, opts: AppErrorOptions) {
    super("INTERNAL" as ErrorCode, 500, "Load failed", opts);
    this.sink = sink;
  }
}

export class PipelineError extends AppError {
  readonly pipelineId: string;
  constructor(pipelineId: string, opts: AppErrorOptions) {
    super("INTERNAL" as ErrorCode, 500, "Pipeline failed", opts);
    this.pipelineId = pipelineId;
  }
}

export class CheckpointError extends AppError {
  constructor(opts: AppErrorOptions) {
    super("INTERNAL" as ErrorCode, 500, "Checkpoint failed", opts);
  }
}

export class ScheduleError extends AppError {
  constructor(opts: AppErrorOptions) {
    super("INTERNAL" as ErrorCode, 500, "Schedule failed", opts);
  }
}

export class MappingError extends AppError {
  readonly field: string;
  constructor(field: string, opts: AppErrorOptions) {
    super("INTERNAL" as ErrorCode, 500, "Mapping failed", opts);
    this.field = field;
  }
}
