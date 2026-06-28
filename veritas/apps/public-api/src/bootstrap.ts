// bootstrap.ts: orchestrates config loading, container construction, and server startup.
import { loadConfig } from "@veritas/config";
import { createLogger } from "@veritas/observability";
import { buildContainer } from "./container.js";
import { buildApp } from "./app.js";
import { startServer } from "./server.js";
import { registerShutdownHandlers } from "./shutdown.js";

/** Bootstrap the public-api: load config → build deps → start HTTP server. */
export async function bootstrap(): Promise<void> {
  const config = loadConfig();

  const bootstrapLogger = createLogger({
    level: config.observability?.logLevel ?? "info",
    bindings: { service: "public-api" },
  });

  bootstrapLogger.info("Bootstrapping public-api", {
    env: config.server.env,
    port: config.server.port,
  });

  const deps = buildContainer(config);
  const app = buildApp(config, deps.logger, deps);

  const server = await startServer(
    app,
    {
      port: config.server.port ?? 3000,
      host: config.server.host ?? "0.0.0.0",
      keepAliveMs: config.server.keepAliveMs,
    },
    deps.logger,
  );

  registerShutdownHandlers(server, deps.logger);
}
