// Bootstrap: composes config + container + app, returning a ready-to-start server.

import { buildContainer, type Deps } from "./container.js";
import { buildApp } from "./app.js";
import { startServer } from "./server.js";
import { registerShutdownHandlers } from "./shutdown.js";
import type { AppConfig } from "./config.js";
import type { Express } from "express";

export type { Deps as AppDeps };

export interface BootstrapResult {
  readonly deps: Deps;
  readonly app: Express;
}

export async function bootstrap(config: AppConfig): Promise<BootstrapResult> {
  const deps = buildContainer(config);
  const app = buildApp(deps);

  deps.logger.info("bootstrap.complete", {
    port: config.port,
    env: config.nodeEnv,
    paymentProcessor: config.paymentProcessorMode,
  });

  return { deps, app };
}

export async function startBootstrapped(
  config: AppConfig,
): Promise<void> {
  const { deps, app } = await bootstrap(config);

  const server = await startServer(app, {
    port: config.port,
    host: config.host,
    logger: deps.logger,
  });

  registerShutdownHandlers(server, {
    timeoutMs: config.shutdownTimeoutMs,
    logger: deps.logger,
  });
}
