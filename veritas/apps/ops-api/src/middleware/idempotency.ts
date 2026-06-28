// Middleware: idempotency key deduplication for mutating requests (POST/PUT/PATCH).
import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@veritas/observability";

const IDEMPOTENCY_HEADER = "x-idempotency-key";
const MUTABLE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

interface CachedResponse {
  status: number;
  body: unknown;
  cachedAt: number;
}

export function makeIdempotencyMiddleware(logger: Logger, ttlMs = 86400000) {
  const cache = new Map<string, CachedResponse>();

  return function idempotencyMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    if (!MUTABLE_METHODS.has(req.method)) {
      next();
      return;
    }

    const key = req.headers[IDEMPOTENCY_HEADER] as string | undefined;
    if (!key) {
      next();
      return;
    }

    const now = Date.now();
    const cached = cache.get(key);

    if (cached) {
      if (now - cached.cachedAt < ttlMs) {
        logger.debug("Idempotency cache hit", { key });
        res.status(cached.status).json(cached.body);
        return;
      }
      cache.delete(key);
    }

    const originalJson = res.json.bind(res);

    res.json = function (body: unknown): Response {
      cache.set(key, { status: res.statusCode, body, cachedAt: Date.now() });
      return originalJson(body);
    };

    next();
  };
}
