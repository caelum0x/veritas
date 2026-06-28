// bootstrap.ts: wires all bridges together into a single start/stop lifecycle.

import { ok, err, type Result, type Logger, noopLogger } from "@veritas/core";
import type { EventBus as EsBus } from "@veritas/event-sourcing";
import { InProcessEventBus, InMemoryProjectionStore, ProjectionEngine } from "@veritas/event-sourcing";
import type { Projection } from "@veritas/event-sourcing";
import { OutboxBridge, type OutboxBridgeOptions } from "./outbox-bridge.js";
import { ProjectionBridge } from "./projection-bridge.js";
import { WiringRegistry } from "./registry.js";
import { WiringError, BridgeStartError } from "./errors.js";
import type { Bridge } from "./types.js";

export interface BootstrapOptions {
  /** Pre-built event bus; defaults to a new InProcessEventBus. */
  readonly eventBus?: EsBus;
  /** Optional outbox bridge configuration; omit to skip outbox wiring. */
  readonly outbox?: OutboxBridgeOptions;
  /** Projections to register with the projection bridge. */
  readonly projections?: ReadonlyArray<Projection<unknown>>;
  /** Additional custom bridges to register alongside built-in ones. */
  readonly extraBridges?: ReadonlyArray<Bridge>;
  readonly logger?: Logger;
}

export interface BootstrapResult {
  readonly registry: WiringRegistry;
  readonly eventBus: EsBus;
  readonly projectionEngine: ProjectionEngine;
  readonly outboxBridge: OutboxBridge | null;
}

/**
 * Wire all bridges (outbox, projection, extra) into a registry and start them.
 * Returns the registry and key references so callers can query state or shut down.
 */
export async function bootstrap(
  options: BootstrapOptions = {},
): Promise<Result<BootstrapResult, WiringError>> {
  const logger = options.logger ?? noopLogger;
  const eventBus = options.eventBus ?? new InProcessEventBus({ logger });

  const store = new InMemoryProjectionStore();
  const projectionEngine = new ProjectionEngine({ store, logger });
  const registry = new WiringRegistry(logger);

  // Register projection bridge
  const projectionBridge = new ProjectionBridge({
    eventBus,
    engine: projectionEngine,
    projections: options.projections ?? [],
    logger,
  });
  registry.register(projectionBridge);

  // Conditionally register outbox bridge
  let outboxBridge: OutboxBridge | null = null;
  if (options.outbox !== undefined) {
    outboxBridge = new OutboxBridge({ ...options.outbox, logger });

    const outboxAsAdapter: Bridge = {
      name: "outbox-bridge",
      start: async () => {
        try {
          outboxBridge!.start();
          return ok(undefined);
        } catch (cause) {
          return err(new BridgeStartError("outbox-bridge", cause));
        }
      },
      stop: async () => {
        outboxBridge!.stop();
      },
    };
    registry.register(outboxAsAdapter);
  }

  // Register any extra bridges
  for (const bridge of options.extraBridges ?? []) {
    registry.register(bridge);
  }

  logger.info("Starting event-wiring registry", { bridges: registry.snapshot().bridges });
  const startResult = await registry.startAll();

  if (!startResult.ok) {
    await registry.stopAll().catch(() => undefined);
    return err(startResult.error);
  }

  return ok({ registry, eventBus, projectionEngine, outboxBridge });
}
