// Unified platform entrypoint: bootstrap all components and start the process.

import { bootstrapPlatform } from "./bootstrap.js";
import { registerShutdown } from "./shutdown.js";

async function main(): Promise<void> {
  const { httpServer, workerSupervisor, agentComponent, logger, config } =
    await bootstrapPlatform();

  // Order matters: start workers before accepting HTTP traffic.
  await workerSupervisor.start();
  await agentComponent.start();
  await httpServer.listen(config.server.port, config.server.host);

  // Register graceful shutdown in reverse start order.
  registerShutdown({
    components: [workerSupervisor, agentComponent, httpServer],
    logger,
    timeoutMs: 15_000,
  });

  logger.info("Platform started", {
    port: config.server.port,
    host: config.server.host,
    env: config.server.env,
  });
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.error("Platform startup failed:", message);
  process.exit(1);
});
