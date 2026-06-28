// Migration 0009 — creates the deliveries table for order fulfilment tracking
import type { Migration, Pool } from "../migration.js";

export const migration0009CreateDeliveries: Migration = {
  id: "0009-create-deliveries",
  description: "Create deliveries table",

  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id            TEXT        PRIMARY KEY,
        order_id      TEXT        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        agent_id      TEXT        NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
        status        TEXT        NOT NULL DEFAULT 'pending',
        attempt       INTEGER     NOT NULL DEFAULT 1,
        payload       JSONB       NOT NULL DEFAULT '{}',
        result        JSONB,
        error_message TEXT,
        started_at    TIMESTAMPTZ,
        completed_at  TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS deliveries_order_id_idx  ON deliveries(order_id);
      CREATE INDEX IF NOT EXISTS deliveries_agent_id_idx  ON deliveries(agent_id);
      CREATE INDEX IF NOT EXISTS deliveries_status_idx    ON deliveries(status);
    `);
  },

  async down(pool: Pool): Promise<void> {
    await pool.query(`
      DROP TABLE IF EXISTS deliveries;
    `);
  },
};
