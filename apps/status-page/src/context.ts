// Request context propagation using @veritas/observability correlation utilities.
import {
  runWithContext,
  getContext,
  extendContext,
  newRequestId,
  newCorrelationId,
  extractCorrelationHeaders,
  type RequestContext,
  type CorrelationContext,
} from "@veritas/observability";
import type { Request, Response, NextFunction } from "express";

export type { RequestContext };

export interface StatusPageRequestContext extends RequestContext {
  readonly requestId: string;
  readonly correlationId: string;
  readonly startedAt: number;
}

export function requestContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const headers = req.headers as Record<string, string | string[] | undefined>;
  const correlation: Partial<CorrelationContext> = extractCorrelationHeaders(headers);
  const requestId = newRequestId();
  const correlationId = correlation.correlationId ?? newCorrelationId();

  runWithContext(
    {
      requestId,
      correlationId,
      traceId: correlation.traceId,
      spanId: correlation.spanId,
    } as RequestContext,
    next,
  );
}

export function getRequestContext(): Partial<StatusPageRequestContext> {
  return (getContext() ?? {}) as Partial<StatusPageRequestContext>;
}

export function withExtendedContext(
  additions: Partial<RequestContext>,
  fn: () => void,
): void {
  extendContext(additions);
  fn();
}
