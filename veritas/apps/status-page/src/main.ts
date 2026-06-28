// Entrypoint: loads config, bootstraps dependencies, starts server, registers shutdown.
import { loadConfig } from "./config.js";
import { bootstrap } from "./bootstrap.js";
import { startServer } from "./server.js";
import { registerShutdownHandlers } from "./shutdown.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const { app, deps } = bootstrap(config);
  const { logger } = deps;

  logger.info("Starting status-page service", {
    version: config.version,
    nodeEnv: config.nodeEnv,
  });

  const server = await startServer({
    app,
    port: config.port,
    host: config.host,
    logger,
  });

  registerShutdownHandlers({ server, logger });

  logger.info("Status-page service ready", {
    port: config.port,
    host: config.host,
    version: config.version,
  });
}

main().catch((err: unknown) => {
  process.stderr.write(
    `Fatal error starting status-page: ${err instanceof Error ? err.stack : String(err)}\n`,
  );
  process.exit(1);
});
