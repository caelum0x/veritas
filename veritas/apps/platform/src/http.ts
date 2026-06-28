// Compose all HTTP sub-apps into a single Express server for the platform process.

import express from "express";
import type { Express } from "express";
import { composeServer } from "@veritas/composition";
import type { MountableApp } from "@veritas/composition";
import type { Logger } from "@veritas/observability";

export interface HttpServerOptions {
  readonly apps: readonly MountableApp[];
  readonly logger: Logger;
  readonly trustProxy?: boolean;
  readonly bodyLimitBytes?: number;
}

export interface HttpServer {
  readonly app: Express;
  readonly mountedPaths: readonly string[];
  listen(port: number, host: string): Promise<void>;
  close(): Promise<void>;
  /** Lifecycle.start — no-op if listen() was already called externally. */
  start(): Promise<void>;
  /** Lifecycle.stop — delegates to close(). */
  stop(): Promise<void>;
}

/** Build the composed Express server and return a controllable HttpServer handle. */
export function buildHttpServer(opts: HttpServerOptions): HttpServer {
  const { app, mountedPaths } = composeServer({
    apps: opts.apps,
    logger: opts.logger,
    trustProxy: opts.trustProxy ?? false,
    bodyLimitBytes: opts.bodyLimitBytes ?? 1_048_576,
  });

  let server: ReturnType<Express["listen"]> | null = null;

  return {
    app,
    mountedPaths,

    listen(port: number, host: string): Promise<void> {
      return new Promise((resolve, reject) => {
        server = app.listen(port, host, () => {
          opts.logger.info("HTTP server listening", { port, host, mountedPaths });
          resolve();
        });
        server.once("error", reject);
      });
    },

    close(): Promise<void> {
      return new Promise((resolve, reject) => {
        if (!server) {
          resolve();
          return;
        }
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },

    start(): Promise<void> {
      // No-op: callers invoke listen() directly with port/host.
      return Promise.resolve();
    },

    stop(): Promise<void> {
      return new Promise((resolve, reject) => {
        if (!server) {
          resolve();
          return;
        }
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  };
}
