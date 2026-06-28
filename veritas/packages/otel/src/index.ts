// Public surface of the @veritas/otel package — re-exports all modules.

// Span model
export { MutableSpan, newTraceId, newSpanId } from "./span.js";

// Errors
export { ExportError, PropagationError, OtelConfigError, SamplerError } from "./errors.js";

// Types
export type {
  SamplingDecision,
  SamplingResult,
  TraceParent,
  PropagatedContext,
  SpanSnapshot,
  ResourceInfo,
  OtlpFormat,
  OtlpExporterConfig,
  FinishedSpan,
} from "./types.js";
