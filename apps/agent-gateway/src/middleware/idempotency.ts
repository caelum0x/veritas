// Express middleware that implements idempotency key deduplication for POST routes.

import type { Request, Response, NextFunction } from "express";
import type { AppConfig } from "../config.js";

interface CachedResponse {
  readonly status: number;
  readonly body: unknown;
  readonly expiresAt: number;
}

/** Build idempotency middleware using in-memory store. */
export function idempotencyMiddleware(config: AppConfig) {
  const store = new Map<string, CachedResponse>();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== "POST") {
      return next();
    }

    const key = req.headers["idempotency-key"] as string | undefined;
    if (!key) {
      return next();
    }

    const now = Date.now();
    const cached = store.get(key);

    if (cached) {
      if (now < cached.expiresAt) {
        res.setHeader("Idempotency-Replayed", "true");
        return void res.status(cached.status).json(cached.body);
      }
      store.delete(key);
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown): Response => {
      const ttlMs = config.idempotencyTtlSeconds * 1000;
      store.set(key, { status: res.statusCode, body, expiresAt: now + ttlMs });
      return originalJson(body);
    };

    next();
  };
}
