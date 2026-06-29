// Correlation and request ID helpers for distributed tracing context.

import { newId } from "@veritas/core";

/** Generates a new correlation ID for a request or trace. */
export function newCorrelationId(): string {
  return newId("corr");
}

/** Generates a new request ID, distinct from correlation IDs. */
export function newRequestId(): string {
  return newId("req");
}

/** Correlation context attached to a request or async flow. */
export interface CorrelationContext {
  readonly correlationId: string;
  readonly requestId: string;
  readonly traceId?: string;
  readonly spanId?: string;
  readonly parentSpanId?: string;
}

/** Creates a new CorrelationContext with fresh IDs. */
export function newCorrelationContext(
  overrides?: Partial<CorrelationContext>
): CorrelationContext {
  return {
    correlationId: newCorrelationId(),
    requestId: newRequestId(),
    ...overrides,
  };
}

/** Extracts correlation headers from an HTTP-like headers map. */
export function extractCorrelationHeaders(
  headers: Record<string, string | string[] | undefined>
): Partial<CorrelationContext> {
  const get = (key: string): string | undefined => {
    const val = headers[key] ?? headers[key.toLowerCase()];
    return Array.isArray(val) ? val[0] : val;
  };

  const correlationId = get("x-correlation-id");
  const requestId = get("x-request-id");
  const traceId = get("x-trace-id");
  const spanId = get("x-span-id");
  const parentSpanId = get("x-parent-span-id");

  const result: Partial<CorrelationContext> = {
    ...(correlationId !== undefined && { correlationId }),
    ...(requestId !== undefined && { requestId }),
    ...(traceId !== undefined && { traceId }),
    ...(spanId !== undefined && { spanId }),
    ...(parentSpanId !== undefined && { parentSpanId }),
  };

  return result;
}

/** Serializes a CorrelationContext to HTTP headers. */
export function toCorrelationHeaders(
  ctx: CorrelationContext
): Record<string, string> {
  const headers: Record<string, string> = {
    "x-correlation-id": ctx.correlationId,
    "x-request-id": ctx.requestId,
  };

  if (ctx.traceId) headers["x-trace-id"] = ctx.traceId;
  if (ctx.spanId) headers["x-span-id"] = ctx.spanId;
  if (ctx.parentSpanId) headers["x-parent-span-id"] = ctx.parentSpanId;

  return headers;
}
