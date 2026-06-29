// Simple in-process sliding-window rate limiter middleware.

import type { Request, Response, NextFunction } from "express";
import { deriveRateLimitKey } from "@veritas/auth";
import { sendError } from "../http/responder.js";
import type { Principal } from "@veritas/auth";

interface WindowEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  readonly windowMs: number;
  readonly maxRequests: number;
}

export function rateLimitMiddleware(opts: RateLimitOptions) {
  const store = new Map<string, WindowEntry>();

  return function rateLimit(req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const principal = (req as Request & { principal?: Principal }).principal;
    const key = deriveRateLimitKey(principal, "global", ip);
    const now = Date.now();

    const entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }

    if (entry.count >= opts.maxRequests) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfterSec);
      res.setHeader("X-RateLimit-Limit", opts.maxRequests);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));
      sendError(
        res,
        429,
        "TOO_MANY_REQUESTS",
        `Rate limit exceeded. Retry after ${retryAfterSec}s.`,
      );
      return;
    }

    entry.count += 1;
    res.setHeader("X-RateLimit-Limit", opts.maxRequests);
    res.setHeader("X-RateLimit-Remaining", opts.maxRequests - entry.count);
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));
    next();
  };
}
