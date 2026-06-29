// DomainEvent: the base envelope for all domain events.

import { newEventId, type EventId } from "../ids.js";
import type { IsoTimestamp } from "../iso.js";
import { systemClock, type Clock } from "../time.js";

/** Common metadata carried by every domain event. */
export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  /** Unique event id. */
  readonly id: EventId;
  /** Discriminating event type, e.g. "claim.verified". */
  readonly type: TType;
  /** When the event occurred. */
  readonly occurredAt: IsoTimestamp;
  /** Event-specific payload. */
  readonly payload: TPayload;
  /** Optional correlation id linking related events. */
  readonly correlationId?: string;
}

/** Inputs needed to construct a domain event (id/time auto-filled). */
export interface DomainEventInit<TType extends string, TPayload> {
  readonly type: TType;
  readonly payload: TPayload;
  readonly correlationId?: string;
}

/** Create a fully-populated DomainEvent using the provided clock. */
export function makeDomainEvent<TType extends string, TPayload>(
  init: DomainEventInit<TType, TPayload>,
  clock: Clock = systemClock,
): DomainEvent<TType, TPayload> {
  return {
    id: newEventId(),
    type: init.type,
    occurredAt: clock.nowIso(),
    payload: init.payload,
    ...(init.correlationId ? { correlationId: init.correlationId } : {}),
  };
}
