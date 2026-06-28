// Graceful shutdown: drains connections and stops all bridges within the timeout.

import type { Server } from "http";
import type { Logger } from "@veritas/observability";

export interface ShutdownOptions {
  readonly server: Server;
  readonly logger: Logger;
  readonly timeoutMs: number;
  readonly onShutdown?: () => Promise<void>;
}

export function registerShutdownHandlers(opts: ShutdownOptions): void {
  const { server, logger, timeoutMs, onShutdown } = opts;

  async function shutdown(signal: string): Promise<void> {
    logger.info(`${signal} received — initiating graceful shutdown`);

    const forceExit = setTimeout(() => {
      logger.error("Shutdown timeout exceeded — forcing exit");
      process.exit(1);
    }, timeoutMs);
    forceExit.unref();

    try {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
      logger.info("HTTP server closed");

      if (onShutdown) {
        await onShutdown();
      }

      clearTimeout(forceExit);
      logger.info("Graceful shutdown complete");
      process.exit(0);
    } catch (err) {
      logger.error("Error during shutdown", {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    }
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}
