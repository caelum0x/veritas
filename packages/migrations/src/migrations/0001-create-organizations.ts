// Migration 0001 — creates the organizations table
import type { Migration, Pool } from "../migration.js";

const migration: Migration = {
  id: "0001-create-organizations",
  description: "Create organizations table with billing and metadata columns",

  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id            TEXT        PRIMARY KEY,
        name          TEXT        NOT NULL,
        slug          TEXT        NOT NULL UNIQUE,
        plan_id       TEXT,
        metadata      JSONB       NOT NULL DEFAULT '{}',
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_organizations_slug
        ON organizations (slug);
    `);
  },

  async down(pool: Pool): Promise<void> {
    await pool.query(`
      DROP INDEX IF EXISTS idx_organizations_slug;
      DROP TABLE IF EXISTS organizations;
    `);
  },
};

export default migration;
