// Channel: named conduit carrying typed realtime events to subscribers.
import { newId } from "@veritas/core";
import type { ChannelId, RealtimeEvent } from "./types.js";
import type { Subscription } from "./subscription.js";

export interface Channel {
  readonly id: ChannelId;
  readonly name: string;
  readonly createdAt: string;
  readonly subscriptionCount: number;
  subscribe(sub: Subscription): void;
  unsubscribe(subscriptionId: string): void;
  publish(event: RealtimeEvent): void;
  close(): void;
}

export function newChannelId(): ChannelId {
  return newId("channel") as unknown as ChannelId;
}

export function createChannel(name: string): Channel {
  const id = newChannelId();
  const createdAt = new Date().toISOString();
  const subscriptions = new Map<string, Subscription>();

  return {
    get id() { return id; },
    get name() { return name; },
    get createdAt() { return createdAt; },
    get subscriptionCount() { return subscriptions.size; },

    subscribe(sub: Subscription): void {
      subscriptions.set(sub.id, sub);
    },

    unsubscribe(subscriptionId: string): void {
      subscriptions.delete(subscriptionId);
    },

    publish(event: RealtimeEvent): void {
      for (const sub of subscriptions.values()) {
        if (!sub.closed) {
          sub.deliver(event);
        }
      }
    },

    close(): void {
      for (const sub of subscriptions.values()) {
        sub.close();
      }
      subscriptions.clear();
    },
  };
}
