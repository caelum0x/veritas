// Nonce generation and one-time-use tracking to prevent replay attacks.
import { randomBytes } from "node:crypto";

/** Default nonce TTL: 5 minutes in milliseconds. */
export const DEFAULT_NONCE_TTL_MS = 5 * 60 * 1000;

/** Generates a cryptographically random nonce (32 hex bytes = 64 chars). */
export function generateNonce(): string {
  return randomBytes(32).toString("hex");
}

interface NonceEntry {
  readonly expiresAt: number;
}

/**
 * In-memory nonce store for replay prevention.
 * In production, replace with a distributed cache (Redis/Memcached)
 * to support multi-instance deployments.
 */
export class InMemoryNonceStore {
  private readonly store = new Map<string, NonceEntry>();
  private readonly ttlMs: number;

  constructor(ttlMs: number = DEFAULT_NONCE_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  /**
   * Consume a nonce.  Returns true if the nonce is fresh (first use within TTL),
   * false if it has already been seen or is expired.
   */
  consume(nonce: string, nowMs: number = Date.now()): boolean {
    this.evict(nowMs);
    if (this.store.has(nonce)) return false;
    this.store.set(nonce, { expiresAt: nowMs + this.ttlMs });
    return true;
  }

  /** Check presence without consuming. */
  has(nonce: string, nowMs: number = Date.now()): boolean {
    const entry = this.store.get(nonce);
    if (!entry) return false;
    return entry.expiresAt > nowMs;
  }

  /** Evict all expired entries to prevent unbounded growth. */
  private evict(nowMs: number): void {
    for (const [k, v] of this.store.entries()) {
      if (v.expiresAt <= nowMs) this.store.delete(k);
    }
  }

  /** Number of live entries (useful for metrics/tests). */
  get size(): number {
    return this.store.size;
  }
}
