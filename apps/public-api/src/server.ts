// server.ts: creates and starts the HTTP server, returns the bound server instance.
import http from "node:http";
import type { Express } from "express";
import type { Logger } from "@veritas/observability";

export interface ServerOptions {
  readonly port: number;
  readonly host?: string;
  readonly keepAliveMs?: number;
}

/** Start an HTTP server for the given Express app and return the server instance. */
export async function startServer(
  app: Express,
  opts: ServerOptions,
  logger: Logger,
): Promise<http.Server> {
  const server = http.createServer(app);

  if (opts.keepAliveMs !== undefined) {
    server.keepAliveTimeout = opts.keepAliveMs;
    // headersTimeout must exceed keepAliveTimeout to avoid race conditions
    server.headersTimeout = opts.keepAliveMs + 1_000;
  }

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(opts.port, opts.host ?? "0.0.0.0", () => {
      resolve();
    });
  });

  const addr = server.address();
  const boundPort = typeof addr === "object" && addr !== null ? addr.port : opts.port;
  logger.info("public-api server started", {
    port: boundPort,
    host: opts.host ?? "0.0.0.0",
  });

  return server;
}
