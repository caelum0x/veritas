// Migration 0016: create audit_logs table
import type { Migration, Pool } from "../migration.js";

export const migration: Migration = {
  id: "0016-create-audit-logs",
  description: "Create audit_logs table",

  async up(pool: Pool): Promise<void> {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
      actor_id TEXT,
      actor_type TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      changes JSONB,
      metadata JSONB NOT NULL DEFAULT '{}',
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS audit_logs_organization_id_idx
      ON audit_logs (organization_id);

    CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx
      ON audit_logs (actor_id)
      WHERE actor_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS audit_logs_action_idx
      ON audit_logs (action);

    CREATE INDEX IF NOT EXISTS audit_logs_resource_idx
      ON audit_logs (resource_type, resource_id);

    CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
      ON audit_logs (created_at DESC);
  `);
  },

  async down(pool: Pool): Promise<void> {
    await pool.query(`
    DROP TABLE IF EXISTS audit_logs;
  `);
  },
};
