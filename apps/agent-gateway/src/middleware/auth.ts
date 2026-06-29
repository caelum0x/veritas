// Express middleware that enforces API key authentication on protected routes.

import type { Request, Response, NextFunction } from "express";
import type { AppConfig } from "../config.js";
import { GatewayAuthError } from "../errors.js";

/** Build API key authentication middleware from config. */
export function authMiddleware(config: AppConfig) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const headerName = config.apiKeyHeader.toLowerCase();
    const providedKey =
      (req.headers[headerName] as string | undefined) ??
      extractBearerToken(req.headers["authorization"] as string | undefined);

    if (providedKey === undefined || providedKey.trim() === "") {
      return next(new GatewayAuthError("Missing API key"));
    }

    if (providedKey !== config.internalApiKey) {
      return next(new GatewayAuthError("Invalid API key"));
    }

    next();
  };
}

function extractBearerToken(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1];
}
