// run.ts — wires all in-memory adapters and starts the composed HTTP server.

import http from "node:http";
import { InMemoryEventBus } from "@veritas/core";
import { createLogger } from "@veritas/observability";
import { composeServer } from "@veritas/composition";
import type { AppConfig } from "@veritas/config";
import type { MountableApp } from "@veritas/composition";
import { seedDemoData } from "./seed.js";

export interface RunOptions {
  readonly config: AppConfig;
  /** Override the apps to mount; defaults to a built-in health app. */
  readonly apps?: readonly MountableApp[];
}

export interface RunHandle {
  readonly server: http.Server;
  readonly eventBus: InMemoryEventBus;
  stop(): Promise<void>;
}

/** Assembles in-memory infrastructure and starts the HTTP server. */
export async function run(options: RunOptions): Promise<RunHandle> {
  const { config, apps = [] } = options;

  const logger = createLogger({
    level: config.observability.logLevel,
    bindings: { service: config.observability.serviceName, env: config.observability.environment },
  });

  const eventBus = new InMemoryEventBus();

  await seedDemoData({ logger, eventBus });

  const { app } = composeServer({
    apps: apps.length > 0 ? apps : buildDefaultApps(),
    logger,
    trustProxy: config.server.trustProxy,
    bodyLimitBytes: config.server.bodyLimitBytes,
  });

  const server = http.createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.server.port, config.server.host, resolve);
  });

  logger.info("All-in-one server listening", {
    host: config.server.host,
    port: config.server.port,
    url: config.server.publicUrl,
  });

  const stop = async (): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    logger.info("All-in-one server stopped");
  };

  return { server, eventBus, stop };
}

/** Minimal default apps — a health endpoint so the server is always useful. */
function buildDefaultApps(): readonly MountableApp[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express = require("express") as typeof import("express");
  const router = express.Router();

  router.get("/", (_req, res) => {
    res.json({ status: "healthy", service: "veritas-all-in-one", ts: new Date().toISOString() });
  });

  return [
    {
      name: "health",
      basePath: "/health",
      router,
    },
  ];
}
