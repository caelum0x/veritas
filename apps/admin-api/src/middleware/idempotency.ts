// Idempotency middleware: short-circuits duplicate POST/PATCH/PUT requests.
import type { Request, Response, NextFunction } from "express";

interface CachedResponse {
  readonly statusCode: number;
  readonly body: unknown;
  readonly cachedAt: number;
}

const TTL_MS = 60_000;
const cache = new Map<string, CachedResponse>();

/** Middleware that deduplicates requests using the Idempotency-Key header. */
export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  if (!["POST", "PUT", "PATCH"].includes(method)) {
    next();
    return;
  }

  const key = req.headers["idempotency-key"] as string | undefined;
  if (!key) {
    next();
    return;
  }

  const now = Date.now();
  const cached = cache.get(key);

  if (cached !== undefined && now - cached.cachedAt < TTL_MS) {
    res.status(cached.statusCode).json(cached.body);
    return;
  }

  // Intercept send to cache the response
  const origJson = res.json.bind(res);
  res.json = (body: unknown): Response => {
    if (res.statusCode < 500) {
      cache.set(key, { statusCode: res.statusCode, body, cachedAt: now });
    }
    return origJson(body);
  };

  next();
}
