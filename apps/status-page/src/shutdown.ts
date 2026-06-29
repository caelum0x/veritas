// Graceful shutdown coordinator for HTTP server and background resources.
import type { Server } from "node:http";
import type { Logger } from "@veritas/observability";

const SHUTDOWN_TIMEOUT_MS = 10_000;

export interface ShutdownOptions {
  readonly server: Server;
  readonly logger: Logger;
  readonly onShutdown?: () => Promise<void>;
}

export function registerShutdownHandlers(opts: ShutdownOptions): void {
  const { server, logger, onShutdown } = opts;

  async function shutdown(signal: string): Promise<void> {
    logger.info("Shutdown initiated", { signal });

    const forceExit = setTimeout(() => {
      logger.error("Graceful shutdown timed out, forcing exit", {
        timeoutMs: SHUTDOWN_TIMEOUT_MS,
      });
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    try {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      if (onShutdown) {
        await onShutdown();
      }

      clearTimeout(forceExit);
      logger.info("Shutdown complete");
      process.exit(0);
    } catch (err) {
      clearTimeout(forceExit);
      logger.error("Error during shutdown", {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    }
  }

  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}
