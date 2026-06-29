// Request context helpers — thin wrappers over @veritas/observability context primitives.
import { runWithContext, getContext, extendContext } from "@veritas/observability";
import type { RequestContext } from "@veritas/observability";
import type { Request, Response, NextFunction } from "express";

export type { RequestContext };

/** Express middleware that seeds RequestContext for each incoming request. */
export function contextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const requestId = (req.headers["x-request-id"] as string | undefined) ?? crypto.randomUUID();
  const traceId = req.headers["x-trace-id"] as string | undefined;
  const ctx: RequestContext = { requestId, traceId };
  runWithContext(ctx, () => next());
}

/** Return the current request context, or an empty object if none is set. */
export function currentContext(): RequestContext | undefined {
  return getContext();
}

/** Extend the current context with additional fields (e.g. authenticated userId). */
export function enrichContext(patch: Partial<RequestContext>): RequestContext {
  return extendContext(patch);
}
