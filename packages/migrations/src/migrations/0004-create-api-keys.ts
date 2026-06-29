// Migration 0004 — creates the api_keys table for per-organisation API authentication
import type { Migration, Pool } from "../migration.js";

export const migration0004CreateApiKeys: Migration = {
  id: "0004-create-api-keys",
  description: "Create api_keys table",

  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id            TEXT        PRIMARY KEY,
        org_id        TEXT        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id       TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name          TEXT        NOT NULL,
        key_hash      TEXT        NOT NULL UNIQUE,
        key_prefix    TEXT        NOT NULL,
        scopes        TEXT[]      NOT NULL DEFAULT '{}',
        expires_at    TIMESTAMPTZ,
        last_used_at  TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS api_keys_org_id_idx  ON api_keys(org_id);
      CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id);
      CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys(key_hash);
    `);
  },

  async down(pool: Pool): Promise<void> {
    await pool.query(`
      DROP TABLE IF EXISTS api_keys;
    `);
  },
};
