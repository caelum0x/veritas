// Start and stop ordered lifecycle components, propagating errors clearly.

import type { Lifecycle } from "./types.js";
import type { Logger } from "@veritas/observability";
import { LifecycleStartError } from "./errors.js";

/** Starts components in order; on failure, stops already-started ones and throws. */
export async function startAll(
  components: readonly (Lifecycle & { name?: string })[],
  logger: Logger,
): Promise<void> {
  const started: (Lifecycle & { name?: string })[] = [];

  for (const component of components) {
    const label = component.name ?? "anonymous";
    try {
      logger.info("Starting lifecycle component", { component: label });
      await component.start();
      started.push(component);
      logger.info("Lifecycle component started", { component: label });
    } catch (cause: unknown) {
      const err = new LifecycleStartError(label, cause);
      logger.error("Lifecycle component failed to start, rolling back", {
        component: label,
        error: err.message,
      });
      await stopAll(started.reverse(), logger);
      throw err;
    }
  }
}

/** Stops components in the given order, collecting all errors before throwing. */
export async function stopAll(
  components: readonly (Lifecycle & { name?: string })[],
  logger: Logger,
): Promise<void> {
  const errors: unknown[] = [];

  for (const component of components) {
    const label = component.name ?? "anonymous";
    try {
      logger.info("Stopping lifecycle component", { component: label });
      await component.stop();
      logger.info("Lifecycle component stopped", { component: label });
    } catch (cause: unknown) {
      errors.push(cause);
      logger.error("Lifecycle component failed to stop", {
        component: label,
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(
      errors,
      `${errors.length} lifecycle component(s) failed to stop`,
    );
  }
}

/**
 * Wraps an array of lifecycle components into a single {@link Lifecycle}
 * that starts them in order and stops them in reverse order.
 */
export function composeLifecycle(
  components: readonly (Lifecycle & { name?: string })[],
  logger: Logger,
): Lifecycle {
  let running: (Lifecycle & { name?: string })[] = [];

  return {
    async start(): Promise<void> {
      await startAll(components, logger);
      running = [...components];
    },
    async stop(): Promise<void> {
      await stopAll([...running].reverse(), logger);
      running = [];
    },
  };
}
