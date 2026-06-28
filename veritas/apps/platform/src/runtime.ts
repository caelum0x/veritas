// Runtime supervisor: tracks started components and surfaces aggregate lifecycle state.

import type { Logger } from "@veritas/core";
import type { Lifecycle } from "@veritas/composition";

export interface RuntimeComponent {
  readonly name: string;
  readonly lifecycle: Lifecycle;
}

export interface RuntimeSupervisor extends Lifecycle {
  readonly components: readonly RuntimeComponent[];
  readonly isRunning: boolean;
}

/** Build a supervisor that starts/stops a set of named lifecycle components in order. */
export function createRuntimeSupervisor(
  components: readonly RuntimeComponent[],
  logger: Logger,
): RuntimeSupervisor {
  let running = false;

  return {
    get components() {
      return components;
    },
    get isRunning() {
      return running;
    },

    async start(): Promise<void> {
      logger.info("Starting runtime supervisor", { count: components.length });
      for (const { name, lifecycle } of components) {
        logger.info("Starting component", { name });
        await lifecycle.start();
        logger.info("Component started", { name });
      }
      running = true;
      logger.info("All components started");
    },

    async stop(): Promise<void> {
      logger.info("Stopping runtime supervisor");
      const reversed = [...components].reverse();
      for (const { name, lifecycle } of reversed) {
        try {
          logger.info("Stopping component", { name });
          await lifecycle.stop();
          logger.info("Component stopped", { name });
        } catch (err) {
          logger.error("Failed to stop component", {
            name,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      running = false;
      logger.info("Runtime supervisor stopped");
    },
  };
}
