// Graceful shutdown: closes HTTP server with a timeout, then exits the process.
import type { Server } from "node:http";
import type { Logger } from "@veritas/observability";

export interface ShutdownOptions {
  readonly server: Server;
  readonly logger: Logger;
  readonly timeoutMs: number;
}

export function createShutdownHandler(opts: ShutdownOptions): () => Promise<void> {
  const { server, logger, timeoutMs } = opts;

  return (): Promise<void> =>
    new Promise<void>((resolve) => {
      logger.info("Graceful shutdown initiated");

      const timer = setTimeout(() => {
        logger.warn("Shutdown timeout reached, forcing exit");
        resolve();
      }, timeoutMs);

      server.close((err) => {
        clearTimeout(timer);
        if (err) {
          logger.error("Server close error", { error: String(err) });
        } else {
          logger.info("Server closed cleanly");
        }
        resolve();
      });
    });
}

export function registerSignalHandlers(
  shutdown: () => Promise<void>,
  logger: Logger,
): void {
  const handle = (signal: string) => (): void => {
    logger.info(`Received ${signal}`);
    shutdown()
      .then(() => process.exit(0))
      .catch((err: unknown) => {
        logger.error("Shutdown error", { error: String(err) });
        process.exit(1);
      });
  };

  process.on("SIGTERM", handle("SIGTERM"));
  process.on("SIGINT", handle("SIGINT"));
}
