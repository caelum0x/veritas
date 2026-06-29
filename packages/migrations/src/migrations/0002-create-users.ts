// Migration 0002 — creates the users table
import type { Migration, Pool } from "../migration.js";

const migration: Migration = {
  id: "0002-create-users",
  description: "Create users table with authentication and profile columns",

  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id              TEXT        PRIMARY KEY,
        email           TEXT        NOT NULL UNIQUE,
        name            TEXT        NOT NULL,
        password_hash   TEXT,
        email_verified  BOOLEAN     NOT NULL DEFAULT FALSE,
        metadata        JSONB       NOT NULL DEFAULT '{}',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_users_email
        ON users (email);
    `);
  },

  async down(pool: Pool): Promise<void> {
    await pool.query(`
      DROP INDEX IF EXISTS idx_users_email;
      DROP TABLE IF EXISTS users;
    `);
  },
};

export default migration;
