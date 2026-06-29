// MigrateUp command — applies pending database migrations using @veritas/migrations
import {
  MigrationRunner,
  MigrationRegistry,
  PgStateStore,
  migration0001,
  migration0002,
  migration0003,
  migration0004,
  migration0005,
  migration0006,
  migration0007,
  migration0008,
  migration0009,
  migration0010,
  migration0011,
  migration0012,
  migration0013,
  migration0014,
  migration0015,
  migration0016,
  migration0017,
  migration0018,
  migration0019,
} from "@veritas/migrations";
import { printSuccess, printLine, printError } from "../output.js";
import type { Command, CommandContext } from "../command.js";

const ALL_MIGRATIONS = [
  migration0001, migration0002, migration0003, migration0004,
  migration0005, migration0006, migration0007, migration0008,
  migration0009, migration0010, migration0011, migration0012,
  migration0013, migration0014, migration0015, migration0016,
  migration0017, migration0018, migration0019,
] as const;

function buildRegistry(): MigrationRegistry {
  const registry = new MigrationRegistry();
  for (const m of ALL_MIGRATIONS) {
    registry.register(m);
  }
  return registry;
}

function resolveDbUrl(flags: Readonly<Record<string, string | boolean | undefined>>): string {
  const flagUrl = typeof flags["db-url"] === "string" ? flags["db-url"] : undefined;
  const envUrl = process.env["DATABASE_URL"];
  const url = flagUrl ?? envUrl;
  if (!url) {
    throw new Error("Database URL is required. Set --db-url or DATABASE_URL env var.");
  }
  return url;
}

export const migrateUpCommand: Command = {
  name: "migrate:up",
  aliases: ["db:migrate"],
  description: "Apply all pending database migrations",
  usage: "veritas migrate:up [--db-url <url>] [--limit <n>]",
  examples: [
    "veritas migrate:up",
    "veritas migrate:up --limit 3",
    "veritas migrate:up --db-url postgres://localhost/veritas",
  ],

  async run(ctx: CommandContext): Promise<void> {
    const dbUrl = resolveDbUrl(ctx.flags);
    const limitRaw = ctx.flags["limit"];
    const limit = typeof limitRaw === "string" ? parseInt(limitRaw, 10) : undefined;

    ctx.logger.info("migrate:up: connecting", { dbUrl: dbUrl.replace(/:\/\/[^@]+@/, "://*@") });

    const { default: pg } = await import("pg");
    const pool = new pg.Pool({ connectionString: dbUrl });

    try {
      const registry = buildRegistry();
      const runner = new MigrationRunner(pool, registry);
      const result = await runner.up(limit !== undefined ? { limit } : {});

      if (result.applied.length === 0) {
        printLine("No pending migrations — database is up to date.");
      } else {
        for (const id of result.applied) {
          printSuccess(`Applied: ${id}`);
        }
        printLine(`\nMigrations applied: ${result.applied.length}`);
      }
    } finally {
      await pool.end();
    }
  },
};
