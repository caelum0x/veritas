// Migration interface — defines the contract for a single schema migration

/** Minimal database pool abstraction for running raw SQL migrations. */
export interface Pool {
  query(sql: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
}

export interface Migration {
  /** Unique sequential identifier, e.g. "0001-create-organizations" */
  readonly id: string;
  /** Human-readable description of what this migration does */
  readonly description?: string;
  /** Apply this migration to the database */
  up(pool: Pool): Promise<void>;
  /** Revert this migration from the database */
  down(pool: Pool): Promise<void>;
}
