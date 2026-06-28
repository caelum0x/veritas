// W3C TraceContext propagation: inject/extract trace headers from HTTP carriers.

import type { Span } from "@veritas/observability";

/** A carrier is any record of string headers (request/response headers, etc.). */
export type Carrier = Record<string, string | string[] | undefined>;

/** W3C traceparent header name. */
const TRACEPARENT = "traceparent";

/** W3C tracestate header name. */
const TRACESTATE = "tracestate";

/** Parsed W3C trace context. */
export interface TraceContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly sampled: boolean;
  readonly traceState?: string;
}

/** Regex for a valid traceparent value: version-traceId-spanId-flags. */
const TRACEPARENT_REGEX =
  /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;

/** Extract the first string value from a header field. */
function firstValue(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Extract a TraceContext from carrier headers, returning undefined if absent
 * or malformed.
 */
export function extractTraceContext(carrier: Carrier): TraceContext | undefined {
  const traceparent = firstValue(carrier[TRACEPARENT]);
  if (traceparent === undefined) return undefined;

  const match = TRACEPARENT_REGEX.exec(traceparent);
  if (match === null) return undefined;

  const [, , traceId, spanId, flags] = match as unknown as [string, string, string, string, string];

  // traceId must not be all zeros
  if (traceId === "0".repeat(32)) return undefined;
  // spanId must not be all zeros
  if (spanId === "0".repeat(16)) return undefined;

  const sampled = (parseInt(flags, 16) & 0x01) === 1;
  const traceState = firstValue(carrier[TRACESTATE]);

  return {
    traceId,
    spanId,
    sampled,
    ...(traceState !== undefined ? { traceState } : {}),
  };
}

/**
 * Inject trace context from a span into carrier headers using W3C TraceContext
 * format.
 */
export function injectTraceContext(span: Span, carrier: Carrier): Carrier {
  const flags = "01"; // sampled
  const traceparent = `00-${span.traceId}-${span.spanId}-${flags}`;
  return { ...carrier, [TRACEPARENT]: traceparent };
}

/**
 * Build StartSpanOptions-compatible parent IDs from extracted trace context.
 * Returns an object suitable for spreading into StartSpanOptions.
 */
export function traceContextToParentOptions(
  ctx: TraceContext,
): { traceId: string; parentSpanId: string } {
  return { traceId: ctx.traceId, parentSpanId: ctx.spanId };
}
