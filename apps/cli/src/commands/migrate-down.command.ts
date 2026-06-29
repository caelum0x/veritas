// MigrateDown command — reverts the last N applied database migrations
import {
  MigrationRunner,
  MigrationRegistry,
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
import { printSuccess, printLine } from "../output.js";
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

export const migrateDownCommand: Command = {
  name: "migrate:down",
  aliases: ["db:rollback"],
  description: "Revert the last N applied database migrations (default: 1)",
  usage: "veritas migrate:down [--db-url <url>] [--steps <n>]",
  examples: [
    "veritas migrate:down",
    "veritas migrate:down --steps 3",
    "veritas migrate:down --db-url postgres://localhost/veritas",
  ],

  async run(ctx: CommandContext): Promise<void> {
    const dbUrl = resolveDbUrl(ctx.flags);
    const stepsRaw = ctx.flags["steps"];
    const steps = typeof stepsRaw === "string" ? parseInt(stepsRaw, 10) : 1;

    ctx.logger.info("migrate:down: connecting", { dbUrl: dbUrl.replace(/:\/\/[^@]+@/, "://*@"), steps });

    const { default: pg } = await import("pg");
    const pool = new pg.Pool({ connectionString: dbUrl });

    try {
      const registry = buildRegistry();
      const runner = new MigrationRunner(pool, registry);
      const result = await runner.down(steps);

      if (result.reverted.length === 0) {
        printLine("No applied migrations to revert.");
      } else {
        for (const id of result.reverted) {
          printSuccess(`Reverted: ${id}`);
        }
        printLine(`\nMigrations reverted: ${result.reverted.length}`);
      }
    } finally {
      await pool.end();
    }
  },
};
