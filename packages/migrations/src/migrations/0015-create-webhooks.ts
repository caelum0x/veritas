// Migration 0015: create webhooks and webhook_deliveries tables
import type { Migration, Pool } from "../migration.js";

export const migration: Migration = {
  id: "0015-create-webhooks",
  description: "Create webhooks and webhook_deliveries tables",

  async up(pool: Pool): Promise<void> {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      secret TEXT NOT NULL,
      events TEXT[] NOT NULL DEFAULT '{}',
      enabled BOOLEAN NOT NULL DEFAULT true,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS webhooks_organization_id_idx
      ON webhooks (organization_id);

    CREATE INDEX IF NOT EXISTS webhooks_enabled_idx
      ON webhooks (enabled);

    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id TEXT PRIMARY KEY,
      webhook_id TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      response_status INTEGER,
      response_body TEXT,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      next_retry_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS webhook_deliveries_webhook_id_idx
      ON webhook_deliveries (webhook_id);

    CREATE INDEX IF NOT EXISTS webhook_deliveries_status_idx
      ON webhook_deliveries (status);

    CREATE INDEX IF NOT EXISTS webhook_deliveries_next_retry_at_idx
      ON webhook_deliveries (next_retry_at)
      WHERE next_retry_at IS NOT NULL;
  `);
  },

  async down(pool: Pool): Promise<void> {
    await pool.query(`
    DROP TABLE IF EXISTS webhook_deliveries;
    DROP TABLE IF EXISTS webhooks;
  `);
  },
};
