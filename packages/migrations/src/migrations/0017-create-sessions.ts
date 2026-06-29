// Migration 0017: create sessions table
import type { Migration, Pool } from "../migration.js";

export const migration: Migration = {
  id: "0017-create-sessions",
  description: "Create sessions table",

  async up(pool: Pool): Promise<void> {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS sessions_user_id_idx
      ON sessions (user_id);

    CREATE INDEX IF NOT EXISTS sessions_token_hash_idx
      ON sessions (token_hash);

    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx
      ON sessions (expires_at);

    CREATE INDEX IF NOT EXISTS sessions_active_idx
      ON sessions (user_id, expires_at)
      WHERE revoked_at IS NULL;
  `);
  },

  async down(pool: Pool): Promise<void> {
    await pool.query(`
    DROP TABLE IF EXISTS sessions;
  `);
  },
};
