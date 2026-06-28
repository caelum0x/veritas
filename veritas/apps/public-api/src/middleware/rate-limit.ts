// rate-limit.ts: Express middleware enforcing per-key sliding-window rate limits.
import type { Request, Response, NextFunction } from "express";
import type { RateLimiter } from "@veritas/rate-limit";
import { RateLimitedError } from "@veritas/core";
import type { AuthenticatedRequest } from "./auth.js";

export interface RateLimitMiddlewareOptions {
  readonly limiter: RateLimiter;
  /** Extract the bucket key from the request; defaults to apiKeyId or IP. */
  readonly keyFn?: (req: Request) => string;
}

function defaultKeyFn(req: Request): string {
  const authed = req as AuthenticatedRequest;
  if (authed.apiKeyId) return `key:${authed.apiKeyId}`;
  const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";
  return `ip:${ip}`;
}

/**
 * Returns an Express middleware that applies the supplied RateLimiter.
 * Sets X-RateLimit-* response headers and returns 429 on exhaustion.
 */
export function createRateLimitMiddleware(
  opts: RateLimitMiddlewareOptions,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const { limiter, keyFn = defaultKeyFn } = opts;

  return async function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const key = keyFn(req);
    const now = Date.now();
    const result = await limiter.check(key, now);

    if (!result.ok) {
      next(new RateLimitedError({ message: "Rate limiter unavailable", cause: result.error }));
      return;
    }

    const decision = result.value;
    res.setHeader("X-RateLimit-Limit", String(decision.limit));
    res.setHeader("X-RateLimit-Remaining", String(decision.remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(decision.resetAt / 1000)));

    if (!decision.allowed) {
      const retryAfterSeconds = Math.ceil(decision.retryAfterMs / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      next(RateLimitedError.of(retryAfterSeconds));
      return;
    }

    next();
  };
}
