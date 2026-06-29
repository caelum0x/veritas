// Event upcasting: upgrade old event payloads to current schema versions.
import type { StoredEvent } from "./domain-event.js";
import { UnknownEventTypeError } from "./errors.js";

export type Upcaster<TFrom = unknown, TTo = unknown> = (
  payload: TFrom
) => TTo;

export interface UpcasterEntry {
  readonly eventType: string;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly upcast: Upcaster;
}

export interface EventVersionRegistry {
  register(entry: UpcasterEntry): void;
  upcast(event: StoredEvent): StoredEvent;
  upcastAll(events: ReadonlyArray<StoredEvent>): ReadonlyArray<StoredEvent>;
}

export function createEventVersionRegistry(): EventVersionRegistry {
  // Map: eventType -> sorted list of upcasters by fromVersion ascending
  const registry = new Map<string, UpcasterEntry[]>();

  function register(entry: UpcasterEntry): void {
    const existing = registry.get(entry.eventType) ?? [];
    const updated = [...existing, entry].sort(
      (a, b) => a.fromVersion - b.fromVersion
    );
    registry.set(entry.eventType, updated);
  }

  function upcast(event: StoredEvent): StoredEvent {
    const upcasters = registry.get(event.eventType);
    if (!upcasters || upcasters.length === 0) {
      return event;
    }

    let current = event;
    for (const upcaster of upcasters) {
      if (current.version === upcaster.fromVersion) {
        const upcasted = upcaster.upcast(current.payload);
        current = {
          ...current,
          version: upcaster.toVersion,
          payload: upcasted,
        };
      }
    }
    return current;
  }

  function upcastAll(events: ReadonlyArray<StoredEvent>): ReadonlyArray<StoredEvent> {
    return events.map(upcast);
  }

  return { register, upcast, upcastAll };
}

export const globalVersionRegistry: EventVersionRegistry =
  createEventVersionRegistry();

export function registerUpcaster(entry: UpcasterEntry): void {
  globalVersionRegistry.register(entry);
}
