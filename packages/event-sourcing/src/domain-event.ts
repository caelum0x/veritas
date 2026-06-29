// Event base type and envelope for the event-sourcing package.
import type { IsoTimestamp } from "@veritas/core";
import { newEventId, type EventId } from "@veritas/core";
import { epochToIso } from "@veritas/core";

export interface DomainEventMetadata {
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly userId?: string;
}

export interface StoredEvent<TPayload = unknown> {
  readonly id: EventId;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly eventType: string;
  readonly version: number;
  readonly occurredAt: IsoTimestamp;
  readonly payload: TPayload;
  readonly metadata: DomainEventMetadata;
}

export interface DomainEventClass<TPayload = unknown> {
  readonly eventType: string;
  fromPayload(payload: TPayload): BaseDomainEvent<TPayload>;
}

export abstract class BaseDomainEvent<TPayload = unknown> {
  abstract readonly eventType: string;
  abstract readonly payload: TPayload;

  toStored(
    aggregateId: string,
    aggregateType: string,
    version: number,
    metadata: DomainEventMetadata = {}
  ): StoredEvent<TPayload> {
    return {
      id: newEventId(),
      aggregateId,
      aggregateType,
      eventType: this.eventType,
      version,
      occurredAt: epochToIso(Date.now()),
      payload: this.payload,
      metadata,
    };
  }
}

export function makeStoredEvent<TPayload>(
  eventType: string,
  aggregateId: string,
  aggregateType: string,
  version: number,
  payload: TPayload,
  metadata: DomainEventMetadata = {}
): StoredEvent<TPayload> {
  return {
    id: newEventId(),
    aggregateId,
    aggregateType,
    eventType,
    version,
    occurredAt: epochToIso(Date.now()),
    payload,
    metadata,
  };
}
