// Distributed lock port — interface + in-memory implementation for local/test use
export interface DistributedLock {
  /**
   * Try to acquire a lock for the given key with a TTL in milliseconds.
   * Returns true if acquired, false if already held.
   */
  acquire(key: string, ttlMs: number): Promise<boolean>;
  /** Release a previously acquired lock. */
  release(key: string): Promise<void>;
}

interface LockEntry {
  readonly expiresAt: number;
}

class InMemoryDistributedLock implements DistributedLock {
  private readonly held = new Map<string, LockEntry>();

  async acquire(key: string, ttlMs: number): Promise<boolean> {
    const existing = this.held.get(key);
    const nowMs = Date.now();
    if (existing != null && existing.expiresAt > nowMs) {
      return false;
    }
    this.held.set(key, { expiresAt: nowMs + ttlMs });
    return true;
  }

  async release(key: string): Promise<void> {
    this.held.delete(key);
  }
}

/** Creates an in-memory distributed lock suitable for single-process or test use. */
export function createInMemoryLock(): DistributedLock {
  return new InMemoryDistributedLock();
}
