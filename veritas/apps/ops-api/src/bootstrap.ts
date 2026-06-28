// Bootstrap: composes config, container, app, and server into a running ops-api instance.
import type { Server } from "http";
import type { Express } from "express";
import { loadConfig, type AppConfig } from "./config.js";
import { buildContainer, type Deps } from "./container.js";
import { buildApp } from "./app.js";
import { startServer } from "./server.js";
import { registerShutdownHandlers } from "./shutdown.js";

export interface OpsApiInstance {
  readonly config: AppConfig;
  readonly deps: Deps;
  readonly app: Express;
  readonly server: Server;
}

export async function bootstrap(overrideConfig?: Partial<AppConfig>): Promise<OpsApiInstance> {
  const baseConfig = loadConfig();
  const config: AppConfig = overrideConfig
    ? { ...baseConfig, ...overrideConfig }
    : baseConfig;

  const deps = buildContainer(config);
  const app = buildApp(deps);

  const server = await startServer(
    app,
    { host: config.server.host, port: config.server.port },
    deps.logger,
  );

  registerShutdownHandlers(server, deps.logger, config.server.shutdownTimeoutMs);

  deps.logger.info("@veritas/ops-api started", {
    env: config.env,
    port: config.server.port,
    basePath: config.server.basePath,
  });

  return { config, deps, app, server };
}
