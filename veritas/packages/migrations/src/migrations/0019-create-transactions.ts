// Migration 0019: create transactions table for financial transaction records
import type { Migration } from "../migration.js";

const migration: Migration = {
  id: "0019-create-transactions",
  description: "Create transactions table for financial transaction records",

  async up(db): Promise<void> {
    await db.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id             TEXT        NOT NULL PRIMARY KEY,
        wallet_id      TEXT        NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
        kind           TEXT        NOT NULL,
        amount_base    BIGINT      NOT NULL,
        currency       TEXT        NOT NULL DEFAULT 'USDC',
        reference_id   TEXT,
        reference_type TEXT,
        description    TEXT,
        metadata       JSONB       NOT NULL DEFAULT '{}',
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS transactions_wallet_id_idx
        ON transactions (wallet_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS transactions_kind_idx
        ON transactions (kind)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS transactions_reference_idx
        ON transactions (reference_id, reference_type)
        WHERE reference_id IS NOT NULL
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS transactions_created_at_idx
        ON transactions (created_at DESC)
    `);
  },

  async down(db): Promise<void> {
    await db.query(`DROP TABLE IF EXISTS transactions`);
  },
};

export default migration;
