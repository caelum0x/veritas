// Admin auth middleware — verifies callers hold valid admin session tokens.

import type { Request, Response, NextFunction, RequestHandler } from "express";
import { UnauthorizedError, ForbiddenError } from "@veritas/core";
import { verifyToken } from "@veritas/auth";
import { ROLE_SUPER_ADMIN, setPrincipal } from "@veritas/rbac";
import type { Logger } from "@veritas/observability";

const BEARER_PREFIX = "Bearer ";

/** Header used for internal service-to-service admin calls. */
const ADMIN_SECRET_HEADER = "x-admin-secret";

/** Optional shared secret for trusted internal callers (set via env). */
const INTERNAL_SECRET = process.env["ADMIN_INTERNAL_SECRET"] ?? "";

/** Payload shape returned by verifyToken. */
interface VerifiedPayload {
  readonly userId: string;
  readonly organizationId: string;
  readonly sessionId: string;
  readonly expiresAt: number;
}

export interface AdminAuthOptions {
  readonly logger: Logger;
  /** Session token signing secret — defaults to JWT_SECRET env var. */
  readonly jwtSecret?: string;
  /**
   * Optional callback to verify the resolved payload has the admin role.
   * When omitted, ALL valid tokens are accepted (useful when the network
   * layer provides perimeter security).
   */
  readonly isAdminUser?: (payload: VerifiedPayload) => Promise<boolean>;
}

/**
 * Returns an Express middleware that enforces admin-level authentication.
 * Accepts either a valid session token (Bearer) or an internal shared secret.
 */
export function adminAuthMiddleware({
  logger,
  jwtSecret,
  isAdminUser,
}: AdminAuthOptions): RequestHandler {
  const secret = jwtSecret ?? process.env["JWT_SECRET"] ?? "";
  const superAdminRole = String(ROLE_SUPER_ADMIN);

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Internal service-to-service path via shared secret
    const adminSecret = req.headers[ADMIN_SECRET_HEADER] as string | undefined;
    if (INTERNAL_SECRET.length > 0 && adminSecret === INTERNAL_SECRET) {
      const internalPrincipal = {
        id: "service:admin-internal",
        kind: "service" as const,
        userId: undefined,
        orgId: "system",
        scopes: [] as never[],
        metadata: { role: superAdminRole },
      };
      setPrincipal(req, internalPrincipal as never);
      next();
      return;
    }

    const authHeader = req.headers["authorization"] as string | undefined;
    if (!authHeader?.startsWith(BEARER_PREFIX)) {
      next(new UnauthorizedError({ message: "Missing or invalid Authorization header" }));
      return;
    }

    const token = authHeader.slice(BEARER_PREFIX.length).trim();
    const result = verifyToken({ secret, token });

    if (!result.ok) {
      logger.warn("Admin auth token verification failed", { error: String(result.error) });
      next(new UnauthorizedError({ message: "Invalid or expired admin token" }));
      return;
    }

    const payload = result.value as unknown as VerifiedPayload;

    if (isAdminUser !== undefined) {
      try {
        const allowed = await isAdminUser(payload);
        if (!allowed) {
          logger.warn("Admin auth denied — user lacks admin role", { userId: payload.userId });
          next(new ForbiddenError({ message: "Admin access requires the super_admin role" }));
          return;
        }
      } catch (checkErr: unknown) {
        logger.error("Admin auth role check failed", { error: String(checkErr) });
        next(new UnauthorizedError({ message: "Admin role verification failed" }));
        return;
      }
    }

    const principal = {
      id: payload.sessionId,
      kind: "session" as const,
      userId: payload.userId as never,
      orgId: payload.organizationId,
      scopes: [] as never[],
      metadata: {},
    };

    setPrincipal(req, principal as never);
    next();
  };
}
