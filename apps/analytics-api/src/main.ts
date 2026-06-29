// Analytics API entry point — loads config, builds container, starts HTTP server.
import { loadConfig } from "./config.js";
import { buildContainer } from "./container.js";
import { buildApp } from "./app.js";
import { startServer } from "./server.js";
import { registerShutdownHandlers } from "./shutdown.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const deps = buildContainer(config);
  const app = buildApp(deps);
  const { server, port, host } = await startServer(app, config);

  deps.logger.info("analytics-api started", { port, host, env: config.env });

  registerShutdownHandlers({
    server,
    logger: deps.logger,
    timeoutMs: config.shutdownTimeoutMs,
  });
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[analytics-api] fatal startup error: ${msg}\n`);
  process.exit(1);
});
