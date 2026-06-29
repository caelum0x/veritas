// Creates and starts the HTTP server, returning the server instance.
import { createServer, type Server } from "node:http";
import type { Express } from "express";
import type { Logger } from "@veritas/observability";

export interface StartServerOptions {
  readonly app: Express;
  readonly port: number;
  readonly host: string;
  readonly logger: Logger;
}

export async function startServer(opts: StartServerOptions): Promise<Server> {
  const { app, port, host, logger } = opts;

  const server = createServer(app);

  return new Promise<Server>((resolve, reject) => {
    server.once("error", reject);

    server.listen(port, host, () => {
      server.removeListener("error", reject);
      logger.info("HTTP server started", { port, host });
      resolve(server);
    });
  });
}
