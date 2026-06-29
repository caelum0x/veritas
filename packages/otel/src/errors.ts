// OTel-specific error types for span export, configuration, and propagation failures.

import { AppError } from "@veritas/core";

/** Thrown when a span exporter fails to export spans. */
export class ExportError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("UNAVAILABLE", 503, message, { cause });
    this.name = "ExportError";
  }
}

/** Thrown when trace context propagation fails (malformed headers, etc.). */
export class PropagationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("VALIDATION", 422, message, { cause });
    this.name = "PropagationError";
  }
}

/** Thrown when the tracer or exporter is misconfigured. */
export class OtelConfigError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, message, { cause });
    this.name = "OtelConfigError";
  }
}

/** Thrown when a sampling decision cannot be evaluated. */
export class SamplerError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, message, { cause });
    this.name = "SamplerError";
  }
}
