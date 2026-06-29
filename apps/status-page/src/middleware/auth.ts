// Optional bearer token authentication middleware for write/admin endpoints.
import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@veritas/observability";

export interface AuthConfig {
  readonly apiKeys: readonly string[];
  readonly enabled: boolean;
}

export function authMiddleware(config: AuthConfig, logger: Logger) {
  return function authenticate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    if (!config.enabled || config.apiKeys.length === 0) {
      next();
      return;
    }

    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("Missing or malformed Authorization header", { path: req.path });
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Bearer token required" },
      });
      return;
    }

    const token = authHeader.slice(7);
    if (!config.apiKeys.includes(token)) {
      logger.warn("Invalid API key presented", { path: req.path });
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Invalid API key" },
      });
      return;
    }

    next();
  };
}
