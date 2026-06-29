// In-memory sliding-window rate limiter middleware per IP address.

import type { Request, Response, NextFunction } from "express";
import { respondError } from "../http/responder.js";

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  readonly windowMs: number;
  readonly max: number;
}

export function rateLimitMiddleware(opts: RateLimitOptions) {
  const windows = new Map<string, RateLimitWindow>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key =
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      req.socket.remoteAddress ??
      "unknown";

    const now = Date.now();
    const existing = windows.get(key);

    if (!existing || now >= existing.resetAt) {
      windows.set(key, { count: 1, resetAt: now + opts.windowMs });
      res.setHeader("X-RateLimit-Limit", opts.max);
      res.setHeader("X-RateLimit-Remaining", opts.max - 1);
      next();
      return;
    }

    existing.count += 1;
    const remaining = Math.max(0, opts.max - existing.count);
    res.setHeader("X-RateLimit-Limit", opts.max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(existing.resetAt / 1000));

    if (existing.count > opts.max) {
      respondError(res, 429, "RATE_LIMITED", "Too many requests, please retry later");
      return;
    }

    next();
  };
}
