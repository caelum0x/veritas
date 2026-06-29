// Agent-gateway entrypoint — bootstraps the app, starts the server, registers shutdown hooks.

import { bootstrap } from "./bootstrap.js";
import { startServer } from "./server.js";
import { registerShutdownHandlers } from "./shutdown.js";

async function main(): Promise<void> {
  const { config, deps, app } = await bootstrap();

  const { server } = await startServer(app, config, deps.logger);

  registerShutdownHandlers(server, deps.logger);

  deps.logger.info("agent-gateway: ready", {
    agentId: config.agentId,
    agentBaseUrl: config.agentBaseUrl,
    port: config.port,
  });
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`agent-gateway: fatal startup error: ${msg}\n`);
  process.exit(1);
});
