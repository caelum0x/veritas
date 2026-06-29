// Request context helpers — thin wrappers over @veritas/observability context.
import {
  runWithContext,
  getContext,
  extendContext,
  type RequestContext,
} from "@veritas/observability";
import type { Request } from "express";

export type { RequestContext };

export const REQUEST_ID_HEADER = "x-request-id";
export const CORRELATION_ID_HEADER = "x-correlation-id";

/** Extracts the request ID from the request headers or the request object. */
export function extractRequestId(req: Request): string {
  return (
    (req.headers[REQUEST_ID_HEADER] as string | undefined) ??
    (req as Request & { id?: string }).id ??
    crypto.randomUUID()
  );
}

/** Build an initial RequestContext from an express Request. */
export function buildRequestContext(req: Request): RequestContext {
  return {
    requestId: extractRequestId(req),
    traceId: (req.headers[CORRELATION_ID_HEADER] as string | undefined),
    method: req.method,
    path: req.path,
  };
}

export { runWithContext, getContext, extendContext };
