// Migration 0014: create subscriptions table
import type { Migration, Pool } from "../migration.js";

export const migration: Migration = {
  id: "0014-create-subscriptions",
  description: "Create subscriptions table",

  async up(pool: Pool): Promise<void> {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL REFERENCES plans(id),
      status TEXT NOT NULL DEFAULT 'active',
      billing_interval TEXT NOT NULL DEFAULT 'monthly',
      current_period_start TIMESTAMPTZ NOT NULL,
      current_period_end TIMESTAMPTZ NOT NULL,
      cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
      canceled_at TIMESTAMPTZ,
      trial_start TIMESTAMPTZ,
      trial_end TIMESTAMPTZ,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS subscriptions_organization_id_idx
      ON subscriptions (organization_id);

    CREATE INDEX IF NOT EXISTS subscriptions_plan_id_idx
      ON subscriptions (plan_id);

    CREATE INDEX IF NOT EXISTS subscriptions_status_idx
      ON subscriptions (status);

    CREATE INDEX IF NOT EXISTS subscriptions_current_period_end_idx
      ON subscriptions (current_period_end);
  `);
  },

  async down(pool: Pool): Promise<void> {
    await pool.query(`
    DROP TABLE IF EXISTS subscriptions;
  `);
  },
};
