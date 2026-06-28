// In-process sliding-window rate limiter middleware.
import type { Request, Response, NextFunction, RequestHandler } from "express";

type WindowEntry = { count: number; resetAt: number };

export interface RateLimitOptions {
  readonly windowMs: number;
  readonly max: number;
}

export function rateLimitMiddleware(opts: RateLimitOptions): RequestHandler {
  const { windowMs, max } = opts;
  const windows = new Map<string, WindowEntry>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip =
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      req.socket.remoteAddress ??
      "unknown";

    const now = Date.now();
    const existing = windows.get(ip);

    if (!existing || now > existing.resetAt) {
      windows.set(ip, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (existing.count >= max) {
      const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        success: false,
        data: null,
        error: { code: "RATE_LIMITED", message: "Too many requests" },
      });
      return;
    }

    windows.set(ip, { count: existing.count + 1, resetAt: existing.resetAt });
    next();
  };
}
