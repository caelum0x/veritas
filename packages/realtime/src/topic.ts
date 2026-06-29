// Topic registry: manages named pub/sub topics with pattern matching and subscriber counts.

import type { TopicId, RealtimeEvent } from "./types.js";

export type TopicHandler = (event: RealtimeEvent) => void;

export interface TopicSubscription {
  readonly id: string;
  readonly topicId: TopicId;
  readonly subscriberId: string;
  unsubscribe(): void;
}

export interface TopicRegistry {
  register(topicId: TopicId): void;
  unregister(topicId: TopicId): void;
  exists(topicId: TopicId): boolean;
  subscribe(topicId: TopicId, subscriberId: string, handler: TopicHandler): TopicSubscription;
  publish(topicId: TopicId, event: RealtimeEvent): void;
  publishPattern(pattern: string, event: RealtimeEvent): void;
  subscriberCount(topicId: TopicId): number;
  listTopics(): readonly TopicId[];
}

function asTopicId(raw: string): TopicId {
  return raw as TopicId;
}

function matchesPattern(pattern: string, topicId: string): boolean {
  const regexStr = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^.]+").replace(/\*\*/g, ".+");
  return new RegExp(`^${regexStr}$`).test(topicId);
}

interface TopicEntry {
  readonly subscriptions: Map<string, TopicHandler>;
}

export class InMemoryTopicRegistry implements TopicRegistry {
  private topics: Map<string, TopicEntry> = new Map();
  private subCounter = 0;

  register(topicId: TopicId): void {
    if (this.topics.has(topicId)) return;
    this.topics.set(topicId, { subscriptions: new Map() });
  }

  unregister(topicId: TopicId): void {
    this.topics.delete(topicId);
  }

  exists(topicId: TopicId): boolean {
    return this.topics.has(topicId);
  }

  subscribe(
    topicId: TopicId,
    subscriberId: string,
    handler: TopicHandler
  ): TopicSubscription {
    if (!this.topics.has(topicId)) {
      this.register(topicId);
    }

    const entry = this.topics.get(topicId)!;
    const subId = `sub-${++this.subCounter}`;
    const updatedSubs = new Map(entry.subscriptions);
    updatedSubs.set(subId, handler);
    this.topics.set(topicId, { subscriptions: updatedSubs });

    const registry = this;
    return {
      id: subId,
      topicId,
      subscriberId,
      unsubscribe(): void {
        const current = registry.topics.get(topicId);
        if (current === undefined) return;
        const newSubs = new Map(current.subscriptions);
        newSubs.delete(subId);
        registry.topics.set(topicId, { subscriptions: newSubs });
      },
    };
  }

  publish(topicId: TopicId, event: RealtimeEvent): void {
    const entry = this.topics.get(topicId);
    if (entry === undefined) return;
    for (const handler of entry.subscriptions.values()) {
      handler(event);
    }
  }

  publishPattern(pattern: string, event: RealtimeEvent): void {
    for (const [topicId, entry] of this.topics) {
      if (matchesPattern(pattern, topicId)) {
        for (const handler of entry.subscriptions.values()) {
          handler(event);
        }
      }
    }
  }

  subscriberCount(topicId: TopicId): number {
    return this.topics.get(topicId)?.subscriptions.size ?? 0;
  }

  listTopics(): readonly TopicId[] {
    return Array.from(this.topics.keys()).map(asTopicId);
  }
}

export function createTopicRegistry(): InMemoryTopicRegistry {
  return new InMemoryTopicRegistry();
}
