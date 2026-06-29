// In-memory pub/sub hub: routes published events to subscribed handlers by channel name.
import { newId } from "@veritas/core";
import type { RealtimeEvent, EventHandler, HubPublishOptions } from "./types.js";
import { ChannelNotFoundError } from "./errors.js";

export interface Hub {
  readonly subscribe: (channel: string, handler: EventHandler) => string;
  readonly unsubscribe: (subscriptionId: string) => void;
  readonly publish: (channel: string, event: RealtimeEvent, opts?: HubPublishOptions) => void;
  readonly channels: () => ReadonlyArray<string>;
  readonly subscriberCount: (channel: string) => number;
  readonly close: () => void;
}

interface SubscriptionEntry {
  readonly id: string;
  readonly channel: string;
  readonly handler: EventHandler;
}

export function createMemoryHub(): Hub {
  const subscriptions = new Map<string, SubscriptionEntry>();
  const channelIndex = new Map<string, Set<string>>();
  const retained = new Map<string, RealtimeEvent>();

  const ensureChannel = (channel: string): Set<string> => {
    let ids = channelIndex.get(channel);
    if (!ids) {
      ids = new Set();
      channelIndex.set(channel, ids);
    }
    return ids;
  };

  return {
    subscribe(channel: string, handler: EventHandler): string {
      const id = newId("sub");
      const entry: SubscriptionEntry = { id, channel, handler };
      subscriptions.set(id, entry);
      ensureChannel(channel).add(id);

      const retainedEvent = retained.get(channel);
      if (retainedEvent !== undefined) {
        try { handler(retainedEvent); } catch { /* swallow handler errors */ }
      }

      return id;
    },

    unsubscribe(subscriptionId: string): void {
      const entry = subscriptions.get(subscriptionId);
      if (!entry) return;
      subscriptions.delete(subscriptionId);
      channelIndex.get(entry.channel)?.delete(subscriptionId);
    },

    publish(channel: string, event: RealtimeEvent, opts?: HubPublishOptions): void {
      if (opts?.retain) {
        retained.set(channel, event);
      }

      const ids = channelIndex.get(channel);
      if (!ids || ids.size === 0) return;

      for (const id of ids) {
        const entry = subscriptions.get(id);
        if (entry) {
          try { entry.handler(event); } catch { /* swallow handler errors */ }
        }
      }
    },

    channels(): ReadonlyArray<string> {
      return Array.from(channelIndex.keys());
    },

    subscriberCount(channel: string): number {
      return channelIndex.get(channel)?.size ?? 0;
    },

    close(): void {
      subscriptions.clear();
      channelIndex.clear();
      retained.clear();
    },
  };
}
