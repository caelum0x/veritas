// Bootstrap orchestrates config loading, container building, and server startup.
import { loadConfig } from "./config.js";
import { buildContainer } from "./container.js";
import { buildApp } from "./app.js";
import { startServer } from "./server.js";
import { registerShutdownHandlers } from "./shutdown.js";

/** Boot the admin-api: load config, wire deps, start server, register shutdown hooks. */
export async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const deps = buildContainer(config);
  const { logger } = deps;

  logger.info("Starting admin-api", { port: config.server.port });

  const app = buildApp(deps);
  const { server } = await startServer(app, config, logger);

  registerShutdownHandlers(server, logger);

  logger.info("Admin API ready");
}
