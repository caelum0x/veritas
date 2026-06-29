// Graceful shutdown: waits for in-flight requests then closes the HTTP server.

import type { Server } from "http";
import type { Logger } from "@veritas/observability";

export function registerShutdownHandlers(
  server: Server,
  logger: Logger,
  timeoutMs: number,
): void {
  const shutdown = (signal: string) => {
    logger.info("Shutdown signal received", { signal });

    const forceTimer = setTimeout(() => {
      logger.error("Graceful shutdown timed out — forcing exit");
      process.exit(1);
    }, timeoutMs);

    forceTimer.unref();

    server.close((err) => {
      if (err) {
        logger.error("Error closing HTTP server", { error: String(err) });
        process.exit(1);
      }
      logger.info("HTTP server closed");
      process.exit(0);
    });
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason: unknown) => {
    logger.error("Unhandled promise rejection", { reason: String(reason) });
    process.exit(1);
  });

  process.on("uncaughtException", (err: unknown) => {
    logger.fatal("Uncaught exception", { error: String(err) });
    process.exit(1);
  });
}
