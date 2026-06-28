// In-flight lock to prevent concurrent duplicate requests using a cache backend.
import type { Cache } from "@veritas/cache";
import { isSome } from "@veritas/core";
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";

const LOCK_PREFIX = "idempotency:lock:";
const DEFAULT_LOCK_TTL_MS = 30_000; // 30 seconds

export interface LockOptions {
  readonly ttlMs?: number;
}

export interface Lock {
  readonly key: string;
  readonly acquiredAt: number;
}

/** Acquire an in-flight lock for an idempotency key. Returns err if already locked. */
export async function acquireLock(
  cache: Cache<string>,
  idempotencyKey: string,
  options: LockOptions = {},
): Promise<Result<Lock, "already_locked">> {
  const cacheKey = `${LOCK_PREFIX}${idempotencyKey}`;
  const ttlMs = options.ttlMs ?? DEFAULT_LOCK_TTL_MS;

  const existing = await cache.get(cacheKey);
  if (isSome(existing)) {
    return err("already_locked");
  }

  const acquiredAt = Date.now();
  await cache.set(cacheKey, acquiredAt.toString(), ttlMs);
  return ok({ key: idempotencyKey, acquiredAt });
}

/** Release an in-flight lock for an idempotency key. */
export async function releaseLock(
  cache: Cache<string>,
  idempotencyKey: string,
): Promise<void> {
  const cacheKey = `${LOCK_PREFIX}${idempotencyKey}`;
  await cache.delete(cacheKey);
}

/** Check whether an idempotency key is currently locked. */
export async function isLocked(
  cache: Cache<string>,
  idempotencyKey: string,
): Promise<boolean> {
  const cacheKey = `${LOCK_PREFIX}${idempotencyKey}`;
  return cache.has(cacheKey);
}
