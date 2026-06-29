// Auth middleware: authenticates requests via @veritas/auth ApiKeyAuthenticator or JWT.

import type { Request, Response, NextFunction } from "express";
import type { Authenticator, Principal } from "@veritas/auth";
import { verifyToken } from "@veritas/auth";
import type { Logger } from "@veritas/observability";
import { respondError } from "../http/responder.js";
import { setRequestContext, getRequestContext } from "../context.js";

export { BillingPrincipal } from "../context.js";

const PRINCIPAL_KEY = Symbol("billing.principal");

export function setPrincipal(req: Request, principal: Principal): void {
  (req as unknown as Record<symbol, Principal>)[PRINCIPAL_KEY] = principal;
}

export function getPrincipal(req: Request): Principal | undefined {
  return (req as unknown as Record<symbol, Principal | undefined>)[PRINCIPAL_KEY];
}

export function requirePrincipal(req: Request): Principal {
  const p = getPrincipal(req);
  if (!p) throw new Error("Principal not set on request");
  return p;
}

/** API key authentication middleware using @veritas/auth ApiKeyAuthenticator. */
export function apiKeyAuthMiddleware(authenticator: Authenticator, logger: Logger) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ctx = {
      authorizationHeader: req.headers["authorization"],
      signatureHeader: req.headers["x-veritas-signature"] as string | undefined,
      timestampHeader: req.headers["x-veritas-timestamp"] as string | undefined,
      method: req.method,
      url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
      body: JSON.stringify(req.body ?? {}),
      remoteIp: req.ip,
    };

    const result = await authenticator.authenticate(ctx);
    if (!result.ok) {
      logger.warn("auth.failed", { path: req.path, error: result.error.message });
      respondError(res, 401, "UNAUTHORIZED", result.error.message);
      return;
    }

    const principal = result.value;
    setPrincipal(req, principal);

    const existingCtx = getRequestContext(req);
    setRequestContext(req, {
      requestId: existingCtx?.requestId ?? "",
      principal,
      organizationId: principal.orgId,
      userId: principal.userId as string | undefined,
    });

    next();
  };
}

/** Session JWT authentication middleware using @veritas/auth verifyToken. */
export function sessionAuth(jwtSecret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers["authorization"];
    if (!header?.startsWith("Bearer ")) {
      respondError(res, 401, "UNAUTHORIZED", "Missing or invalid Authorization header");
      return;
    }

    const token = header.slice(7);
    const result = verifyToken({ secret: jwtSecret, token });
    if (!result.ok) {
      respondError(res, 401, "UNAUTHORIZED", "Invalid or expired session token");
      return;
    }

    next();
  };
}
