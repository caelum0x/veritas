// Graceful shutdown: registers OS signals and drains in-flight work before exit.

import type { Logger } from "@veritas/core";
import type { VeritasProvider } from "@veritas/cap/provider.js";

/** Maximum milliseconds to wait for a graceful stop before forcing exit. */
const SHUTDOWN_TIMEOUT_MS = 15_000;

/** Signals that trigger a graceful shutdown. */
const SHUTDOWN_SIGNALS = ["SIGTERM", "SIGINT", "SIGUSR2"] as const;

type ShutdownSignal = (typeof SHUTDOWN_SIGNALS)[number];

/** Registered cleanup hooks called before the process exits. */
type CleanupHook = () => Promise<void>;

/** State managed by the shutdown controller. */
interface ShutdownController {
  /** Register an additional async cleanup hook. */
  onShutdown(hook: CleanupHook): void;
  /** Trigger the shutdown sequence manually (e.g. from tests). */
  shutdown(reason: string): Promise<void>;
}

/**
 * Attach signal handlers for graceful shutdown.
 * Returns a controller that allows additional hooks to be registered.
 */
export function attachShutdownHandlers(
  provider: VeritasProvider,
  logger: Logger,
): ShutdownController {
  const hooks: CleanupHook[] = [];
  let shuttingDown = false;

  async function doShutdown(reason: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info("cap-agent: shutdown initiated", { reason });

    const timer = setTimeout(() => {
      logger.error("cap-agent: shutdown timed out, forcing exit", {
        timeoutMs: SHUTDOWN_TIMEOUT_MS,
      });
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    try {
      await provider.stop();
      logger.info("cap-agent: provider stopped");

      for (const hook of hooks) {
        try {
          await hook();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          logger.warn("cap-agent: cleanup hook failed", { error: message });
        }
      }

      clearTimeout(timer);
      logger.info("cap-agent: shutdown complete");
      process.exit(0);
    } catch (err: unknown) {
      clearTimeout(timer);
      const message = err instanceof Error ? err.message : String(err);
      logger.error("cap-agent: error during shutdown", { error: message });
      process.exit(1);
    }
  }

  for (const signal of SHUTDOWN_SIGNALS) {
    process.on(signal as ShutdownSignal, () => {
      void doShutdown(signal);
    });
  }

  process.on("uncaughtException", (err: Error) => {
    logger.error("cap-agent: uncaught exception", { error: err.message, stack: err.stack });
    void doShutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    logger.error("cap-agent: unhandled rejection", { reason: message });
    void doShutdown("unhandledRejection");
  });

  return {
    onShutdown(hook: CleanupHook): void {
      hooks.push(hook);
    },
    shutdown(reason: string): Promise<void> {
      return doShutdown(reason);
    },
  };
}
