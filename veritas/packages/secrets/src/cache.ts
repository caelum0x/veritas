// TTL-based in-memory cache layer for resolved secrets — wraps a SecretsManager.

import { Result, ok } from "@veritas/core";
import {
  SecretRef,
  SecretMetadata,
  ResolvedSecret,
} from "./secret.js";
import { SecretNotFoundError, SecretAccessError } from "./errors.js";
import {
  SecretsManager,
  SetSecretOptions,
  ListSecretsOptions,
  ListSecretsResult,
} from "./manager.js";

interface CacheEntry {
  readonly resolved: ResolvedSecret;
  readonly expiresAt: number; // ms since epoch
}

export interface CacheOptions {
  /** Default TTL in milliseconds (default: 60_000). */
  readonly ttlMs?: number;
  /** Maximum number of entries to hold (default: 500). */
  readonly maxSize?: number;
}

/**
 * Wraps a SecretsManager with a TTL cache to reduce backend round-trips.
 * Cache is invalidated on set/delete operations.
 */
export class CachingSecretsManager implements SecretsManager {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;
  private readonly maxSize: number;

  constructor(
    private readonly inner: SecretsManager,
    options: CacheOptions = {}
  ) {
    this.ttlMs = options.ttlMs ?? 60_000;
    this.maxSize = options.maxSize ?? 500;
  }

  private cacheKey(ref: SecretRef): string {
    return ref.version ? `${ref.name}@${ref.version}` : ref.name;
  }

  private get(key: string): ResolvedSecret | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.resolved;
  }

  private set(key: string, resolved: ResolvedSecret): void {
    if (this.cache.size >= this.maxSize) {
      // Evict oldest entry (insertion order)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, { resolved, expiresAt: Date.now() + this.ttlMs });
  }

  private invalidate(name: string): void {
    for (const key of [...this.cache.keys()]) {
      if (key === name || key.startsWith(`${name}@`)) {
        this.cache.delete(key);
      }
    }
  }

  /** Evict all expired entries from the cache. */
  evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) this.cache.delete(key);
    }
  }

  /** Current number of cached entries (including possibly-expired). */
  get size(): number {
    return this.cache.size;
  }

  async getSecret(
    ref: SecretRef
  ): Promise<Result<ResolvedSecret, SecretNotFoundError | SecretAccessError>> {
    const key = this.cacheKey(ref);
    const cached = this.get(key);
    if (cached) {
      return ok(cached);
    }
    const result = await this.inner.getSecret(ref);
    if (result.ok) {
      this.set(key, result.value);
    }
    return result;
  }

  async setSecret(
    name: string,
    value: string,
    options?: SetSecretOptions
  ): Promise<Result<SecretMetadata, SecretAccessError>> {
    const result = await this.inner.setSecret(name, value, options);
    if (result.ok) {
      this.invalidate(name);
    }
    return result;
  }

  async deleteSecret(
    name: string,
    version?: string
  ): Promise<Result<void, SecretNotFoundError | SecretAccessError>> {
    const result = await this.inner.deleteSecret(name, version);
    if (result.ok) {
      this.invalidate(name);
    }
    return result;
  }

  async listSecrets(
    options?: ListSecretsOptions
  ): Promise<Result<ListSecretsResult, SecretAccessError>> {
    return this.inner.listSecrets(options);
  }

  async secretExists(name: string): Promise<Result<boolean, SecretAccessError>> {
    return this.inner.secretExists(name);
  }
}
