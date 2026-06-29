// Bootstrap: wires config, container, and app together, returning a ready Express instance.
import type { Express } from "express";
import type { AppConfig } from "./config.js";
import { buildContainer, type Deps } from "./container.js";
import { buildApp } from "./app.js";

export interface BootstrapResult {
  readonly app: Express;
  readonly deps: Deps;
}

export function bootstrap(config: AppConfig): BootstrapResult {
  const deps = buildContainer(config);
  const app = buildApp(deps);
  return { app, deps };
}
