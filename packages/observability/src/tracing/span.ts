// Span and Tracer interfaces for distributed tracing instrumentation.

import { IsoTimestamp } from "@veritas/core";

/** Status of a completed span. */
export type SpanStatus = "ok" | "error" | "unset";

/** Key-value attributes attached to a span. */
export type SpanAttributes = Record<string, string | number | boolean>;

/** An event recorded within a span's lifetime. */
export interface SpanEvent {
  readonly name: string;
  readonly timestamp: IsoTimestamp;
  readonly attributes?: SpanAttributes;
}

/** A single unit of work in a distributed trace. */
export interface Span {
  /** The span's unique ID. */
  readonly spanId: string;
  /** The trace this span belongs to. */
  readonly traceId: string;
  /** Parent span ID, if any. */
  readonly parentSpanId?: string;
  /** Human-readable operation name. */
  readonly name: string;
  /** Wall-clock start time in ISO format. */
  readonly startTime: IsoTimestamp;

  /** Set an attribute on this span. Returns self for chaining. */
  setAttribute(key: string, value: string | number | boolean): this;
  /** Set multiple attributes at once. Returns self for chaining. */
  setAttributes(attrs: SpanAttributes): this;
  /** Record a named event at the current time. Returns self for chaining. */
  addEvent(name: string, attributes?: SpanAttributes): this;
  /** Set the span's status. Returns self for chaining. */
  setStatus(status: SpanStatus, message?: string): this;
  /** Record an error and set status to "error". Returns self for chaining. */
  recordError(error: Error): this;
  /** End the span, recording its duration. */
  end(): void;
  /** Whether the span has been ended. */
  readonly isEnded: boolean;
  /** Snapshot of all attributes. */
  readonly attributes: Readonly<SpanAttributes>;
  /** Snapshot of all events. */
  readonly events: readonly SpanEvent[];
  /** The span's current status. */
  readonly status: SpanStatus;
  /** Optional message associated with the status. */
  readonly statusMessage?: string;
  /** End time in ISO format, set when end() is called. */
  readonly endTime?: IsoTimestamp;
}

/** Options for starting a new span. */
export interface StartSpanOptions {
  readonly parentSpan?: Span;
  readonly attributes?: SpanAttributes;
  /** Force a specific trace ID (e.g. from upstream headers). */
  readonly traceId?: string;
  /** Force a specific parent span ID (e.g. from upstream headers). */
  readonly parentSpanId?: string;
}

/** A tracer that creates and manages spans. */
export interface Tracer {
  /** Start a new span. Caller must call span.end(). */
  startSpan(name: string, options?: StartSpanOptions): Span;

  /**
   * Execute a function within a new span, automatically ending it.
   * The span is passed as the first argument.
   */
  withSpan<T>(
    name: string,
    fn: (span: Span) => T,
    options?: StartSpanOptions
  ): T;

  /**
   * Execute an async function within a new span, automatically ending it.
   */
  withSpanAsync<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: StartSpanOptions
  ): Promise<T>;
}
