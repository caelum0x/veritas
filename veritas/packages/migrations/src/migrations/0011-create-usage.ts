// Migration 0011 — creates the usage table for per-organisation metered billing records
import type { Migration, Pool } from "../migration.js";

export const migration0011CreateUsage: Migration = {
  id: "0011-create-usage",
  description: "Create usage table",

  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usage (
        id            TEXT        PRIMARY KEY,
        org_id        TEXT        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        metric        TEXT        NOT NULL,
        quantity      BIGINT      NOT NULL DEFAULT 0,
        period_start  TIMESTAMPTZ NOT NULL,
        period_end    TIMESTAMPTZ NOT NULL,
        metadata      JSONB       NOT NULL DEFAULT '{}',
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT usage_quantity_non_negative CHECK (quantity >= 0),
        CONSTRAINT usage_period_order          CHECK (period_end > period_start)
      );

      CREATE INDEX IF NOT EXISTS usage_org_id_idx      ON usage(org_id);
      CREATE INDEX IF NOT EXISTS usage_metric_idx      ON usage(metric);
      CREATE INDEX IF NOT EXISTS usage_period_start_idx ON usage(period_start);
    `);
  },

  async down(pool: Pool): Promise<void> {
    await pool.query(`
      DROP TABLE IF EXISTS usage;
    `);
  },
};
