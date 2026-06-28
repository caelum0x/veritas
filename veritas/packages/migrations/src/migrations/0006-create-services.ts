// Migration 0006 — creates the services table for marketplace verification service listings
import type { Migration, Pool } from "../migration.js";

export const migration0006CreateServices: Migration = {
  id: "0006-create-services",
  description: "Create services table",

  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id               TEXT         PRIMARY KEY,
        agent_id         TEXT         NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        org_id           TEXT         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name             TEXT         NOT NULL,
        description      TEXT,
        price_per_claim  BIGINT       NOT NULL DEFAULT 0,
        currency         TEXT         NOT NULL DEFAULT 'USDC',
        capabilities     TEXT[]       NOT NULL DEFAULT '{}',
        is_active        BOOLEAN      NOT NULL DEFAULT true,
        metadata         JSONB        NOT NULL DEFAULT '{}',
        created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS services_agent_id_idx  ON services(agent_id);
      CREATE INDEX IF NOT EXISTS services_org_id_idx    ON services(org_id);
      CREATE INDEX IF NOT EXISTS services_is_active_idx ON services(is_active);
    `);
  },

  async down(pool: Pool): Promise<void> {
    await pool.query(`
      DROP TABLE IF EXISTS services;
    `);
  },
};
