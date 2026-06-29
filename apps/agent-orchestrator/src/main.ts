// main: agent-orchestrator entrypoint — wires dependencies and starts the supervisor.

import { noopLogger } from "@veritas/core";
import { loadOrchestratorConfigFromEnv, DEFAULT_ORCHESTRATOR_CONFIG } from "./config.js";
import { createAgentRegistry } from "./registry.js";
import { CAPAgentClient, NoopHttpTransport } from "./cap-agent-client.js";
import { createOrchestrator } from "./orchestrator.js";
import { runRuntime } from "./runtime.js";
import type { OrchestratorHandle, OrchestratorHealthSnapshot } from "./runtime.js";

/** Bootstrap an OrchestratorHandle that the supervisor can manage. */
function buildHandle(logger: typeof noopLogger): OrchestratorHandle {
  const config = (() => {
    try {
      return loadOrchestratorConfigFromEnv();
    } catch {
      logger.warn("main: failed to load env config, using defaults");
      return DEFAULT_ORCHESTRATOR_CONFIG;
    }
  })();

  const registry = createAgentRegistry();
  const client = new CAPAgentClient(new NoopHttpTransport(), logger);
  const orchestrator = createOrchestrator(registry, client, config, logger);

  let running = false;
  let startedAt = 0;
  let completedTasks = 0;
  let failedTasks = 0;

  return {
    async start(): Promise<void> {
      running = true;
      startedAt = Date.now();
      logger.info("orchestrator: started");
      // Block until stop() is called via an idle keep-alive.
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (!running) {
            clearInterval(check);
            resolve();
          }
        }, 500);
      });
    },

    async stop(): Promise<void> {
      running = false;
      logger.info("orchestrator: stopped");
    },

    healthSnapshot(): OrchestratorHealthSnapshot {
      return {
        activePipelines: 0,
        queuedTasks: 0,
        completedTasks,
        failedTasks,
        uptimeMs: running ? Date.now() - startedAt : 0,
      };
    },
  };
}

/** Entry-point: create logger, build handle, and run the supervisor. */
async function main(): Promise<void> {
  // Use noopLogger as a baseline; production deployments inject pino via DI.
  const logger = noopLogger;

  logger.info("main: agent-orchestrator starting");

  const handle = buildHandle(logger);

  await runRuntime(handle, DEFAULT_ORCHESTRATOR_CONFIG, logger);

  logger.info("main: agent-orchestrator exited");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[agent-orchestrator] fatal: ${message}\n`);
  process.exit(1);
});
