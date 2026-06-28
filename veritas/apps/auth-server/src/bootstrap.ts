// Bootstrap: loads config, builds the container, wires the app, and exports utilities.

import type { Express } from "express";
import { loadConfig, type AppConfig } from "./config.js";
import { buildContainer, type Deps } from "./container.js";
import { buildApp } from "./app.js";

export interface BootstrapResult {
  readonly config: AppConfig;
  readonly deps: Deps;
  readonly app: Express;
}

/** Load config, build the dependency container, and return a configured Express app. */
export function bootstrap(overrides?: Partial<AppConfig>): BootstrapResult {
  const config = { ...loadConfig(), ...overrides };
  const deps = buildContainer(config);
  const app = buildApp(deps);

  deps.logger.info("Auth-server bootstrap complete", {
    port: config.port,
    env: config.env,
    publicUrl: config.publicUrl,
  });

  return { config, deps, app };
}

// Legacy compat — old thin MVP code imported these directly.
export type { AppConfig as AuthConfig } from "./config.js";
export { loadConfig as loadAuthConfig } from "./config.js";
