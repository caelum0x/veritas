// Middleware: sliding-window in-memory rate limiter with configurable window and max requests.

import type { Request, Response, NextFunction } from "express";

interface WindowState {
  count: number;
  windowStart: number;
}

export function rateLimitMiddleware(windowMs: number, maxRequests: number) {
  const windows = new Map<string, WindowState>();

  const getKey = (req: Request): string =>
    (req.ip ?? req.socket.remoteAddress ?? "unknown");

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = getKey(req);
    const now = Date.now();

    const state = windows.get(key);
    if (!state || now - state.windowStart > windowMs) {
      windows.set(key, { count: 1, windowStart: now });
      next();
      return;
    }

    state.count += 1;
    const remaining = Math.max(0, maxRequests - state.count);
    const resetSec = Math.ceil((state.windowStart + windowMs - now) / 1000);

    res.setHeader("X-RateLimit-Limit", String(maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(resetSec));

    if (state.count > maxRequests) {
      res.status(429).json({
        type: "https://veritas.io/errors/too-many-requests",
        title: "Too Many Requests",
        status: 429,
        detail: `Rate limit exceeded. Retry after ${resetSec}s.`,
      });
      return;
    }

    next();
  };
}
