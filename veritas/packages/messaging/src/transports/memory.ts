// In-memory transport: synchronous in-process delivery for testing and local development.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Message } from "../message.js";
import { TransportError } from "../errors.js";
import type {
  Transport,
  TransportHandler,
  TransportSubscription,
  SendOptions,
  SubscribeOptions,
} from "./transport.js";
import { defaultMatcher } from "../topic.js";

interface Subscription {
  readonly id: string;
  readonly pattern: string;
  readonly handler: TransportHandler<unknown>;
}

let subIdCounter = 0;

export class MemoryTransport implements Transport {
  private readonly subscriptions = new Map<string, Subscription>();
  private connected = false;

  get isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<Result<void, TransportError>> {
    if (this.connected) {
      return err(new TransportError("MemoryTransport is already connected"));
    }
    this.connected = true;
    return ok(undefined);
  }

  async disconnect(): Promise<Result<void, TransportError>> {
    if (!this.connected) {
      return err(new TransportError("MemoryTransport is not connected"));
    }
    this.connected = false;
    this.subscriptions.clear();
    return ok(undefined);
  }

  async send<TPayload>(
    message: Message<TPayload>,
    _options?: SendOptions,
  ): Promise<Result<void, TransportError>> {
    if (!this.connected) {
      return err(new TransportError("MemoryTransport is not connected"));
    }

    const matched = Array.from(this.subscriptions.values()).filter((sub) =>
      defaultMatcher.matches(sub.pattern, message.topic),
    );

    await Promise.all(
      matched.map((sub) => (sub.handler as TransportHandler<TPayload>)(message)),
    );

    return ok(undefined);
  }

  async subscribe<TPayload>(
    topic: string,
    handler: TransportHandler<TPayload>,
    _options?: SubscribeOptions,
  ): Promise<Result<TransportSubscription, TransportError>> {
    if (!this.connected) {
      return err(new TransportError("MemoryTransport is not connected"));
    }

    const id = `mem-sub-${++subIdCounter}`;
    const sub: Subscription = {
      id,
      pattern: topic,
      handler: handler as TransportHandler<unknown>,
    };

    this.subscriptions.set(id, sub);

    const subscription: TransportSubscription = {
      topic,
      unsubscribe: async () => {
        this.subscriptions.delete(id);
      },
    };

    return ok(subscription);
  }

  /** Return the number of active subscriptions (useful in tests). */
  get subscriptionCount(): number {
    return this.subscriptions.size;
  }
}
