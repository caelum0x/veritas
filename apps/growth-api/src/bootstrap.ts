// Orchestrates loadConfig → buildContainer → buildApp for programmatic use.
import { loadConfig, type AppConfig } from "./config.js";
import { buildContainer, type Deps } from "./container.js";
import { buildApp } from "./app.js";
import type { Express } from "express";

export interface BootstrapResult {
  readonly config: AppConfig;
  readonly deps: Deps;
  readonly app: Express;
}

export async function bootstrap(overrides?: Partial<AppConfig>): Promise<BootstrapResult> {
  const rawConfig = loadConfig();
  const config: AppConfig = overrides !== undefined ? { ...rawConfig, ...overrides } : rawConfig;
  const deps = buildContainer(config);
  const app = buildApp(deps);
  return { config, deps, app };
}
