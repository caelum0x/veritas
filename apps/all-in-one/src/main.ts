// main.ts — dev all-in-one entrypoint; boots with in-memory config and wiring.

import { createLogger } from "@veritas/observability";
import { buildDevConfig } from "./config.js";
import { run } from "./run.js";

const logger = createLogger({ level: "info", bindings: { service: "veritas-all-in-one" } });

async function main(): Promise<void> {
  const config = buildDevConfig();

  logger.info("Starting Veritas all-in-one (dev mode)", {
    port: config.server.port,
    host: config.server.host,
  });

  const handle = await run({ config });

  const shutdown = async (): Promise<void> => {
    logger.info("Received shutdown signal — stopping server...");
    await handle.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error("Fatal startup error", { error: message });
  process.exit(1);
});
