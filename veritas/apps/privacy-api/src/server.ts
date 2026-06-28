// Creates and starts the HTTP server; returns the net.Server instance for shutdown handling.

import http from "http";
import type { Express } from "express";
import type { Logger } from "@veritas/observability";

export function createServer(app: Express): http.Server {
  return http.createServer(app);
}

export function startServer(
  server: http.Server,
  port: number,
  host: string,
  logger: Logger,
): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      logger.info("HTTP server started", { port, host, url: `http://${host}:${port}` });
      resolve();
    });
  });
}
