// Idempotency middleware: caches and replays responses for duplicate requests.
import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@veritas/observability";

const IDEMPOTENCY_HEADER = "idempotency-key";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedResponse {
  readonly status: number;
  readonly body: unknown;
  readonly cachedAt: number;
}

const responseCache = new Map<string, CachedResponse>();

function pruneExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of responseCache) {
    if (now - entry.cachedAt > CACHE_TTL_MS) {
      responseCache.delete(key);
    }
  }
}

export function idempotencyMiddleware(logger: Logger) {
  return function enforceIdempotency(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const methods = ["POST", "PATCH", "PUT"];
    if (!methods.includes(req.method)) {
      next();
      return;
    }

    const idempotencyKey = req.headers[IDEMPOTENCY_HEADER] as string | undefined;
    if (!idempotencyKey) {
      next();
      return;
    }

    const cacheKey = `${req.path}:${idempotencyKey}`;
    pruneExpiredEntries();

    const cached = responseCache.get(cacheKey);
    if (cached) {
      logger.debug("Replaying idempotent response", { idempotencyKey, path: req.path });
      res.setHeader("X-Idempotency-Replayed", "true");
      res.status(cached.status).json(cached.body);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = function captureAndCache(body: unknown): Response {
      responseCache.set(cacheKey, {
        status: res.statusCode,
        body,
        cachedAt: Date.now(),
      });
      return originalJson(body);
    };

    next();
  };
}
