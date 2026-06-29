// Idempotency middleware: caches and replays responses for duplicate requests.
import type { Request, Response, NextFunction } from "express";

interface CachedResponse {
  readonly status: number;
  readonly body: unknown;
  readonly cachedAt: number;
}

const cache = new Map<string, CachedResponse>();

export const IDEMPOTENCY_KEY_HEADER = "x-idempotency-key";

export function idempotencyMiddleware(ttlMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === "GET" || req.method === "DELETE") {
      next();
      return;
    }

    const key = req.headers[IDEMPOTENCY_KEY_HEADER] as string | undefined;
    if (key === undefined) {
      next();
      return;
    }

    const now = Date.now();
    const cached = cache.get(key);
    if (cached !== undefined && now - cached.cachedAt < ttlMs) {
      res.status(cached.status).json(cached.body);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, { status: res.statusCode, body, cachedAt: Date.now() });
      }
      return originalJson(body);
    };

    next();
  };
}
