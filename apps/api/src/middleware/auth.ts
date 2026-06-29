// API-key authentication middleware: validates Bearer/X-Api-Key credentials via @veritas/auth.
import type { Request, Response, NextFunction } from "express";
import {
  parseApiKey,
  ApiKeyAuthenticator,
} from "@veritas/auth";
import type { ApiKeyStore } from "@veritas/auth";
import { UnauthorizedError, ForbiddenError } from "@veritas/core";

export interface AuthenticatedRequest extends Request {
  apiKeyId?: string;
  orgId?: string;
  userId?: string;
  scopes?: string[];
}

export interface ApiKeyAuthService {
  validateApiKey(key: string): Promise<{
    apiKeyId: string;
    orgId: string;
    userId?: string;
    scopes: string[];
    active: boolean;
  } | null>;
}

function extractRawKey(req: Request): string | null {
  const fromHeader = req.headers["x-api-key"];
  if (typeof fromHeader === "string" && fromHeader.length > 0) return fromHeader;
  const auth = req.headers.authorization;
  if (!auth) return null;
  const [scheme, token] = auth.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

export function createAuthMiddleware(authService: ApiKeyAuthService) {
  return async function authMiddleware(
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const raw = extractRawKey(req);
    if (!raw) {
      next(new UnauthorizedError({ message: "Missing API key" }));
      return;
    }
    try {
      const result = await authService.validateApiKey(raw);
      if (!result) { next(new UnauthorizedError({ message: "Invalid API key" })); return; }
      if (!result.active) { next(new ForbiddenError({ message: "API key is inactive" })); return; }
      req.apiKeyId = result.apiKeyId;
      req.orgId    = result.orgId;
      req.userId   = result.userId;
      req.scopes   = result.scopes;
      next();
    } catch {
      next(new UnauthorizedError({ message: "Authentication failed" }));
    }
  };
}

export function requireScope(scope: string) {
  return function scopeMiddleware(
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): void {
    const scopes = req.scopes ?? [];
    if (!scopes.includes(scope) && !scopes.includes("*")) {
      next(new ForbiddenError({ message: `Insufficient scope: ${scope} required` }));
      return;
    }
    next();
  };
}

export function optionalAuth(authService: ApiKeyAuthService) {
  return async function optionalAuthMiddleware(
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const raw = extractRawKey(req);
    if (!raw) { next(); return; }
    try {
      const result = await authService.validateApiKey(raw);
      if (result?.active) {
        req.apiKeyId = result.apiKeyId;
        req.orgId    = result.orgId;
        req.userId   = result.userId;
        req.scopes   = result.scopes;
      }
    } catch { /* ignore */ }
    next();
  };
}

export function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.apiKeyId) {
    next(new UnauthorizedError({ message: "Authentication required" }));
    return;
  }
  next();
}

/** Aliases used by some route files. */
export const authenticate   = requireAuth;
export const authMiddleware = requireAuth;

export function requireRole(role: string) {
  return function roleMiddleware(
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): void {
    const scopes = req.scopes ?? [];
    if (!scopes.includes(role) && !scopes.includes("*")) {
      next(new ForbiddenError({ message: `Role '${role}' required` }));
      return;
    }
    next();
  };
}
