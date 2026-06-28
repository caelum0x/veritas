// Prefix wrapper — scopes all cache operations under a fixed namespace.
import type { Option } from "@veritas/core";
import type { Cache } from "./cache.js";
import { prefixKey, stripPrefix, hasNamespace } from "./key.js";

export class NamespacedCache<V = unknown> implements Cache<V> {
  private readonly inner: Cache<V>;
  private readonly namespace: string;

  constructor(inner: Cache<V>, namespace: string) {
    if (namespace.length === 0) throw new Error("Namespace must be non-empty");
    this.inner = inner;
    this.namespace = namespace;
  }

  private ns(key: string): string {
    return prefixKey(this.namespace, key);
  }

  async get(key: string): Promise<Option<V>> {
    return this.inner.get(this.ns(key));
  }

  async set(key: string, value: V, ttlMs?: number): Promise<void> {
    return this.inner.set(this.ns(key), value, ttlMs);
  }

  async delete(key: string): Promise<boolean> {
    return this.inner.delete(this.ns(key));
  }

  async has(key: string): Promise<boolean> {
    return this.inner.has(this.ns(key));
  }

  async clear(): Promise<void> {
    const allKeys = await this.inner.keys();
    await Promise.all(
      allKeys
        .filter((k) => hasNamespace(this.namespace, k))
        .map((k) => this.inner.delete(k)),
    );
  }

  async keys(): Promise<readonly string[]> {
    const allKeys = await this.inner.keys();
    return allKeys
      .filter((k) => hasNamespace(this.namespace, k))
      .map((k) => stripPrefix(this.namespace, k));
  }

  async size(): Promise<number> {
    return (await this.keys()).length;
  }
}

/** Factory function to create a new NamespacedCache instance. */
export function createNamespacedCache<V = unknown>(
  inner: Cache<V>,
  namespace: string,
): NamespacedCache<V> {
  return new NamespacedCache<V>(inner, namespace);
}
