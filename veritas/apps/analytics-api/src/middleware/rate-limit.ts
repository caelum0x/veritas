// Rate-limit middleware — sliding-window in-memory rate limiter per IP/principal.
import type { Request, Response, NextFunction } from "express";
import { deriveRateLimitKey } from "@veritas/auth";
import type { Principal } from "@veritas/auth";

interface WindowEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, WindowEntry>();

export interface RateLimitOptions {
  readonly max: number;
  readonly windowMs: number;
}

/** Simple in-memory fixed-window rate limiter Express middleware. */
export function rateLimitMiddleware({ max, windowMs }: RateLimitOptions) {
  return function rateLimit(req: Request, res: Response, next: NextFunction): void {
    const principal = req.principal as Principal | undefined;
    const key = principal
      ? deriveRateLimitKey(principal)
      : (req.ip ?? "unknown");

    const now = Date.now();
    const existing = store.get(key);

    if (!existing || now - existing.windowStart >= windowMs) {
      store.set(key, { count: 1, windowStart: now });
      next();
      return;
    }

    if (existing.count >= max) {
      const retryAfter = Math.ceil((existing.windowStart + windowMs - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many requests — please slow down" },
      });
      return;
    }

    existing.count += 1;
    next();
  };
}
