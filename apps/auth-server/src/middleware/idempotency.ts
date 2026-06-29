// idempotency middleware: caches POST/PUT responses by Idempotency-Key header to prevent duplicates.

import type { Request, Response, NextFunction } from "express";

interface CachedResponse {
  readonly status: number;
  readonly body: unknown;
  readonly cachedAt: number;
}

/** Returns a middleware that enforces idempotency via the Idempotency-Key request header. */
export function idempotencyMiddleware(ttlMs: number) {
  const cache = new Map<string, CachedResponse>();

  return (req: Request, res: Response, next: NextFunction): void => {
    // Only enforce on state-mutating methods.
    if (req.method !== "POST" && req.method !== "PUT" && req.method !== "PATCH") {
      return next();
    }

    const key = req.headers["idempotency-key"] as string | undefined;
    if (key === undefined) {
      return next();
    }

    const now = Date.now();
    const cached = cache.get(key);

    if (cached !== undefined && now - cached.cachedAt < ttlMs) {
      res.setHeader("X-Idempotency-Replayed", "true");
      res.status(cached.status).json(cached.body);
      return;
    }

    // Patch res.json to capture the outgoing response for caching.
    const originalJson = res.json.bind(res);
    res.json = (body: unknown): Response => {
      if (res.statusCode < 500) {
        cache.set(key, { status: res.statusCode, body, cachedAt: Date.now() });
      }
      return originalJson(body);
    };

    next();
  };
}
