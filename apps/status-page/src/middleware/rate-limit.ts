// In-memory sliding-window rate limiter middleware with configurable limits.
import type { Request, Response, NextFunction } from "express";

interface RateLimitOptions {
  readonly windowMs: number;
  readonly max: number;
  readonly message?: string;
}

interface HitRecord {
  count: number;
  resetAt: number;
}

export function rateLimitMiddleware(opts: RateLimitOptions) {
  const { windowMs, max, message = "Too many requests, please try again later." } = opts;
  const store = new Map<string, HitRecord>();

  return function rateLimit(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const key =
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      req.socket.remoteAddress ??
      "unknown";

    const now = Date.now();
    const record = store.get(key);

    if (!record || now > record.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(max - 1));
      next();
      return;
    }

    record.count += 1;
    const remaining = Math.max(0, max - record.count);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(record.resetAt / 1000)));

    if (record.count > max) {
      res.status(429).json({ success: false, error: { code: "TOO_MANY_REQUESTS", message } });
      return;
    }

    next();
  };
}
