// Creates and starts the HTTP server, returning the net.Server instance.

import http from "http";
import type { Application } from "express";
import type { Logger } from "@veritas/observability";

export interface ServerOptions {
  readonly app: Application;
  readonly port: number;
  readonly host: string;
  readonly logger: Logger;
}

export function createServer(opts: ServerOptions): http.Server {
  const server = http.createServer(opts.app);

  server.listen(opts.port, opts.host, () => {
    opts.logger.info("HTTP server listening", {
      host: opts.host,
      port: opts.port,
    });
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    opts.logger.error("HTTP server error", { error: err.message, code: err.code });
    process.exit(1);
  });

  return server;
}
