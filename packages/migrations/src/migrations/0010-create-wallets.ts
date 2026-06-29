// Migration 0010 — creates the wallets table for organisation USDC balances
import type { Migration, Pool } from "../migration.js";

export const migration0010CreateWallets: Migration = {
  id: "0010-create-wallets",
  description: "Create wallets table",

  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id              TEXT        PRIMARY KEY,
        org_id          TEXT        NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
        balance_usdc    BIGINT      NOT NULL DEFAULT 0,
        locked_usdc     BIGINT      NOT NULL DEFAULT 0,
        address         TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT wallets_balance_non_negative CHECK (balance_usdc >= 0),
        CONSTRAINT wallets_locked_non_negative  CHECK (locked_usdc  >= 0),
        CONSTRAINT wallets_locked_lte_balance   CHECK (locked_usdc  <= balance_usdc)
      );

      CREATE INDEX IF NOT EXISTS wallets_org_id_idx ON wallets(org_id);
    `);
  },

  async down(pool: Pool): Promise<void> {
    await pool.query(`
      DROP TABLE IF EXISTS wallets;
    `);
  },
};
