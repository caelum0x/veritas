// Limiter store backed by @veritas/cache for persisting rate-limit counters/logs
import type { Logger } from "@veritas/core";

export interface StoreEntry {
  readonly value: number;
  readonly expiresAt: number;
}

export interface LimiterStore {
  get(key: string): Promise<StoreEntry | undefined>;
  set(key: string, entry: StoreEntry): Promise<void>;
  increment(key: string, ttlMs: number): Promise<number>;
  delete(key: string): Promise<void>;
  /** Append a timestamp to a sorted list and return all values within windowMs */
  appendLog(key: string, timestampMs: number, windowMs: number): Promise<readonly number[]>;
}

export interface StoreOptions {
  readonly logger?: Logger;
  readonly keyPrefix?: string;
}

interface CacheProvider {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export function createLimiterStore(
  cache: CacheProvider,
  opts: StoreOptions = {}
): LimiterStore {
  const prefix = opts.keyPrefix ?? "rl:";

  function prefixed(key: string): string {
    return `${prefix}${key}`;
  }

  async function get(key: string): Promise<StoreEntry | undefined> {
    const raw = await cache.get(prefixed(key));
    if (raw == null || typeof raw !== "object") return undefined;
    const obj = raw as Record<string, unknown>;
    if (typeof obj["value"] !== "number" || typeof obj["expiresAt"] !== "number") {
      return undefined;
    }
    return { value: obj["value"], expiresAt: obj["expiresAt"] };
  }

  async function set(key: string, entry: StoreEntry): Promise<void> {
    const ttlMs = Math.max(0, entry.expiresAt - Date.now());
    await cache.set(prefixed(key), { value: entry.value, expiresAt: entry.expiresAt }, ttlMs);
  }

  async function increment(key: string, ttlMs: number): Promise<number> {
    const existing = await get(key);
    const now = Date.now();
    if (existing == null || existing.expiresAt <= now) {
      const entry: StoreEntry = { value: 1, expiresAt: now + ttlMs };
      await set(key, entry);
      return 1;
    }
    const next: StoreEntry = { value: existing.value + 1, expiresAt: existing.expiresAt };
    await set(key, next);
    return next.value;
  }

  async function deleteKey(key: string): Promise<void> {
    await cache.delete(prefixed(key));
  }

  async function appendLog(key: string, timestampMs: number, windowMs: number): Promise<readonly number[]> {
    const logKey = prefixed(key);
    const raw = await cache.get(logKey);
    const cutoff = timestampMs - windowMs;
    const existing: number[] =
      Array.isArray(raw) ? (raw as unknown[]).filter((v): v is number => typeof v === "number" && v > cutoff) : [];
    const updated = [...existing, timestampMs];
    await cache.set(logKey, updated, windowMs + 5000);
    return updated;
  }

  return { get, set, increment, delete: deleteKey, appendLog };
}
