// subscribe.ts: subscribes handler functions to an EventBus for specific event types.

import type { EventBus, EventHandler, DomainEvent, Logger } from "@veritas/core";
import { noopLogger } from "@veritas/core";
import type { HandlerKey } from "./event-map.js";
import { DEFAULT_EVENT_MAP, buildEventIndex } from "./event-map.js";
import type { EventMap } from "./event-map.js";

/** A map from HandlerKey to an EventHandler function. */
export type HandlerRegistry = Readonly<Partial<Record<HandlerKey, EventHandler<DomainEvent>>>>;

export interface SubscribeOptions {
  readonly map?: EventMap;
  readonly logger?: Logger;
}

/** Subscription handle returned to allow unsubscription of all registered handlers. */
export interface WiringSubscription {
  unsubscribeAll(): void;
}

/**
 * Wires all handlers in the registry to the bus according to the event map.
 * Returns a handle to unsubscribe all subscriptions at once.
 */
export function subscribeHandlers(
  bus: EventBus,
  handlers: HandlerRegistry,
  options: SubscribeOptions = {},
): WiringSubscription {
  const { map = DEFAULT_EVENT_MAP, logger = noopLogger } = options;
  const index = buildEventIndex(map);
  const unsubscribeFns: Array<() => void> = [];

  for (const [eventType, handlerKeys] of index.entries()) {
    for (const key of handlerKeys) {
      const handler = handlers[key];
      if (handler === undefined) continue;

      const unsub = bus.subscribe(eventType, handler);
      unsubscribeFns.push(unsub);
      logger.debug("Subscribed handler to event", { eventType, handlerKey: key });
    }
  }

  logger.info("Event wiring subscriptions registered", { count: unsubscribeFns.length });

  return {
    unsubscribeAll(): void {
      for (const fn of unsubscribeFns) {
        try {
          fn();
        } catch {
          // best-effort cleanup
        }
      }
      logger.info("Event wiring subscriptions removed", { count: unsubscribeFns.length });
    },
  };
}
