// Creates and starts the HTTP server, resolving to the bound port.
import { createServer, type Server } from "node:http";
import type { Express } from "express";
import type { Logger } from "@veritas/observability";

export interface ServerHandle {
  readonly port: number;
  readonly server: Server;
  readonly stop: () => Promise<void>;
}

export function startServer(
  app: Express,
  host: string,
  port: number,
  logger: Logger,
): Promise<ServerHandle> {
  return new Promise<ServerHandle>((resolve, reject) => {
    const server = createServer(app);

    server.once("error", reject);

    server.listen(port, host, () => {
      const addr = server.address();
      const boundPort =
        addr !== null && typeof addr === "object" ? addr.port : port;

      logger.info("HTTP server listening", { host, port: boundPort });

      const stop = (): Promise<void> =>
        new Promise<void>((res, rej) =>
          server.close((err) => (err ? rej(err) : res())),
        );

      resolve({ port: boundPort, server, stop });
    });
  });
}
