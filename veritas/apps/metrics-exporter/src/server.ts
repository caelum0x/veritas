// HTTP server that binds to the configured host/port and delegates to the Exporter.

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { Logger } from "@veritas/observability";
import type { ExporterConfig } from "./config.js";
import type { Exporter } from "./exporter.js";

export interface ServerHandle {
  /** Stop accepting new connections and close the server. */
  close(): Promise<void>;
}

/** Return 401 when bearer-token auth is configured and the request header does not match. */
function isAuthorized(req: IncomingMessage, config: ExporterConfig): boolean {
  if (!config.bearerToken) return true;
  const header = req.headers["authorization"] ?? "";
  return header === `Bearer ${config.bearerToken}`;
}

/** Start a Node.js HTTP server that serves the given Exporter. */
export function startServer(
  exporter: Exporter,
  config: ExporterConfig,
  logger: Logger
): Promise<ServerHandle> {
  return new Promise((resolve, reject) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (!isAuthorized(req, config)) {
        res.writeHead(401, { "Content-Type": "text/plain" });
        res.end("Unauthorized");
        logger.warn("Metrics scrape rejected: invalid or missing bearer token");
        return;
      }
      exporter.handleRequest(req, res);
    });

    server.once("error", reject);

    server.listen(config.port, config.host, () => {
      logger.info(
        "metrics-exporter listening",
        { host: config.host, port: String(config.port), path: config.path }
      );

      const handle: ServerHandle = {
        close: () =>
          new Promise<void>((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          }),
      };

      resolve(handle);
    });
  });
}
