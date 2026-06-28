// Request context: typed extension of Express Request carrying authenticated principal and request id.
import type { Request } from "express";
import type { Principal } from "@veritas/auth";

/** Express request extended with authentication and correlation data. */
export interface OpsRequest extends Request {
  requestId: string;
  principal: Principal;
}

/** Type guard to check if a request is authenticated. */
export function isOpsRequest(req: Request): req is OpsRequest {
  return typeof (req as OpsRequest).principal !== "undefined";
}

/** Extract the request id, falling back to a header or unknown. */
export function getRequestId(req: Request): string {
  return (req as OpsRequest).requestId
    ?? (req.headers["x-request-id"] as string | undefined)
    ?? "unknown";
}
