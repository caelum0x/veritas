// Request context — per-request identity and correlation helpers.
import type { Request } from "express";
import { newRequestId } from "@veritas/observability";

export interface RequestContext {
  readonly requestId: string;
  readonly correlationId: string;
  readonly orgId?: string;
  readonly userId?: string;
  readonly appId?: string;
  readonly scopes?: readonly string[];
  readonly startedAt: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      context?: RequestContext;
    }
  }
}

export function buildRequestContext(req: Request): RequestContext {
  const requestId =
    (req.headers["x-request-id"] as string | undefined) ?? newRequestId();
  const correlationId =
    (req.headers["x-correlation-id"] as string | undefined) ?? requestId;

  return {
    requestId,
    correlationId,
    startedAt: Date.now(),
  };
}

export function getRequestContext(req: Request): RequestContext | undefined {
  return req.context;
}

export function setRequestContext(req: Request, ctx: RequestContext): void {
  (req as unknown as Record<string, unknown>)["context"] = ctx;
}

export function enrichContext(req: Request, patch: Partial<RequestContext>): void {
  const existing = req.context ?? buildRequestContext(req);
  (req as unknown as Record<string, unknown>)["context"] = { ...existing, ...patch };
}
