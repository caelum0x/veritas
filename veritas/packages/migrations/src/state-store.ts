// Applied-migrations state store — persists which migrations have been run
import type { Pool } from "./migration.js";

export interface AppliedMigration {
  readonly id: string;
  readonly appliedAt: string;
}

export interface StateStore {
  /** Ensure the migrations tracking table exists. */
  ensureTable(): Promise<void>;
  /** Return all migration IDs that have already been applied. */
  listApplied(): Promise<ReadonlyArray<AppliedMigration>>;
  /** Record a migration as applied. */
  markApplied(id: string): Promise<void>;
  /** Remove the applied record for a migration. */
  markReverted(id: string): Promise<void>;
}

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS _migrations (
    id         TEXT        NOT NULL PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

export class PgStateStore implements StateStore {
  constructor(private readonly pool: Pool) {}

  async ensureTable(): Promise<void> {
    await this.pool.query(CREATE_TABLE_SQL);
  }

  async listApplied(): Promise<ReadonlyArray<AppliedMigration>> {
    const result = await this.pool.query(
      "SELECT id, applied_at FROM _migrations ORDER BY applied_at ASC"
    );
    return (result.rows as Array<{ id: string; applied_at: string }>).map(
      (row) => ({ id: row.id, appliedAt: row.applied_at })
    );
  }

  async markApplied(id: string): Promise<void> {
    await this.pool.query(
      "INSERT INTO _migrations (id) VALUES ($1) ON CONFLICT DO NOTHING",
      [id]
    );
  }

  async markReverted(id: string): Promise<void> {
    await this.pool.query("DELETE FROM _migrations WHERE id = $1", [id]);
  }
}
