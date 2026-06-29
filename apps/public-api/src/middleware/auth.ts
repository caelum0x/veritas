// auth.ts: API-key authentication middleware wired to @veritas/services ApiKeyService.
import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError, ForbiddenError, epochToIso } from "@veritas/core";
import { makeServiceContext } from "@veritas/services";
import type { ServiceContext } from "@veritas/services";

/** Shape of the authenticated request after successful key validation. */
export interface AuthenticatedRequest extends Request {
  readonly apiKeyId?: string;
  readonly orgId?: string;
  readonly userId?: string;
  readonly scopes?: readonly string[];
  readonly serviceContext?: ServiceContext;
}

/** Principal info returned by a successful validateApiKey callback. */
export interface ResolvedPrincipal {
  readonly apiKeyId: string;
  readonly orgId: string;
  readonly userId?: string;
  readonly scopes: string[];
  readonly active: boolean;
}

/** Options accepted by createAuthMiddleware. */
export interface AuthMiddlewareOptions {
  /**
   * Resolve a raw API key string to a principal, or return null if invalid.
   * Implementations are responsible for any service calls needed.
   */
  readonly validateApiKey: (rawKey: string) => Promise<ResolvedPrincipal | null>;
}

function extractRawKey(req: Request): string | null {
  const fromHeader = req.headers["x-api-key"];
  if (typeof fromHeader === "string" && fromHeader.length > 0) return fromHeader;

  const auth = req.headers["authorization"];
  if (typeof auth === "string") {
    const spaceIdx = auth.indexOf(" ");
    if (spaceIdx !== -1) {
      const scheme = auth.slice(0, spaceIdx).toLowerCase();
      const token = auth.slice(spaceIdx + 1).trim();
      if ((scheme === "bearer" || scheme === "apikey") && token) return token;
    }
  }
  return null;
}

/**
 * Factory that returns an Express middleware requiring a valid Veritas API key.
 * Attaches principal fields and a ServiceContext to the request on success.
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  return async function authMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const raw = extractRawKey(req);
    if (!raw) {
      next(new UnauthorizedError({ message: "Missing API key. Supply via X-Api-Key header or Bearer token." }));
      return;
    }

    try {
      const principal = await options.validateApiKey(raw);

      if (principal === null || !principal.active) {
        next(new UnauthorizedError({ message: "Invalid or expired API key." }));
        return;
      }

      const requestId = (req.headers["x-request-id"] as string | undefined) ?? crypto.randomUUID();
      const serviceContext = makeServiceContext(
        {
          userId: principal.userId ?? principal.apiKeyId,
          orgId: principal.orgId,
          roles: [],
          apiKeyId: principal.apiKeyId,
        },
        requestId,
        requestId,
        epochToIso(Date.now()),
      );

      const mutableReq = req as unknown as Record<string, unknown>;
      mutableReq["apiKeyId"] = principal.apiKeyId;
      mutableReq["orgId"] = principal.orgId;
      mutableReq["userId"] = principal.userId;
      mutableReq["scopes"] = principal.scopes;
      mutableReq["serviceContext"] = serviceContext;

      next();
    } catch {
      next(new UnauthorizedError({ message: "Authentication failed." }));
    }
  };
}

/** Middleware asserting a scope is present on the authenticated request. */
export function requireScope(scope: string) {
  return function scopeGuard(req: Request, _res: Response, next: NextFunction): void {
    const scopes = (req as AuthenticatedRequest).scopes ?? [];
    if (!scopes.includes(scope) && !scopes.includes("*")) {
      next(new ForbiddenError({ message: `Scope '${scope}' is required for this endpoint.` }));
      return;
    }
    next();
  };
}

/** Stand-alone middleware rejecting unauthenticated requests. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authed = req as AuthenticatedRequest;
  if (!authed.apiKeyId) {
    next(new UnauthorizedError({ message: "Authentication required." }));
    return;
  }
  next();
}
