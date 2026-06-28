// Shared value types used across the @veritas/otel module.

import type { Span, SpanAttributes } from "@veritas/observability";

/** Sampling decision for a span. */
export type SamplingDecision = "record_and_sample" | "record_only" | "drop";

/** Result returned by a sampler. */
export interface SamplingResult {
  readonly decision: SamplingDecision;
  /** Additional attributes to attach to the span when sampled. */
  readonly attributes?: SpanAttributes;
}

/** W3C traceparent header fields. */
export interface TraceParent {
  readonly version: string;
  readonly traceId: string;
  readonly parentSpanId: string;
  readonly traceFlags: number;
}

/** Propagated trace context extracted from incoming headers. */
export interface PropagatedContext {
  readonly traceId: string;
  readonly parentSpanId: string;
  readonly sampled: boolean;
}

/** Immutable snapshot of a completed span ready for export. */
export interface SpanSnapshot {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly startTime: string;
  readonly endTime?: string;
  readonly status: "ok" | "error" | "unset";
  readonly statusMessage?: string;
  readonly attributes: Readonly<SpanAttributes>;
  readonly events: ReadonlyArray<{
    readonly name: string;
    readonly timestamp: string;
    readonly attributes?: SpanAttributes;
  }>;
}

/** Resource labels describing the emitting service. */
export interface ResourceInfo {
  readonly serviceName: string;
  readonly serviceVersion: string;
  readonly environment: string;
  readonly [key: string]: string;
}

/** OTLP export format options. */
export type OtlpFormat = "json" | "proto";

/** Configuration for the OTLP exporter. */
export interface OtlpExporterConfig {
  readonly endpoint: string;
  readonly format?: OtlpFormat;
  readonly headers?: Readonly<Record<string, string>>;
  readonly timeoutMs?: number;
}

/** A finished span passed to exporters. */
export type FinishedSpan = Span & { readonly isEnded: true };
