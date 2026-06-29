// Graceful shutdown handler that drains in-flight requests before exiting.

import type { Server } from "node:http";
import type { Logger } from "@veritas/observability";

export interface ShutdownOptions {
  readonly timeoutMs: number;
  readonly logger: Logger;
}

export function registerShutdownHandlers(server: Server, opts: ShutdownOptions): void {
  let isShuttingDown = false;

  async function gracefulShutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    opts.logger.info("shutdown.initiated", { signal, timeoutMs: opts.timeoutMs });

    const timeoutHandle = setTimeout(() => {
      opts.logger.error("shutdown.timeout", { timeoutMs: opts.timeoutMs });
      process.exit(1);
    }, opts.timeoutMs);

    timeoutHandle.unref();

    await new Promise<void>((resolve) => {
      server.close((err) => {
        if (err) {
          opts.logger.error("shutdown.server_close_error", { error: String(err) });
        }
        resolve();
      });
    });

    clearTimeout(timeoutHandle);
    opts.logger.info("shutdown.complete");
    process.exit(0);
  }

  process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => void gracefulShutdown("SIGINT"));

  process.on("uncaughtException", (err) => {
    opts.logger.fatal("uncaught_exception", { error: String(err), stack: err.stack });
    void gracefulShutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason) => {
    opts.logger.fatal("unhandled_rejection", { reason: String(reason) });
    void gracefulShutdown("unhandledRejection");
  });
}
