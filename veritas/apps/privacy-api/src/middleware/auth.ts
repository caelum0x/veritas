// Auth middleware: authenticates requests via @veritas/auth Authenticator; attaches principal.

import type { Request, Response, NextFunction } from "express";
import type { Authenticator, Principal } from "@veritas/auth";
import { isAuthError } from "@veritas/auth";
import { makeProblem } from "../http/problem.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      principal?: Principal;
      auth?: { sub: string; email?: string; roles?: readonly string[] };
    }
  }
}

export type { Principal };

export function requireAuth(authenticator: Authenticator) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ctx = {
      authorizationHeader: req.headers["authorization"],
      signatureHeader: req.headers["x-veritas-signature"] as string | undefined,
      timestampHeader: req.headers["x-veritas-timestamp"] as string | undefined,
      method: req.method,
      url: req.originalUrl,
      body: typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? ""),
      remoteIp: req.ip,
    };

    const result = await authenticator.authenticate(ctx);
    if (!result.ok) {
      const status = isAuthError(result.error) ? 401 : 500;
      const problem = makeProblem(status, "UNAUTHORIZED", result.error.message, req.path);
      res.status(status).json(problem);
      return;
    }

    req.principal = result.value;
    next();
  };
}

export function optionalAuth(authenticator: Authenticator) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      next();
      return;
    }

    const ctx = {
      authorizationHeader: authHeader,
      signatureHeader: req.headers["x-veritas-signature"] as string | undefined,
      timestampHeader: req.headers["x-veritas-timestamp"] as string | undefined,
      method: req.method,
      url: req.originalUrl,
      body: typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? ""),
      remoteIp: req.ip,
    };

    const result = await authenticator.authenticate(ctx);
    if (result.ok) req.principal = result.value;

    next();
  };
}
