// EventBus for publishing committed StoredEvents to subscribers after persistence.
import type { Logger } from "@veritas/core";
import { noopLogger } from "@veritas/core";
import type { StoredEvent } from "./domain-event.js";

export type EventHandler<TPayload = unknown> = (
  event: StoredEvent<TPayload>
) => Promise<void>;

export type Unsubscribe = () => void;

export interface EventBus {
  publish(events: ReadonlyArray<StoredEvent<unknown>>): Promise<void>;
  subscribe<TPayload = unknown>(
    eventType: string,
    handler: EventHandler<TPayload>
  ): Unsubscribe;
  subscribeAll(handler: EventHandler<unknown>): Unsubscribe;
}

export interface EventBusOptions {
  readonly logger?: Logger;
  readonly continueOnError?: boolean;
}

export class InProcessEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<EventHandler<unknown>>>();
  private readonly wildcardHandlers = new Set<EventHandler<unknown>>();
  private readonly logger: Logger;
  private readonly continueOnError: boolean;

  constructor(options: EventBusOptions = {}) {
    this.logger = options.logger ?? noopLogger;
    this.continueOnError = options.continueOnError ?? false;
  }

  subscribe<TPayload = unknown>(
    eventType: string,
    handler: EventHandler<TPayload>
  ): Unsubscribe {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    const set = this.handlers.get(eventType)!;
    set.add(handler as EventHandler<unknown>);
    return () => {
      set.delete(handler as EventHandler<unknown>);
    };
  }

  subscribeAll(handler: EventHandler<unknown>): Unsubscribe {
    this.wildcardHandlers.add(handler);
    return () => {
      this.wildcardHandlers.delete(handler);
    };
  }

  async publish(events: ReadonlyArray<StoredEvent<unknown>>): Promise<void> {
    for (const event of events) {
      await this.dispatch(event);
    }
  }

  private async dispatch(event: StoredEvent<unknown>): Promise<void> {
    const typed = this.handlers.get(event.eventType) ?? new Set();
    const all = [...typed, ...this.wildcardHandlers];

    for (const handler of all) {
      try {
        await handler(event);
      } catch (err) {
        this.logger.error("Event handler failed", {
          eventType: event.eventType,
          aggregateId: event.aggregateId,
          error: err,
        });
        if (!this.continueOnError) {
          throw err;
        }
      }
    }
  }
}
