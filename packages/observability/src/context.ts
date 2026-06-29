// AsyncLocalStorage-based request/trace context for structured log correlation.

import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  /** Unique identifier for the incoming request. */
  readonly requestId: string;
  /** Distributed trace ID (W3C traceparent or custom). */
  readonly traceId?: string;
  /** Active span ID within the trace. */
  readonly spanId?: string;
  /** Authenticated user ID, if available. */
  readonly userId?: string;
  /** Organisation ID, if available. */
  readonly orgId?: string;
  /** Arbitrary additional metadata. */
  readonly [key: string]: unknown;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Runs `fn` with the given context bound to the current async chain.
 * Any code reachable from `fn` can call `getContext()` to retrieve it.
 */
export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/** Returns the `RequestContext` for the current async chain, or `undefined`. */
export function getContext(): RequestContext | undefined {
  return storage.getStore();
}

/** Returns only the fields of the current context useful for log decoration. */
export function getLogContext(): Record<string, unknown> {
  const ctx = storage.getStore();
  if (!ctx) return {};
  const { requestId, traceId, spanId, userId, orgId } = ctx;
  const out: Record<string, unknown> = {};
  if (requestId !== undefined) out["requestId"] = requestId;
  if (traceId !== undefined) out["traceId"] = traceId;
  if (spanId !== undefined) out["spanId"] = spanId;
  if (userId !== undefined) out["userId"] = userId;
  if (orgId !== undefined) out["orgId"] = orgId;
  return out;
}

/** Creates a child context by merging `patch` into the current context. */
export function extendContext(patch: Partial<RequestContext>): RequestContext {
  const existing = storage.getStore() ?? ({ requestId: "" } as RequestContext);
  return { ...existing, ...patch } as RequestContext;
}
