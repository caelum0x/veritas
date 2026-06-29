// Builds a ServiceContext from an authenticated Express request.
import type { Request } from "express";
import { makeServiceContext } from "@veritas/services";
import type { ServiceContext, Principal as SvcPrincipal } from "@veritas/services";
import { getPrincipal } from "@veritas/rbac";
import { epochToIso, newId } from "@veritas/core";

/** Extract and convert an rbac Principal to a ServiceContext principal shape. */
function toSvcPrincipal(req: Request): SvcPrincipal {
  try {
    const p = getPrincipal(req);
    return {
      userId: String(p.userId ?? p.id),
      orgId: p.orgId,
      roles: p.scopes.map(String),
      apiKeyId: p.kind === "api_key" ? String(p.id) : undefined,
    };
  } catch {
    return {
      userId: "anonymous",
      orgId: undefined,
      roles: [],
      apiKeyId: undefined,
    };
  }
}

/** Build a request-scoped ServiceContext from the Express request. */
export function buildContext(req: Request): ServiceContext {
  const principal = toSvcPrincipal(req);
  const traceId = (req.headers["x-trace-id"] as string | undefined) ?? newId("tr");
  const requestId = (req.headers["x-request-id"] as string | undefined) ?? newId("req");
  const requestedAt = epochToIso(Date.now());
  return makeServiceContext(principal, traceId, requestId, requestedAt);
}
