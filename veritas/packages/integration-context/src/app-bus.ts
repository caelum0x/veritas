// In-process application event bus — thin typed wrapper over core InMemoryEventBus.

import {
  InMemoryEventBus,
  type DomainEvent,
  type EventHandler,
  type Unsubscribe,
  type EventBus,
} from "@veritas/core";

/** Typed application-level event bus backed by the in-process InMemoryEventBus. */
export class AppEventBus implements EventBus {
  private readonly inner: InMemoryEventBus;

  constructor() {
    this.inner = new InMemoryEventBus();
  }

  subscribe<E extends DomainEvent>(
    eventType: string,
    handler: EventHandler<E>
  ): Unsubscribe {
    return this.inner.subscribe(eventType, handler as EventHandler<DomainEvent>);
  }

  async publish(event: DomainEvent): Promise<void> {
    await this.inner.publish(event);
  }
}

/** Create a singleton-style AppEventBus instance. */
export function createAppEventBus(): AppEventBus {
  return new AppEventBus();
}
