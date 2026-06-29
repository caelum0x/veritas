// HTTP server lifecycle — creates and starts the Express server, returns the Node http.Server.
import http from "http";
import type { Express } from "express";
import type { Logger } from "@veritas/observability";

export interface ServerOptions {
  readonly port: number;
  readonly host: string;
}

export function createServer(
  app: Express,
  options: ServerOptions,
  logger: Logger,
): Promise<http.Server> {
  const server = http.createServer(app);

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(options.port, options.host, () => {
      logger.info("HTTP server listening", {
        port: options.port,
        host: options.host,
      });
      resolve(server);
    });
  });
}
