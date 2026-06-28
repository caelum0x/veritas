// Migration 0013 — creates the plans table for subscription tier definitions
import type { Migration, Pool } from "../migration.js";

export const migration0013CreatePlans: Migration = {
  id: "0013-create-plans",
  description: "Create plans table",

  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id              TEXT        PRIMARY KEY,
        name            TEXT        NOT NULL UNIQUE,
        description     TEXT,
        price_monthly   BIGINT      NOT NULL DEFAULT 0,
        price_yearly    BIGINT      NOT NULL DEFAULT 0,
        currency        TEXT        NOT NULL DEFAULT 'usd',
        features        TEXT[]      NOT NULL DEFAULT '{}',
        limits          JSONB       NOT NULL DEFAULT '{}',
        is_active       BOOLEAN     NOT NULL DEFAULT true,
        metadata        JSONB       NOT NULL DEFAULT '{}',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT plans_price_monthly_non_negative CHECK (price_monthly >= 0),
        CONSTRAINT plans_price_yearly_non_negative  CHECK (price_yearly  >= 0)
      );

      CREATE INDEX IF NOT EXISTS plans_is_active_idx ON plans(is_active);
    `);
  },

  async down(pool: Pool): Promise<void> {
    await pool.query(`
      DROP TABLE IF EXISTS plans;
    `);
  },
};
