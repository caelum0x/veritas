// Graceful shutdown coordinator: drains all registered lifecycle components on SIGTERM/SIGINT.

import type { Logger } from "@veritas/core";
import type { Lifecycle } from "@veritas/composition";

export interface ShutdownOptions {
  readonly components: readonly Lifecycle[];
  readonly logger: Logger;
  readonly timeoutMs?: number;
}

/** Register OS signal handlers and stop all components in reverse registration order. */
export function registerShutdown(opts: ShutdownOptions): void {
  const { components, logger, timeoutMs = 15_000 } = opts;

  async function shutdown(signal: string): Promise<void> {
    logger.info("Received signal, shutting down", { signal });
    const reversed = [...components].reverse();

    const deadline = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error("Shutdown timed out")), timeoutMs),
    );

    const drain = async (): Promise<void> => {
      for (const c of reversed) {
        try {
          await c.stop();
          logger.info("Component stopped", { component: (c as { name?: string }).name ?? "unknown" });
        } catch (err) {
          logger.error("Component stop failed", {
            component: (c as { name?: string }).name ?? "unknown",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    };

    try {
      await Promise.race([drain(), deadline]);
      logger.info("Shutdown complete");
    } catch (err) {
      logger.error("Shutdown error", { error: err instanceof Error ? err.message : String(err) });
    } finally {
      process.exit(0);
    }
  }

  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}
