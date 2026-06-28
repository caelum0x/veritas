// Idempotency store — persists and retrieves idempotency records via the cache layer.
import { type Option, some, none } from "@veritas/core";
import { type Cache, createNamespacedCache, ttlFromHours } from "@veritas/cache";
import { type IdempotencyRecord, idempotencyRecordSchema } from "./record.js";

export const DEFAULT_TTL_MS = ttlFromHours(24);
export const NAMESPACE = "idempotency";

export interface IdempotencyStoreOptions {
  readonly ttlMs?: number;
  readonly namespace?: string;
}

export interface IdempotencyStore {
  get(key: string): Promise<Option<IdempotencyRecord>>;
  set(key: string, record: IdempotencyRecord): Promise<void>;
  delete(key: string): Promise<boolean>;
}

/** Create an idempotency store backed by a cache instance. */
export function createIdempotencyStore(
  cache: Cache,
  options: IdempotencyStoreOptions = {},
): IdempotencyStore {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const ns = options.namespace ?? NAMESPACE;
  const namespaced = createNamespacedCache(cache, ns);

  return {
    async get(key: string): Promise<Option<IdempotencyRecord>> {
      const option = await namespaced.get(key);
      if (!option.some) return none();
      const parsed = idempotencyRecordSchema.safeParse(option.value);
      if (!parsed.success) return none();
      return some(parsed.data);
    },

    async set(key: string, record: IdempotencyRecord): Promise<void> {
      await namespaced.set(key, record as unknown, ttlMs);
    },

    async delete(key: string): Promise<boolean> {
      return namespaced.delete(key);
    },
  };
}
