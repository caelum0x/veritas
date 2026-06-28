// Keyed stream state store with TTL eviction for stateful stream operations.
import { StreamError } from "./errors.js";

export type StateEntry<V> = {
  readonly value: V;
  readonly updatedAt: number;
};

export interface StateStore<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
  delete(key: string): void;
  has(key: string): boolean;
  keys(): ReadonlyArray<string>;
  clear(): void;
  size(): number;
}

/** In-memory keyed state store with optional TTL-based eviction. */
export class InMemoryStateStore<V> implements StateStore<V> {
  private readonly store = new Map<string, StateEntry<V>>();
  private readonly ttlMs: number | undefined;

  constructor(options?: { ttlMs?: number }) {
    this.ttlMs = options?.ttlMs;
  }

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (this.ttlMs !== undefined && Date.now() - entry.updatedAt > this.ttlMs) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V): void {
    this.store.set(key, { value, updatedAt: Date.now() });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  keys(): ReadonlyArray<string> {
    if (this.ttlMs === undefined) return [...this.store.keys()];
    // Evict expired before returning keys
    const now = Date.now();
    for (const [k, entry] of this.store) {
      if (now - entry.updatedAt > this.ttlMs) this.store.delete(k);
    }
    return [...this.store.keys()];
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.keys().length;
  }
}

/** Scoped state accessor bound to a specific key (e.g., per-event key). */
export class KeyedState<V> {
  constructor(
    private readonly store: StateStore<V>,
    private readonly key: string
  ) {}

  get(): V | undefined {
    return this.store.get(this.key);
  }

  getOrThrow(): V {
    const v = this.store.get(this.key);
    if (v === undefined) throw new StreamError(`State key "${this.key}" not found`);
    return v;
  }

  set(value: V): void {
    this.store.set(this.key, value);
  }

  update(fn: (current: V | undefined) => V): void {
    this.store.set(this.key, fn(this.store.get(this.key)));
  }

  delete(): void {
    this.store.delete(this.key);
  }

  has(): boolean {
    return this.store.has(this.key);
  }
}

/** Factory that creates KeyedState instances from a shared store. */
export function makeKeyedStateFactory<V>(
  store: StateStore<V>
): (key: string) => KeyedState<V> {
  return (key) => new KeyedState(store, key);
}
