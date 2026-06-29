// idempotency.ts: idempotency-key deduplication middleware for mutating requests.
import type { Request, Response, NextFunction } from "express";

interface IdempotencyStore {
  get(key: string): Promise<{ status: number; body: unknown } | undefined>;
  set(key: string, value: { status: number; body: unknown }): Promise<void>;
}

/** In-process in-memory idempotency store (swap for Redis in production). */
class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly cache = new Map<string, { status: number; body: unknown }>();

  async get(key: string): Promise<{ status: number; body: unknown } | undefined> {
    return this.cache.get(key);
  }

  async set(key: string, value: { status: number; body: unknown }): Promise<void> {
    this.cache.set(key, value);
  }
}

const defaultStore: IdempotencyStore = new MemoryIdempotencyStore();

/**
 * Returns an Express middleware that deduplicates POST/PATCH requests using the
 * Idempotency-Key header. Replays cached responses for duplicate keys.
 */
export function createIdempotencyMiddleware(store: IdempotencyStore = defaultStore) {
  return async function idempotencyMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    if (req.method !== "POST" && req.method !== "PATCH") {
      next();
      return;
    }

    const idempotencyKey = req.headers["idempotency-key"] as string | undefined;
    if (!idempotencyKey) {
      next();
      return;
    }

    const cached = await store.get(idempotencyKey);
    if (cached !== undefined) {
      res.status(cached.status).json(cached.body);
      return;
    }

    // Intercept and cache the response before sending
    const originalJson = res.json.bind(res);
    res.json = (body: unknown): Response => {
      void store.set(idempotencyKey, { status: res.statusCode, body });
      return originalJson(body);
    };

    next();
  };
}
