// Request context types and helpers for per-request async context propagation.

import { runWithContext, getContext, extendContext, type RequestContext } from "@veritas/observability";
import type { Principal } from "@veritas/auth";
import type { Request, Response, NextFunction } from "express";

export type { RequestContext };

/** Extended auth-server request context that may carry an authenticated principal. */
export interface AuthRequestContext extends RequestContext {
  readonly principal?: Principal;
}

/** Run a callback within a new request context. */
export function runWithAuthContext<T>(ctx: AuthRequestContext, fn: () => T): T {
  return runWithContext(ctx, fn);
}

/** Retrieve the current auth request context from async storage. */
export function getAuthContext(): AuthRequestContext | undefined {
  return getContext() as AuthRequestContext | undefined;
}

/** Attach a principal to the existing context. */
export function withPrincipal(principal: Principal): AuthRequestContext {
  return extendContext({ principal } as Partial<AuthRequestContext>) as AuthRequestContext;
}

/** Express middleware that wraps each request in an auth-server context. */
export function attachContext(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers["x-request-id"] as string | undefined) ?? crypto.randomUUID();
  const traceId = req.headers["x-trace-id"] as string | undefined;
  const ctx: AuthRequestContext = { requestId, traceId };
  runWithAuthContext(ctx, () => {
    res.setHeader("x-request-id", requestId);
    next();
  });
}
