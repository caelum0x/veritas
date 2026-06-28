// Migration 0018: create settlements table
import type { Migration, Pool } from "../migration.js";

export const migration: Migration = {
  id: "0018-create-settlements",
  description: "Create settlements table",

  async up(pool: Pool): Promise<void> {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
      payer_wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
      payee_wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
      amount_usdc BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      settled_at TIMESTAMPTZ,
      failure_reason TEXT,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS settlements_order_id_idx
      ON settlements (order_id);

    CREATE INDEX IF NOT EXISTS settlements_payer_wallet_id_idx
      ON settlements (payer_wallet_id);

    CREATE INDEX IF NOT EXISTS settlements_payee_wallet_id_idx
      ON settlements (payee_wallet_id);

    CREATE INDEX IF NOT EXISTS settlements_status_idx
      ON settlements (status);

    CREATE INDEX IF NOT EXISTS settlements_settled_at_idx
      ON settlements (settled_at DESC)
      WHERE settled_at IS NOT NULL;
  `);
  },

  async down(pool: Pool): Promise<void> {
    await pool.query(`
    DROP TABLE IF EXISTS settlements;
  `);
  },
};
