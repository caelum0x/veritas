// Idempotency middleware: caches responses keyed by Idempotency-Key header.

import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@veritas/observability";

const IDEMPOTENCY_HEADER = "idempotency-key";

interface CachedResponse {
  readonly statusCode: number;
  readonly body: unknown;
  readonly cachedAt: number;
}

export interface IdempotencyOptions {
  readonly ttlMs: number;
  readonly logger: Logger;
}

export function idempotencyMiddleware(opts: IdempotencyOptions) {
  const cache = new Map<string, CachedResponse>();

  // Periodic cleanup of expired entries
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now - entry.cachedAt > opts.ttlMs) {
        cache.delete(key);
      }
    }
  }, Math.min(opts.ttlMs, 60_000));
  cleanupInterval.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const idempotencyKey = req.headers[IDEMPOTENCY_HEADER] as string | undefined;
    if (!idempotencyKey || !["POST", "PUT", "PATCH"].includes(req.method)) {
      next();
      return;
    }

    const cacheKey = `${req.method}:${req.path}:${idempotencyKey}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      opts.logger.info("idempotency.cache_hit", { key: idempotencyKey, path: req.path });
      res.setHeader("Idempotency-Replayed", "true");
      res.status(cached.statusCode).json(cached.body);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown): Response => {
      if (res.statusCode < 500) {
        cache.set(cacheKey, { statusCode: res.statusCode, body, cachedAt: Date.now() });
      }
      return originalJson(body);
    };

    next();
  };
}
