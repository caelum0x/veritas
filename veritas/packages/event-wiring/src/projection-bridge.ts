// projection-bridge.ts: routes domain StoredEvents to the ProjectionEngine for read-model updates.

import { ok, err, tryAsync, type Result, type Logger, noopLogger } from "@veritas/core";
import type { StoredEvent } from "@veritas/event-sourcing";
import { ProjectionEngine, type Projection, InMemoryProjectionStore } from "@veritas/event-sourcing";
import type { EventBus } from "@veritas/event-sourcing";
import type { Bridge, BridgeOptions } from "./types.js";
import { ProjectionBridgeError } from "./errors.js";

export interface ProjectionBridgeConfig extends BridgeOptions {
  readonly eventBus: EventBus;
  readonly engine?: ProjectionEngine;
  readonly projections?: ReadonlyArray<Projection<unknown>>;
}

/** Bridges domain events from EventBus into a ProjectionEngine, updating read-model state. */
export class ProjectionBridge implements Bridge {
  readonly name = "projection-bridge";

  private readonly eventBus: EventBus;
  private readonly engine: ProjectionEngine;
  private readonly logger: Logger;
  private readonly projections: ReadonlyArray<Projection<unknown>>;
  private unsubscribe: (() => void) | null = null;

  constructor(config: ProjectionBridgeConfig) {
    this.eventBus = config.eventBus;
    this.logger = config.logger ?? noopLogger;
    this.projections = config.projections ?? [];
    this.engine =
      config.engine ??
      new ProjectionEngine({ store: new InMemoryProjectionStore(), logger: this.logger });

    for (const projection of this.projections) {
      this.engine.register(projection);
    }
  }

  async start(): Promise<Result<void, ProjectionBridgeError>> {
    const result = await tryAsync(async () => {
      this.unsubscribe = this.eventBus.subscribeAll(
        async (event: StoredEvent<unknown>) => {
          await this.handleEvent(event);
        },
      );
    });

    if (result.ok) {
      this.logger.info("ProjectionBridge started", { bridge: this.name });
      return ok(undefined);
    }

    const error = new ProjectionBridgeError(this.name, result.error);
    this.logger.error("ProjectionBridge failed to start", {
      bridge: this.name,
      error: error.message,
    });
    return err(error);
  }

  async stop(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.logger.info("ProjectionBridge stopped", { bridge: this.name });
  }

  /** Expose engine for external state queries. */
  getEngine(): ProjectionEngine {
    return this.engine;
  }

  private async handleEvent(event: StoredEvent<unknown>): Promise<void> {
    const result = await tryAsync(() => this.engine.process([event]));
    if (!result.ok) {
      this.logger.error("ProjectionBridge failed to process event", {
        bridge: this.name,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        error: result.error instanceof Error ? result.error.message : String(result.error),
      });
    }
  }
}
