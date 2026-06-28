// rate-limit middleware: sliding-window in-process rate limiter using @veritas/auth deriveRateLimitKey.

import type { Request, Response, NextFunction } from "express";
import { deriveRateLimitKey } from "@veritas/auth";
import type { AppConfig } from "../config.js";

interface WindowEntry {
  count: number;
  resetAt: number;
}

/** Returns an Express middleware that enforces a per-IP sliding-window rate limit. */
export function rateLimitMiddleware(config: AppConfig) {
  const { rateLimitWindowMs, rateLimitMax } = config;
  const windows = new Map<string, WindowEntry>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? "unknown";
    const key = deriveRateLimitKey(undefined, "global", ip);
    const now = Date.now();

    const entry = windows.get(key);

    if (entry === undefined || now > entry.resetAt) {
      windows.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
      setRateLimitHeaders(res, rateLimitMax, rateLimitMax - 1, now + rateLimitWindowMs);
      return next();
    }

    entry.count += 1;
    const remaining = Math.max(0, rateLimitMax - entry.count);
    setRateLimitHeaders(res, rateLimitMax, remaining, entry.resetAt);

    if (entry.count > rateLimitMax) {
      res.status(429).json({
        success: false,
        data: null,
        error: { code: "RATE_LIMITED", message: "Too many requests — please slow down" },
      });
      return;
    }

    next();
  };
}

function setRateLimitHeaders(res: Response, limit: number, remaining: number, resetAt: number): void {
  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", remaining);
  res.setHeader("X-RateLimit-Reset", Math.ceil(resetAt / 1000));
}
