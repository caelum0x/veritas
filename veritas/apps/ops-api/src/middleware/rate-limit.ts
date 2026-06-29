// Middleware: sliding-window in-process rate limiter keyed by IP + API key.
import type { Request, Response, NextFunction } from "express";
import { deriveRateLimitKey } from "@veritas/auth";
import { sendApiError } from "../http/api-error.js";
import type { OpsRequest } from "../context.js";

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

interface WindowState {
  count: number;
  resetAt: number;
}

export function makeRateLimitMiddleware(opts: RateLimitOptions) {
  const windows = new Map<string, WindowState>();

  return function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const opsReq = req as OpsRequest;
    const principal = opsReq.principal;
    const ip = req.ip ?? "unknown";

    const key = principal
      ? deriveRateLimitKey(principal, "global", ip)
      : `ip:${ip}`;

    const now = Date.now();
    const existing = windows.get(key);

    if (!existing || now >= existing.resetAt) {
      windows.set(key, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }

    if (existing.count >= opts.maxRequests) {
      const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("X-RateLimit-Limit", String(opts.maxRequests));
      res.setHeader("X-RateLimit-Remaining", "0");
      sendApiError(res, 429, "RATE_LIMITED", "Rate limit exceeded");
      return;
    }

    existing.count += 1;
    res.setHeader("X-RateLimit-Limit", String(opts.maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(opts.maxRequests - existing.count));
    next();
  };
}
