// Graceful shutdown logic — drains in-flight requests before process exit.
import type { Server } from "node:http";
import type { Logger } from "@veritas/observability";

export interface ShutdownOptions {
  readonly server: Server;
  readonly logger: Logger;
  readonly timeoutMs: number;
}

/** Register SIGTERM/SIGINT handlers that close the HTTP server gracefully. */
export function registerShutdownHandlers({ server, logger, timeoutMs }: ShutdownOptions): void {
  const shutdown = (signal: string): void => {
    logger.info("analytics-api shutting down", { signal });

    const forceExit = setTimeout(() => {
      logger.error("shutdown timeout exceeded; forcing exit");
      process.exit(1);
    }, timeoutMs);
    forceExit.unref();

    server.close((err) => {
      if (err) {
        logger.error("error during server close", { error: err.message });
        process.exit(1);
      }
      logger.info("analytics-api stopped gracefully");
      process.exit(0);
    });
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}
