// Bootstraps the developer portal API — wires config, container, app, and server.
import { loadConfig } from "./config.js";
import { buildContainer } from "./container.js";
import { buildApp } from "./app.js";
import { createServer } from "./server.js";
import { registerShutdownHandlers } from "./shutdown.js";

export async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const deps = buildContainer(config);

  deps.logger.info("Starting developer-portal-api", {
    env: config.nodeEnv,
    port: config.port,
  });

  const app = buildApp(deps);
  const server = await createServer(app, { port: config.port, host: config.host }, deps.logger);

  registerShutdownHandlers(server, deps.logger);

  deps.logger.info("developer-portal-api ready", {
    port: config.port,
    host: config.host,
    env: config.nodeEnv,
  });
}
