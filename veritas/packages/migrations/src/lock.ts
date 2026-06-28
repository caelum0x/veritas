// Migration lock — prevents concurrent migration runs via PostgreSQL advisory lock
import type { Pool } from "./migration.js";

/** Advisory lock key — arbitrary stable integer for the migrations lock. */
const LOCK_KEY = 999_001;

/** Acquires and releases a PostgreSQL session-level advisory lock around migrations. */
export class MigrationLock {
  constructor(private readonly pool: Pool) {}

  /** Acquire the advisory lock; throws if already held by another session. */
  async acquire(): Promise<void> {
    const result = await this.pool.query(
      "SELECT pg_try_advisory_lock($1) AS acquired",
      [LOCK_KEY]
    );
    const rows = result.rows as Array<{ acquired: boolean }>;
    if (!rows[0]?.acquired) {
      throw new Error(
        "Could not acquire migration lock — another process may be running migrations."
      );
    }
  }

  /** Release the advisory lock. */
  async release(): Promise<void> {
    await this.pool.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
  }

  /** Run a callback while holding the lock, releasing on completion or error. */
  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      await this.release();
    }
  }
}
