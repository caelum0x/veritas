// Migration 0003 — creates the memberships join table linking users to organizations
import type { Migration, Pool } from "../migration.js";

const migration: Migration = {
  id: "0003-create-memberships",
  description: "Create memberships table joining users to organizations with roles",

  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS memberships (
        id              TEXT        PRIMARY KEY,
        user_id         TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        organization_id TEXT        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
        role            TEXT        NOT NULL DEFAULT 'member',
        metadata        JSONB       NOT NULL DEFAULT '{}',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, organization_id)
      );

      CREATE INDEX IF NOT EXISTS idx_memberships_user_id
        ON memberships (user_id);

      CREATE INDEX IF NOT EXISTS idx_memberships_organization_id
        ON memberships (organization_id);
    `);
  },

  async down(pool: Pool): Promise<void> {
    await pool.query(`
      DROP INDEX IF EXISTS idx_memberships_organization_id;
      DROP INDEX IF EXISTS idx_memberships_user_id;
      DROP TABLE IF EXISTS memberships;
    `);
  },
};

export default migration;
