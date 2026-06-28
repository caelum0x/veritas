// Bootstraps config, container, and Express app; returns them ready for server start.

import { loadConfig } from "./config.js";
import { buildContainer } from "./container.js";
import { buildApp } from "./app.js";
import type { AppConfig } from "./config.js";
import type { Deps } from "./container.js";
import type { Express } from "express";

export interface BootstrapResult {
  readonly config: AppConfig;
  readonly deps: Deps;
  readonly app: Express;
}

export function bootstrap(): BootstrapResult {
  const config = loadConfig();
  const deps = buildContainer(config);
  const app = buildApp(deps);

  deps.logger.info("Privacy API bootstrapped", {
    env: config.nodeEnv,
    port: config.port,
  });

  return { config, deps, app };
}
