// Subscription: single consumer's handle on a channel, with delivery callback.
import { newId } from "@veritas/core";
import type { SubscriptionId, RealtimeEvent } from "./types.js";

export type EventHandler = (event: RealtimeEvent) => void;

export interface Subscription {
  readonly id: SubscriptionId;
  readonly channelId: string;
  readonly subscriberId: string;
  readonly topics: ReadonlySet<string>;
  readonly closed: boolean;
  deliver(event: RealtimeEvent): void;
  close(): void;
}

export interface SubscriptionOptions {
  readonly channelId: string;
  readonly subscriberId: string;
  readonly topics?: ReadonlyArray<string>;
  readonly onEvent: EventHandler;
  readonly onClose?: () => void;
}

export function newSubscriptionId(): SubscriptionId {
  return newId("sub") as unknown as SubscriptionId;
}

export function createSubscription(opts: SubscriptionOptions): Subscription {
  const id = newSubscriptionId();
  const topics = new Set(opts.topics ?? []);
  let closed = false;

  return {
    get id() { return id; },
    get channelId() { return opts.channelId; },
    get subscriberId() { return opts.subscriberId; },
    get topics() { return topics; },
    get closed() { return closed; },

    deliver(event: RealtimeEvent): void {
      if (closed) return;
      if (topics.size > 0 && !topics.has(event.topic)) return;
      opts.onEvent(event);
    },

    close(): void {
      if (closed) return;
      closed = true;
      opts.onClose?.();
    },
  };
}
