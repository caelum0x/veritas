// context.ts: builds a ServiceContext from an Express request for injecting into service calls.
import type { Request } from "express";
import { epochToIso } from "@veritas/core";
import { makeServiceContext } from "@veritas/services";
import type { ServiceContext, Principal } from "@veritas/services";

/** Augmented Express request after auth middleware attaches principal fields. */
export interface AuthedRequest extends Request {
  readonly apiKeyId?: string;
  readonly orgId?: string;
  readonly userId?: string;
  readonly scopes?: readonly string[];
  readonly requestId?: string;
}

/** Build an anonymous ServiceContext for unauthenticated requests (health, openapi). */
export function anonymousContext(req: Request): ServiceContext {
  const requestId = (req.headers["x-request-id"] as string | undefined) ?? crypto.randomUUID();
  const principal: Principal = {
    userId: "anonymous",
    orgId: undefined,
    roles: [],
    apiKeyId: undefined,
  };
  return makeServiceContext(principal, requestId, requestId, epochToIso(Date.now()));
}

/**
 * Build a ServiceContext from an authenticated Express request.
 * Throws if the request has not been through auth middleware.
 */
export function serviceContextFromRequest(req: Request): ServiceContext {
  const authed = req as AuthedRequest;
  const requestId =
    (req.headers["x-request-id"] as string | undefined) ??
    authed.requestId ??
    crypto.randomUUID();

  const principal: Principal = {
    userId: authed.userId ?? authed.apiKeyId ?? "unknown",
    orgId: authed.orgId,
    roles: [],
    apiKeyId: authed.apiKeyId,
  };

  return makeServiceContext(principal, requestId, requestId, epochToIso(Date.now()));
}

/** Attach a ServiceContext onto an Express request object. */
export function attachServiceContext(req: Request, ctx: ServiceContext): void {
  (req as unknown as Record<string, unknown>)["serviceContext"] = ctx;
}

/** Retrieve an already-attached ServiceContext from the request. */
export function getServiceContext(req: Request): ServiceContext {
  const ctx = (req as unknown as Record<string, unknown>)["serviceContext"] as ServiceContext | undefined;
  if (ctx === undefined) {
    return anonymousContext(req);
  }
  return ctx;
}
