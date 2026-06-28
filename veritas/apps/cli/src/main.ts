// CLI entrypoint — bootstraps registry, parses args, and exits with status code
import { CommandRegistry } from "./registry.js";
import { parseArgs, dispatch } from "./cli.js";

const VERSION = "1.0.0";

const HELP_TEXT = `
veritas — enterprise fact-verification & source-provenance platform

Usage:
  veritas <command> [options]

Commands:
  verify              Submit a URL for fact-verification
  verify-text         Submit raw text for fact-verification
  reports list        List verification reports
  reports get         Get a specific verification report
  keys create         Create an API key
  keys list           List API keys
  keys revoke         Revoke an API key
  agents list         List registered agents
  orders list         List orders
  orders get          Get a specific order
  migrate up          Run pending database migrations
  migrate down        Roll back the last migration
  serve api           Start the REST API server
  serve worker        Start the background worker
  serve agent         Start the agent process
  store publish       Publish an agent to the store

Options:
  --json              Output results as JSON
  --help, -h          Show help
  --version, -v       Show version

Run 'veritas <command> --help' for command-specific help.
`.trim();

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);
  const registry = new CommandRegistry();

  // Dynamically import command modules to keep startup fast
  const [
    { VerifyCommand },
    { VerifyTextCommand },
    { ReportsListCommand },
    { ReportsGetCommand },
    { KeysCreateCommand },
    { keysListCommand },
    { keysRevokeCommand },
    { agentsListCommand },
    { ordersListCommand },
    { ordersGetCommand },
    { migrateUpCommand },
    { migrateDownCommand },
    { serveApiCommand },
    { serveWorkerCommand },
    { serveAgentCommand },
    { storePublishCommand },
  ] = await Promise.all([
    import("./commands/verify.command.js"),
    import("./commands/verify-text.command.js"),
    import("./commands/reports-list.command.js"),
    import("./commands/reports-get.command.js"),
    import("./commands/keys-create.command.js"),
    import("./commands/keys-list.command.js"),
    import("./commands/keys-revoke.command.js"),
    import("./commands/agents-list.command.js"),
    import("./commands/orders-list.command.js"),
    import("./commands/orders-get.command.js"),
    import("./commands/migrate-up.command.js"),
    import("./commands/migrate-down.command.js"),
    import("./commands/serve-api.command.js"),
    import("./commands/serve-worker.command.js"),
    import("./commands/serve-agent.command.js"),
    import("./commands/store-publish.command.js"),
  ]);

  registry.register(new VerifyCommand());
  registry.register(new VerifyTextCommand());
  registry.register(new ReportsListCommand());
  registry.register(new ReportsGetCommand());
  registry.register(new KeysCreateCommand());
  registry.register(keysListCommand);
  registry.register(keysRevokeCommand);
  registry.register(agentsListCommand);
  registry.register(ordersListCommand);
  registry.register(ordersGetCommand);
  registry.register(migrateUpCommand);
  registry.register(migrateDownCommand);
  registry.register(serveApiCommand);
  registry.register(serveWorkerCommand);
  registry.register(serveAgentCommand);
  registry.register(storePublishCommand);

  const exitCode = await dispatch(registry, parsed, HELP_TEXT, VERSION);
  process.exit(exitCode);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Fatal: ${message}\n`);
  process.exit(1);
});
