// Auth middleware — validates API key using @veritas/auth and attaches principal to request.
import type { Request, Response, NextFunction } from "express";
import {
  ApiKeyAuthenticator,
  isAuthError,
  MissingCredentialsError,
  type Principal,
} from "@veritas/auth";
import { UnauthorizedError, ForbiddenError } from "@veritas/core";

/**
 * Express Request augmented with portal auth fields set by the auth middleware.
 * Controllers cast `req` to this type to access identity fields.
 */
export interface PortalAuthRequest extends Request {
  principal?: Principal;
  orgId?: string;
  userId?: string;
  portalAppId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}

function extractAuthorizationHeader(req: Request): string | undefined {
  const raw = req.headers["authorization"];
  if (typeof raw === "string") return raw;
  const key = req.headers["x-api-key"];
  if (typeof key === "string") return `Bearer ${key}`;
  return undefined;
}

export function createAuthMiddleware(authenticator: ApiKeyAuthenticator) {
  return async function authMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const authorizationHeader = extractAuthorizationHeader(req);
    const remoteIp = req.ip ?? req.socket.remoteAddress;

    const result = await authenticator.authenticate({
      authorizationHeader,
      remoteIp,
      signatureHeader: req.headers["x-veritas-signature"] as string | undefined,
      timestampHeader: req.headers["x-veritas-timestamp"] as string | undefined,
      method: req.method,
      url: req.originalUrl,
      body: "",
    });

    if (!result.ok) {
      const authErr = result.error;
      if (authErr instanceof MissingCredentialsError) {
        next(new UnauthorizedError({ message: "Missing credentials" }));
      } else if (isAuthError(authErr)) {
        next(new UnauthorizedError({ message: authErr.message }));
      } else {
        next(new UnauthorizedError({ message: "Authentication failed" }));
      }
      return;
    }

    (req as unknown as Record<string, unknown>)["principal"] = result.value;
    next();
  };
}

export function requireScope(scope: string) {
  return function scopeGuard(req: Request, _res: Response, next: NextFunction): void {
    const principal = req.principal;
    if (!principal) {
      next(new UnauthorizedError({ message: "Authentication required" }));
      return;
    }
    const hasScope = principal.scopes.some((s) => s === scope || (s as string) === "*");
    if (!hasScope) {
      next(new ForbiddenError({ message: `Scope '${scope}' required` }));
      return;
    }
    next();
  };
}

/** Direct middleware — use as router.use(requirePortalAuth). */
export function requirePortalAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.principal) {
    next(new UnauthorizedError({ message: "Authentication required" }));
    return;
  }
  next();
}

/** Factory alias — use as router.use(requireAuth()). */
export function requireAuth() {
  return requirePortalAuth;
}

/** Scope guard factory for admin-level routes. */
export function requirePortalScope(scope: string) {
  return requireScope(scope);
}

export interface PortalApiKeyValidator {
  validateApiKey(rawKey: string): Promise<{
    readonly appId: string;
    readonly orgId: string;
    readonly userId?: string;
    readonly scopes: readonly string[];
    readonly active: boolean;
  } | null>;
}
