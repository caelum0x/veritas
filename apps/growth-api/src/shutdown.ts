// Graceful shutdown: drains in-flight requests and exits cleanly.
import type { Server } from "node:http";
import type { Logger } from "@veritas/observability";

export interface ShutdownOptions {
  readonly server: Server;
  readonly logger: Logger;
  readonly timeoutMs: number;
}

export function registerShutdownHandlers(opts: ShutdownOptions): void {
  const { server, logger, timeoutMs } = opts;

  function shutdown(signal: string): void {
    logger.info("Received shutdown signal", { signal });

    const timer = setTimeout(() => {
      logger.error("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, timeoutMs);

    timer.unref();

    server.close((err) => {
      if (err !== undefined) {
        logger.error("Error closing server", { error: String(err) });
        process.exit(1);
      }
      logger.info("Server closed, exiting");
      process.exit(0);
    });
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (err) => {
    logger.fatal("Uncaught exception", { error: String(err), stack: err.stack });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.fatal("Unhandled promise rejection", { reason: String(reason) });
    process.exit(1);
  });
}
