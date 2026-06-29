// shutdown.ts: graceful shutdown logic with a configurable drain timeout.
import type { Server } from "node:http";
import type { Logger } from "@veritas/observability";

const DEFAULT_DRAIN_MS = 10_000;

/** Register SIGTERM/SIGINT handlers that close the server gracefully. */
export function registerShutdownHandlers(
  server: Server,
  logger: Logger,
  drainMs = DEFAULT_DRAIN_MS,
): void {
  function shutdown(signal: string): void {
    logger.info("Received shutdown signal", { signal });

    const forceTimer = setTimeout(() => {
      logger.error("Graceful shutdown timed out — forcing exit");
      process.exit(1);
    }, drainMs);
    forceTimer.unref();

    server.close((err?: Error) => {
      if (err) {
        logger.error("Error during server close", { error: err.message });
        process.exit(1);
      }
      logger.info("Server closed cleanly");
      process.exit(0);
    });
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (err: Error) => {
    logger.error("Uncaught exception", { error: err.message, stack: err.stack });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason: unknown) => {
    logger.error("Unhandled promise rejection", {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
    process.exit(1);
  });
}
