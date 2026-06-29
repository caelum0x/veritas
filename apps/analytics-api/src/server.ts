// HTTP server factory — creates and configures the Node http.Server from an Express app.
import { createServer, type Server } from "node:http";
import type { Express } from "express";
import type { AnalyticsApiConfig } from "./config.js";

export interface StartedServer {
  readonly server: Server;
  readonly port: number;
  readonly host: string;
}

/** Create the HTTP server and begin listening; resolves when the server is bound. */
export function startServer(app: Express, config: AnalyticsApiConfig): Promise<StartedServer> {
  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.keepAliveTimeout = config.keepAliveMs;
    server.headersTimeout = config.keepAliveMs + 5_000;

    server.once("error", reject);
    server.listen(config.port, config.host, () => {
      server.removeListener("error", reject);
      resolve({ server, port: config.port, host: config.host });
    });
  });
}
