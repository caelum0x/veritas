// Auth middleware — authenticates every request via @veritas/auth and attaches the principal.
import type { Request, Response, NextFunction } from "express";
import { isOk } from "@veritas/core";
import type { Authenticator, Principal } from "@veritas/auth";
import { MissingCredentialsError } from "@veritas/auth";
import { hasScope } from "@veritas/auth";
import type { Scope } from "@veritas/auth";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}

/** Express middleware that performs API-key authentication on every request. */
export function makeAuthMiddleware(authenticator: Authenticator) {
  return async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const ctx = {
      authorizationHeader: req.headers["authorization"],
      signatureHeader: req.headers["x-veritas-signature"] as string | undefined,
      timestampHeader: req.headers["x-veritas-timestamp"] as string | undefined,
      method: req.method,
      url: req.originalUrl,
      body: typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? ""),
      remoteIp: req.ip,
    };

    if (!ctx.authorizationHeader) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Missing Authorization header" } });
      return;
    }

    const result = await authenticator.authenticate(ctx);

    if (!isOk(result)) {
      const status = result.error instanceof MissingCredentialsError ? 401 : 403;
      res.status(status).json({ success: false, error: { code: "UNAUTHORIZED", message: result.error.message } });
      return;
    }

    req.principal = result.value;
    next();
  };
}

/** Scope guard middleware — requires the authenticated principal to hold a specific scope. */
export function requireScope(scope: Scope) {
  return function scopeGuard(req: Request, res: Response, next: NextFunction): void {
    const principal = req.principal;
    if (!principal || !hasScope(principal, scope)) {
      res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: `Required scope: ${scope}` } });
      return;
    }
    next();
  };
}
