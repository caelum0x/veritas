// Migration 0005 — creates the agents table for CAP verification agent registry
import type { Migration, Pool } from "../migration.js";

export const migration0005CreateAgents: Migration = {
  id: "0005-create-agents",
  description: "Create agents table",

  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id            TEXT        PRIMARY KEY,
        org_id        TEXT        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name          TEXT        NOT NULL,
        description   TEXT,
        endpoint_url  TEXT        NOT NULL,
        capabilities  TEXT[]      NOT NULL DEFAULT '{}',
        trust_score   NUMERIC(5,4) NOT NULL DEFAULT 0,
        tier          TEXT        NOT NULL DEFAULT 'bronze',
        is_active     BOOLEAN     NOT NULL DEFAULT true,
        metadata      JSONB       NOT NULL DEFAULT '{}',
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS agents_org_id_idx   ON agents(org_id);
      CREATE INDEX IF NOT EXISTS agents_tier_idx     ON agents(tier);
      CREATE INDEX IF NOT EXISTS agents_is_active_idx ON agents(is_active);
    `);
  },

  async down(pool: Pool): Promise<void> {
    await pool.query(`
      DROP TABLE IF EXISTS agents;
    `);
  },
};
