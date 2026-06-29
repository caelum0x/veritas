// Middleware: idempotency key deduplication for mutating requests (POST/PATCH/PUT).

import type { Request, Response, NextFunction } from "express";

interface CachedResponse {
  readonly statusCode: number;
  readonly body: unknown;
  readonly cachedAt: number;
}

export function idempotencyMiddleware(ttlMs: number) {
  const cache = new Map<string, CachedResponse>();

  const purgeExpired = (): void => {
    const now = Date.now();
    for (const [key, entry] of cache) {
      if (now - entry.cachedAt > ttlMs) cache.delete(key);
    }
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    const method = req.method.toUpperCase();
    if (method !== "POST" && method !== "PUT" && method !== "PATCH") {
      next();
      return;
    }

    const idempotencyKey = req.headers["idempotency-key"];
    if (typeof idempotencyKey !== "string" || idempotencyKey.length === 0) {
      next();
      return;
    }

    purgeExpired();

    const cached = cache.get(idempotencyKey);
    if (cached) {
      res.status(cached.statusCode).json(cached.body);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown): Response => {
      cache.set(idempotencyKey, {
        statusCode: res.statusCode,
        body,
        cachedAt: Date.now(),
      });
      return originalJson(body);
    };

    next();
  };
}
