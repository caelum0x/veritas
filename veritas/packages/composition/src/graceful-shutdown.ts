// Coordinates graceful shutdown of all composed components with a timeout guard.

import type { Lifecycle, GracefulShutdownOptions } from "./types.js";
import type { Logger } from "@veritas/observability";
import { ShutdownTimeoutError } from "./errors.js";

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Stops every component in reverse order, racing against a configurable timeout.
 * Throws {@link ShutdownTimeoutError} if the timeout is exceeded.
 */
export async function gracefulShutdown(
  options: GracefulShutdownOptions,
): Promise<void> {
  const { components, logger, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const reversed = [...components].reverse();

  logger.info("Graceful shutdown initiated", {
    componentCount: reversed.length,
    timeoutMs,
  });

  const shutdownAll = async (): Promise<void> => {
    const errors: unknown[] = [];

    for (const component of reversed) {
      const label = (component as { name?: string }).name ?? "anonymous";
      try {
        logger.info("Shutting down component", { component: label });
        await component.stop();
        logger.info("Component shut down", { component: label });
      } catch (cause: unknown) {
        errors.push(cause);
        logger.error("Component shutdown error", {
          component: label,
          error: cause instanceof Error ? cause.message : String(cause),
        });
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        `${errors.length} component(s) failed during graceful shutdown`,
      );
    }
  };

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new ShutdownTimeoutError(timeoutMs)),
      timeoutMs,
    ),
  );

  await Promise.race([shutdownAll(), timeout]);

  logger.info("Graceful shutdown complete");
}

/**
 * Registers OS signals (SIGTERM, SIGINT) to trigger graceful shutdown.
 * Returns a cleanup function that de-registers the handlers.
 */
export function registerShutdownHandlers(
  components: readonly Lifecycle[],
  logger: Logger,
  options?: Partial<Pick<GracefulShutdownOptions, "timeoutMs">>,
): () => void {
  let shuttingDown = false;

  const handler = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info("Received shutdown signal", { signal });

    try {
      await gracefulShutdown({
        components,
        logger,
        timeoutMs: options?.timeoutMs,
      });
      process.exit(0);
    } catch (err: unknown) {
      logger.error("Graceful shutdown failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    }
  };

  const sigtermHandler = (): void => { void handler("SIGTERM"); };
  const sigintHandler = (): void => { void handler("SIGINT"); };

  process.on("SIGTERM", sigtermHandler);
  process.on("SIGINT", sigintHandler);

  return (): void => {
    process.off("SIGTERM", sigtermHandler);
    process.off("SIGINT", sigintHandler);
  };
}
