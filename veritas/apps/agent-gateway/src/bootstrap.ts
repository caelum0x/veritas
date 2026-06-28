// Bootstrap: loads config, builds container, constructs the Express app.

import { loadConfig, type AppConfig } from "./config.js";
import { buildContainer, type Deps } from "./container.js";
import { buildApp } from "./app.js";
import type { Express } from "express";

export interface BootstrapResult {
  readonly config: AppConfig;
  readonly deps: Deps;
  readonly app: Express;
}

/** Load configuration, wire dependencies, and construct the Express app. */
export async function bootstrap(): Promise<BootstrapResult> {
  const config = loadConfig();
  const deps = buildContainer(config);
  const app = buildApp(deps);

  deps.logger.info("bootstrap: complete", {
    agentId: config.agentId,
    port: config.port,
    nodeEnv: config.nodeEnv,
  });

  return { config, deps, app };
}
