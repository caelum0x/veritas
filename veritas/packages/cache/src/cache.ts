// Cache interface — generic async key-value store abstraction.
import type { Option } from "@veritas/core";

export interface CacheEntry<V> {
  readonly value: V;
  readonly expiresAt: number | undefined;
}

export interface Cache<V = unknown> {
  get(key: string): Promise<Option<V>>;
  set(key: string, value: V, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(): Promise<readonly string[]>;
  size(): Promise<number>;
}
