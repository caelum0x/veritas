// Creates and starts the HTTP server from the configured Express application.
import { createServer, type Server } from "node:http";
import type { Express } from "express";
import type { Logger } from "@veritas/observability";

export interface StartServerOptions {
  readonly app: Express;
  readonly port: number;
  readonly host: string;
  readonly logger: Logger;
}

export function startServer(opts: StartServerOptions): Promise<Server> {
  const { app, port, host, logger } = opts;

  return new Promise((resolve, reject) => {
    const server = createServer(app);

    server.once("error", reject);

    server.listen(port, host, () => {
      server.removeListener("error", reject);
      logger.info("growth-api listening", { port, host });
      resolve(server);
    });
  });
}
