// Request-scoped context: correlation IDs, authenticated principal, and logger child.
import type { Request } from "express";
import { newCorrelationId } from "@veritas/observability";
import type { AuthenticatedRequest } from "./middleware/auth.js";

export interface RequestContext {
  readonly requestId: string;
  readonly correlationId: string;
  readonly orgId: string | undefined;
  readonly userId: string | undefined;
  readonly apiKeyId: string | undefined;
  readonly scopes: readonly string[];
}

/** Extract a typed RequestContext from an Express request. */
export function getRequestContext(req: Request): RequestContext {
  const authed = req as AuthenticatedRequest;
  return {
    requestId:     req.requestId,
    correlationId: (req.headers["x-correlation-id"] as string | undefined) ?? newCorrelationId(),
    orgId:         authed.orgId,
    userId:        authed.userId,
    apiKeyId:      authed.apiKeyId,
    scopes:        authed.scopes ?? [],
  };
}
