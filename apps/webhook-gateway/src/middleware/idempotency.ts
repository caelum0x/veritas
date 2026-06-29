// Idempotency key middleware — rejects duplicate requests within the TTL window.

import type { Request, Response, NextFunction } from "express";
import { sendError } from "../http/responder.js";

interface KeyEntry {
  readonly usedAt: number;
}

export interface IdempotencyOptions {
  readonly windowMs: number;
}

export function idempotencyMiddleware(opts: IdempotencyOptions) {
  const store = new Map<string, KeyEntry>();

  // Periodic cleanup of expired entries (every 5 minutes)
  const cleanupInterval = setInterval(() => {
    const cutoff = Date.now() - opts.windowMs;
    for (const [key, entry] of store) {
      if (entry.usedAt < cutoff) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  cleanupInterval.unref();

  return function idempotencyCheck(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const key = req.headers["idempotency-key"];
    if (typeof key !== "string" || key.length === 0) {
      next();
      return;
    }

    const now = Date.now();
    const existing = store.get(key);

    if (existing && now - existing.usedAt < opts.windowMs) {
      sendError(
        res,
        409,
        "IDEMPOTENCY_CONFLICT",
        `Idempotency key '${key}' was already used within the replay window`,
      );
      return;
    }

    store.set(key, { usedAt: now });
    next();
  };
}
