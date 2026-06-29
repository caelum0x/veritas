// Creates and starts the HTTP server, returns the running server instance.
import { createServer } from "node:http";
import type { Express } from "express";
import type { Server } from "node:http";
import type { Logger } from "@veritas/core";
import type { AppConfig } from "./config.js";

export interface StartServerResult {
  readonly server: Server;
  readonly port: number;
}

/** Start the HTTP server and return the bound server instance. */
export async function startServer(
  app: Express,
  config: AppConfig,
  logger: Logger,
): Promise<StartServerResult> {
  const server = createServer(app);
  server.keepAliveTimeout = config.server.keepAliveMs;
  server.headersTimeout = config.server.keepAliveMs + 5_000;

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.server.port, config.server.host, () => {
      logger.info("Admin API server started", {
        host: config.server.host,
        port: config.server.port,
      });
      resolve({ server, port: config.server.port });
    });
  });
}
