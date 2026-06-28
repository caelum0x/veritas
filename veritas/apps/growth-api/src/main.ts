// Entry point: load config, build container, start server, register shutdown hooks.
import { bootstrap } from "./bootstrap.js";
import { startServer } from "./server.js";
import { registerShutdownHandlers } from "./shutdown.js";

async function main(): Promise<void> {
  const { config, deps, app } = await bootstrap();

  const server = await startServer({
    app,
    port: config.port,
    host: config.host,
    logger: deps.logger,
  });

  registerShutdownHandlers({
    server,
    logger: deps.logger,
    timeoutMs: config.shutdownTimeoutMs,
  });
}

main().catch((err: unknown) => {
  process.stderr.write(
    `[fatal] growth-api startup failed: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
