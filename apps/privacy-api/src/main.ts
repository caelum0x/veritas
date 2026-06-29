// Entrypoint: loads config, bootstraps app, starts HTTP server, and registers shutdown hooks.

import { bootstrap } from "./bootstrap.js";
import { createServer, startServer } from "./server.js";
import { registerShutdownHandlers } from "./shutdown.js";

async function main(): Promise<void> {
  const { config, deps, app } = bootstrap();
  const server = createServer(app);

  registerShutdownHandlers(server, deps.logger, config.shutdownTimeoutMs);

  await startServer(server, config.port, config.host, deps.logger);
}

main().catch((err: unknown) => {
  process.stderr.write(`[privacy-api] Fatal startup error: ${String(err)}\n`);
  process.exit(1);
});
