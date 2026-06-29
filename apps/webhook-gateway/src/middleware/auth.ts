// Authentication middleware — resolves the caller principal via @veritas/auth.

import type { Request, Response, NextFunction } from "express";
import type { Authenticator, Principal } from "@veritas/auth";
import { isAuthError, hasScope } from "@veritas/auth";
import type { Scope } from "@veritas/auth";
import { sendError } from "../http/responder.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}

export function authMiddleware(authenticator: Authenticator) {
  return async function authenticate(
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
      body: (req as Request & { rawBody?: string }).rawBody ?? "",
      remoteIp: req.ip,
    };

    const result = await authenticator.authenticate(ctx);

    if (!result.ok) {
      const authErr = result.error;
      const status = isAuthError(authErr) ? 401 : 500;
      sendError(res, status, "UNAUTHORIZED", authErr.message);
      return;
    }

    req.principal = result.value;
    next();
  };
}

export function requireScope(...scopes: Scope[]) {
  return function scopeGuard(req: Request, res: Response, next: NextFunction): void {
    const principal = req.principal;
    if (!principal) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    for (const scope of scopes) {
      if (!hasScope(principal, scope)) {
        sendError(
          res,
          403,
          "FORBIDDEN",
          `Insufficient scope. Required: ${scope}`,
        );
        return;
      }
    }

    next();
  };
}
