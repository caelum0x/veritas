// Migration 0012 — creates the invoices table for subscription billing statements
import type { Migration, Pool } from "../migration.js";

export const migration0012CreateInvoices: Migration = {
  id: "0012-create-invoices",
  description: "Create invoices table",

  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id              TEXT        PRIMARY KEY,
        org_id          TEXT        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        subscription_id TEXT,
        status          TEXT        NOT NULL DEFAULT 'draft',
        currency        TEXT        NOT NULL DEFAULT 'usd',
        amount_due      BIGINT      NOT NULL DEFAULT 0,
        amount_paid     BIGINT      NOT NULL DEFAULT 0,
        line_items      JSONB       NOT NULL DEFAULT '[]',
        period_start    TIMESTAMPTZ NOT NULL,
        period_end      TIMESTAMPTZ NOT NULL,
        due_at          TIMESTAMPTZ,
        paid_at         TIMESTAMPTZ,
        metadata        JSONB       NOT NULL DEFAULT '{}',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT invoices_amount_due_non_negative  CHECK (amount_due  >= 0),
        CONSTRAINT invoices_amount_paid_non_negative CHECK (amount_paid >= 0),
        CONSTRAINT invoices_period_order             CHECK (period_end > period_start)
      );

      CREATE INDEX IF NOT EXISTS invoices_org_id_idx          ON invoices(org_id);
      CREATE INDEX IF NOT EXISTS invoices_subscription_id_idx ON invoices(subscription_id);
      CREATE INDEX IF NOT EXISTS invoices_status_idx          ON invoices(status);
      CREATE INDEX IF NOT EXISTS invoices_due_at_idx          ON invoices(due_at);
    `);
  },

  async down(pool: Pool): Promise<void> {
    await pool.query(`
      DROP TABLE IF EXISTS invoices;
    `);
  },
};
