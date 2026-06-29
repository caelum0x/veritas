// Bootstrap: wires config -> deps -> app -> server -> graceful shutdown.
import { loadConfig } from "./config.js";
import { buildDeps } from "./container.js";
import { buildApp } from "./app.js";
import { createServer, startServer } from "./server.js";
import { registerShutdownHandlers } from "./shutdown.js";

export async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const deps   = buildDeps(config);
  const app    = buildApp(deps);
  const server = createServer(app);

  registerShutdownHandlers(server, deps.logger);

  const port = config.server.port ?? 3000;
  const host = config.server.host ?? "0.0.0.0";
  await startServer(server, port, host);

  deps.logger.info("api.started", { port, host, env: config.server.env });
}
