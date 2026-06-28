// Idempotency middleware — caches responses for idempotent requests via Idempotency-Key header.
import type { Request, Response, NextFunction } from "express";

interface CachedResponse {
  readonly status: number;
  readonly body: unknown;
  readonly cachedAt: number;
}

const cache = new Map<string, CachedResponse>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Express middleware that short-circuits duplicate mutation requests using Idempotency-Key. */
export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers["idempotency-key"] as string | undefined;

  if (!key || req.method === "GET" || req.method === "HEAD") {
    next();
    return;
  }

  const cached = cache.get(key);
  if (cached && Date.now() - cached.cachedAt < TTL_MS) {
    res.status(cached.status).json(cached.body);
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = (body: unknown): Response => {
    if (res.statusCode < 500) {
      cache.set(key, { status: res.statusCode, body, cachedAt: Date.now() });
    }
    return originalJson(body);
  };

  next();
}
