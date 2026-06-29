// Optional API-key auth guard for admin endpoints; skips if no API key is configured.
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { sendError } from "../http/responder.js";

export interface AuthOptions {
  readonly adminApiKey?: string;
}

export function authMiddleware(opts: AuthOptions): RequestHandler {
  const { adminApiKey } = opts;

  return (req: Request, res: Response, next: NextFunction): void => {
    // If no admin key configured, allow all.
    if (!adminApiKey) {
      next();
      return;
    }

    const authHeader = req.headers["authorization"];
    if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
      sendError(res, 401, "UNAUTHORIZED", "Missing or invalid Authorization header");
      return;
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (token !== adminApiKey) {
      sendError(res, 403, "FORBIDDEN", "Invalid admin API key");
      return;
    }

    next();
  };
}
