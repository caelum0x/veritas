// In-process token-bucket rate limiter middleware.
import type { Request, Response, NextFunction } from "express";
import { sendError } from "../http/responder.js";

interface BucketEntry {
  tokens: number;
  lastRefillMs: number;
}

const store = new Map<string, BucketEntry>();

/** Build a rate-limiting middleware using a token-bucket per IP. */
export function buildRateLimitMiddleware(opts: {
  readonly windowMs: number;
  readonly maxRequests: number;
}) {
  const { windowMs, maxRequests } = opts;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = String(req.ip ?? "unknown");
    const now = Date.now();

    let entry = store.get(key);
    if (entry === undefined) {
      entry = { tokens: maxRequests, lastRefillMs: now };
      store.set(key, entry);
    }

    // Refill proportional to elapsed time
    const elapsed = now - entry.lastRefillMs;
    if (elapsed > 0) {
      const refill = Math.floor((elapsed / windowMs) * maxRequests);
      entry = {
        tokens: Math.min(maxRequests, entry.tokens + refill),
        lastRefillMs: now,
      };
      store.set(key, entry);
    }

    if (entry.tokens <= 0) {
      res.setHeader("Retry-After", String(Math.ceil(windowMs / 1000)));
      sendError(res, 429, "RATE_LIMITED", "Too many requests; please slow down");
      return;
    }

    store.set(key, { ...entry, tokens: entry.tokens - 1 });
    res.setHeader("X-RateLimit-Limit", String(maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(entry.tokens - 1));
    next();
  };
}
