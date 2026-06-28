// ProjectionEngine: applies stored events to registered projections and persists state.
import type { Logger } from "@veritas/core";
import { noopLogger } from "@veritas/core";
import type { StoredEvent } from "./domain-event.js";
import type { Projection, ProjectionStore } from "./projection.js";

export interface ProjectionEngineOptions {
  readonly store: ProjectionStore;
  readonly logger?: Logger;
}

export class ProjectionEngine {
  private readonly projections = new Map<string, Projection<unknown>>();
  private readonly store: ProjectionStore;
  private readonly logger: Logger;

  constructor(options: ProjectionEngineOptions) {
    this.store = options.store;
    this.logger = options.logger ?? noopLogger;
  }

  register<TState>(projection: Projection<TState>): void {
    this.projections.set(projection.name, projection as Projection<unknown>);
  }

  async process(events: ReadonlyArray<StoredEvent<unknown>>): Promise<void> {
    for (const event of events) {
      await this.processEvent(event);
    }
  }

  async getState<TState>(
    projectionName: string,
    aggregateId: string
  ): Promise<TState | null> {
    return this.store.loadState<TState>(projectionName, aggregateId);
  }

  private async processEvent(event: StoredEvent<unknown>): Promise<void> {
    for (const [name, projection] of this.projections) {
      if (
        projection.aggregateType !== event.aggregateType ||
        !projection.canHandle(event.eventType)
      ) {
        continue;
      }

      try {
        const position = await this.store.loadPosition(name, event.aggregateId);

        if (event.version <= position.lastProcessedVersion) {
          continue;
        }

        const existing = await this.store.loadState<unknown>(name, event.aggregateId);
        const currentState = existing ?? projection.initialState();
        const nextState = projection.apply(currentState, event);

        await this.store.saveState(name, event.aggregateId, nextState, {
          lastProcessedVersion: event.version,
          lastProcessedEventId: event.id,
        });
      } catch (err) {
        this.logger.error("Projection apply failed", {
          projection: name,
          eventType: event.eventType,
          aggregateId: event.aggregateId,
          error: err,
        });
        throw err;
      }
    }
  }
}
