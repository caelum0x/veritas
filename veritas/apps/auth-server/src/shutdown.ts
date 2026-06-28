// Graceful shutdown handler: drains in-flight requests and terminates the process.

import type { Server } from "node:http";
import type { Logger } from "@veritas/observability";

const DRAIN_TIMEOUT_MS = 10_000;

/** Register SIGTERM and SIGINT handlers that close the HTTP server cleanly. */
export function registerShutdownHooks(server: Server, logger: Logger): void {
  const shutdown = (signal: string): void => {
    logger.info("Received shutdown signal", { signal });

    const drainTimer = setTimeout(() => {
      logger.warn("Graceful shutdown timed out — forcing exit");
      process.exit(1);
    }, DRAIN_TIMEOUT_MS);

    // Allow the timer to be garbage-collected without blocking the event loop.
    if (typeof drainTimer.unref === "function") drainTimer.unref();

    server.close((err) => {
      if (err) {
        logger.error("Error during server close", { err: err.message });
        process.exit(1);
      }
      logger.info("HTTP server closed — exiting");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
