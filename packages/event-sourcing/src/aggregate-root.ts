// AggregateRoot base class for event-sourced aggregates.
import type { StoredEvent, DomainEventMetadata } from "./domain-event.js";
import { makeStoredEvent } from "./domain-event.js";

export abstract class AggregateRoot {
  protected _version: number = 0;
  private _pendingEvents: StoredEvent[] = [];

  abstract readonly aggregateType: string;
  abstract readonly id: string;

  get version(): number {
    return this._version;
  }

  get pendingEvents(): ReadonlyArray<StoredEvent> {
    return this._pendingEvents;
  }

  protected raise<TPayload>(
    eventType: string,
    payload: TPayload,
    metadata: DomainEventMetadata = {}
  ): void {
    const nextVersion = this._version + this._pendingEvents.length + 1;
    const stored = makeStoredEvent(
      eventType,
      this.id,
      this.aggregateType,
      nextVersion,
      payload,
      metadata
    );
    this._pendingEvents = [...this._pendingEvents, stored];
    this.apply(stored);
  }

  abstract apply(event: StoredEvent): void;

  rehydrate(events: ReadonlyArray<StoredEvent>): void {
    for (const event of events) {
      this.apply(event);
      this._version = event.version;
    }
  }

  clearPendingEvents(): void {
    this._pendingEvents = [];
  }

  markCommitted(version: number): void {
    this._version = version;
    this._pendingEvents = [];
  }
}
