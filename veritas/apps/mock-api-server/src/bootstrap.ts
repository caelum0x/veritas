// Wires config, container, app, and server together to produce a running ServerHandle.
import { loadConfig } from "./config.js";
import { buildContainer } from "./container.js";
import { createApp } from "./app.js";
import { startServer, type ServerHandle } from "./server.js";

export type { ServerHandle };

export async function bootstrap(): Promise<ServerHandle> {
  const config = loadConfig();
  const deps = buildContainer(config);

  deps.logger.info("Bootstrapping mock-api-server", { port: config.port });

  const app = createApp(deps);
  const handle = await startServer(app, config.host, config.port, deps.logger);

  return handle;
}
