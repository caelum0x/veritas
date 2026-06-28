// EventBus port plus an in-memory implementation for publish/subscribe.

import type { DomainEvent } from "./domain-event.js";

/** An async handler invoked for each published event. */
export type EventHandler<E extends DomainEvent = DomainEvent> = (
  event: E,
) => void | Promise<void>;

/** Unsubscribe function returned by `subscribe`. */
export type Unsubscribe = () => void;

/** Publish/subscribe port for domain events. */
export interface EventBus {
  /** Publish an event to all matching subscribers. */
  publish(event: DomainEvent): Promise<void>;
  /** Subscribe to a specific event type (or "*" for all). */
  subscribe(type: string, handler: EventHandler): Unsubscribe;
}

/**
 * A simple in-process EventBus. Handlers for a matching type and wildcard
 * ("*") subscribers are invoked; errors in one handler do not block others.
 */
export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();

  subscribe(type: string, handler: EventHandler): Unsubscribe {
    const set = this.handlers.get(type) ?? new Set<EventHandler>();
    set.add(handler);
    this.handlers.set(type, set);
    return () => {
      set.delete(handler);
      if (set.size === 0) this.handlers.delete(type);
    };
  }

  async publish(event: DomainEvent): Promise<void> {
    const targets: EventHandler[] = [
      ...(this.handlers.get(event.type) ?? []),
      ...(this.handlers.get("*") ?? []),
    ];
    await Promise.allSettled(targets.map((h) => Promise.resolve(h(event))));
  }
}
