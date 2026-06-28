// auth.ts: API-key authentication middleware wired to @veritas/services ApiKeyService.
import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError, ForbiddenError, epochToIso } from "@veritas/core";
import { makeServiceContext } from "@veritas/services";
import type { ServiceContext } from "@veritas/services";
import type { ApiKeyService } from "@veritas/services";

/** Shape of the authenticated request after successful key validation. */
export interface AuthenticatedRequest extends Request {
  readonly apiKeyId?: string;
  readonly orgId?: string;
  readonly userId?: string;
  readonly scopes?: readonly string[];
  readonly serviceContext?: ServiceContext;
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

function buildSystemContext(req: Request): ServiceContext {
  const requestId = (req.headers["x-request-id"] as string | undefined) ?? crypto.randomUUID();
  return makeServiceContext(
    { userId: "system", orgId: undefined, roles: ["system"], apiKeyId: undefined },
    requestId,
    requestId,
    epochToIso(Date.now()),
  );
}

/**
 * Factory that returns an Express middleware requiring a valid Veritas API key.
 * Attaches principal fields and a ServiceContext to the request on success.
 */
export function createAuthMiddleware(apiKeyService: ApiKeyService) {
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
      const systemCtx = buildSystemContext(req);
      const result = await apiKeyService.validateApiKey(systemCtx, { rawKey: raw });

      if (!result.ok) {
        next(new UnauthorizedError({ message: "API key validation failed." }));
        return;
      }

      const { valid, apiKey } = result.value;
      if (!valid || apiKey === null) {
        next(new UnauthorizedError({ message: "Invalid or expired API key." }));
        return;
      }

      if (apiKey.revokedAt !== null) {
        next(new ForbiddenError({ message: "API key has been revoked." }));
        return;
      }

      const requestId = (req.headers["x-request-id"] as string | undefined) ?? crypto.randomUUID();
      const serviceContext = makeServiceContext(
        {
          userId: apiKey.userId ?? apiKey.id,
          orgId: apiKey.organizationId,
          roles: [],
          apiKeyId: apiKey.id,
        },
        requestId,
        requestId,
        epochToIso(Date.now()),
      );

      const mutableReq = req as Record<string, unknown>;
      mutableReq["apiKeyId"] = apiKey.id;
      mutableReq["orgId"] = apiKey.organizationId;
      mutableReq["userId"] = apiKey.userId;
      mutableReq["scopes"] = apiKey.scopes ?? [];
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
