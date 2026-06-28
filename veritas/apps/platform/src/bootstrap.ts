// Bootstrap: build the DI container, wire events, compose HTTP apps, and assemble all components.

import { buildDefaultContainer } from "@veritas/wiring";
import { bootstrap as wireEvents } from "@veritas/event-wiring";
import { buildHttpServer } from "./http.js";
import { buildWorkerSupervisor } from "./workers.js";
import { buildAgentComponent } from "./agent.js";
import type { AppConfig } from "@veritas/config";
import { noopLogger } from "@veritas/observability";
import type { Logger } from "@veritas/observability";
import {
  CAP_PROVIDER,
  LOGGER,
  CONFIG,
} from "@veritas/container";
import type { Container } from "@veritas/container";
import type { HttpServer } from "./http.js";
import type { WorkerSupervisor } from "./workers.js";
import type { AgentComponent } from "./agent.js";
import type { VeritasProvider } from "@veritas/cap/provider.js";

export interface PlatformBootstrapResult {
  readonly container: Container;
  readonly httpServer: HttpServer;
  readonly workerSupervisor: WorkerSupervisor;
  readonly agentComponent: AgentComponent;
  readonly logger: Logger;
  readonly config: AppConfig;
}

/** Build and wire all platform components. Does not start any of them. */
export async function bootstrapPlatform(): Promise<PlatformBootstrapResult> {
  // Build DI container with in-memory / default adapters.
  const container = buildDefaultContainer();

  const config = container.resolve<AppConfig>(CONFIG);
  const logger: Logger = container.has(LOGGER)
    ? container.resolve<Logger>(LOGGER)
    : noopLogger;

  // Wire domain events (projections, outbox, bridges).
  const wiringResult = await wireEvents({ logger });
  if (!wiringResult.ok) {
    throw new Error(`Event wiring failed: ${wiringResult.error.message}`);
  }

  // Compose HTTP server with no sub-apps registered yet (apps added externally).
  const httpServer = buildHttpServer({
    apps: [],
    logger,
    trustProxy: config.server.trustProxy,
    bodyLimitBytes: config.server.bodyLimitBytes,
  });

  // No persistent background workers by default; extend via opts.
  const workerSupervisor = buildWorkerSupervisor({ workers: [], logger });

  // CAP agent — only wire if the provider token is registered.
  const provider = container.tryResolve<VeritasProvider>(CAP_PROVIDER);
  const agentComponent = buildAgentComponent({
    provider: provider ?? makNoopProvider(),
    logger,
  });

  return { container, httpServer, workerSupervisor, agentComponent, logger, config };
}

/** Noop provider used when CAP is not configured. */
function makNoopProvider(): VeritasProvider {
  return {
    state: "idle" as const,
    metrics: { counts: () => ({}) } as unknown as VeritasProvider["metrics"],
    settlements: { list: () => [] } as unknown as VeritasProvider["settlements"],
    async start(): Promise<void> {},
    async stop(): Promise<void> {},
  };
}
