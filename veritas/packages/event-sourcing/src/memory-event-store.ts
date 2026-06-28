// In-memory implementation of EventStore; suitable for testing and development.
import { ok, err, type Result } from "@veritas/core";
import { InternalError, type AppError } from "@veritas/core";
import type { StoredEvent } from "./domain-event.js";
import type { EventStore, AppendOptions, ReadOptions } from "./event-store.js";
import { ConcurrencyError, StreamNotFoundError } from "./errors.js";

export class MemoryEventStore implements EventStore {
  private readonly streams: Map<string, StoredEvent[]> = new Map();
  private readonly typeIndex: Map<string, string[]> = new Map();

  async append(
    aggregateId: string,
    aggregateType: string,
    events: ReadonlyArray<StoredEvent>,
    options: AppendOptions = {}
  ): Promise<Result<void, AppError>> {
    try {
      const existing = this.streams.get(aggregateId) ?? [];
      const currentVersion = existing.length > 0
        ? existing[existing.length - 1]!.version
        : 0;

      if (
        options.expectedVersion !== undefined &&
        currentVersion !== options.expectedVersion
      ) {
        return err(
          new ConcurrencyError(aggregateId, options.expectedVersion, currentVersion)
        );
      }

      const updated = [...existing, ...events];
      this.streams.set(aggregateId, updated);

      const typeList = this.typeIndex.get(aggregateType) ?? [];
      if (!typeList.includes(aggregateId)) {
        this.typeIndex.set(aggregateType, [...typeList, aggregateId]);
      }

      return ok(undefined);
    } catch (e) {
      return err(new InternalError({ cause: e instanceof Error ? e : new Error(String(e)) }));
    }
  }

  async read(
    aggregateId: string,
    options: ReadOptions = {}
  ): Promise<Result<ReadonlyArray<StoredEvent>, AppError>> {
    try {
      const events = this.streams.get(aggregateId);
      if (!events) {
        return err(new StreamNotFoundError(aggregateId));
      }

      let filtered = events;
      if (options.fromVersion !== undefined) {
        filtered = filtered.filter(e => e.version >= options.fromVersion!);
      }
      if (options.toVersion !== undefined) {
        filtered = filtered.filter(e => e.version <= options.toVersion!);
      }
      if (options.limit !== undefined) {
        filtered = filtered.slice(0, options.limit);
      }

      return ok(filtered);
    } catch (e) {
      return err(new InternalError({ cause: e instanceof Error ? e : new Error(String(e)) }));
    }
  }

  async readAll(
    aggregateType: string,
    options: ReadOptions = {}
  ): Promise<Result<ReadonlyArray<StoredEvent>, AppError>> {
    try {
      const ids = this.typeIndex.get(aggregateType) ?? [];
      const allEvents: StoredEvent[] = [];

      for (const id of ids) {
        const streamEvents = this.streams.get(id) ?? [];
        allEvents.push(...streamEvents);
      }

      allEvents.sort((a, b) => {
        const timeCompare = a.occurredAt.localeCompare(b.occurredAt);
        return timeCompare !== 0 ? timeCompare : a.version - b.version;
      });

      let filtered = allEvents;
      if (options.fromVersion !== undefined) {
        filtered = filtered.filter(e => e.version >= options.fromVersion!);
      }
      if (options.toVersion !== undefined) {
        filtered = filtered.filter(e => e.version <= options.toVersion!);
      }
      if (options.limit !== undefined) {
        filtered = filtered.slice(0, options.limit);
      }

      return ok(filtered);
    } catch (e) {
      return err(new InternalError({ cause: e instanceof Error ? e : new Error(String(e)) }));
    }
  }

  async currentVersion(
    aggregateId: string
  ): Promise<Result<number, AppError>> {
    try {
      const events = this.streams.get(aggregateId);
      if (!events || events.length === 0) {
        return ok(0);
      }
      return ok(events[events.length - 1]!.version);
    } catch (e) {
      return err(new InternalError({ cause: e instanceof Error ? e : new Error(String(e)) }));
    }
  }

  async exists(aggregateId: string): Promise<Result<boolean, AppError>> {
    return ok(this.streams.has(aggregateId));
  }
}
