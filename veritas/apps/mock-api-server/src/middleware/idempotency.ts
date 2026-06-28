// Idempotency-Key middleware: replays cached responses for duplicate mutating requests.
import type { Request, Response, NextFunction, RequestHandler } from "express";

type CachedResponse = {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: unknown;
  readonly cachedAt: number;
};

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MUTABLE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function idempotencyMiddleware(): RequestHandler {
  const cache = new Map<string, CachedResponse>();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!MUTABLE_METHODS.has(req.method)) {
      next();
      return;
    }

    const key = req.headers["idempotency-key"];
    if (typeof key !== "string" || key.length === 0) {
      next();
      return;
    }

    const now = Date.now();
    const existing = cache.get(key);
    if (existing && now - existing.cachedAt < IDEMPOTENCY_TTL_MS) {
      res.set(existing.headers);
      res.status(existing.status).json(existing.body);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown): Response => {
      cache.set(key, {
        status: res.statusCode,
        headers: { "content-type": "application/json" },
        body,
        cachedAt: Date.now(),
      });
      return originalJson(body);
    };

    next();
  };
}
