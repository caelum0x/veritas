// HTTP server factory — creates the Node HTTP server from the Express app.

import { createServer, type Server } from "node:http";
import type { Express } from "express";
import type { Logger } from "@veritas/observability";
import type { AppConfig } from "./config.js";

export interface ServerStartResult {
  readonly server: Server;
  readonly address: string;
}

/** Create and start the HTTP server; resolves once it is bound. */
export function startServer(
  app: Express,
  config: AppConfig,
  logger: Logger
): Promise<ServerStartResult> {
  return new Promise((resolve, reject) => {
    const server = createServer(app);

    server.once("error", (err) => {
      logger.fatal("server: bind error", { err: err.message, port: config.port });
      reject(err);
    });

    server.listen(config.port, config.host, () => {
      const address = `http://${config.host}:${config.port}`;
      logger.info("server: listening", {
        host: config.host,
        port: config.port,
        address,
      });
      resolve({ server, address });
    });
  });
}
