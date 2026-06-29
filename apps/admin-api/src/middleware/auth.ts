// Auth middleware: verifies admin session tokens and attaches Principal to requests.
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { UnauthorizedError, ForbiddenError } from "@veritas/core";
import { verifyToken } from "@veritas/auth";
import { setPrincipal } from "@veritas/rbac";
import type { AppConfig } from "../config.js";
import type { Logger } from "@veritas/core";

const BEARER_PREFIX = "Bearer ";
const ADMIN_SECRET_HEADER = "x-admin-secret";

/** Build the authentication middleware for admin requests. */
export function buildAuthMiddleware(config: AppConfig, logger: Logger): RequestHandler {
  const jwtSecret = config.auth.jwtSecret;
  const adminInternalSecret = config.auth.adminInternalSecret;

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Internal service-to-service via shared secret
    const adminSecret = req.headers[ADMIN_SECRET_HEADER] as string | undefined;
    if (adminInternalSecret.length > 0 && adminSecret === adminInternalSecret) {
      setPrincipal(req, {
        id: "service:admin-internal",
        kind: "service" as const,
        userId: undefined,
        orgId: "system",
        scopes: [],
        metadata: { roles: ["admin", "system"] },
      } as never);
      next();
      return;
    }

    const authHeader = req.headers["authorization"] as string | undefined;
    if (!authHeader?.startsWith(BEARER_PREFIX)) {
      next(new UnauthorizedError({ message: "Missing or invalid Authorization header" }));
      return;
    }

    const token = authHeader.slice(BEARER_PREFIX.length).trim();
    const result = verifyToken({ secret: jwtSecret, token });

    if (!result.ok) {
      logger.warn("Admin token verification failed", { error: String(result.error) });
      next(new UnauthorizedError({ message: "Invalid or expired admin token" }));
      return;
    }

    const payload = result.value;
    setPrincipal(req, {
      id: payload.sessionId,
      kind: "session" as const,
      userId: payload.userId as never,
      orgId: payload.organizationId,
      scopes: [],
      metadata: {},
    } as never);

    next();
  };
}
