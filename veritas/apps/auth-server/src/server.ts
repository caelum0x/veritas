// HTTP server factory: wraps an Express app in a Node http.Server with configured timeouts.

import http from "node:http";
import type { Express } from "express";
import type { AppConfig } from "./config.js";

export interface StartedServer {
  readonly server: http.Server;
  readonly port: number;
  readonly host: string;
}

/** Create and start the HTTP server, resolving once the port is bound. */
export async function startServer(app: Express, config: AppConfig): Promise<StartedServer> {
  const server = http.createServer(app);

  server.keepAliveTimeout = config.keepAliveTimeoutMs;
  // headersTimeout should exceed keepAliveTimeout
  server.headersTimeout = config.keepAliveTimeoutMs + 1000;

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.host, () => {
      server.removeListener("error", reject);
      resolve();
    });
  });

  return { server, port: config.port, host: config.host };
}
