// HTTP server factory: binds the Express app to a port and returns the Node.js Server.
import { createServer, type Server } from "http";
import type { Express } from "express";
import type { Logger } from "@veritas/observability";

export interface ServerOptions {
  readonly host: string;
  readonly port: number;
}

export function startServer(
  app: Express,
  opts: ServerOptions,
  logger: Logger,
): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer(app);

    server.once("error", (err) => {
      logger.fatal("Failed to start HTTP server", { err: (err as Error).message });
      reject(err);
    });

    server.listen(opts.port, opts.host, () => {
      logger.info("HTTP server listening", { host: opts.host, port: opts.port });
      resolve(server);
    });
  });
}
