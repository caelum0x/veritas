// Subscriber registry: maps topics to handler lists and manages lifecycle.
import type { MessageHandler } from "./handler.js";
import type { Unsubscribe } from "./message-bus.js";

export class SubscriberRegistry {
  private readonly handlers = new Map<string, Set<MessageHandler<unknown>>>();

  register<TPayload>(topic: string, handler: MessageHandler<TPayload>): Unsubscribe {
    const existing = this.handlers.get(topic);
    const set = existing ?? new Set<MessageHandler<unknown>>();

    if (!existing) {
      this.handlers.set(topic, set);
    }

    set.add(handler as MessageHandler<unknown>);

    return () => {
      set.delete(handler as MessageHandler<unknown>);
      if (set.size === 0) {
        this.handlers.delete(topic);
      }
    };
  }

  getHandlers<TPayload>(topic: string): ReadonlyArray<MessageHandler<TPayload>> {
    const set = this.handlers.get(topic);
    if (!set || set.size === 0) return [];
    return Array.from(set) as MessageHandler<TPayload>[];
  }

  getTopics(): ReadonlyArray<string> {
    return Array.from(this.handlers.keys());
  }

  handlerCount(topic: string): number {
    return this.handlers.get(topic)?.size ?? 0;
  }

  clear(): void {
    this.handlers.clear();
  }
}
