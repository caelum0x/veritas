// Rate-limit middleware: sliding-window per API key/IP using an in-memory store.
import type { Request, Response, NextFunction } from "express";
import { RateLimitedError } from "@veritas/core";
import { createLimiterStore } from "@veritas/rate-limit";
import type { AuthenticatedRequest } from "./auth.js";

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
  reset(key: string): Promise<void>;
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  keyResolver?: (req: Request) => string;
}

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  async increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();
    const existing = this.windows.get(key);
    if (!existing || now >= existing.resetAt) {
      const entry = { count: 1, resetAt: now + windowMs };
      this.windows.set(key, entry);
      return { ...entry };
    }
    existing.count += 1;
    return { count: existing.count, resetAt: existing.resetAt };
  }

  async reset(key: string): Promise<void> {
    this.windows.delete(key);
  }
}

function defaultKeyResolver(req: Request): string {
  const authed = req as AuthenticatedRequest;
  if (authed.apiKeyId) return `apikey:${authed.apiKeyId}`;
  if (authed.orgId)    return `org:${authed.orgId}`;
  const fwd = req.headers["x-forwarded-for"];
  const ip  = Array.isArray(fwd) ? fwd[0] : fwd ?? req.socket?.remoteAddress ?? "unknown";
  return `ip:${ip}`;
}

export function createRateLimitMiddleware(store: RateLimitStore, options: RateLimitOptions) {
  const { windowMs, maxRequests, keyPrefix = "rl", keyResolver = defaultKeyResolver } = options;

  return async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const resolvedKey = keyResolver(req);
    const storeKey    = `${keyPrefix}:${resolvedKey}`;
    try {
      const { count, resetAt } = await store.increment(storeKey, windowMs);
      const remaining = Math.max(0, maxRequests - count);
      res.setHeader("X-RateLimit-Limit",     String(maxRequests));
      res.setHeader("X-RateLimit-Remaining", String(remaining));
      res.setHeader("X-RateLimit-Reset",     String(Math.ceil(resetAt / 1000)));
      if (count > maxRequests) {
        res.setHeader("Retry-After", String(Math.ceil((resetAt - Date.now()) / 1000)));
        next(new RateLimitedError({ message: "Rate limit exceeded" }));
        return;
      }
      next();
    } catch {
      next(); // fail open
    }
  };
}

export function rateLimit(options: { max: number; windowMs?: number }): ReturnType<typeof createRateLimitMiddleware> {
  return createRateLimitMiddleware(new InMemoryRateLimitStore(), {
    windowMs: options.windowMs ?? 60_000,
    maxRequests: options.max,
  });
}
