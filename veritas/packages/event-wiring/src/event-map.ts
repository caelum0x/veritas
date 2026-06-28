// event-map.ts: maps domain event types to their handler identifiers for routing.

import type { DomainEvent } from "@veritas/core";

/** Handler identifier string, naming the bridge/handler responsible for an event type. */
export type HandlerKey =
  | "webhook-bridge"
  | "notification-bridge"
  | "projection-bridge"
  | "outbox-bridge";

/** A mapping entry: an event type string to one or more handler keys. */
export interface EventMapEntry {
  readonly eventType: string;
  readonly handlers: readonly HandlerKey[];
}

/** Complete event-to-handler routing map. */
export type EventMap = readonly EventMapEntry[];

/** Default wiring: which bridges receive which domain event types. */
export const DEFAULT_EVENT_MAP: EventMap = [
  // Claim events
  { eventType: "claim.created", handlers: ["webhook-bridge", "notification-bridge", "projection-bridge"] },
  { eventType: "claim.updated", handlers: ["webhook-bridge", "projection-bridge"] },
  { eventType: "claim.deleted", handlers: ["webhook-bridge", "projection-bridge"] },

  // Verification events
  { eventType: "verification.started", handlers: ["webhook-bridge", "notification-bridge", "projection-bridge"] },
  { eventType: "verification.completed", handlers: ["webhook-bridge", "notification-bridge", "projection-bridge"] },
  { eventType: "verification.failed", handlers: ["webhook-bridge", "notification-bridge", "projection-bridge"] },

  // Job events
  { eventType: "job.created", handlers: ["webhook-bridge", "projection-bridge"] },
  { eventType: "job.started", handlers: ["webhook-bridge", "projection-bridge"] },
  { eventType: "job.completed", handlers: ["webhook-bridge", "notification-bridge", "projection-bridge"] },
  { eventType: "job.failed", handlers: ["webhook-bridge", "notification-bridge", "projection-bridge"] },

  // Order events
  { eventType: "order.created", handlers: ["webhook-bridge", "notification-bridge", "projection-bridge"] },
  { eventType: "order.settled", handlers: ["webhook-bridge", "notification-bridge", "projection-bridge"] },
  { eventType: "order.cancelled", handlers: ["webhook-bridge", "notification-bridge", "projection-bridge"] },

  // Source events
  { eventType: "source.created", handlers: ["webhook-bridge", "projection-bridge"] },
  { eventType: "source.updated", handlers: ["webhook-bridge", "projection-bridge"] },
  { eventType: "source.deleted", handlers: ["webhook-bridge", "projection-bridge"] },

  // Settlement events
  { eventType: "settlement.initiated", handlers: ["webhook-bridge", "notification-bridge", "projection-bridge"] },
  { eventType: "settlement.confirmed", handlers: ["webhook-bridge", "notification-bridge", "projection-bridge"] },
  { eventType: "settlement.failed", handlers: ["webhook-bridge", "notification-bridge", "projection-bridge"] },

  // Agent events
  { eventType: "agent.registered", handlers: ["webhook-bridge", "projection-bridge"] },
  { eventType: "agent.deregistered", handlers: ["webhook-bridge", "projection-bridge"] },

  // Invoice / billing events
  { eventType: "invoice.created", handlers: ["webhook-bridge", "notification-bridge", "projection-bridge"] },
  { eventType: "invoice.paid", handlers: ["webhook-bridge", "notification-bridge", "projection-bridge"] },
  { eventType: "usage.threshold_reached", handlers: ["webhook-bridge", "notification-bridge"] },

  // Report events
  { eventType: "report.created", handlers: ["webhook-bridge", "projection-bridge"] },
  { eventType: "report.updated", handlers: ["webhook-bridge", "projection-bridge"] },
] as const;

/** Look up handler keys for a given domain event type. Returns empty array if unmapped. */
export function handlersForEvent(
  eventType: string,
  map: EventMap = DEFAULT_EVENT_MAP,
): readonly HandlerKey[] {
  return map.find((e) => e.eventType === eventType)?.handlers ?? [];
}

/** Build a quick-lookup index from event type -> handler keys. */
export function buildEventIndex(map: EventMap = DEFAULT_EVENT_MAP): ReadonlyMap<string, readonly HandlerKey[]> {
  const index = new Map<string, readonly HandlerKey[]>();
  for (const entry of map) {
    index.set(entry.eventType, entry.handlers);
  }
  return index;
}
