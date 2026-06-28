// Idempotency middleware — caches responses for requests carrying Idempotency-Key header.
import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { AppConfig } from "../config.js";

interface CachedResponse {
  readonly status: number;
  readonly body: unknown;
  readonly cachedAt: number;
}

export function idempotencyMiddleware(config: AppConfig): RequestHandler {
  const cache = new Map<string, CachedResponse>();
  const { idempotencyTtlMs } = config;

  const IDEMPOTENT_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

  return function idempotency(req: Request, res: Response, next: NextFunction): void {
    if (!IDEMPOTENT_METHODS.has(req.method)) {
      next();
      return;
    }

    const key = req.headers["idempotency-key"] as string | undefined;
    if (!key) {
      next();
      return;
    }

    const cacheKey = `${req.method}:${req.path}:${key}`;
    const cached = cache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.cachedAt < idempotencyTtlMs) {
      res.setHeader("X-Idempotency-Replayed", "true");
      res.status(cached.status).json(cached.body);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = function captureAndCache(body: unknown): Response {
      if (res.statusCode < 500) {
        cache.set(cacheKey, { status: res.statusCode, body, cachedAt: now });
      }
      return originalJson(body);
    };

    next();
  };
}
