// Start the CAP VeritasProvider agent lifecycle component for the platform process.

import type { Logger } from "@veritas/core";
import type { VeritasProvider } from "@veritas/cap/provider.js";

export interface AgentComponentOptions {
  readonly provider: VeritasProvider;
  readonly logger: Logger;
}

export interface AgentComponent {
  readonly name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
}

/** Wrap the CAP VeritasProvider as a named lifecycle component. */
export function buildAgentComponent(opts: AgentComponentOptions): AgentComponent {
  const { provider, logger } = opts;

  return {
    name: "cap-agent",

    async start(): Promise<void> {
      logger.info("Starting CAP provider agent");
      // start() resolves when the loop exits; we fire-and-forget so bootstrap continues.
      provider.start().catch((err: unknown) => {
        logger.error("CAP provider agent exited with error", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
      logger.info("CAP provider agent started");
    },

    async stop(): Promise<void> {
      logger.info("Stopping CAP provider agent");
      await provider.stop();
      logger.info("CAP provider agent stopped");
    },
  };
}
