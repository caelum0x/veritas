// Tiered cache that reads from L1 first, falls back to L2, and back-fills on miss.
import { isSome } from "@veritas/core";
import type { Option } from "@veritas/core";
import type { Cache } from "./cache.js";

export interface MultiTierOptions {
  /** L1 (fast/local) cache */
  readonly l1: Cache;
  /** L2 (slower/remote) cache */
  readonly l2: Cache;
  /** When true, a L2 hit is written back to L1 (default: true). */
  readonly backfill?: boolean;
  /** Default TTL in ms to use when back-filling L1 from L2 (optional). */
  readonly backfillTtlMs?: number;
}

export function createMultiTierCache(options: MultiTierOptions): Cache {
  const { l1, l2, backfill = true, backfillTtlMs } = options;

  return {
    async get(key: string): Promise<Option<unknown>> {
      const l1Value = await l1.get(key);
      if (isSome(l1Value)) {
        return l1Value;
      }
      const l2Value = await l2.get(key);
      if (isSome(l2Value) && backfill) {
        await l1.set(key, l2Value.value, backfillTtlMs);
      }
      return l2Value;
    },

    async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
      await Promise.all([l1.set(key, value, ttlMs), l2.set(key, value, ttlMs)]);
    },

    async delete(key: string): Promise<boolean> {
      const [r1, r2] = await Promise.all([l1.delete(key), l2.delete(key)]);
      return r1 || r2;
    },

    async has(key: string): Promise<boolean> {
      return (await l1.has(key)) || (await l2.has(key));
    },

    async clear(): Promise<void> {
      await Promise.all([l1.clear(), l2.clear()]);
    },

    async keys(): Promise<readonly string[]> {
      const [k1, k2] = await Promise.all([l1.keys(), l2.keys()]);
      return Array.from(new Set([...k1, ...k2]));
    },

    async size(): Promise<number> {
      return l2.size();
    },
  };
}
