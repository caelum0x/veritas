// Event-sourced repository base: load aggregates from events, save new events, publish.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { AppError } from "@veritas/core";
import { NotFoundError, InternalError } from "@veritas/core";
import type { StoredEvent } from "./domain-event.js";
import type { EventBus } from "./event-bus.js";
import type { SnapshotPolicy, SnapshotStore } from "./snapshot.js";
import { NeverSnapshotPolicy, makeSnapshot } from "./snapshot.js";

export interface EventStore {
  append(
    aggregateId: string,
    aggregateType: string,
    events: ReadonlyArray<StoredEvent<unknown>>,
    expectedVersion: number
  ): Promise<void>;
  load(
    aggregateId: string,
    aggregateType: string,
    fromVersion?: number
  ): Promise<ReadonlyArray<StoredEvent<unknown>>>;
}

export interface AggregateRoot<TState> {
  readonly id: string;
  readonly aggregateType: string;
  readonly version: number;
  getState(): TState;
  getUncommittedEvents(): ReadonlyArray<StoredEvent<unknown>>;
  clearUncommittedEvents(): void;
  applyStoredEvent(event: StoredEvent<unknown>): void;
  restoreFromSnapshot(state: TState, version: number): void;
}

export interface RepositoryOptions<TState> {
  readonly eventStore: EventStore;
  readonly eventBus?: EventBus;
  readonly snapshotStore?: SnapshotStore;
  readonly snapshotPolicy?: SnapshotPolicy;
  readonly aggregateType: string;
  factory: (id: string) => AggregateRoot<TState>;
}

export class EventSourcedRepository<TState> {
  private readonly eventStore: EventStore;
  private readonly eventBus: EventBus | null;
  private readonly snapshotStore: SnapshotStore | null;
  private readonly snapshotPolicy: SnapshotPolicy;
  private readonly aggregateType: string;
  private readonly factory: (id: string) => AggregateRoot<TState>;

  constructor(options: RepositoryOptions<TState>) {
    this.eventStore = options.eventStore;
    this.eventBus = options.eventBus ?? null;
    this.snapshotStore = options.snapshotStore ?? null;
    this.snapshotPolicy = options.snapshotPolicy ?? new NeverSnapshotPolicy();
    this.aggregateType = options.aggregateType;
    this.factory = options.factory;
  }

  async load(id: string): Promise<Result<AggregateRoot<TState>, AppError>> {
    try {
      const aggregate = this.factory(id);
      let fromVersion = 0;

      if (this.snapshotStore) {
        const snapshot = await this.snapshotStore.load<TState>(id, this.aggregateType);
        if (snapshot) {
          aggregate.restoreFromSnapshot(snapshot.state, snapshot.version);
          fromVersion = snapshot.version;
        }
      }

      const events = await this.eventStore.load(id, this.aggregateType, fromVersion);

      if (events.length === 0 && fromVersion === 0) {
        return err(new NotFoundError({ message: `${this.aggregateType} not found: ${id}` }));
      }

      for (const event of events) {
        aggregate.applyStoredEvent(event);
      }

      return ok(aggregate);
    } catch (e) {
      return err(new InternalError({ message: "Failed to load aggregate", cause: e }));
    }
  }

  async save(
    aggregate: AggregateRoot<TState>
  ): Promise<Result<void, AppError>> {
    const uncommitted = aggregate.getUncommittedEvents();
    if (uncommitted.length === 0) {
      return ok(undefined);
    }

    const expectedVersion = aggregate.version - uncommitted.length;

    try {
      await this.eventStore.append(
        aggregate.id,
        this.aggregateType,
        uncommitted,
        expectedVersion
      );

      aggregate.clearUncommittedEvents();

      if (this.snapshotStore) {
        const lastSnapshot = await this.snapshotStore.load<TState>(
          aggregate.id,
          this.aggregateType
        );
        const lastSnapshotVersion = lastSnapshot?.version ?? 0;

        if (this.snapshotPolicy.shouldTakeSnapshot(aggregate.version, lastSnapshotVersion)) {
          const snap = makeSnapshot(
            aggregate.id,
            this.aggregateType,
            aggregate.version,
            aggregate.getState()
          );
          await this.snapshotStore.save(snap);
        }
      }

      if (this.eventBus) {
        await this.eventBus.publish(uncommitted);
      }

      return ok(undefined);
    } catch (e) {
      return err(new InternalError({ message: "Failed to save aggregate", cause: e }));
    }
  }
}
