// Graceful shutdown handler — closes the HTTP server and flushes in-flight work.

import type { Server } from "node:http";
import type { Logger } from "@veritas/observability";

const SHUTDOWN_TIMEOUT_MS = 10_000;

/** Register SIGTERM/SIGINT handlers for graceful shutdown. */
export function registerShutdownHandlers(server: Server, logger: Logger): void {
  let shutdownInitiated = false;

  const shutdown = (signal: string): void => {
    if (shutdownInitiated) return;
    shutdownInitiated = true;

    logger.info("shutdown: signal received", { signal });

    const timeout = setTimeout(() => {
      logger.error("shutdown: timed out, forcing exit");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    timeout.unref();

    server.close((err) => {
      if (err) {
        logger.error("shutdown: server close error", { err: err.message });
        process.exit(1);
      }
      logger.info("shutdown: server closed cleanly");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (err) => {
    logger.fatal("uncaught exception", { err: err.message, stack: err.stack });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.fatal("unhandled rejection", {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
    process.exit(1);
  });
}
