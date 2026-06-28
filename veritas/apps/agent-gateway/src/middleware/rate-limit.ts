// Express middleware that enforces per-IP rate limiting using a sliding window.

import type { Request, Response, NextFunction } from "express";
import type { AppConfig } from "../config.js";
import { GatewayRateLimitError } from "../errors.js";

interface WindowEntry {
  count: number;
  resetAt: number;
}

/** Build in-memory sliding-window rate limit middleware from config. */
export function rateLimitMiddleware(config: AppConfig) {
  const store = new Map<string, WindowEntry>();

  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = clientKey(req);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + config.rateLimitWindowMs });
      return next();
    }

    if (entry.count >= config.rateLimitMaxRequests) {
      return next(
        new GatewayRateLimitError(
          `Rate limit of ${config.rateLimitMaxRequests} requests per ${config.rateLimitWindowMs}ms exceeded`
        )
      );
    }

    entry.count += 1;
    next();
  };
}

function clientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : typeof forwarded === "string"
    ? forwarded.split(",")[0]?.trim()
    : req.socket.remoteAddress ?? "unknown";
  return ip ?? "unknown";
}
