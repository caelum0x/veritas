// Migration 0008 — creates the negotiations table for buyer/agent price negotiation rounds
import type { Migration, Pool } from "../migration.js";

export const migration0008CreateNegotiations: Migration = {
  id: "0008-create-negotiations",
  description: "Create negotiations table",

  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS negotiations (
        id              TEXT         PRIMARY KEY,
        order_id        TEXT         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        initiator_id    TEXT         NOT NULL,
        counterparty_id TEXT         NOT NULL,
        status          TEXT         NOT NULL DEFAULT 'open',
        proposed_amount BIGINT       NOT NULL,
        currency        TEXT         NOT NULL DEFAULT 'USDC',
        rounds          JSONB        NOT NULL DEFAULT '[]',
        expires_at      TIMESTAMPTZ,
        resolved_at     TIMESTAMPTZ,
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS negotiations_order_id_idx        ON negotiations(order_id);
      CREATE INDEX IF NOT EXISTS negotiations_initiator_id_idx    ON negotiations(initiator_id);
      CREATE INDEX IF NOT EXISTS negotiations_counterparty_id_idx ON negotiations(counterparty_id);
      CREATE INDEX IF NOT EXISTS negotiations_status_idx          ON negotiations(status);
    `);
  },

  async down(pool: Pool): Promise<void> {
    await pool.query(`
      DROP TABLE IF EXISTS negotiations;
    `);
  },
};
