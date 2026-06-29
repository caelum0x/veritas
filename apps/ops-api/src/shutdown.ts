// Graceful shutdown handler: drains open connections then exits cleanly.
import type { Server } from "http";
import type { Logger } from "@veritas/observability";

/** Register SIGTERM / SIGINT handlers for graceful HTTP server shutdown. */
export function registerShutdownHandlers(
  server: Server,
  logger: Logger,
  timeoutMs: number,
): void {
  const shutdown = (signal: string): void => {
    logger.info(`Received ${signal} — shutting down`, { signal, timeoutMs });

    const forceExit = setTimeout(() => {
      logger.error("Graceful shutdown timed out — forcing exit");
      process.exit(1);
    }, timeoutMs);

    forceExit.unref();

    server.close((err?: Error) => {
      if (err) {
        logger.error("Error during server close", { err: err.message });
        process.exit(1);
      }
      logger.info("Server closed cleanly");
      process.exit(0);
    });
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (err) => {
    logger.fatal("Uncaught exception", { err: err.message, stack: err.stack });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.fatal("Unhandled rejection", { reason: String(reason) });
    process.exit(1);
  });
}
