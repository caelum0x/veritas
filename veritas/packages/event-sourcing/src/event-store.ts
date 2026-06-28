// EventStore interface defining the persistence contract for domain events.
import type { Result } from "@veritas/core";
import type { AppError } from "@veritas/core";
import type { StoredEvent } from "./domain-event.js";

export interface AppendOptions {
  readonly expectedVersion?: number;
}

export interface ReadOptions {
  readonly fromVersion?: number;
  readonly toVersion?: number;
  readonly limit?: number;
}

export interface EventStore {
  append(
    aggregateId: string,
    aggregateType: string,
    events: ReadonlyArray<StoredEvent>,
    options?: AppendOptions
  ): Promise<Result<void, AppError>>;

  read(
    aggregateId: string,
    options?: ReadOptions
  ): Promise<Result<ReadonlyArray<StoredEvent>, AppError>>;

  readAll(
    aggregateType: string,
    options?: ReadOptions
  ): Promise<Result<ReadonlyArray<StoredEvent>, AppError>>;

  currentVersion(
    aggregateId: string
  ): Promise<Result<number, AppError>>;

  exists(aggregateId: string): Promise<Result<boolean, AppError>>;
}
