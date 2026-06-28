// Graceful shutdown: drains in-flight requests and exits cleanly on SIGTERM/SIGINT.
import type http from "node:http";
import type { Logger } from "@veritas/observability";

const DRAIN_TIMEOUT_MS = 10_000;

export function registerShutdownHandlers(
  server: http.Server,
  logger: Logger,
): void {
  const shutdown = (signal: string): void => {
    logger.info("shutdown.signal", { signal });

    server.close((err?: Error) => {
      if (err) {
        logger.error("shutdown.error", { message: err.message });
        process.exit(1);
      }
      logger.info("shutdown.complete");
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("shutdown.forced", { timeoutMs: DRAIN_TIMEOUT_MS });
      process.exit(1);
    }, DRAIN_TIMEOUT_MS).unref();
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT",  () => shutdown("SIGINT"));
}
