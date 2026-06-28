// Request context propagation using AsyncLocalStorage for correlation IDs.

import { AsyncLocalStorage } from "node:async_hooks";
import {
  newCorrelationContext,
  extractCorrelationHeaders,
  type CorrelationContext,
} from "@veritas/observability";
import type { Request } from "express";

export interface GatewayContext {
  readonly correlation: CorrelationContext;
  readonly startedAt: number;
}

const storage = new AsyncLocalStorage<GatewayContext>();

/** Run fn with the given context bound to AsyncLocalStorage. */
export function runWithGatewayContext<T>(ctx: GatewayContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/** Get the current request context, or undefined if outside a request. */
export function getGatewayContext(): GatewayContext | undefined {
  return storage.getStore();
}

/** Build a GatewayContext from an Express request. */
export function contextFromRequest(req: Request): GatewayContext {
  const headers = req.headers as Record<string, string | string[] | undefined>;
  const extracted = extractCorrelationHeaders(headers);
  const correlation = newCorrelationContext(extracted);
  return { correlation, startedAt: Date.now() };
}
