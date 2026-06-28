// Service entrypoint — loads config, builds container, starts server with graceful shutdown.

import { loadConfig } from "./config.js";
import { buildContainer } from "./container.js";
import { buildApp } from "./app.js";
import { createServer } from "./server.js";
import { registerShutdownHandlers } from "./shutdown.js";
import { bootstrapEventWiring } from "./bootstrap.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const deps = buildContainer(config);
  const { logger } = deps;

  // Start event-wiring bridges
  const wiringResult = await bootstrapEventWiring(logger);
  if (!wiringResult.ok) {
    logger.error("Event-wiring bootstrap failed", {
      error: wiringResult.error.message,
    });
    process.exit(1);
  }

  const { registry } = wiringResult.value;

  const app = buildApp(deps);
  const server = createServer({
    app,
    port: config.port,
    host: config.host,
    logger,
  });

  registerShutdownHandlers({
    server,
    logger,
    timeoutMs: config.shutdownTimeoutMs,
    onShutdown: async () => {
      await registry.stopAll();
      logger.info("Event-wiring bridges stopped");
    },
  });
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error("Fatal startup error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
