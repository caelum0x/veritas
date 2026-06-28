// Token-bucket rate limiter middleware — keyed by IP or API key.
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { deriveRateLimitKey } from "@veritas/auth";
import type { AppConfig } from "../config.js";

interface Bucket {
  count: number;
  resetAt: number;
}

function getRateLimitKey(req: Request): string {
  const principal = (req as Record<string, unknown>)["principal"];
  if (principal && typeof principal === "object" && "id" in principal) {
    return deriveRateLimitKey(principal as { id: string; kind: string }, req.ip ?? "");
  }
  return req.ip ?? "unknown";
}

export function rateLimitMiddleware(config: AppConfig): RequestHandler {
  const buckets = new Map<string, Bucket>();
  const { rateLimitWindowMs, rateLimitMax } = config;

  return function rateLimit(req: Request, res: Response, next: NextFunction): void {
    const key = getRateLimitKey(req);
    const now = Date.now();

    const existing = buckets.get(key);
    if (!existing || now > existing.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
      res.setHeader("X-RateLimit-Limit", String(rateLimitMax));
      res.setHeader("X-RateLimit-Remaining", String(rateLimitMax - 1));
      next();
      return;
    }

    existing.count += 1;
    const remaining = Math.max(0, rateLimitMax - existing.count);
    res.setHeader("X-RateLimit-Limit", String(rateLimitMax));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(existing.resetAt / 1000)));

    if (existing.count > rateLimitMax) {
      res.status(429).json({
        success: false,
        error: { code: "RATE_LIMITED", message: "Rate limit exceeded" },
      });
      return;
    }

    next();
  };
}
