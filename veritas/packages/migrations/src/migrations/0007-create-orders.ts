// Migration 0007 — creates the orders table for claim verification purchase orders
import type { Migration, Pool } from "../migration.js";

export const migration0007CreateOrders: Migration = {
  id: "0007-create-orders",
  description: "Create orders table",

  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id             TEXT         PRIMARY KEY,
        org_id         TEXT         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        service_id     TEXT         NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
        claim_text     TEXT         NOT NULL,
        claim_hash     TEXT         NOT NULL,
        status         TEXT         NOT NULL DEFAULT 'pending',
        total_amount   BIGINT       NOT NULL DEFAULT 0,
        currency       TEXT         NOT NULL DEFAULT 'USDC',
        options        JSONB        NOT NULL DEFAULT '{}',
        idempotency_key TEXT        UNIQUE,
        created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS orders_org_id_idx     ON orders(org_id);
      CREATE INDEX IF NOT EXISTS orders_service_id_idx ON orders(service_id);
      CREATE INDEX IF NOT EXISTS orders_status_idx     ON orders(status);
      CREATE INDEX IF NOT EXISTS orders_claim_hash_idx ON orders(claim_hash);
    `);
  },

  async down(pool: Pool): Promise<void> {
    await pool.query(`
      DROP TABLE IF EXISTS orders;
    `);
  },
};
