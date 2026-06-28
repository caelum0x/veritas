// Graceful shutdown: closes the HTTP server and flushes in-flight work.
import type { Server } from "node:http";
import type { Logger } from "@veritas/core";

const SHUTDOWN_TIMEOUT_MS = 10_000;

/** Register SIGTERM and SIGINT handlers that drain the server gracefully. */
export function registerShutdownHandlers(server: Server, logger: Logger): void {
  const shutdown = (signal: string): void => {
    logger.info("Received shutdown signal", { signal });

    const forceTimer = setTimeout(() => {
      logger.error("Graceful shutdown timed out; forcing exit");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    server.close((err) => {
      clearTimeout(forceTimer);
      if (err) {
        logger.error("Error during server close", { error: String(err) });
        process.exit(1);
      }
      logger.info("Server closed cleanly");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { error: String(err), stack: err.stack });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", { reason: String(reason) });
    process.exit(1);
  });
}
