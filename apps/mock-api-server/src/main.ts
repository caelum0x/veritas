// Entrypoint: bootstraps the server and registers graceful shutdown handlers.
import { bootstrap } from "./bootstrap.js";
import { registerSignalHandlers, createShutdownHandler } from "./shutdown.js";
import { createLogger } from "@veritas/observability";

const logger = createLogger({ bindings: { service: "mock-api-server" } });

async function main(): Promise<void> {
  const handle = await bootstrap();

  logger.info("Server ready", { port: handle.port });

  const shutdown = createShutdownHandler({
    server: handle.server,
    logger,
    timeoutMs: 10_000,
  });

  registerSignalHandlers(shutdown, logger);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error("Fatal startup error", { error: message });
  process.exit(1);
});
