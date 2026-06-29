// Creates and starts the HTTP server, returning the bound server instance.

import { createServer, type Server } from "node:http";
import type { Express } from "express";
import type { Logger } from "@veritas/observability";

export interface StartServerOptions {
  readonly port: number;
  readonly host: string;
  readonly logger: Logger;
}

export function startServer(app: Express, opts: StartServerOptions): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer(app);

    server.on("error", (err) => {
      opts.logger.fatal("server.error", { error: String(err) });
      reject(err);
    });

    server.listen(opts.port, opts.host, () => {
      opts.logger.info("server.listening", {
        host: opts.host,
        port: opts.port,
        url: `http://${opts.host}:${opts.port}`,
      });
      resolve(server);
    });
  });
}
