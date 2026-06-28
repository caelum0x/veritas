// EventStream type representing a named sequence of stored domain events.
import type { IsoTimestamp } from "@veritas/core";
import type { StoredEvent } from "./domain-event.js";

export interface EventStream {
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly version: number;
  readonly events: ReadonlyArray<StoredEvent>;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface EventStreamSlice {
  readonly aggregateId: string;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly events: ReadonlyArray<StoredEvent>;
  readonly isEndOfStream: boolean;
}

export function makeEventStream(
  aggregateId: string,
  aggregateType: string,
  events: ReadonlyArray<StoredEvent>
): EventStream {
  const version = events.length > 0
    ? events[events.length - 1]!.version
    : 0;

  const now = events.length > 0
    ? events[events.length - 1]!.occurredAt
    : new Date().toISOString() as IsoTimestamp;

  const createdAt = events.length > 0
    ? events[0]!.occurredAt
    : now;

  return {
    aggregateId,
    aggregateType,
    version,
    events,
    createdAt,
    updatedAt: now,
  };
}

export function makeEventStreamSlice(
  aggregateId: string,
  events: ReadonlyArray<StoredEvent>,
  isEndOfStream: boolean
): EventStreamSlice {
  const fromVersion = events.length > 0 ? events[0]!.version : 0;
  const toVersion = events.length > 0 ? events[events.length - 1]!.version : 0;

  return {
    aggregateId,
    fromVersion,
    toVersion,
    events,
    isEndOfStream,
  };
}
