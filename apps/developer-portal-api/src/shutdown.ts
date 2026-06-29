// Graceful shutdown — drains in-flight requests then closes the HTTP server.
import type { Server } from "http";
import type { Logger } from "@veritas/observability";

const SHUTDOWN_TIMEOUT_MS = 10_000;

export function registerShutdownHandlers(server: Server, logger: Logger): void {
  function shutdown(signal: string): void {
    logger.info("Shutdown signal received", { signal });

    const forceExit = setTimeout(() => {
      logger.error("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    forceExit.unref();

    server.close((err) => {
      if (err) {
        logger.error("Error during server close", { error: err.message });
        process.exit(1);
      }
      logger.info("HTTP server closed cleanly");
      process.exit(0);
    });
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (err) => {
    logger.fatal("Uncaught exception", { error: err.message, stack: err.stack });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    logger.fatal("Unhandled promise rejection", { reason: message });
    process.exit(1);
  });
}
